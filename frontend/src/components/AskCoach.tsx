import { useState } from "react";
import { api } from "../api";

const EXAMPLES = [
  "Wie oft pro Woche sollte ich als Anfänger laufen?",
  "Was ist der Unterschied zwischen einem Tempolauf und Intervallen?",
  "Wie verhindere ich, dass ich mich beim Lauftraining verletze?",
];

export default function AskCoach() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ask = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    setAnswer(null);
    try {
      const res = await api.askCoach(q);
      setAnswer(res.answer);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <h2>Frag den Coach</h2>
      <p className="muted">
        Stell einfach eine Lauf- oder Trainingsfrage — ganz ohne Upload. Wenn du schon Läufe
        hochgeladen und Präferenzen gespeichert hast, bezieht der Coach das automatisch mit ein.
      </p>

      <form
        className="form"
        style={{ maxWidth: "100%" }}
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
      >
        <label>
          Deine Frage
          <textarea
            rows={3}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="z. B. Wie baue ich meine wöchentliche Laufdistanz sicher auf?"
          />
        </label>
        <button type="submit" disabled={loading || !question.trim()}>
          {loading ? "Frage wird beantwortet..." : "Frage stellen"}
        </button>
      </form>

      <div className="example-chips">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            className="chip"
            onClick={() => {
              setQuestion(ex);
              ask(ex);
            }}
          >
            {ex}
          </button>
        ))}
      </div>

      {error && <div className="banner error">{error}</div>}

      {answer && (
        <div className="coach-answer">
          <p>{answer}</p>
        </div>
      )}
    </div>
  );
}
