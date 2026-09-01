import { Router } from "express";
import { db } from "../db";
import { StoredActivity, Preferences } from "../types";
import { buildTrainingSummary, computePersonalBests, computeRacePredictions, mergeManualBests } from "../aggregate";

export const activitiesRouter = Router();

activitiesRouter.get("/", (req, res) => {
  const activities = db
    .prepare("SELECT * FROM activities WHERE user_id = ? ORDER BY date DESC")
    .all(req.userId!) as unknown as StoredActivity[];
  res.json(activities);
});

activitiesRouter.get("/summary", (req, res) => {
  const activities = db
    .prepare("SELECT * FROM activities WHERE user_id = ? ORDER BY date ASC")
    .all(req.userId!) as unknown as StoredActivity[];
  res.json(buildTrainingSummary(activities));
});

activitiesRouter.get("/bests", (req, res) => {
  const activities = db
    .prepare("SELECT * FROM activities WHERE user_id = ? ORDER BY date ASC")
    .all(req.userId!) as unknown as StoredActivity[];

  const prefsRow = db.prepare("SELECT data FROM preferences WHERE user_id = ?").get(req.userId!) as
    | { data: string }
    | undefined;
  const preferences = prefsRow ? (JSON.parse(prefsRow.data) as Preferences) : null;

  res.json({
    personal_bests: mergeManualBests(computePersonalBests(activities), preferences?.manual_bests ?? null),
    predictions: computeRacePredictions(activities),
  });
});

activitiesRouter.delete("/:id", (req, res) => {
  const result = db.prepare("DELETE FROM activities WHERE id = ? AND user_id = ?").run(req.params.id, req.userId!);
  if (result.changes === 0) return res.status(404).json({ error: "Activity not found" });
  res.json({ ok: true });
});
