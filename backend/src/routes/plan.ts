import { Router } from "express";
import { db } from "../db";
import { StoredActivity, Preferences } from "../types";
import { buildTrainingSummary } from "../aggregate";
import { generatePlan } from "../claude";

export const planRouter = Router();

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
    const prefsRow = db.prepare("SELECT data FROM preferences WHERE id = 1").get() as { data: string } | undefined;
    if (!prefsRow) return res.status(400).json({ error: "Bitte zuerst die Trainingspräferenzen festlegen, bevor ein Plan erstellt wird." });
    const preferences = JSON.parse(prefsRow.data) as Preferences;

    const activities = db.prepare("SELECT * FROM activities ORDER BY date ASC").all() as unknown as StoredActivity[];
    const summary = buildTrainingSummary(activities);

    const plan = await generatePlan(summary, preferences);

    const info = db
      .prepare("INSERT INTO plans (plan_json, summary_json, preferences_json) VALUES (?, ?, ?)")
      .run(JSON.stringify(plan), JSON.stringify(summary), JSON.stringify(preferences));

    res.json({ id: info.lastInsertRowid, plan, created_at: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});
