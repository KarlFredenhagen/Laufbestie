// Same interface the old fetch-based client exposed — every component keeps calling
// `api.xxx()` exactly as before. Only what happens inside changed: no server, everything
// runs against localStorage (see store.ts) and Gemini is called directly (see gemini.ts).
import { buildTrainingSummary, computePersonalBests, computeRacePredictions, mergeManualBests } from "./aggregate";
import * as gemini from "./gemini";
import { parseUploadedFile } from "./parsers";
import * as store from "./store";
import { CalendarEvent, GeneratedPlan, PersonalBest, Preferences, RacePrediction, RunFeedback, StoredActivity, TrainingSummary, UploadResult } from "./types";

type PlanResponse = { id: number; plan: GeneratedPlan; created_at: string };

function upcomingEvents(events: CalendarEvent[]): CalendarEvent[] {
  const today = new Date().toISOString().slice(0, 10);
  return events.filter((e) => e.date >= today).slice(0, 50);
}

function recentFeedback(feedback: RunFeedback[]): RunFeedback[] {
  const sixWeeksAgo = new Date(Date.now() - 42 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return feedback.filter((f) => f.date >= sixWeeksAgo);
}

export const api = {
  uploadFiles: async (files: FileList | File[]): Promise<UploadResult> => {
    let imported = 0;
    let duplicates = 0;
    let skippedNonRunning = 0;
    const failures: { filename: string; reason: string }[] = [];

    for (const file of Array.from(files)) {
      const outcome = await parseUploadedFile(file);
      if (outcome.error) {
        failures.push({ filename: file.name, reason: outcome.error });
        continue;
      }
      skippedNonRunning += outcome.skippedNonRunning;
      for (const activity of outcome.activities) {
        const { added } = store.addActivity({ ...activity, source_file: file.name });
        if (added) imported++;
        else duplicates++;
      }
    }

    return {
      imported,
      duplicates,
      skippedNonRunning,
      failures,
      summary: `${imported} ${imported === 1 ? "Lauf" : "Läufe"} importiert, ${skippedNonRunning} Nicht-Lauf-${skippedNonRunning === 1 ? "Aktivität" : "Aktivitäten"} übersprungen, ${duplicates} ${duplicates === 1 ? "Duplikat" : "Duplikate"} ignoriert${failures.length ? `, ${failures.length} ${failures.length === 1 ? "Datei konnte" : "Dateien konnten"} nicht verarbeitet werden` : ""}.`,
    };
  },

  getActivities: async (): Promise<StoredActivity[]> => store.getActivities(),

  getSummary: async (): Promise<TrainingSummary> => buildTrainingSummary(store.getActivities()),

  getPreferences: async (): Promise<Preferences | null> => store.getPreferences(),

  savePreferences: async (prefs: Preferences): Promise<void> => {
    store.savePreferences(prefs);
  },

  getPlan: async (): Promise<PlanResponse | null> => store.getPlan(),

  generatePlan: async (): Promise<PlanResponse> => {
    const preferences = store.getPreferences();
    if (!preferences) throw new Error("Bitte zuerst die Trainingspräferenzen festlegen, bevor ein Plan erstellt wird.");

    const summary = buildTrainingSummary(store.getActivities());
    const events = upcomingEvents(store.getEvents());
    const plan = await gemini.generatePlan(summary, preferences, events);
    return store.savePlan(plan);
  },

  adaptPlan: async (note: string): Promise<PlanResponse> => {
    const current = store.getPlan();
    if (!current) throw new Error("Es gibt noch keinen Plan zum Anpassen.");
    const preferences = store.getPreferences();
    if (!preferences) throw new Error("Es sind keine Trainingspräferenzen gespeichert.");

    const summary = buildTrainingSummary(store.getActivities());
    const events = upcomingEvents(store.getEvents());
    const feedback = recentFeedback(store.getFeedback());
    const plan = await gemini.adaptPlan(current.plan, summary, preferences, events, feedback, note);
    return store.savePlan(plan);
  },

  deletePlan: async (): Promise<void> => {
    store.deletePlan();
  },

  askCoach: async (question: string): Promise<{ answer: string }> => {
    const activities = store.getActivities();
    const summary = activities.length > 0 ? buildTrainingSummary(activities) : null;
    const preferences = store.getPreferences();
    const answer = await gemini.answerQuestion(question, summary, preferences);
    return { answer };
  },

  getEvents: async (): Promise<CalendarEvent[]> => store.getEvents(),

  createEvent: async (event: { date: string; title: string; notes?: string }): Promise<CalendarEvent> => store.addEvent(event),

  deleteEvent: async (id: number): Promise<void> => {
    store.deleteEvent(id);
  },

  getBests: async (): Promise<{ personal_bests: PersonalBest[]; predictions: RacePrediction[] }> => {
    const activities = store.getActivities();
    const preferences = store.getPreferences();
    return {
      personal_bests: mergeManualBests(computePersonalBests(activities), preferences?.manual_bests ?? null),
      predictions: computeRacePredictions(activities),
    };
  },

  getFeedback: async (): Promise<RunFeedback[]> => store.getFeedback(),

  saveFeedback: async (date: string, rpe: 1 | 2 | 3, note?: string): Promise<void> => {
    store.saveFeedback(date, rpe, note);
  },
};
