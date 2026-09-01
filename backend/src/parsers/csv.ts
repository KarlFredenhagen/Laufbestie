import { parse } from "csv-parse/sync";
import { NormalizedActivity } from "../types";
import { isRunningType, computePaceSecPerKm, ParseError } from "./common";

// Garmin Connect's "Export CSV" button on the Activities list (much easier to reach than the
// per-activity GPX/TCX/FIT export buried under each activity's gear menu) produces one row per
// activity with pre-aggregated totals rather than raw track points. There's no GPS trace to
// derive distance/duration from ourselves, so this parser trusts the row's own distance and
// time totals — but still recomputes pace from them rather than trusting Garmin's own pace
// column, consistent with the GPX/TCX/FIT parsers.
//
// Column names/formats vary by Garmin account locale and have changed over the years, so this
// looks up each field by trying several known header spellings and normalizes whatever number
// format it finds (comma or dot decimals, "hh:mm:ss" or "mm:ss" durations).

const HEADER_ALIASES: Record<string, string[]> = {
  type: ["Activity Type", "Type"],
  date: ["Date"],
  distance: ["Distance"],
  time: ["Time", "Moving Time", "Elapsed Time"],
  avgHr: ["Avg HR", "Average Heart Rate", "Avg Heart Rate"],
  elevationGain: ["Total Ascent", "Elev Gain", "Elevation Gain"],
};

function findColumn(headers: string[], aliases: string[]): string | undefined {
  const normalized = headers.map((h) => h.trim().toLowerCase());
  for (const alias of aliases) {
    const idx = normalized.indexOf(alias.toLowerCase());
    if (idx !== -1) return headers[idx];
  }
  return undefined;
}

// "5.02", "5,02", "5.02 km" -> 5.02
function parseLocaleNumber(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const cleaned = raw.replace(/[^\d.,-]/g, "").trim();
  if (!cleaned) return undefined;
  // If both separators appear, assume the last one is the decimal point (e.g. "1.234,56").
  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");
  let normalized = cleaned;
  if (hasComma && hasDot) {
    normalized = cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")
      ? cleaned.replace(/\./g, "").replace(",", ".")
      : cleaned.replace(/,/g, "");
  } else if (hasComma) {
    normalized = cleaned.replace(",", ".");
  }
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : undefined;
}

// "00:24:31" or "24:31" -> seconds
function parseDuration(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const parts = raw.trim().split(":").map((p) => parseFloat(p));
  if (parts.some((p) => !Number.isFinite(p))) return undefined;
  let seconds = 0;
  for (const p of parts) seconds = seconds * 60 + p;
  return seconds;
}

function parseDate(raw: string | undefined): Date | undefined {
  if (!raw) return undefined;
  const isoLike = new Date(raw.replace(" ", "T"));
  if (!isNaN(isoLike.getTime())) return isoLike;
  // Fall back to "DD.MM.YYYY[ HH:MM[:SS]]" (common in German-locale exports).
  const match = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (match) {
    const [, d, m, y, h = "0", min = "0", s = "0"] = match;
    return new Date(Number(y), Number(m) - 1, Number(d), Number(h), Number(min), Number(s));
  }
  return undefined;
}

export function parseCsv(buffer: Buffer, filename: string): { activities: NormalizedActivity[]; skipped: number } {
  let rows: Record<string, string>[];
  try {
    rows = parse(buffer, { columns: true, skip_empty_lines: true, trim: true, bom: true });
  } catch (err) {
    throw new ParseError(`${filename}: keine gültige CSV-Datei (${(err as Error).message})`);
  }

  if (rows.length === 0) {
    throw new ParseError(`${filename}: keine Zeilen in der CSV-Datei gefunden`);
  }

  const headers = Object.keys(rows[0]);
  const col = {
    type: findColumn(headers, HEADER_ALIASES.type),
    date: findColumn(headers, HEADER_ALIASES.date),
    distance: findColumn(headers, HEADER_ALIASES.distance),
    time: findColumn(headers, HEADER_ALIASES.time),
    avgHr: findColumn(headers, HEADER_ALIASES.avgHr),
    elevationGain: findColumn(headers, HEADER_ALIASES.elevationGain),
  };

  if (!col.date || !col.distance || !col.time) {
    throw new ParseError(
      `${filename}: Spalten Date/Distance/Time nicht gefunden (gefunden: ${headers.join(", ")})`
    );
  }

  const activities: NormalizedActivity[] = [];
  let skipped = 0;

  // Bad individual rows are skipped rather than failing the whole file — a single malformed
  // export row shouldn't discard the rest of someone's history.
  for (const row of rows) {
    const rawType = col.type ? row[col.type] : undefined;
    if (!isRunningType(rawType)) {
      skipped++;
      continue;
    }

    const date = parseDate(row[col.date]);
    const distance_km = parseLocaleNumber(row[col.distance]);
    const duration_seconds = parseDuration(row[col.time]);

    if (!date || !distance_km || !duration_seconds || distance_km <= 0 || duration_seconds <= 0) {
      continue;
    }

    activities.push({
      date: date.toISOString().slice(0, 10),
      distance_km: Math.round(distance_km * 1000) / 1000,
      duration_seconds: Math.round(duration_seconds),
      avg_pace_per_km: Math.round(computePaceSecPerKm(distance_km, duration_seconds)),
      avg_heartrate: col.avgHr ? parseLocaleNumber(row[col.avgHr]) : undefined,
      elevation_gain_m: col.elevationGain ? parseLocaleNumber(row[col.elevationGain]) : undefined,
      activity_type: rawType ?? "running",
    });
  }

  return { activities, skipped };
}
