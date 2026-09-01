import { useState } from "react";
import UploadPage from "./components/UploadPage";
import Dashboard from "./components/Dashboard";
import PlanView from "./components/PlanView";
import AskCoach from "./components/AskCoach";

type Tab = "upload" | "dashboard" | "plan" | "ask";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "upload", label: "Hochladen", icon: "⬆️" },
  { id: "dashboard", label: "Übersicht", icon: "📊" },
  { id: "plan", label: "Plan", icon: "🏃" },
  { id: "ask", label: "Frag den Coach", icon: "💬" },
];

export default function App() {
  const [tab, setTab] = useState<Tab>("upload");

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark">🏃‍♂️</span>
          <h1>Laufplan Generator</h1>
        </div>
        <nav className="tabs">
          {TABS.map((t) => (
            <button key={t.id} className={tab === t.id ? "active" : ""} onClick={() => setTab(t.id)}>
              <span className="tab-icon">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="app-main">
        {tab === "upload" && <UploadPage />}
        {tab === "dashboard" && <Dashboard />}
        {tab === "plan" && <PlanView />}
        {tab === "ask" && <AskCoach />}
      </main>
    </div>
  );
}
