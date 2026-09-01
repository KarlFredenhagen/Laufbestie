import { useState } from "react";
import { ExperienceLevel, GoalDistance, ManualBests, Preferences } from "../types";
import { formatDuration, parseTimeToSeconds } from "../timeFormat";

const DAYS = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
const DAY_SHORT: Record<string, string> = {
  Montag: "Mo",
  Dienstag: "Di",
  Mittwoch: "Mi",
  Donnerstag: "Do",
  Freitag: "Fr",
  Samstag: "Sa",
  Sonntag: "So",
};

const GOALS: { value: GoalDistance; label: string; icon: string }[] = [
  { value: "5k", label: "5 km", icon: "🏁" },
  { value: "10k", label: "10 km", icon: "🎯" },
  { value: "half_marathon", label: "Halbmarathon", icon: "⚡" },
  { value: "marathon", label: "Marathon", icon: "🏆" },
  { value: "general_fitness", label: "Allgemeine Fitness", icon: "💪" },
];

const LEVELS: { value: ExperienceLevel | ""; label: string; icon: string }[] = [
  { value: "", label: "Keine Angabe", icon: "🤷" },
  { value: "beginner", label: "Anfänger", icon: "🌱" },
  { value: "intermediate", label: "Fortgeschritten", icon: "🔥" },
  { value: "advanced", label: "Erfahren", icon: "🚀" },
];

const BEST_FIELDS: { key: keyof ManualBests; label: string }[] = [
  { key: "five_k_seconds", label: "5 km" },
  { key: "ten_k_seconds", label: "10 km" },
  { key: "half_marathon_seconds", label: "Halbmarathon" },
  { key: "marathon_seconds", label: "Marathon" },
];

const EMPTY_BESTS: ManualBests = {
  five_k_seconds: null,
  ten_k_seconds: null,
  half_marathon_seconds: null,
  marathon_seconds: null,
};

const DEFAULT_PREFS: Preferences = {
  goal_distance: "10k",
  target_date: null,
  days_per_week: 4,
  rest_days: [],
  experience_level: null,
  constraints_notes: "",
  long_run_day: "Samstag",
  manual_bests: null,
};

interface Props {
  initial: Preferences | null;
  onCancel: () => void;
  onComplete: (prefs: Preferences) => void;
}

const STEP_TITLES = [
  "Was ist dein Ziel?",
  "Hast du ein Zieldatum?",
  "Wie viele Tage pro Woche?",
  "Brauchst du feste Ruhetage?",
  "Wann läufst du am liebsten lang?",
  "Wie erfahren bist du?",
  "Kennst du deine Bestzeiten?",
  "Verletzungen oder Einschränkungen?",
  "Alles bereit?",
];

function initialBestInputs(bests: ManualBests | null | undefined): Record<keyof ManualBests, string> {
  const b = bests ?? EMPTY_BESTS;
  return {
    five_k_seconds: b.five_k_seconds != null ? formatDuration(b.five_k_seconds) : "",
    ten_k_seconds: b.ten_k_seconds != null ? formatDuration(b.ten_k_seconds) : "",
    half_marathon_seconds: b.half_marathon_seconds != null ? formatDuration(b.half_marathon_seconds) : "",
    marathon_seconds: b.marathon_seconds != null ? formatDuration(b.marathon_seconds) : "",
  };
}

