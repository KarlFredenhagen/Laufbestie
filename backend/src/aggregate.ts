import { StoredActivity, TrainingSummary, PersonalBest, RacePrediction, ManualBests } from "./types";

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

const RACE_DISTANCES: { label: PersonalBest["distance_label"]; km: number }[] = [
  { label: "5k", km: 5 },
  { label: "10k", km: 10 },
  { label: "half_marathon", km: 21.0975 },
  { label: "marathon", km: 42.195 },
];

// A run only counts toward a distance's PB if it's close enough to that distance — otherwise
// e.g. a 30km long run would "win" the 10K best time simply by being run faster overall than
// any actual 10K, which isn't a meaningful comparison.
const PB_TOLERANCE = 0.05; // ±5%

// "Best known time near this distance" rather than a true PB — we only have whole-activity
// distance/duration, not GPS splits, so we can't interpolate an exact-distance time.
export function computePersonalBests(activities: StoredActivity[]): PersonalBest[] {
  const bests: PersonalBest[] = [];

  for (const { label, km } of RACE_DISTANCES) {
    const candidates = activities.filter((a) => Math.abs(a.distance_km - km) / km <= PB_TOLERANCE);
    if (candidates.length === 0) continue;

    const best = candidates.reduce((fastest, a) => (a.duration_seconds < fastest.duration_seconds ? a : fastest));
    bests.push({
      distance_label: label,
      target_km: km,
      best_time_seconds: Math.round(best.duration_seconds),
      activity_distance_km: best.distance_km,
      date: best.date,
      source: "activity",
    });
  }

  return bests;
}

const MANUAL_BEST_FIELD: Record<PersonalBest["distance_label"], keyof ManualBests> = {
  "5k": "five_k_seconds",
  "10k": "ten_k_seconds",
  half_marathon: "half_marathon_seconds",
  marathon: "marathon_seconds",
};

// Merges self-reported best times (from the wizard) with ones derived from uploaded
// activities. A manual entry is taken at face value — it's the person telling us a fact,
// possibly from an untracked race — so it wins over a same-distance activity-derived time.
export function mergeManualBests(computed: PersonalBest[], manual: ManualBests | null): PersonalBest[] {
  if (!manual) return computed;

  const byDistance = new Map(computed.map((b) => [b.distance_label, b]));

  for (const { label, km } of RACE_DISTANCES) {
    const seconds = manual[MANUAL_BEST_FIELD[label]];
    if (seconds === null || seconds === undefined) continue;
    byDistance.set(label, {
      distance_label: label,
      target_km: km,
      best_time_seconds: seconds,
      activity_distance_km: null,
      date: null,
      source: "manual",
    });
  }

  return RACE_DISTANCES.map(({ label }) => byDistance.get(label)).filter((b): b is PersonalBest => b !== undefined);
}

// Riegel's race-time-prediction formula: T2 = T1 * (D2/D1)^1.06. A well-established, publicly
// documented model (Pete Riegel, 1977) for extrapolating a finish time at one distance from a
// real effort at another, assuming similar training/conditions.
function riegelPredict(knownSeconds: number, knownKm: number, targetKm: number): number {
  return knownSeconds * Math.pow(targetKm / knownKm, 1.06);
}

// Predicts standard race times from the single best recent effort (last 90 days), so the
// prediction reflects current fitness rather than a lifetime-best that may be stale.
export function computeRacePredictions(activities: StoredActivity[]): RacePrediction[] {
  const ninetyDaysAgo = new Date(Date.now() - 90 * MS_PER_DAY);
  const recent = activities.filter((a) => new Date(a.date) >= ninetyDaysAgo && a.distance_km >= 1.5);
  if (recent.length === 0) return [];

  // Same distance-normalized scoring as fastest_recent_effort: favors a genuinely strong
  // effort over a merely fast-but-short run.
  const best = recent.reduce((fastest, a) => {
    const scoreA = a.avg_pace_per_km / Math.sqrt(a.distance_km);
    const scoreFastest = fastest.avg_pace_per_km / Math.sqrt(fastest.distance_km);
    return scoreA < scoreFastest ? a : fastest;
  });

  return RACE_DISTANCES.map(({ label, km }) => ({
    distance_label: label,
    target_km: km,
    predicted_seconds: Math.round(riegelPredict(best.duration_seconds, best.distance_km, km)),
  }));
}
