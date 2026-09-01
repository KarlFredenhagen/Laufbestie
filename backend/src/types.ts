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

export interface Preferences {
  goal_distance: "5k" | "10k" | "half_marathon" | "marathon" | "general_fitness";
  target_date: string | null;
  days_per_week: number;
  rest_days: string[]; // e.g. ["Sunday"]
  experience_level: "beginner" | "intermediate" | "advanced" | null;
  constraints_notes: string | null;
  long_run_day: string; // e.g. "Saturday"
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
  type: "rest" | "easy_run" | "long_run" | "tempo" | "intervals" | "cross_train";
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
