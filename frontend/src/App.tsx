import { useEffect, useState } from "react";
import UploadPage from "./components/UploadPage";
import Dashboard from "./components/Dashboard";
import PlanView from "./components/PlanView";
import AskCoach from "./components/AskCoach";
import CalendarView from "./components/CalendarView";
import LoginPage from "./components/LoginPage";
import { api } from "./api";
import { BrandIcon, CalendarIcon, ChartIcon, ChatIcon, TargetIcon, UploadIcon } from "./components/icons";

type Tab = "upload" | "dashboard" | "plan" | "calendar" | "ask";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "upload", label: "Hochladen", icon: <UploadIcon /> },
  { id: "dashboard", label: "Übersicht", icon: <ChartIcon /> },
  { id: "plan", label: "Plan", icon: <TargetIcon /> },
  { id: "calendar", label: "Kalender", icon: <CalendarIcon /> },
  { id: "ask", label: "Frag den Coach", icon: <ChatIcon /> },
];

export default function App() {
  const [tab, setTab] = useState<Tab>("upload");
  const [email, setEmail] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    api
      .me()
      .then((res) => setEmail(res?.email ?? null))
      .finally(() => setCheckingAuth(false));
  }, []);

  const handleLogout = async () => {
    await api.logout();
    setEmail(null);
  };

  if (checkingAuth) return null;

  if (!email) {
    return <LoginPage onLoggedIn={() => api.me().then((res) => setEmail(res?.email ?? null))} />;
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark">
            <BrandIcon />
          </span>
          <h1>Laufplan Generator</h1>
          <button type="button" className="ghost-button logout-button" onClick={handleLogout}>
            Abmelden
          </button>
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
        {tab === "calendar" && <CalendarView />}
        {tab === "ask" && <AskCoach />}
      </main>
    </div>
  );
}
