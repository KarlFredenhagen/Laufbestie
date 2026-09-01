import {
  CalendarEvent,
  GeneratedPlan,
  PersonalBest,
  Preferences,
  RacePrediction,
  RunFeedback,
  StoredActivity,
  TrainingSummary,
  UploadResult,
} from "./types";

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed with status ${res.status}`);
  }
  return res.json();
}

type PlanResponse = { id: number; plan: GeneratedPlan; created_at: string };

export const api = {
  login: async (email: string, password: string): Promise<void> => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    await json(res);
  },

  logout: async (): Promise<void> => {
    const res = await fetch("/api/auth/logout", { method: "POST" });
    await json(res);
  },

  me: async (): Promise<{ email: string } | null> => {
    const res = await fetch("/api/auth/me");
    if (res.status === 401) return null;
    return json(res);
  },

  uploadFiles: async (files: FileList | File[]): Promise<UploadResult> => {
    const formData = new FormData();
    Array.from(files).forEach((f) => formData.append("files", f));
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    return json(res);
  },

  getActivities: async (): Promise<StoredActivity[]> => {
    const res = await fetch("/api/activities");
    return json(res);
  },

  getSummary: async (): Promise<TrainingSummary> => {
    const res = await fetch("/api/activities/summary");
    return json(res);
  },

  getPreferences: async (): Promise<Preferences | null> => {
    const res = await fetch("/api/preferences");
    return json(res);
  },

  savePreferences: async (prefs: Preferences): Promise<void> => {
    const res = await fetch("/api/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(prefs),
    });
    await json(res);
  },

  getPlan: async (): Promise<PlanResponse | null> => {
    const res = await fetch("/api/plan");
    return json(res);
  },

  generatePlan: async (): Promise<PlanResponse> => {
    const res = await fetch("/api/plan/generate", { method: "POST" });
    return json(res);
  },

  adaptPlan: async (note: string): Promise<PlanResponse> => {
    const res = await fetch("/api/plan/adapt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    });
    return json(res);
  },

  deletePlan: async (): Promise<void> => {
    const res = await fetch("/api/plan", { method: "DELETE" });
    await json(res);
  },

  askCoach: async (question: string): Promise<{ answer: string }> => {
    const res = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    return json(res);
  },

  getEvents: async (): Promise<CalendarEvent[]> => {
    const res = await fetch("/api/events");
    return json(res);
  },

  createEvent: async (event: { date: string; title: string; notes?: string }): Promise<CalendarEvent> => {
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    });
    return json(res);
  },

  deleteEvent: async (id: number): Promise<void> => {
    const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
    await json(res);
  },

  getBests: async (): Promise<{ personal_bests: PersonalBest[]; predictions: RacePrediction[] }> => {
    const res = await fetch("/api/activities/bests");
    return json(res);
  },

  getFeedback: async (): Promise<RunFeedback[]> => {
    const res = await fetch("/api/feedback");
    return json(res);
  },

  saveFeedback: async (date: string, rpe: 1 | 2 | 3, note?: string): Promise<void> => {
    const res = await fetch("/api/feedback", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, rpe, note }),
    });
    await json(res);
  },
};
