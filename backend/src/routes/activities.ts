import { Router } from "express";
import { db } from "../db";
import { StoredActivity } from "../types";
import { buildTrainingSummary } from "../aggregate";

export const activitiesRouter = Router();

activitiesRouter.get("/", (_req, res) => {
  const activities = db.prepare("SELECT * FROM activities ORDER BY date DESC").all() as unknown as StoredActivity[];
  res.json(activities);
});

activitiesRouter.get("/summary", (_req, res) => {
  const activities = db.prepare("SELECT * FROM activities ORDER BY date ASC").all() as unknown as StoredActivity[];
  res.json(buildTrainingSummary(activities));
});

activitiesRouter.delete("/:id", (req, res) => {
  const result = db.prepare("DELETE FROM activities WHERE id = ?").run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: "Activity not found" });
  res.json({ ok: true });
});
