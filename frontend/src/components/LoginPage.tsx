import { useState } from "react";
import { api } from "../api";
import { BrandIcon } from "./icons";

interface Props {
  onLoggedIn: () => void;
}

export default function LoginPage({ onLoggedIn }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.login(email.trim(), password);
      onLoggedIn();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
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

        <label>
          E-Mail
          <input
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
          />
        </label>

        <label>
          Passwort
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>

        {error && <div className="banner error">{error}</div>}

        <button type="submit" disabled={loading}>
          {loading ? "Wird geprüft..." : "Anmelden"}
        </button>
      </form>
    </div>
  );
}
