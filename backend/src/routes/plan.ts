import { Router } from "express";
import { db } from "../db";
import { StoredActivity, Preferences, CalendarEvent, GeneratedPlan } from "../types";
import { buildTrainingSummary } from "../aggregate";
import { generatePlan, adaptPlan } from "../claude";

export const planRouter = Router();

function loadPreferences(): Preferences | null {
  const row = db.prepare("SELECT data FROM preferences WHERE id = 1").get() as { data: string } | undefined;
  return row ? (JSON.parse(row.data) as Preferences) : null;
}

function loadSummary() {
  const activities = db.prepare("SELECT * FROM activities ORDER BY date ASC").all() as unknown as StoredActivity[];
  return buildTrainingSummary(activities);
}

// Only events from today onward are relevant context for a training plan.
function loadUpcomingEvents(): CalendarEvent[] {
  const today = new Date().toISOString().slice(0, 10);
  return db.prepare("SELECT * FROM events WHERE date >= ? ORDER BY date ASC LIMIT 50").all(today) as unknown as CalendarEvent[];
}

// Latest cached plan, if one exists.
planRouter.get("/", (_req, res) => {
  const row = db.prepare("SELECT * FROM plans ORDER BY created_at DESC LIMIT 1").get() as
    | { id: number; plan_json: string; created_at: string }
    | undefined;
  if (!row) return res.json(null);
  res.json({ id: row.id, plan: JSON.parse(row.plan_json), created_at: row.created_at });
});

// Generates a new plan and caches it. Only called when the user explicitly asks —
// existing plans are served from the cache above, never silently regenerated.
planRouter.post("/generate", async (_req, res) => {
  try {
    const preferences = loadPreferences();
    if (!preferences) return res.status(400).json({ error: "Bitte zuerst die Trainingspräferenzen festlegen, bevor ein Plan erstellt wird." });

    const summary = loadSummary();
    const events = loadUpcomingEvents();
    const plan = await generatePlan(summary, preferences, events);

    const info = db
      .prepare("INSERT INTO plans (plan_json, summary_json, preferences_json) VALUES (?, ?, ?)")
      .run(JSON.stringify(plan), JSON.stringify(summary), JSON.stringify(preferences));

    res.json({ id: info.lastInsertRowid, plan, created_at: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Adjusts the existing plan given fresh training data, calendar events, and a free-text note
// about what changed — rather than starting over from the preferences wizard.
planRouter.post("/adapt", async (req, res) => {
  try {
    const row = db.prepare("SELECT plan_json FROM plans ORDER BY created_at DESC LIMIT 1").get() as
      | { plan_json: string }
      | undefined;
    if (!row) return res.status(400).json({ error: "Es gibt noch keinen Plan zum Anpassen." });

    const preferences = loadPreferences();
    if (!preferences) return res.status(400).json({ error: "Es sind keine Trainingspräferenzen gespeichert." });

    const currentPlan = JSON.parse(row.plan_json) as GeneratedPlan;
    const summary = loadSummary();
    const events = loadUpcomingEvents();
    const changeNote = (req.body?.note as string | undefined)?.trim() ?? "";

    const plan = await adaptPlan(currentPlan, summary, preferences, events, changeNote);

    const info = db
      .prepare("INSERT INTO plans (plan_json, summary_json, preferences_json) VALUES (?, ?, ?)")
      .run(JSON.stringify(plan), JSON.stringify(summary), JSON.stringify(preferences));

    res.json({ id: info.lastInsertRowid, plan, created_at: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Clears all saved plans, returning the app to its "no plan yet" state.
planRouter.delete("/", (_req, res) => {
  db.prepare("DELETE FROM plans").run();
  res.json({ ok: true });
});
