import { useState } from "react";
import { setGeminiKey } from "../store";
import { BrandIcon } from "./icons";

interface Props {
  onDone: () => void;
}

export default function ApiKeySetup({ onDone }: Props) {
  const [key, setKey] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) return;
    setGeminiKey(key.trim());
    onDone();
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-brand">
          <span className="brand-mark">
            <BrandIcon />
          </span>
          <h1>Laufplan Generator</h1>
        </div>

        <p className="muted small" style={{ textAlign: "center" }}>
          Diese App läuft komplett in deinem Browser, ohne eigenen Server. Damit dein Coach
          Pläne erstellen kann, brauchst du einen kostenlosen Gemini-API-Key.
        </p>

        <ol style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.85rem", lineHeight: 1.6 }}>
          <li>
            Auf{" "}
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">
              aistudio.google.com/apikey
            </a>{" "}
            mit Google-Konto anmelden
          </li>
          <li>„Create API key" klicken, Schlüssel kopieren</li>
          <li>Hier einfügen — er bleibt nur in diesem Browser gespeichert</li>
        </ol>

        <label>
          Gemini-API-Key
          <input
            type="password"
            required
            autoFocus
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="AIza..."
          />
        </label>

        <button type="submit">Loslegen</button>

        <p className="muted small" style={{ textAlign: "center", margin: 0 }}>
          Der Key wird ausschließlich direkt an Google gesendet, nie an einen eigenen Server —
          es gibt keinen.
        </p>
      </form>
    </div>
  );
}
