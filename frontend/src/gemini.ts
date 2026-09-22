// Calls the Gemini API directly from the browser — there's no backend to hide the key
// behind, so the key lives in this browser's localStorage and never touches any server of
// ours. Error handling and the auto-fallback-to-another-model-on-404 behavior follow the
// same pattern already proven out in a sibling project (essensbestie).
import { CalendarEvent, GeneratedPlan, Preferences, RunFeedback, TrainingSummary } from "./types";
import { getGeminiKey, getGeminiModel, isGeminiModelPinned, setGeminiModel } from "./store";

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";
export const DEFAULT_MODEL = "gemini-2.5-flash";

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchAvailableModels(key: string): Promise<string[]> {
  try {
    const res = await fetch(`${API_BASE}/models?key=${encodeURIComponent(key)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.models ?? [])
      .filter((m: any) => (m.supportedGenerationMethods ?? []).includes("generateContent"))
      .map((m: any) => String(m.name).replace(/^models\//, ""));
  } catch {
    return [];
  }
}

// Prefers a "flash" (fast/cheap) model over "pro" or "lite" variants when picking a
// replacement for a model that's gone stale (returns 404 for this key).
function pickBestModel(models: string[]): string | null {
  const flash = models.find((m) => m.includes("flash") && !m.includes("lite"));
  return flash ?? models[0] ?? null;
}

interface CallOptions {
  systemInstruction?: string;
  responseSchema?: unknown;
  maxOutputTokens?: number;
}

interface CallState {
  tries: number;
  switched: boolean;
  plain: boolean;
}

async function callGemini(contents: string, opts: CallOptions, state: CallState = { tries: 0, switched: false, plain: false }): Promise<string> {
  const key = getGeminiKey();
  if (!key) throw new Error("Kein Gemini-API-Key hinterlegt. Trage ihn in den Einstellungen ein.");

  const model = getGeminiModel(DEFAULT_MODEL);
  const url = `${API_BASE}/models/${encodeURIComponent(model)}:generateContent`;

  const generationConfig: Record<string, unknown> = { maxOutputTokens: opts.maxOutputTokens ?? 2048 };
  if (opts.responseSchema && !state.plain) {
    generationConfig.responseMimeType = "application/json";
    generationConfig.responseSchema = opts.responseSchema;
  }

  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: [{ text: contents }] }],
    generationConfig,
  };
  if (opts.systemInstruction) {
    body.systemInstruction = { parts: [{ text: opts.systemInstruction }] };
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Keine Verbindung zu Gemini. Bist du online?");
  }

  if (!res.ok) {
    let detail = "";
    try {
      detail = (await res.json())?.error?.message ?? "";
    } catch {
      /* ignore */
    }
    const short = detail.length > 160 ? detail.slice(0, 160) + "…" : detail;

    if (res.status === 400 && /api.?key/i.test(detail)) {
      throw new Error("Gemini-API-Key wird nicht akzeptiert. Prüf ihn in den Einstellungen.");
    }
    if (res.status === 403) {
      throw new Error("Zugriff verweigert — der Key ist ungültig oder für die Gemini API nicht freigeschaltet.");
    }
    if (res.status === 429) {
      throw new Error("Kostenloses Kontingent gerade ausgeschöpft. Kurz warten und nochmal versuchen.");
    }
    if (res.status === 404) {
      // A self-chosen (pinned) model stays as-is — only an unpinned default gets auto-repaired.
      if (!isGeminiModelPinned() && !state.switched) {
        const models = await fetchAvailableModels(key);
        const best = pickBestModel(models);
        if (best && best !== model) {
          setGeminiModel(best, false);
          return callGemini(contents, opts, { ...state, switched: true });
        }
      }
      throw new Error(`Modell "${model}" ist für deinen Key nicht verfügbar. Sag mir Bescheid, welches Modell dein Key freischaltet.`);
    }
    if (res.status >= 500) {
      if (state.tries < 2) {
        await sleep(1200 * (state.tries + 1));
        return callGemini(contents, opts, { ...state, tries: state.tries + 1 });
      }
      if (opts.responseSchema && !state.plain) {
        return callGemini(contents, opts, { ...state, plain: true, tries: 0 });
      }
      throw new Error(`Gemini ist gerade überlastet (${res.status}).${short ? " " + short : ""} Später nochmal versuchen.`);
    }
    throw new Error(short || `Fehler ${res.status}`);
  }

  const data = await res.json();
  const candidate = data?.candidates?.[0];
  if (!candidate) {
    throw new Error(data?.promptFeedback?.blockReason ? "Antwort wurde vom Sicherheitsfilter blockiert." : "Leere Antwort erhalten.");
  }
  if (candidate.finishReason === "MAX_TOKENS") {
    throw new Error("Antwort wurde abgeschnitten (zu lang). Nochmal versuchen.");
  }
  const text = (candidate.content?.parts ?? [])
    .filter((p: any) => p.text && !p.thought)
    .map((p: any) => p.text)
    .join("");
  if (!text.trim()) throw new Error("Keine verwertbare Antwort erhalten. Nochmal versuchen.");
  return text;
}

// Defensive parse in case a response ever comes back wrapped in code fences despite JSON mode.
function parseJson<T>(text: string): T | null {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    /* fall through */
  }
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(cleaned.slice(start, end + 1)) as T;
    } catch {
      /* fall through */
    }
  }
  return null;
}

const PLAN_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    plan_name: { type: "STRING" },
    weeks: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          week_number: { type: "NUMBER" },
          start_date: { type: "STRING" },
          days: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                day: { type: "STRING" },
                type: {
                  type: "STRING",
                  enum: ["rest", "easy_run", "long_run", "tempo", "intervals", "cross_train", "strength"],
                },
                distance_km: { type: "NUMBER" },
                target_pace: { type: "STRING" },
                notes: { type: "STRING" },
              },
              required: ["day", "type", "distance_km", "target_pace", "notes"],
            },
          },
        },
        required: ["week_number", "start_date", "days"],
      },
    },
    coach_notes: { type: "STRING" },
  },
  required: ["plan_name", "weeks", "coach_notes"],
};

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
        { day: "Freitag", type: "strength", distance_km: 0, target_pace: "-", notes: "20-30 Min. Rumpf- und Beinkraft (z.B. Kniebeugen, Ausfallschritte, Planks)." },
        { day: "Samstag", type: "long_run", distance_km: 10, target_pace: "6:10-6:30/km", notes: "Ruhig angehen, hier zählt Zeit auf den Beinen." },
        { day: "Sonntag", type: "cross_train", distance_km: 0, target_pace: "-", notes: "30-40 Min. lockeres Radfahren oder Schwimmen." },
      ],
    },
  ],
  coach_notes: "Diese erste Woche ist bewusst vorsichtig angesetzt, um eine Basis zu schaffen. Konsistenz geht vor Tempo — tausche einen lockeren Lauf lieber gegen eine Pause, wenn du dich ungewöhnlich erschöpft fühlst.",
};

const PLAN_RULES = `- graduell aufbaut (wöchentliche Gesamtdistanz nicht um mehr als ~10% steigern, außer in geplanten Erholungswochen)
- die verfügbaren Tage pro Woche und Pflicht-Ruhetage respektiert
- den Langlauf nach Möglichkeit auf den bevorzugten Tag legt
- auf der tatsächlichen bisherigen Trainingsbelastung basiert (keine Distanzen weit über das hinaus, was die Historie hergibt)
- Verletzungs-/Einschränkungshinweise durch angepasste Intensität/Umfang berücksichtigt
- auf das Zieldatum/die Zieldistanz hinarbeitet, falls angegeben, sonst auf allgemeine Fitness
- eine Mischung aus lockeren Läufen, gelegentlichen Tempo-/Intervalleinheiten (bei fortgeschrittenem Level) und Langläufen enthält, restliche Tage als Pause oder Cross-Training
- nach Möglichkeit 1 (max. 2) kurze Krafttraining-Einheiten pro Woche einplant (Tagestyp "strength", 20-30 Min. Rumpf-/Beinkraft) — hilft Verletzungen vorzubeugen, aber nicht auf Kosten von Pflicht-Ruhetagen
- bekannte anstehende Termine berücksichtigt (z.B. an Reisetagen keine langen Läufe einplanen, ein Termin am Wunsch-Langlauftag verschiebt den Langlauf auf einen anderen Tag)
- vorhandene Ziel-Paces realistisch kalibriert: nutze primär "training_summary", falls diese kaum Daten enthält (z.B. keine oder sehr wenige hochgeladene Läufe) aber "preferences.manual_bests" vorhanden ist, kalibriere die Paces stattdessen anhand dieser selbst angegebenen Bestzeiten`;

const GENERATE_SYSTEM_PROMPT = `Du bist ein erfahrener Lauftrainer, der personalisierte, sichere und realistische Trainingspläne erstellt.

Du erhältst ein JSON-Objekt mit: "current_date" (heutiges Datum), "training_summary" (aggregierte Trainingshistorie — kann leer/spärlich sein, wenn noch keine Läufe hochgeladen wurden), "preferences" (Ziel, Zieldistanz/-datum, wöchentliche Verfügbarkeit, Pflicht-Ruhetage, Erfahrungslevel, Einschränkungen, bevorzugter Langlauftag, optional "manual_bests" mit selbst angegebenen Bestzeiten für 5 km/10 km/Halbmarathon/Marathon in Sekunden) und optional "upcoming_events" (bekannte Termine wie Reisen, Rennen o.ä.).

Erstelle einen wochenweisen Trainingsplan, der bei "current_date" bzw. dem darauffolgenden Montag beginnt, und der:
${PLAN_RULES}

Alle Texte (plan_name, notes, coach_notes) auf Deutsch verfassen. Für das Feld "day" ausschließlich die deutschen Wochentagsnamen verwenden: Montag, Dienstag, Mittwoch, Donnerstag, Freitag, Samstag, Sonntag. Jede Woche muss alle 7 Wochentage enthalten (Montag bis Sonntag), auch Ruhetage.

Hier ist ein vollständiges Beispiel für eine gültige Antwort:

${JSON.stringify(EXAMPLE_OUTPUT, null, 2)}`;

const ADAPT_SYSTEM_PROMPT = `Du bist ein erfahrener Lauftrainer. Du bekommst einen bereits bestehenden Trainingsplan (JSON) sowie eine aktualisierte Trainingszusammenfassung, die aktuellen Präferenzen, optional anstehende Termine, optional "recent_feedback" (Gefühls-Check-ins zu einzelnen Lauftagen: rpe 1 = hart/schwer, 2 = okay, 3 = super, plus optionale Notiz), und eine kurze Notiz der Person dazu, was sich geändert hat (z.B. Krankheit, Verletzung, verschobenes Ziel-Rennen, mehr/weniger Zeit).

Wenn "recent_feedback" überwiegend niedrige Werte (1) zeigt, ist das ein Signal, Umfang/Intensität in den kommenden Wochen zu reduzieren, auch ohne explizite Notiz dazu.

Du erhältst zusätzlich "current_date" (heutiges Datum). Wochen mit "start_date" vor "current_date" gelten als bereits gelaufen — lass sie inhaltlich unverändert, außer die Notiz verlangt ausdrücklich etwas anderes. Passe die aktuelle und alle zukünftigen Wochen an die neue Situation an: Umfang/Intensität reduzieren oder anpassen bei Krankheit/Verletzung, den Aufbau neu takten bei geändertem Zieldatum, Rücksicht auf neue Termine nehmen, usw.

Der Plan soll insgesamt so viele Wochen behalten wie sinnvoll (bei einem verschobenen Zieldatum ggf. mehr oder weniger Wochen als vorher).

Passe den Plan an, sodass er:
${PLAN_RULES}

Alle Texte (plan_name, notes, coach_notes) auf Deutsch verfassen, deutsche Wochentagsnamen für "day", alle 7 Wochentage pro Woche. Erwähne im "coach_notes" kurz, was sich durch die Anpassung geändert hat.`;

const QA_SYSTEM_PROMPT = `Du bist ein erfahrener, freundlicher Lauftrainer. Beantworte die Frage der Person direkt, praktisch und auf Deutsch.

Dir kann optional eine aggregierte Trainingszusammenfassung und/oder Trainingspräferenzen als Kontext mitgegeben werden — nutze sie, falls vorhanden, um die Antwort persönlicher zu machen. Es ist aber völlig normal, dass keine Daten vorliegen (die Person hat noch nichts hochgeladen); beantworte die Frage dann einfach mit deinem allgemeinen Lauf-Coaching-Wissen, ohne das Fehlen der Daten zu kommentieren.

Antworte in normalem Fließtext (kein JSON), prägnant aber vollständig — typischerweise 3-8 Sätze, länger nur wenn die Frage es wirklich erfordert.`;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function generatePlan(summary: TrainingSummary, preferences: Preferences, events: CalendarEvent[]): Promise<GeneratedPlan> {
  const contents = JSON.stringify({ current_date: todayIso(), training_summary: summary, preferences, upcoming_events: events }, null, 2);
  const raw = await callGemini(contents, { systemInstruction: GENERATE_SYSTEM_PROMPT, responseSchema: PLAN_RESPONSE_SCHEMA, maxOutputTokens: 8000 });
  const parsed = parseJson<GeneratedPlan>(raw);
  if (!parsed) throw new Error("Gemini hat kein valides JSON geliefert. Nochmal versuchen.");
  return parsed;
}

export async function adaptPlan(
  currentPlan: GeneratedPlan,
  summary: TrainingSummary,
  preferences: Preferences,
  events: CalendarEvent[],
  feedback: RunFeedback[],
  changeNote: string
): Promise<GeneratedPlan> {
  const contents = JSON.stringify(
    {
      current_date: todayIso(),
      current_plan: currentPlan,
      training_summary: summary,
      preferences,
      upcoming_events: events,
      recent_feedback: feedback,
      change_note: changeNote || "Keine spezifische Notiz — bitte anhand der aktuellen Trainingsdaten und Termine sinnvoll anpassen.",
    },
    null,
    2
  );
  const raw = await callGemini(contents, { systemInstruction: ADAPT_SYSTEM_PROMPT, responseSchema: PLAN_RESPONSE_SCHEMA, maxOutputTokens: 8000 });
  const parsed = parseJson<GeneratedPlan>(raw);
  if (!parsed) throw new Error("Gemini hat kein valides JSON geliefert. Nochmal versuchen.");
  return parsed;
}

export async function answerQuestion(question: string, summary?: TrainingSummary | null, preferences?: Preferences | null): Promise<string> {
  const contextParts: string[] = [];
  if (summary) contextParts.push(`Trainingszusammenfassung:\n${JSON.stringify(summary, null, 2)}`);
  if (preferences) contextParts.push(`Präferenzen:\n${JSON.stringify(preferences, null, 2)}`);
  const context = contextParts.length > 0 ? `${contextParts.join("\n\n")}\n\n` : "";

  return callGemini(`${context}Frage: ${question}`, { systemInstruction: QA_SYSTEM_PROMPT, maxOutputTokens: 1024 });
}
