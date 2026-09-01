export interface StoredActivity {
  id: number;
  date: string;
  distance_km: number;
  duration_seconds: number;
  avg_pace_per_km: number;
  avg_heartrate?: number | null;
  elevation_gain_m?: number | null;
  activity_type: string;
  source_file: string;
  created_at: string;
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

export type GoalDistance = "5k" | "10k" | "half_marathon" | "marathon" | "general_fitness";
export type ExperienceLevel = "beginner" | "intermediate" | "advanced";

export interface Preferences {
  goal_distance: GoalDistance;
  target_date: string | null;
  days_per_week: number;
  rest_days: string[];
  experience_level: ExperienceLevel | null;
  constraints_notes: string | null;
  long_run_day: string;
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

export interface UploadResult {
  imported: number;
  duplicates: number;
  skippedNonRunning: number;
  failures: { filename: string; reason: string }[];
  summary: string;
}
