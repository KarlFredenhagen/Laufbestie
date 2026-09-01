import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../api";
import { StoredActivity, TrainingSummary } from "../types";

function formatPace(secPerKm: number): string {
  if (!secPerKm) return "-";
  const min = Math.floor(secPerKm / 60);
  const sec = Math.round(secPerKm % 60);
  return `${min}:${sec.toString().padStart(2, "0")}/km`;
}

const PACE_TREND_LABELS: Record<TrainingSummary["pace_trend"], string> = {
  improving: "Verbessert sich",
  stable: "Stabil",
  declining: "Wird langsamer",
  insufficient_data: "Nicht genug Daten",
};

const ELEVATION_TREND_LABELS: Record<TrainingSummary["elevation_gain_trend"], string> = {
  increasing: "Steigend",
  stable: "Stabil",
  decreasing: "Sinkend",
  unavailable: "Keine Daten",
};

export default function Dashboard() {
  const [activities, setActivities] = useState<StoredActivity[]>([]);
  const [summary, setSummary] = useState<TrainingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.getActivities(), api.getSummary()])
      .then(([a, s]) => {
        setActivities(a);
        setSummary(s);
      })
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page">Lädt...</div>;
  if (error) return <div className="page banner error">{error}</div>;

  const chartData = (summary?.weekly_distance_km ?? []).map((w) => ({
    week: w.week_start.slice(5),
    "Distanz (km)": w.distance_km,
  }));

  return (
    <div className="page">
      <h2>Übersicht</h2>

      {activities.length === 0 ? (
        <p className="muted">Noch keine Aktivitäten. Lade ein paar Läufe hoch, um loszulegen.</p>
      ) : (
        <>
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-label">Läufe gesamt</div>
              <div className="stat-value">{activities.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Ø Pace (gesamt)</div>
              <div className="stat-value">{formatPace(summary!.avg_pace_overall_sec_per_km)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Pace-Trend</div>
              <div className="stat-value">{PACE_TREND_LABELS[summary!.pace_trend]}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Längster Lauf (4 Wo.)</div>
              <div className="stat-value">{summary!.longest_run_last_4_weeks_km.toFixed(1)} km</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Lauffrequenz</div>
              <div className="stat-value">{summary!.run_frequency_days_per_week.toFixed(1)} Tage/Wo.</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Höhenmeter-Trend</div>
              <div className="stat-value">{ELEVATION_TREND_LABELS[summary!.elevation_gain_trend]}</div>
            </div>
          </div>

          <h3>Wöchentliches Volumen</h3>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="Distanz (km)" fill="#3366cc" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <h3>Letzte Aktivitäten</h3>
          <table className="activity-table">
            <thead>
              <tr>
                <th>Datum</th>
                <th>Distanz</th>
                <th>Dauer</th>
                <th>Pace</th>
                <th>Puls</th>
                <th>Höhenmeter</th>
                <th>Quelle</th>
              </tr>
            </thead>
            <tbody>
              {activities.slice(0, 25).map((a) => (
                <tr key={a.id}>
                  <td>{a.date}</td>
                  <td>{a.distance_km.toFixed(2)} km</td>
                  <td>{Math.round(a.duration_seconds / 60)} min</td>
                  <td>{formatPace(a.avg_pace_per_km)}</td>
                  <td>{a.avg_heartrate ?? "-"}</td>
                  <td>{a.elevation_gain_m ?? "-"}</td>
                  <td>{a.source_file}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
