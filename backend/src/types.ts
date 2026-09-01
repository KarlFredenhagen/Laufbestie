// Normalized shape every parser (GPX/TCX/FIT) must produce, regardless of source format.
export interface NormalizedActivity {
  date: string; // ISO date (YYYY-MM-DD)
  distance_km: number;
  duration_seconds: number;
  avg_pace_per_km: number; // seconds/km, always derived from distance+duration
  avg_heartrate?: number;
  elevation_gain_m?: number;
  activity_type: string; // raw sport/type string from the source file
}

export interface ParseResult {
  activities: NormalizedActivity[];
  skippedNonRunning: number;
}

export interface StoredActivity extends NormalizedActivity {
  id: number;
  source_file: string;
  created_at: string;
}

// Self-reported best times, in seconds — collected in the wizard as a fallback pace signal
// for people who haven't uploaded any activities yet (or who ran a race untracked).
export interface ManualBests {
  five_k_seconds: number | null;
  ten_k_seconds: number | null;
  half_marathon_seconds: number | null;
  marathon_seconds: number | null;
}

export interface Preferences {
  goal_distance: "5k" | "10k" | "half_marathon" | "marathon" | "general_fitness";
  target_date: string | null;
  days_per_week: number;
  rest_days: string[]; // e.g. ["Sunday"]
  experience_level: "beginner" | "intermediate" | "advanced" | null;
  constraints_notes: string | null;
  long_run_day: string; // e.g. "Saturday"
  manual_bests: ManualBests | null;
}

export interface TrainingSummary {
  weekly_distance_km: { week_start: string; distance_km: number }[];
  avg_pace_overall_sec_per_km: number;
  pace_trend: "improving" | "stable" | "declining" | "insufficient_data";
  longest_run_last_4_weeks_km: number;
  run_frequency_days_per_week: number;
  elevation_gain_trend: "increasing" | "stable" | "decreasing" | "unavailable";
  fastest_recent_effort: { distance_km: number; pace_sec_per_km: number; date: string } | null;
}

export interface PlanDay {
  day: string;
  type: "rest" | "easy_run" | "long_run" | "tempo" | "intervals" | "cross_train" | "strength";
  distance_km: number;
  target_pace: string;
  notes: string;
}

export interface PlanWeek {
  week_number: number;
  start_date: string;
  days: PlanDay[];
}

export interface GeneratedPlan {
  plan_name: string;
  weeks: PlanWeek[];
  coach_notes: string;
}

export interface CalendarEvent {
  id: number;
  date: string; // ISO date
  title: string;
  notes: string | null;
  created_at: string;
}

// Best known time near a standard race distance, approximated from uploaded activities
// (there's no GPS-split data to interpolate an exact-distance time from).
export interface PersonalBest {
  distance_label: "5k" | "10k" | "half_marathon" | "marathon";
  target_km: number;
  best_time_seconds: number;
  activity_distance_km: number | null;
  date: string | null;
  source: "activity" | "manual";
}

// Projected finish time for a standard distance, extrapolated from a recent strong effort
// using Riegel's race-time-prediction formula (T2 = T1 * (D2/D1)^1.06).
export interface RacePrediction {
  distance_label: "5k" | "10k" | "half_marathon" | "marathon";
  target_km: number;
  predicted_seconds: number;
}

export interface RunFeedback {
  date: string; // ISO date
  rpe: 1 | 2 | 3; // simple 3-point scale: hart/schwer, okay, super
  note: string | null;
}
