import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { CalendarEvent } from "../types";

const WEEKDAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const MONTH_LABELS = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

// Builds a Monday-first 6-week grid covering the given month, including the trailing/leading
// days from adjacent months needed to fill complete weeks.
function buildMonthGrid(monthStart: Date): Date[] {
  const firstWeekday = (monthStart.getDay() + 6) % 7; // 0 = Monday
  const gridStart = new Date(monthStart);
  gridStart.setDate(gridStart.getDate() - firstWeekday);

  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    days.push(d);
  }
  return days;
}

export default function CalendarView() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [monthStart, setMonthStart] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => isoDate(new Date()));
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const loadEvents = () => {
    api
      .getEvents()
      .then(setEvents)
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  };

  useEffect(loadEvents, []);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date)!.push(e);
    }
    return map;
  }, [events]);

  const grid = useMemo(() => buildMonthGrid(monthStart), [monthStart]);
  const todayIso = isoDate(new Date());
  const selectedEvents = eventsByDate.get(selectedDate) ?? [];

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const created = await api.createEvent({ date: selectedDate, title: title.trim(), notes: notes.trim() || undefined });
      setEvents((prev) => [...prev, created]);
      setTitle("");
      setNotes("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setError(null);
    try {
      await api.deleteEvent(id);
      setEvents((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (loading) return <div className="page">Lädt...</div>;

  return (
    <div className="page">
      <h2>Kalender</h2>
      <p className="muted">
        Trage Termine ein, die dein Training beeinflussen könnten (Reisen, Rennen, Verpflichtungen) —
        dein Coach berücksichtigt sie beim Erstellen und Anpassen deines Plans.
      </p>

      {error && <div className="banner error">{error}</div>}

      <div className="calendar-card">
        <div className="calendar-nav">
          <button
            type="button"
            className="ghost-button"
            onClick={() => setMonthStart((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
          >
            ‹
          </button>
          <strong>
            {MONTH_LABELS[monthStart.getMonth()]} {monthStart.getFullYear()}
          </strong>
          <button
            type="button"
            className="ghost-button"
            onClick={() => setMonthStart((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
          >
            ›
          </button>
        </div>

        <div className="calendar-weekdays">
          {WEEKDAY_LABELS.map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>

        <div className="calendar-grid">
          {grid.map((d) => {
            const iso = isoDate(d);
            const inMonth = d.getMonth() === monthStart.getMonth();
            const dayEvents = eventsByDate.get(iso) ?? [];
            return (
              <button
                key={iso}
                type="button"
                className={[
                  "calendar-day",
                  !inMonth ? "outside" : "",
                  iso === todayIso ? "today" : "",
                  iso === selectedDate ? "selected" : "",
                ].join(" ")}
                onClick={() => setSelectedDate(iso)}
              >
                <span>{d.getDate()}</span>
                {dayEvents.length > 0 && <span className="calendar-dot" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="calendar-detail">
        <h3>
          {new Date(selectedDate + "T00:00:00").toLocaleDateString("de-DE", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </h3>

        {selectedEvents.length > 0 && (
          <ul className="event-list">
            {selectedEvents.map((e) => (
              <li key={e.id}>
                <div>
                  <strong>{e.title}</strong>
                  {e.notes && <p className="muted small">{e.notes}</p>}
                </div>
                <button type="button" className="ghost-button small" onClick={() => handleDelete(e.id)}>
                  Löschen
                </button>
              </li>
            ))}
          </ul>
        )}

        <form className="form" style={{ maxWidth: "100%" }} onSubmit={handleAdd}>
          <label>
            Titel
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z. B. Halbmarathon, Dienstreise, Zahnarzttermin"
            />
          </label>
          <label>
            Notiz (optional)
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="z. B. ganztägig, keine Zeit zum Laufen" />
          </label>
          <button type="submit" disabled={saving || !title.trim()}>
            {saving ? "Wird gespeichert..." : "Termin hinzufügen"}
          </button>
        </form>
      </div>
    </div>
  );
}
