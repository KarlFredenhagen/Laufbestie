import { useEffect, useState } from "react";
import { api } from "../api";
import { GeneratedPlan, Preferences, PlanDay } from "../types";
import PlanWizard from "./PlanWizard";

const TYPE_LABELS: Record<PlanDay["type"], string> = {
  rest: "Ruhetag",
  easy_run: "Lockerer Lauf",
  long_run: "Langer Lauf",
  tempo: "Tempolauf",
  intervals: "Intervalle",
  cross_train: "Cross-Training",
};

export default function PlanView() {
  const [plan, setPlan] = useState<GeneratedPlan | null>(null);
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [activeWeek, setActiveWeek] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.getPlan(), api.getPreferences()])
      .then(([planRes, prefsRes]) => {
        if (planRes) {
          setPlan(planRes.plan);
          setCreatedAt(planRes.created_at);
        }
        setPreferences(prefsRes);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleWizardComplete = async (prefs: Preferences) => {
    setWizardOpen(false);
    setPreferences(prefs);
    setGenerating(true);
    setError(null);
    try {
      await api.savePreferences(prefs);
      const res = await api.generatePlan();
      setPlan(res.plan);
      setCreatedAt(res.created_at);
      setActiveWeek(0);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <div className="page">Lädt...</div>;

  if (wizardOpen) {
    return (
      <div className="page">
        <PlanWizard initial={preferences} onCancel={() => setWizardOpen(false)} onComplete={handleWizardComplete} />
      </div>
    );
  }

  return (
    <div className="page">
      <div className="plan-header">
        <h2>Dein Trainingsplan</h2>
        {plan && !generating && (
          <button onClick={() => setWizardOpen(true)} className="ghost-button">
            Neuen Plan erstellen
          </button>
        )}
      </div>

      {error && <div className="banner error">{error}</div>}

      {!plan && !generating && (
        <div className="empty-state">
          <div className="empty-state-icon">🏃‍♀️</div>
          <p>Noch kein Trainingsplan. Beantworte ein paar kurze Fragen und dein Coach erstellt dir einen.</p>
          <button onClick={() => setWizardOpen(true)}>Plan erstellen</button>
        </div>
      )}

      {generating && (
        <div className="empty-state">
          <div className="spinner" />
          <p className="muted">Der Coach denkt nach... das kann bis zu einer Minute dauern.</p>
        </div>
      )}

      {plan && !generating && (
        <>
          <h3>{plan.plan_name}</h3>
          {createdAt && <p className="muted small">Erstellt am {new Date(createdAt).toLocaleString("de-DE")}</p>}
          <p className="coach-notes">{plan.coach_notes}</p>

          <div className="week-tabs">
            {plan.weeks.map((w, i) => (
              <button
                key={w.week_number}
                className={i === activeWeek ? "active" : ""}
                onClick={() => setActiveWeek(i)}
              >
                Woche {w.week_number}
              </button>
            ))}
          </div>

          <div className="day-cards">
            {plan.weeks[activeWeek].days.map((day) => (
              <div key={day.day} className={`day-card type-${day.type}`}>
                <div className="day-card-header">
                  <strong>{day.day}</strong>
                  <span className="day-type">{TYPE_LABELS[day.type] ?? day.type}</span>
                </div>
                {day.type !== "rest" && (
                  <div className="day-card-body">
                    <div>{day.distance_km} km</div>
                    <div className="muted">{day.target_pace}</div>
                  </div>
                )}
                {day.notes && <p className="day-notes">{day.notes}</p>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
