import { Router } from "express";
import { db } from "../db";
import { StoredActivity, Preferences } from "../types";
import { buildTrainingSummary } from "../aggregate";
import { answerQuestion } from "../claude";

export const askRouter = Router();

// Plain running-coach Q&A — no upload or preferences required. Existing data is used
// opportunistically as context when present, but the endpoint works from a clean database too.
askRouter.post("/", async (req, res) => {
  const question = (req.body?.question as string | undefined)?.trim();
  if (!question) {
    return res.status(400).json({ error: "Frage darf nicht leer sein." });
  }

  try {
    const activities = db
      .prepare("SELECT * FROM activities WHERE user_id = ? ORDER BY date ASC")
      .all(req.userId!) as unknown as StoredActivity[];
    const summary = activities.length > 0 ? buildTrainingSummary(activities) : null;

    const prefsRow = db.prepare("SELECT data FROM preferences WHERE user_id = ?").get(req.userId!) as
      | { data: string }
      | undefined;
    const preferences = prefsRow ? (JSON.parse(prefsRow.data) as Preferences) : null;

    const answer = await answerQuestion(question, summary, preferences);
    res.json({ answer });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});
