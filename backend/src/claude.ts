import Anthropic from "@anthropic-ai/sdk";
import { GeneratedPlan, Preferences, TrainingSummary } from "./types";

const MODEL = process.env.CLAUDE_MODEL || "claude-haiku-4-5-20251001";

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY ist nicht gesetzt. Trage ihn in backend/.env ein (siehe .env.example).");
  }
  return new Anthropic({ apiKey });
}

const EXAMPLE_OUTPUT: GeneratedPlan = {
  plan_name: "10-km-Grundlagenaufbau",
  weeks: [
    {
      week_number: 1,
      start_date: "2026-09-07",
      days: [
        { day: "Montag", type: "rest", distance_km: 0, target_pace: "-", notes: "Komplette Pause, leichtes Dehnen optional." },
        { day: "Dienstag", type: "easy_run", distance_km: 5, target_pace: "6:00-6:20/km", notes: "Lockeres Tempo, Fokus auf sauberer Technik." },
        { day: "Mittwoch", type: "rest", distance_km: 0, target_pace: "-", notes: "Pause oder leichtes Cross-Training." },
        { day: "Donnerstag", type: "tempo", distance_km: 6, target_pace: "5:20-5:35/km", notes: "10 Min. Einlaufen, 20 Min. im Tempo, 10 Min. Auslaufen." },
        { day: "Freitag", type: "rest", distance_km: 0, target_pace: "-", notes: "Pause." },
        { day: "Samstag", type: "long_run", distance_km: 10, target_pace: "6:10-6:30/km", notes: "Ruhig angehen, hier zählt Zeit auf den Beinen." },
        { day: "Sonntag", type: "cross_train", distance_km: 0, target_pace: "-", notes: "30-40 Min. lockeres Radfahren oder Schwimmen." },
      ],
    },
  ],
  coach_notes: "Diese erste Woche ist bewusst vorsichtig angesetzt, um eine Basis zu schaffen. Konsistenz geht vor Tempo — tausche einen lockeren Lauf lieber gegen eine Pause, wenn du dich ungewöhnlich erschöpft fühlst.",
};

const SYSTEM_PROMPT = `Du bist ein erfahrener Lauftrainer, der personalisierte, sichere und realistische Trainingspläne erstellt.

Du erhältst ein JSON-Objekt mit zwei Teilen:
1. "training_summary": eine aggregierte Zusammenfassung der bisherigen Trainingshistorie (wöchentliche Distanzen, Pace-Trend, längster Lauf, Frequenz, Höhenmeter-Trend, ein kürzlicher schneller Effort).
2. "preferences": das Ziel des Läufers/der Läuferin, Zieldistanz/-datum, wöchentliche Verfügbarkeit, Pflicht-Ruhetage, Erfahrungslevel, Verletzungs-/Einschränkungshinweise und bevorzugter Langlauftag.

Erstelle einen wochenweisen Trainingsplan, der:
- graduell aufbaut (wöchentliche Gesamtdistanz nicht um mehr als ~10% steigern, außer in geplanten Erholungswochen)
- die verfügbaren Tage pro Woche und Pflicht-Ruhetage respektiert
- den Langlauf nach Möglichkeit auf den bevorzugten Tag legt
- auf der tatsächlichen bisherigen Trainingsbelastung basiert (keine Distanzen weit über das hinaus, was die Historie hergibt)
- Verletzungs-/Einschränkungshinweise durch angepasste Intensität/Umfang berücksichtigt
- auf das Zieldatum/die Zieldistanz hinarbeitet, falls angegeben, sonst auf allgemeine Fitness
- eine Mischung aus lockeren Läufen, gelegentlichen Tempo-/Intervalleinheiten (bei fortgeschrittenem Level) und Langläufen enthält, restliche Tage als Pause oder Cross-Training

Antworte AUSSCHLIESSLICH mit validem JSON nach genau diesem Schema, keine Erklärungen, keine Markdown-Codeblöcke:

{
  "plan_name": "string",
  "weeks": [
    {
      "week_number": 1,
      "start_date": "YYYY-MM-DD",
      "days": [
        {
          "day": "Montag",
          "type": "rest | easy_run | long_run | tempo | intervals | cross_train",
          "distance_km": 5.0,
          "target_pace": "string, z.B. '5:30-5:50/km'",
          "notes": "string"
        }
      ]
    }
  ],
  "coach_notes": "string, 2-3 Sätze allgemeine Hinweise"
}

Wichtig:
- Alle Texte (plan_name, notes, coach_notes) auf Deutsch verfassen.
- Für das Feld "day" ausschließlich die deutschen Wochentagsnamen verwenden: Montag, Dienstag, Mittwoch, Donnerstag, Freitag, Samstag, Sonntag.
- Jede Woche muss alle 7 Wochentage enthalten (Montag bis Sonntag), auch Ruhetage.

Hier ist ein vollständiges Beispiel für eine gültige Antwort:

${JSON.stringify(EXAMPLE_OUTPUT, null, 2)}`;

