import { StoredActivity, TrainingSummary } from "./types";

const WEEKS_OF_HISTORY = 10;
const MS_PER_DAY = 86_400_000;
const MS_PER_WEEK = MS_PER_DAY * 7;

function startOfWeek(date: Date): Date {
  // Weeks start on Monday.
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay(); // 0 = Sunday
  const diff = (day === 0 ? -6 : 1) - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Turns raw stored activities into the compact, pre-computed summary that gets sent to the
// LLM. All arithmetic happens here in code — the prompt only ever sees these final numbers,
// never per-run data, so the model can't (and doesn't need to) re-derive trends itself.
export function buildTrainingSummary(activities: StoredActivity[]): TrainingSummary {
  const sorted = [...activities].sort((a, b) => a.date.localeCompare(b.date));

  const now = new Date();
  const currentWeekStart = startOfWeek(now);

  // --- Weekly distance for the last N weeks ---
  const weeklyBuckets = new Map<string, number>();
  for (let i = WEEKS_OF_HISTORY - 1; i >= 0; i--) {
    const weekStart = new Date(currentWeekStart.getTime() - i * MS_PER_WEEK);
    weeklyBuckets.set(isoDate(weekStart), 0);
  }
  for (const a of sorted) {
    const weekStart = isoDate(startOfWeek(new Date(a.date)));
    if (weeklyBuckets.has(weekStart)) {
      weeklyBuckets.set(weekStart, weeklyBuckets.get(weekStart)! + a.distance_km);
    }
  }
  const weekly_distance_km = [...weeklyBuckets.entries()].map(([week_start, distance_km]) => ({
    week_start,
    distance_km: Math.round(distance_km * 100) / 100,
  }));

  // --- Overall average pace ---
  const totalDistance = sorted.reduce((sum, a) => sum + a.distance_km, 0);
  const totalDuration = sorted.reduce((sum, a) => sum + a.duration_seconds, 0);
  const avg_pace_overall_sec_per_km = totalDistance > 0 ? Math.round(totalDuration / totalDistance) : 0;

  // --- Pace trend: last 4 weeks vs prior 4 weeks ---
  const fourWeeksAgo = new Date(currentWeekStart.getTime() - 4 * MS_PER_WEEK);
  const eightWeeksAgo = new Date(currentWeekStart.getTime() - 8 * MS_PER_WEEK);

  const recentRuns = sorted.filter((a) => new Date(a.date) >= fourWeeksAgo);
  const priorRuns = sorted.filter((a) => new Date(a.date) >= eightWeeksAgo && new Date(a.date) < fourWeeksAgo);

  const paceOf = (runs: StoredActivity[]): number | null => {
    const dist = runs.reduce((s, a) => s + a.distance_km, 0);
    const dur = runs.reduce((s, a) => s + a.duration_seconds, 0);
    return dist > 0 ? dur / dist : null;
  };

  const recentPace = paceOf(recentRuns);
  const priorPace = paceOf(priorRuns);

  let pace_trend: TrainingSummary["pace_trend"] = "insufficient_data";
  if (recentPace !== null && priorPace !== null) {
    const pctChange = (recentPace - priorPace) / priorPace;
    if (pctChange < -0.02) pace_trend = "improving"; // lower sec/km = faster
    else if (pctChange > 0.02) pace_trend = "declining";
    else pace_trend = "stable";
  }

  // --- Longest run in last 4 weeks ---
  const longest_run_last_4_weeks_km =
    recentRuns.length > 0 ? Math.max(...recentRuns.map((a) => a.distance_km)) : 0;

  // --- Run frequency (avg days/week over available history window) ---
  const windowRuns = sorted.filter((a) => new Date(a.date) >= new Date(currentWeekStart.getTime() - WEEKS_OF_HISTORY * MS_PER_WEEK));
  const uniqueDays = new Set(windowRuns.map((a) => a.date));
  const run_frequency_days_per_week = Math.round((uniqueDays.size / WEEKS_OF_HISTORY) * 10) / 10;

  // --- Elevation gain trend: last 4 weeks vs prior 4 weeks (only if data is available) ---
  const recentWithElevation = recentRuns.filter((a) => a.elevation_gain_m !== undefined && a.elevation_gain_m !== null);
  const priorWithElevation = priorRuns.filter((a) => a.elevation_gain_m !== undefined && a.elevation_gain_m !== null);

  let elevation_gain_trend: TrainingSummary["elevation_gain_trend"] = "unavailable";
  if (recentWithElevation.length > 0 && priorWithElevation.length > 0) {
    const recentAvg = recentWithElevation.reduce((s, a) => s + (a.elevation_gain_m ?? 0), 0) / recentWithElevation.length;
    const priorAvg = priorWithElevation.reduce((s, a) => s + (a.elevation_gain_m ?? 0), 0) / priorWithElevation.length;
    const pctChange = priorAvg > 0 ? (recentAvg - priorAvg) / priorAvg : 0;
    if (pctChange > 0.1) elevation_gain_trend = "increasing";
    else if (pctChange < -0.1) elevation_gain_trend = "decreasing";
    else elevation_gain_trend = "stable";
  }

  // --- Fastest recent effort relative to distance (proxy for a race/hard effort) ---
  // Score = pace normalized by distance so a fast short run doesn't automatically "win"
  // over a strong longer effort; lower score = more impressive effort.
  let fastest_recent_effort: TrainingSummary["fastest_recent_effort"] = null;
  if (recentRuns.length > 0) {
    const scored = recentRuns.map((a) => ({
      run: a,
      score: a.avg_pace_per_km / Math.sqrt(Math.max(a.distance_km, 0.1)),
    }));
    scored.sort((a, b) => a.score - b.score);
    const best = scored[0].run;
    fastest_recent_effort = {
      distance_km: best.distance_km,
      pace_sec_per_km: best.avg_pace_per_km,
      date: best.date,
    };
  }

  return {
    weekly_distance_km,
    avg_pace_overall_sec_per_km,
    pace_trend,
    longest_run_last_4_weeks_km,
    run_frequency_days_per_week,
    elevation_gain_trend,
    fastest_recent_effort,
  };
}
