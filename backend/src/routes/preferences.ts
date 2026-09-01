import { Router } from "express";
import { db } from "../db";
import { Preferences } from "../types";

export const preferencesRouter = Router();

preferencesRouter.get("/", (_req, res) => {
  const row = db.prepare("SELECT data FROM preferences WHERE id = 1").get() as { data: string } | undefined;
  res.json(row ? JSON.parse(row.data) : null);
});

preferencesRouter.put("/", (req, res) => {
  const prefs = req.body as Preferences;

  if (!prefs.goal_distance || !prefs.days_per_week || !prefs.long_run_day) {
    return res.status(400).json({ error: "Ziel, Tage pro Woche und Langlauftag sind erforderlich." });
  }

  db.prepare(
    `INSERT INTO preferences (id, data, updated_at) VALUES (1, ?, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = datetime('now')`
  ).run(JSON.stringify(prefs));

  res.json({ ok: true });
});
