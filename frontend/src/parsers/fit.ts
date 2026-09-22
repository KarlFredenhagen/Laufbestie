import FitParser from "fit-file-parser";
import { NormalizedActivity } from "../types";
import { isRunningType, toIsoDate, computePaceSecPerKm, ParseError } from "./common";

// FIT (Flexible and Interoperable Data Transfer) is Garmin's binary activity format —
// unlike GPX/TCX it is not human-readable XML. A FIT file is a sequence of typed
// "messages" (header, definitions, data records, CRC) that map to things like
// `session`, `lap`, and `record` (one record per GPS/sensor sample). We don't hand-decode
// any of that binary layout ourselves; fit-file-parser does it and hands back plain JS
// objects grouped by message type. We only care about the `session` messages here, since
// a session already aggregates one activity's totals (distance, elapsed time, avg HR,
// ascent) the way a single run/ride would be summarized in Garmin Connect.
function parseWithLibrary(buffer: ArrayBuffer): Promise<any> {
  return new Promise((resolve, reject) => {
    const parser = new FitParser({
      force: true,
      mode: "list", // flat arrays (sessions/laps/records) rather than nested cascade — simpler to walk
      lengthUnit: "km",
      speedUnit: "km/h",
      elapsedRecordField: true,
    });
    parser.parse(buffer, (error: any, data: any) => {
      if (error) reject(error);
      else resolve(data);
    });
  });
}

export async function parseFit(
  arrayBuffer: ArrayBuffer,
  filename: string
): Promise<{ activities: NormalizedActivity[]; skipped: number }> {
  let data: any;
  try {
    data = await parseWithLibrary(arrayBuffer);
  } catch (err) {
    throw new ParseError(`${filename}: keine gültige/lesbare FIT-Datei (${(err as Error).message ?? err})`);
  }

  const sessions: any[] = data?.sessions ?? [];
  if (sessions.length === 0) {
    throw new ParseError(`${filename}: keine Session-Daten in der FIT-Datei gefunden`);
  }

  const activities: NormalizedActivity[] = [];
  let skipped = 0;

  for (const session of sessions) {
    // FIT's `sport` enum value (e.g. "running", "cycling", "swimming") — this is the
    // sport field the spec asks us to check rather than assuming every file is a run.
    const sport: string | undefined = session.sport;
    if (!isRunningType(sport)) {
      skipped++;
      continue;
    }

    const distance_km: number = Number(session.total_distance ?? 0);
    // Prefer timer time (moving/active time, excludes auto-pause) over elapsed time (wall clock).
    const duration_seconds: number = Number(session.total_timer_time ?? session.total_elapsed_time ?? 0);
    const startTime: Date | undefined = session.start_time;

    if (distance_km <= 0 || duration_seconds <= 0 || !startTime) {
      throw new ParseError(`${filename}: Session hat keine Distanz, Dauer oder Startzeit`);
    }

    activities.push({
      date: toIsoDate(new Date(startTime)),
      distance_km: Math.round(distance_km * 1000) / 1000,
      duration_seconds: Math.round(duration_seconds),
      // Ignore the FIT file's own avg_speed field for pace — recompute from distance+duration,
      // consistent with every other parser, so all sources agree on how pace is defined.
      avg_pace_per_km: Math.round(computePaceSecPerKm(distance_km, duration_seconds)),
      avg_heartrate: session.avg_heart_rate !== undefined ? Math.round(session.avg_heart_rate) : undefined,
      elevation_gain_m: session.total_ascent !== undefined ? Math.round(session.total_ascent) : undefined,
      activity_type: sport ?? "running",
    });
  }

  return { activities, skipped };
}
