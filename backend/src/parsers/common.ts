// Shared helpers used by every format-specific parser (gpx.ts, tcx.ts, fit.ts).

// Sport/type strings across Garmin/Strava/generic exports that count as a "run".
// Deliberately excludes walking, cycling, swimming, etc.
const RUNNING_KEYWORDS = ["run", "running", "trail_running", "treadmill_running", "track_running"];

export function isRunningType(rawType: string | undefined | null): boolean {
  if (!rawType) return true; // many GPX exports simply omit <type>; assume running rather than dropping the file
  const t = rawType.toLowerCase().trim();
  if (!t) return true;
  return RUNNING_KEYWORDS.some((k) => t.includes(k));
}

export function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Always derive pace from distance+duration rather than trusting a file's own pace/speed field.
export function computePaceSecPerKm(distance_km: number, duration_seconds: number): number {
  if (distance_km <= 0) return 0;
  return duration_seconds / distance_km;
}

export function average(nums: number[]): number | undefined {
  const filtered = nums.filter((n) => Number.isFinite(n) && n > 0);
  if (filtered.length === 0) return undefined;
  return filtered.reduce((a, b) => a + b, 0) / filtered.length;
}

export class ParseError extends Error {}

// Great-circle distance between two lat/lon points, in meters. Used to derive GPX
// distance ourselves from trackpoints, since GPX has no built-in distance/duration field.
export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// fast-xml-parser gives a bare object when an element occurs once, and an array when it
// repeats. Normalize both cases so calling code never has to special-case it.
export function ensureArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}
