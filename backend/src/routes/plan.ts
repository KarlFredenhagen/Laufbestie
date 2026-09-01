import { Router } from "express";
import { db } from "../db";
import { StoredActivity, Preferences, CalendarEvent, GeneratedPlan, RunFeedback } from "../types";
import { buildTrainingSummary } from "../aggregate";
import { generatePlan, adaptPlan } from "../claude";

export const planRouter = Router();

function loadPreferences(userId: number): Preferences | null {
  const row = db.prepare("SELECT data FROM preferences WHERE user_id = ?").get(userId) as { data: string } | undefined;
  return row ? (JSON.parse(row.data) as Preferences) : null;
}

function loadSummary(userId: number) {
  const activities = db
    .prepare("SELECT * FROM activities WHERE user_id = ? ORDER BY date ASC")
    .all(userId) as unknown as StoredActivity[];
  return buildTrainingSummary(activities);
}

// Only events from today onward are relevant context for a training plan.
function loadUpcomingEvents(userId: number): CalendarEvent[] {
  const today = new Date().toISOString().slice(0, 10);
  return db
    .prepare("SELECT * FROM events WHERE user_id = ? AND date >= ? ORDER BY date ASC LIMIT 50")
    .all(userId, today) as unknown as CalendarEvent[];
}

// Only the last 6 weeks of check-ins are relevant for deciding whether to ease off.
function loadRecentFeedback(userId: number): RunFeedback[] {
  const sixWeeksAgo = new Date(Date.now() - 42 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return db
    .prepare("SELECT date, rpe, note FROM run_feedback WHERE user_id = ? AND date >= ? ORDER BY date DESC")
    .all(userId, sixWeeksAgo) as unknown as RunFeedback[];
}

// Latest cached plan, if one exists.
planRouter.get("/", (req, res) => {
  const row = db.prepare("SELECT * FROM plans WHERE user_id = ? ORDER BY created_at DESC LIMIT 1").get(req.userId!) as
    | { id: number; plan_json: string; created_at: string }
    | undefined;
  if (!row) return res.json(null);
  res.json({ id: row.id, plan: JSON.parse(row.plan_json), created_at: row.created_at });
});

// Generates a new plan and caches it. Only called when the user explicitly asks —
// existing plans are served from the cache above, never silently regenerated.
planRouter.post("/generate", async (req, res) => {
  try {
    const userId = req.userId!;
    const preferences = loadPreferences(userId);
    if (!preferences) return res.status(400).json({ error: "Bitte zuerst die Trainingspräferenzen festlegen, bevor ein Plan erstellt wird." });

    const summary = loadSummary(userId);
    const events = loadUpcomingEvents(userId);
    const plan = await generatePlan(summary, preferences, events);

    const info = db
      .prepare("INSERT INTO plans (user_id, plan_json, summary_json, preferences_json) VALUES (?, ?, ?, ?)")
      .run(userId, JSON.stringify(plan), JSON.stringify(summary), JSON.stringify(preferences));

    res.json({ id: info.lastInsertRowid, plan, created_at: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Adjusts the existing plan given fresh training data, calendar events, and a free-text note
// about what changed — rather than starting over from the preferences wizard.
planRouter.post("/adapt", async (req, res) => {
  try {
    const userId = req.userId!;
    const row = db.prepare("SELECT plan_json FROM plans WHERE user_id = ? ORDER BY created_at DESC LIMIT 1").get(userId) as
      | { plan_json: string }
      | undefined;
    if (!row) return res.status(400).json({ error: "Es gibt noch keinen Plan zum Anpassen." });

    const preferences = loadPreferences(userId);
    if (!preferences) return res.status(400).json({ error: "Es sind keine Trainingspräferenzen gespeichert." });

    const currentPlan = JSON.parse(row.plan_json) as GeneratedPlan;
    const summary = loadSummary(userId);
    const events = loadUpcomingEvents(userId);
    const feedback = loadRecentFeedback(userId);
    const changeNote = (req.body?.note as string | undefined)?.trim() ?? "";

    const plan = await adaptPlan(currentPlan, summary, preferences, events, feedback, changeNote);

    const info = db
      .prepare("INSERT INTO plans (user_id, plan_json, summary_json, preferences_json) VALUES (?, ?, ?, ?)")
      .run(userId, JSON.stringify(plan), JSON.stringify(summary), JSON.stringify(preferences));

    res.json({ id: info.lastInsertRowid, plan, created_at: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Clears this user's saved plans, returning the app to its "no plan yet" state.
planRouter.delete("/", (req, res) => {
  db.prepare("DELETE FROM plans WHERE user_id = ?").run(req.userId!);
  res.json({ ok: true });
});
