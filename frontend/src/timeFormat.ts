// Accepts "mm:ss" or "h:mm:ss" (e.g. "24:30" or "1:45:00"); returns null for empty/invalid input.
export function parseTimeToSeconds(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const parts = trimmed.split(":").map((p) => Number(p));
  if (parts.length < 2 || parts.length > 3 || parts.some((p) => !Number.isFinite(p) || p < 0)) return null;

  let seconds = 0;
  for (const part of parts) seconds = seconds * 60 + part;
  return seconds > 0 ? Math.round(seconds) : null;
}

// Formats seconds back to "mm:ss" (or "h:mm:ss" once it's an hour or more).
export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.round(totalSeconds % 60);

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