const QA_SYSTEM_PROMPT = `Du bist ein erfahrener, freundlicher Lauftrainer. Beantworte die Frage der Person direkt, praktisch und auf Deutsch.

Dir kann optional eine aggregierte Trainingszusammenfassung und/oder Trainingspräferenzen als Kontext mitgegeben werden — nutze sie, falls vorhanden, um die Antwort persönlicher zu machen. Es ist aber völlig normal, dass keine Daten vorliegen (die Person hat noch nichts hochgeladen); beantworte die Frage dann einfach mit deinem allgemeinen Lauf-Coaching-Wissen, ohne das Fehlen der Daten zu kommentieren.

Antworte in normalem Fließtext (kein JSON), prägnant aber vollständig — typischerweise 3-8 Sätze, länger nur wenn die Frage es wirklich erfordert.`;

function extractJson(text: string): string {
  // Defensive trim in case the model wraps the JSON in fences despite instructions.
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  return (fenced ? fenced[1] : text).trim();
}

export async function generatePlan(summary: TrainingSummary, preferences: Preferences): Promise<GeneratedPlan> {
  const client = getClient();
  const userMessage = JSON.stringify({ training_summary: summary, preferences }, null, 2);

  const attempt = async (extra?: string): Promise<string> => {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: extra ? `${userMessage}\n\n${extra}` : userMessage }],
    });
    const textBlock = response.content.find((b) => b.type === "text");
    return textBlock && textBlock.type === "text" ? textBlock.text : "";
  };

  const raw = await attempt();
  try {
    return JSON.parse(extractJson(raw)) as GeneratedPlan;
  } catch (firstError) {
    // Retry once, telling the model exactly what went wrong and re-demanding pure JSON.
    const retryRaw = await attempt(
      `Deine vorherige Antwort konnte nicht als JSON geparst werden: ${(firstError as Error).message}. Antworte AUSSCHLIESSLICH mit validem JSON nach dem Schema, ohne Erklärungen und ohne Codeblöcke.`
    );
    try {
      return JSON.parse(extractJson(retryRaw)) as GeneratedPlan;
    } catch (secondError) {
      throw new Error(`Claude hat auch nach einem erneuten Versuch kein valides JSON geliefert: ${(secondError as Error).message}`);
    }
  }
}

// Free-form running-coach Q&A that works with zero uploaded data — training summary and
// preferences are included as optional context when available, never required.
export async function answerQuestion(
  question: string,
  summary?: TrainingSummary | null,
  preferences?: Preferences | null
): Promise<string> {
  const client = getClient();

  const contextParts: string[] = [];
  if (summary) contextParts.push(`Trainingszusammenfassung:\n${JSON.stringify(summary, null, 2)}`);
  if (preferences) contextParts.push(`Präferenzen:\n${JSON.stringify(preferences, null, 2)}`);
  const context = contextParts.length > 0 ? `${contextParts.join("\n\n")}\n\n` : "";

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: QA_SYSTEM_PROMPT,
    messages: [{ role: "user", content: `${context}Frage: ${question}` }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock && textBlock.type === "text" ? textBlock.text : "";
}
