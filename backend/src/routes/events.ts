import { Router } from "express";
import { db } from "../db";
import { CalendarEvent } from "../types";

export const eventsRouter = Router();

eventsRouter.get("/", (_req, res) => {
  const events = db.prepare("SELECT * FROM events ORDER BY date ASC").all() as unknown as CalendarEvent[];
  res.json(events);
});

eventsRouter.post("/", (req, res) => {
  const { date, title, notes } = req.body as { date?: string; title?: string; notes?: string };
  if (!date || !title) {
    return res.status(400).json({ error: "Datum und Titel sind erforderlich." });
  }

  const info = db
    .prepare("INSERT INTO events (date, title, notes) VALUES (?, ?, ?)")
    .run(date, title, notes ?? null);

  const created = db.prepare("SELECT * FROM events WHERE id = ?").get(info.lastInsertRowid) as unknown as CalendarEvent;
  res.status(201).json(created);
});

eventsRouter.delete("/:id", (req, res) => {
  const result = db.prepare("DELETE FROM events WHERE id = ?").run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: "Termin nicht gefunden." });
  res.json({ ok: true });
});
