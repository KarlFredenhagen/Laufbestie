// Everything the old Express+SQLite backend used to hold now lives in this browser's
// localStorage instead — there's no server, so there's nothing to sync between devices.
// Mirrors the shape of the old API responses closely so the rest of the app barely notices.
import { CalendarEvent, GeneratedPlan, Preferences, RunFeedback, StoredActivity } from "./types";

const KEYS = {
  activities: "lb_activities",
  preferences: "lb_preferences",
  plan: "lb_plan",
  events: "lb_events",
  feedback: "lb_feedback",
  geminiKey: "lb_gemini_key",
  geminiModel: "lb_gemini_model",
  geminiModelPinned: "lb_gemini_model_pinned",
} as const;

function jget<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function jset(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    throw new Error("Speicher voll oder nicht verfügbar — der Browser konnte die Daten nicht speichern.");
  }
}

function nextId(items: { id: number }[]): number {
  return items.length > 0 ? Math.max(...items.map((i) => i.id)) + 1 : 1;
}

export interface StoredPlan {
  id: number;
  plan: GeneratedPlan;
  created_at: string;
}

// --- Activities ---

export function getActivities(): StoredActivity[] {
  return jget<StoredActivity[]>(KEYS.activities, []).sort((a, b) => b.date.localeCompare(a.date));
}

// Round distance/duration so near-identical float exports of the same run collide on the same key.
function dedupeKey(date: string, distance_km: number, duration_seconds: number): string {
  return `${date}|${distance_km.toFixed(2)}|${Math.round(duration_seconds)}`;
}

export function addActivity(activity: Omit<StoredActivity, "id" | "created_at">): { added: boolean } {
  const activities = jget<StoredActivity[]>(KEYS.activities, []);
  const key = dedupeKey(activity.date, activity.distance_km, activity.duration_seconds);
  if (activities.some((a) => dedupeKey(a.date, a.distance_km, a.duration_seconds) === key)) {
    return { added: false };
  }
  activities.push({ ...activity, id: nextId(activities), created_at: new Date().toISOString() });
  jset(KEYS.activities, activities);
  return { added: true };
}

export function deleteActivity(id: number): boolean {
  const activities = jget<StoredActivity[]>(KEYS.activities, []);
  const filtered = activities.filter((a) => a.id !== id);
  if (filtered.length === activities.length) return false;
  jset(KEYS.activities, filtered);
  return true;
}

// --- Preferences ---

export function getPreferences(): Preferences | null {
  return jget<Preferences | null>(KEYS.preferences, null);
}

export function savePreferences(prefs: Preferences): void {
  jset(KEYS.preferences, prefs);
}

// --- Plan (just the latest, like before) ---

export function getPlan(): StoredPlan | null {
  return jget<StoredPlan | null>(KEYS.plan, null);
}

export function savePlan(plan: GeneratedPlan): StoredPlan {
  const stored: StoredPlan = { id: Date.now(), plan, created_at: new Date().toISOString() };
  jset(KEYS.plan, stored);
  return stored;
}

export function deletePlan(): void {
  localStorage.removeItem(KEYS.plan);
}

// --- Calendar events ---

export function getEvents(): CalendarEvent[] {
  return jget<CalendarEvent[]>(KEYS.events, []).sort((a, b) => a.date.localeCompare(b.date));
}

export function addEvent(event: { date: string; title: string; notes?: string }): CalendarEvent {
  const events = jget<CalendarEvent[]>(KEYS.events, []);
  const created: CalendarEvent = {
    id: nextId(events),
    date: event.date,
    title: event.title,
    notes: event.notes ?? null,
    created_at: new Date().toISOString(),
  };
  events.push(created);
  jset(KEYS.events, events);
  return created;
}

export function deleteEvent(id: number): boolean {
  const events = jget<CalendarEvent[]>(KEYS.events, []);
  const filtered = events.filter((e) => e.id !== id);
  if (filtered.length === events.length) return false;
  jset(KEYS.events, filtered);
  return true;
}

// --- Run feedback (RPE check-ins), one per date ---

export function getFeedback(): RunFeedback[] {
  return jget<RunFeedback[]>(KEYS.feedback, []).sort((a, b) => b.date.localeCompare(a.date));
}

export function saveFeedback(date: string, rpe: 1 | 2 | 3, note?: string): void {
  const feedback = jget<RunFeedback[]>(KEYS.feedback, []);
  const idx = feedback.findIndex((f) => f.date === date);
  const entry: RunFeedback = { date, rpe, note: note ?? null };
  if (idx >= 0) feedback[idx] = entry;
  else feedback.push(entry);
  jset(KEYS.feedback, feedback);
}

// --- Gemini API key / model (per-browser, never sent anywhere but Google's API) ---

export function getGeminiKey(): string {
  return localStorage.getItem(KEYS.geminiKey) ?? "";
}

export function setGeminiKey(key: string): void {
  localStorage.setItem(KEYS.geminiKey, key.trim());
}

export function getGeminiModel(defaultModel: string): string {
  return localStorage.getItem(KEYS.geminiModel) ?? defaultModel;
}

export function setGeminiModel(model: string, pinned: boolean): void {
  localStorage.setItem(KEYS.geminiModel, model);
  localStorage.setItem(KEYS.geminiModelPinned, pinned ? "1" : "0");
}

export function isGeminiModelPinned(): boolean {
  return localStorage.getItem(KEYS.geminiModelPinned) === "1";
}
