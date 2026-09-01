import { Router } from "express";
import { db } from "../db";
import { RunFeedback } from "../types";

export const feedbackRouter = Router();

feedbackRouter.get("/", (req, res) => {
  const rows = db
    .prepare("SELECT date, rpe, note FROM run_feedback WHERE user_id = ? ORDER BY date DESC")
    .all(req.userId!) as unknown as RunFeedback[];
  res.json(rows);
});

// One check-in per date — logging again for the same day overwrites it.
feedbackRouter.put("/", (req, res) => {
  const { date, rpe, note } = req.body as { date?: string; rpe?: number; note?: string };
  if (!date || ![1, 2, 3].includes(rpe as number)) {
    return res.status(400).json({ error: "Datum und eine Bewertung (1-3) sind erforderlich." });
  }

  db.prepare(
    `INSERT INTO run_feedback (user_id, date, rpe, note) VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id, date) DO UPDATE SET rpe = excluded.rpe, note = excluded.note`
  ).run(req.userId!, date, rpe!, note ?? null);

  res.json({ ok: true });
});