export default function PlanWizard({ initial, onCancel, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [prefs, setPrefs] = useState<Preferences>(initial ?? DEFAULT_PREFS);
  const [noDate, setNoDate] = useState(!initial?.target_date);
  const [bestInputs, setBestInputs] = useState<Record<keyof ManualBests, string>>(() =>
    initialBestInputs(initial?.manual_bests)
  );

  const lastStep = STEP_TITLES.length - 1;

  const update = <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    setPrefs((p) => ({ ...p, [key]: value }));
  };

  const toggleRestDay = (day: string) => {
    setPrefs((p) => ({
      ...p,
      rest_days: p.rest_days.includes(day) ? p.rest_days.filter((d) => d !== day) : [...p.rest_days, day],
    }));
  };

  const updateBestInput = (key: keyof ManualBests, raw: string) => {
    setBestInputs((prev) => ({ ...prev, [key]: raw }));
    const seconds = parseTimeToSeconds(raw);
    setPrefs((p) => ({
      ...p,
      manual_bests: { ...(p.manual_bests ?? EMPTY_BESTS), [key]: seconds },
    }));
  };

  const next = () => setStep((s) => Math.min(s + 1, lastStep));
  const back = () => (step === 0 ? onCancel() : setStep((s) => s - 1));

  return (
    <div className="wizard">
      <div className="wizard-progress">
        {STEP_TITLES.map((_, i) => (
          <div key={i} className={`wizard-dot ${i === step ? "current" : ""} ${i < step ? "done" : ""}`} />
        ))}
      </div>

      <div className="wizard-card" key={step}>
        <h3 className="wizard-title">{STEP_TITLES[step]}</h3>

        {step === 0 && (
          <div className="choice-grid">
            {GOALS.map((g) => (
              <button
                key={g.value}
                type="button"
                className={`choice-card ${prefs.goal_distance === g.value ? "selected" : ""}`}
                onClick={() => {
                  update("goal_distance", g.value);
                  next();
                }}
              >
                <span className="choice-icon">{g.icon}</span>
                {g.label}
              </button>
            ))}
          </div>
        )}

        {step === 1 && (
          <div className="wizard-field">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={noDate}
                onChange={(e) => {
                  setNoDate(e.target.checked);
                  if (e.target.checked) update("target_date", null);
                }}
              />
              Kein festes Datum
            </label>
            {!noDate && (
              <input
                type="date"
                value={prefs.target_date ?? ""}
                onChange={(e) => update("target_date", e.target.value || null)}
              />
            )}
          </div>
        )}

        {step === 2 && (
          <div className="stepper-row">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <button
                key={n}
                type="button"
                className={`stepper-btn ${prefs.days_per_week === n ? "selected" : ""}`}
                onClick={() => update("days_per_week", n)}
              >
                {n}
              </button>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="chip-row">
            {DAYS.map((day) => (
              <button
                key={day}
                type="button"
                className={`chip-toggle ${prefs.rest_days.includes(day) ? "selected" : ""}`}
                onClick={() => toggleRestDay(day)}
              >
                {DAY_SHORT[day]}
              </button>
            ))}
          </div>
        )}

        {step === 4 && (
          <div className="chip-row">
            {DAYS.map((day) => (
              <button
                key={day}
                type="button"
                className={`chip-toggle ${prefs.long_run_day === day ? "selected" : ""}`}
                onClick={() => {
                  update("long_run_day", day);
                  next();
                }}
              >
                {day}
              </button>
            ))}
          </div>
        )}

        {step === 5 && (
          <div className="choice-grid">
            {LEVELS.map((l) => (
              <button
                key={l.value || "none"}
                type="button"
                className={`choice-card ${(prefs.experience_level ?? "") === l.value ? "selected" : ""}`}
                onClick={() => {
                  update("experience_level", (l.value || null) as ExperienceLevel | null);
                  next();
                }}
              >
                <span className="choice-icon">{l.icon}</span>
                {l.label}
              </button>
            ))}
          </div>
        )}

        {step === 6 && (
          <div className="wizard-field">
            <p className="muted small" style={{ textAlign: "center", margin: "-0.5rem 0 0.5rem" }}>
              Optional — vor allem hilfreich, wenn du noch keine Läufe hochgeladen hast. Format: mm:ss oder h:mm:ss.
            </p>
            {BEST_FIELDS.map(({ key, label }) => (
              <label key={key} style={{ width: "100%" }}>
                {label}
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="z. B. 24:30"
                  value={bestInputs[key]}
                  onChange={(e) => updateBestInput(key, e.target.value)}
                />
              </label>
            ))}
          </div>
        )}

        {step === 7 && (
          <div className="wizard-field">
            <textarea
              rows={4}
              value={prefs.constraints_notes ?? ""}
              onChange={(e) => update("constraints_notes", e.target.value)}
              placeholder="z. B. leichte Knieschmerzen, aktuell keine Anstiege (optional, einfach leer lassen)"
            />
          </div>
        )}

        {step === lastStep && (
          <div className="wizard-summary">
            <ul>
              <li>
                <strong>Ziel:</strong> {GOALS.find((g) => g.value === prefs.goal_distance)?.label}
              </li>
              <li>
                <strong>Zieldatum:</strong> {prefs.target_date ?? "kein festes Datum"}
              </li>
              <li>
                <strong>Tage/Woche:</strong> {prefs.days_per_week}
              </li>
              <li>
                <strong>Ruhetage:</strong> {prefs.rest_days.length > 0 ? prefs.rest_days.join(", ") : "keine"}
              </li>
              <li>
                <strong>Langlauftag:</strong> {prefs.long_run_day}
              </li>
              <li>
                <strong>Level:</strong> {LEVELS.find((l) => l.value === (prefs.experience_level ?? ""))?.label}
              </li>
              {BEST_FIELDS.some(({ key }) => prefs.manual_bests?.[key] != null) && (
                <li>
                  <strong>Bestzeiten:</strong>{" "}
                  {BEST_FIELDS.filter(({ key }) => prefs.manual_bests?.[key] != null)
                    .map(({ key, label }) => `${label}: ${formatDuration(prefs.manual_bests![key]!)}`)
                    .join(", ")}
                </li>
              )}
              {prefs.constraints_notes && (
                <li>
                  <strong>Hinweise:</strong> {prefs.constraints_notes}
                </li>
              )}
            </ul>
          </div>
        )}
      </div>

      <div className="wizard-nav">
        <button type="button" className="ghost-button" onClick={back}>
          {step === 0 ? "Abbrechen" : "Zurück"}
        </button>
        {step < lastStep ? (
          <button type="button" onClick={next}>
            Weiter
          </button>
        ) : (
          <button type="button" onClick={() => onComplete(prefs)}>
            Plan erstellen
          </button>
        )}
      </div>
    </div>
  );
}
