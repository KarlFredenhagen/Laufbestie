import { XMLParser } from "fast-xml-parser";
import { NormalizedActivity } from "../types";
import { isRunningType, toIsoDate, computePaceSecPerKm, average, ParseError, ensureArray } from "./common";

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseTagValue: true,
});

export function parseTcx(buffer: Buffer, filename: string): { activities: NormalizedActivity[]; skipped: number } {
  let doc: any;
  try {
    doc = xmlParser.parse(buffer.toString("utf-8"));
  } catch (err) {
    throw new ParseError(`${filename}: keine gültige TCX/XML-Datei (${(err as Error).message})`);
  }

  const tcd = doc?.TrainingCenterDatabase;
  const rawActivities = ensureArray(tcd?.Activities?.Activity);
  if (rawActivities.length === 0) {
    throw new ParseError(`${filename}: keine <Activity>-Elemente in der TCX-Datei gefunden`);
  }

  const activities: NormalizedActivity[] = [];
  let skipped = 0;

  for (const activity of rawActivities) {
    const sport = activity?.["@_Sport"] as string | undefined;
    if (!isRunningType(sport)) {
      skipped++;
      continue;
    }

    const laps = ensureArray(activity.Lap);
    if (laps.length === 0) {
      throw new ParseError(`${filename}: Aktivität enthält keine <Lap>-Daten`);
    }

    let totalDistanceM = 0;
    let totalDurationS = 0;
    const hrReadings: number[] = [];
    const altitudes: number[] = [];

    for (const lap of laps) {
      totalDistanceM += Number(lap.DistanceMeters ?? 0);
      totalDurationS += Number(lap.TotalTimeSeconds ?? 0);

      const lapAvgHr = lap.AverageHeartRateBpm?.Value;
      if (lapAvgHr !== undefined) hrReadings.push(Number(lapAvgHr));

      const trackpoints = ensureArray(lap.Track?.Trackpoint);
      for (const tp of trackpoints) {
        const hr = tp.HeartRateBpm?.Value;
        if (hr !== undefined) hrReadings.push(Number(hr));
        if (tp.AltitudeMeters !== undefined) altitudes.push(Number(tp.AltitudeMeters));
      }
    }

    if (totalDistanceM <= 0 || totalDurationS <= 0) {
      throw new ParseError(`${filename}: Aktivität hat keine Distanz oder Dauer`);
    }

    let elevationGain: number | undefined;
    if (altitudes.length > 1) {
      elevationGain = 0;
      for (let i = 1; i < altitudes.length; i++) {
        const diff = altitudes[i] - altitudes[i - 1];
        if (diff > 0) elevationGain += diff;
      }
      elevationGain = Math.round(elevationGain);
    }

    const startTimeRaw = laps[0]["@_StartTime"] ?? activity.Id;
    const startTime = startTimeRaw ? new Date(startTimeRaw) : null;
    if (!startTime || isNaN(startTime.getTime())) {
      throw new ParseError(`${filename}: Startzeit der Aktivität konnte nicht bestimmt werden`);
    }

    const distance_km = totalDistanceM / 1000;

    activities.push({
      date: toIsoDate(startTime),
      distance_km: Math.round(distance_km * 1000) / 1000,
      duration_seconds: Math.round(totalDurationS),
      avg_pace_per_km: Math.round(computePaceSecPerKm(distance_km, totalDurationS)),
      avg_heartrate: average(hrReadings) !== undefined ? Math.round(average(hrReadings)!) : undefined,
      elevation_gain_m: elevationGain,
      activity_type: sport ?? "running",
    });
  }

  return { activities, skipped };
}
