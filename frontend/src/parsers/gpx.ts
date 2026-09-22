import { XMLParser } from "fast-xml-parser";
import { NormalizedActivity } from "../types";
import {
  isRunningType,
  toIsoDate,
  computePaceSecPerKm,
  average,
  haversineMeters,
  ParseError,
  ensureArray,
} from "./common";

// Parsed directly with fast-xml-parser rather than the `gpxparser` npm package: gpxparser
// calls `require("jsdom-global")()` as a load-time side effect, which permanently installs
// `window`/`document`/`navigator` onto the Node global object. That in turn makes the
// Anthropic SDK's browser-environment check (Part 4) misfire and refuse to run. Parsing the
// XML ourselves — the same approach used for TCX — sidesteps that entirely and keeps GPX/TCX
// parsing consistent.
const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseTagValue: true,
});

function extractAvgHeartrate(xml: string): number | undefined {
  // GPX has no standard heart-rate field — Garmin/Strava stuff it into a namespaced
  // <gpxtpx:hr> (or similarly prefixed) extension element per trackpoint. Regex-scanning
  // the raw XML for any "*hr" tag is a simpler, equally reliable best-effort average.
  const matches = [...xml.matchAll(/<[\w:]*hr[^>]*>\s*(\d+)\s*<\/[\w:]*hr>/gi)];
  return average(matches.map((m) => parseInt(m[1], 10)));
}

export function parseGpx(xml: string, filename: string): { activities: NormalizedActivity[]; skipped: number } {
  let doc: any;
  try {
    doc = xmlParser.parse(xml);
  } catch (err) {
    throw new ParseError(`${filename}: keine gültige GPX/XML-Datei (${(err as Error).message})`);
  }

  const tracks = ensureArray(doc?.gpx?.trk);
  if (tracks.length === 0) {
    throw new ParseError(`${filename}: keine <trk>-Tracks in der GPX-Datei gefunden`);
  }

  const activities: NormalizedActivity[] = [];
  let skipped = 0;

  for (const track of tracks) {
    const rawType: string | undefined = typeof track.type === "string" ? track.type : undefined;
    if (!isRunningType(rawType)) {
      skipped++;
      continue;
    }

    // A track can have multiple segments (e.g. auto-paused sections); flatten to one point list.
    const segments = ensureArray(track.trkseg);
    const points = segments.flatMap((seg: any) => ensureArray(seg.trkpt));
    const timedPoints = points.filter((p: any) => p.time && p["@_lat"] !== undefined && p["@_lon"] !== undefined);

    if (timedPoints.length < 2) {
      throw new ParseError(`${filename}: Track hat keine verwertbaren Zeitstempel zur Dauerberechnung`);
    }

    const startTime = new Date(timedPoints[0].time);
    const endTime = new Date(timedPoints[timedPoints.length - 1].time);
    const duration_seconds = (endTime.getTime() - startTime.getTime()) / 1000;

    let distanceMeters = 0;
    let elevationGain = 0;
    let hasElevation = false;
    for (let i = 1; i < timedPoints.length; i++) {
      const prev = timedPoints[i - 1];
      const curr = timedPoints[i];
      distanceMeters += haversineMeters(
        parseFloat(prev["@_lat"]),
        parseFloat(prev["@_lon"]),
        parseFloat(curr["@_lat"]),
        parseFloat(curr["@_lon"])
      );
      if (prev.ele !== undefined && curr.ele !== undefined) {
        hasElevation = true;
        const diff = parseFloat(curr.ele) - parseFloat(prev.ele);
        if (diff > 0) elevationGain += diff;
      }
    }

    const distance_km = distanceMeters / 1000;

    if (duration_seconds <= 0 || distance_km <= 0) {
      throw new ParseError(`${filename}: Track hat keine Distanz oder Dauer`);
    }

    activities.push({
      date: toIsoDate(startTime),
      distance_km: Math.round(distance_km * 1000) / 1000,
      duration_seconds: Math.round(duration_seconds),
      avg_pace_per_km: Math.round(computePaceSecPerKm(distance_km, duration_seconds)),
      avg_heartrate: extractAvgHeartrate(xml),
      elevation_gain_m: hasElevation ? Math.round(elevationGain) : undefined,
      activity_type: rawType ?? "running",
    });
  }

  return { activities, skipped };
}
