// Sämtliche Gemini-Kommunikation, gekapselt. Nach dem Muster der
// Essensbestie: strukturierte JSON-Antworten per responseSchema, robuste
// Fehlerbehandlung, Retry bei 5xx, automatischer Modellwechsel bei 404.
import { store } from './store.js';

const API = 'https://generativelanguage.googleapis.com/v1beta';
const sleep = ms => new Promise(r => setTimeout(r, ms));

function parseJson(text) {
  const t = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  try { return JSON.parse(t); } catch {}
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a >= 0 && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch {} }
  return null;
}

export async function fetchModels(force) {
  const key = store.key.trim();
  if (!key) return null;
  try {
    const res = await fetch(`${API}/models`, { headers: { 'x-goog-api-key': key } });
    if (!res.ok) return null;
    const data = await res.json();
    const list = (data.models || [])
      .filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
      .map(m => m.name.replace('models/', ''));
    return list;
  } catch { return null; }
}

function pickBest(list) {
  const pref = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
  for (const p of pref) if (list.includes(p)) return p;
  return list[0] || null;
}

export async function gemini(parts, schema, temp, state) {
  const st = state || { tries: 0, plain: false, switched: false };
  const key = store.key.trim();
  if (!key) throw new Error('Kein API-Key hinterlegt. Trage ihn unter „Mehr" ein.');
  const url = `${API}/models/${encodeURIComponent(store.model)}:generateContent`;

  const cfg = { temperature: temp ?? 0.3, responseMimeType: 'application/json' };
  if (schema && !st.plain) cfg.responseSchema = schema;

  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({ contents: [{ role: 'user', parts }], generationConfig: cfg })
    });
  } catch { throw new Error('Keine Verbindung. Bist du online?'); }

  if (!res.ok) {
    let d = ''; try { d = (await res.json())?.error?.message || ''; } catch {}
    const kurz = d.length > 140 ? d.slice(0, 140) + '…' : d;
    if (res.status === 400 && /api.?key/i.test(d)) throw new Error('API-Key wird nicht akzeptiert. Prüf ihn unter „Mehr".');
    if (res.status === 403) throw new Error('Zugriff verweigert — Key ungültig oder die Gemini API ist dafür nicht freigeschaltet.');
    if (res.status === 429) throw new Error('Freikontingent gerade erschöpft. Kurz warten oder ein anderes Modell nehmen.');
    if (res.status === 404) {
      const dead = store.model;
      if (store.pinned)
        throw new Error(`„${dead}" antwortet nicht (404). Wähl unter „Mehr" ein anderes Modell.`);
      const list = await fetchModels(true);
      const best = list && list.length ? pickBest(list) : null;
      if (best && best !== dead && !st.switched) {
        store.model = best;
        return gemini(parts, schema, temp, { ...st, switched: true });
      }
      throw new Error(`Modell „${dead}" gibt es für deinen Key nicht. Wähl unter „Mehr" ein anderes.`);
    }
    if (res.status >= 500) {
      if (st.tries < 2) {
        await sleep(1200 * (st.tries + 1));
        return gemini(parts, schema, temp, { ...st, tries: st.tries + 1 });
      }
      if (schema && !st.plain)
        return gemini(parts, schema, temp, { ...st, plain: true, tries: 0 });
      throw new Error(res.status === 503
        ? `Das Modell ist gerade überlastet. In ein paar Minuten nochmal probieren.${kurz ? ' (' + kurz + ')' : ''}`
        : `Google meldet einen Serverfehler (${res.status}).${kurz ? ' ' + kurz : ''}`);
    }
    throw new Error(kurz || ('Fehler ' + res.status));
  }

  const data = await res.json();
  const c = data?.candidates?.[0];
  if (!c) throw new Error(data?.promptFeedback?.blockReason ? 'Vom Sicherheitsfilter blockiert.' : 'Leere Antwort erhalten.');
  if (c.finishReason === 'MAX_TOKENS') throw new Error('Antwort wurde abgeschnitten. Nochmal probieren.');
  const text = (c.content?.parts || []).filter(p => p.text && !p.thought).map(p => p.text).join('');
  if (!text.trim()) throw new Error('Konnte keine gültige Antwort erzeugen. Nochmal probieren.');
  const obj = parseJson(text);
  if (!obj) throw new Error('Antwort war unlesbar. Nochmal probieren.');
  return obj;
}

export async function testApiKey(key) {
  const tmp = key ?? store.key;
  if (!tmp || !tmp.trim()) return { ok: false, message: 'Kein Key eingetragen.' };
  try {
    const res = await fetch(`${API}/models`, { headers: { 'x-goog-api-key': tmp.trim() } });
    if (res.ok) return { ok: true, message: 'Key funktioniert.' };
    if (res.status === 400 || res.status === 403) return { ok: false, message: 'Key wird nicht akzeptiert.' };
    return { ok: false, message: `Fehler ${res.status} beim Testen.` };
  } catch { return { ok: false, message: 'Keine Verbindung. Bist du online?' }; }
}

/* ============ Schemas ============ */
const WORKOUT_PROPS = {
  date: { type: 'STRING', description: 'YYYY-MM-DD' },
  type: { type: 'STRING', enum: ['easy', 'long', 'recovery', 'tempo', 'interval', 'marathon_pace', 'race', 'rest'] },
  distance: { type: 'NUMBER', description: 'Kilometer, 0 bei rest' },
  duration: { type: 'NUMBER', description: 'Minuten, 0 bei rest' },
  pace: { type: 'STRING', description: 'z.B. "5:30-5:50" min/km, leer bei rest' },
  heartRate: { type: 'STRING', description: 'z.B. "Zone 2", leer bei rest' },
  description: { type: 'STRING' },
  goal: { type: 'STRING' }
};
const WEEK_SCHEMA = {
  type: 'OBJECT',
  properties: {
    week: { type: 'NUMBER' },
    startDate: { type: 'STRING', description: 'YYYY-MM-DD, Montag der Woche' },
    focus: { type: 'STRING', description: 'kurzer Fokus der Woche, z.B. "Grundlage" oder "Tapering"' },
    totalKm: { type: 'NUMBER' },
    workouts: {
      type: 'ARRAY',
      items: { type: 'OBJECT', properties: WORKOUT_PROPS, required: ['date', 'type', 'distance', 'duration', 'pace', 'heartRate', 'description', 'goal'] }
    }
  },
  required: ['week', 'startDate', 'workouts']
};
const PLAN_SCHEMA = {
  type: 'OBJECT',
  properties: {
    summary: { type: 'STRING', description: 'Kurze Einschaetzung des Plans, 2-3 Saetze, Deutsch' },
    weeks: { type: 'ARRAY', items: WEEK_SCHEMA }
  },
  required: ['summary', 'weeks']
};
const ANALYSIS_SCHEMA = {
  type: 'OBJECT',
  properties: {
    plannedKm: { type: 'NUMBER' },
    actualKm: { type: 'NUMBER' },
    runsPlanned: { type: 'NUMBER' },
    runsCompleted: { type: 'NUMBER' },
    longRunKm: { type: 'NUMBER' },
    summary: { type: 'STRING', description: 'Kurze Wochenanalyse, Deutsch, 2-4 Saetze' },
    recommendation: { type: 'STRING', enum: ['weiter wie geplant', 'leicht anpassen', 'deutlich anpassen'] },
    adjustment: { type: 'STRING', description: 'Erklaerung der Anpassung, leer wenn keine noetig' },
    adjustedWeeks: { type: 'ARRAY', items: WEEK_SCHEMA, description: 'Nur die kommenden, angepassten Wochen. Leer wenn keine Anpassung noetig.' }
  },
  required: ['plannedKm', 'actualKm', 'runsPlanned', 'runsCompleted', 'summary', 'recommendation']
};

const SYSTEM_RULES = `Du bist ein erfahrener Lauftrainingsplaner.

Erstelle realistische Trainingspläne anhand der vorhandenen Daten:
aktuelles Leistungsniveau, Bestzeiten, Wochenkilometer, Long Run, verfügbare
Trainingstage, Zielzeit, Herzfrequenz, andere Sportarten, Regeneration,
progressive Belastung, Entlastungswochen und Tapering vor dem Wettkampf.

Regeln:
- Nutze ausschließlich die Trainingstypen: easy, long, recovery, tempo, interval, marathon_pace, race, rest.
- Plane nur an den vom Nutzer angegebenen verfügbaren Tagen, nie an ausgeschlossenen Tagen.
- Eine Zielzeit wird nicht blind erzwungen, wenn die Leistungsdaten deutlich dagegen sprechen.
  Erstelle dann einen konservativeren Plan und erkläre die Abweichung klar in "summary" bzw. "adjustment".
  "Hauptsache ankommen" heißt: Fokus auf sicheres Finish, moderate Belastungssteigerung.
- Steigere den Umfang moderat (Faustregel: nicht mehr als ca. 10% pro Woche), baue regelmäßig
  Entlastungswochen ein und tapere in den letzten 1-3 Wochen vor dem Event.
- Stelle KEINE medizinischen Diagnosen. Bei Hinweisen auf Verletzungen oder Schmerzen in Notizen
  des Nutzers: keine Diagnose, stattdessen auf professionelle medizinische Beratung hinweisen
  (z.B. im jeweiligen Beschreibungstext) und die Belastung an der Stelle vorsichtig halten.
- Alle Texte auf Deutsch, unkompliziert, direkt, leicht verständlich, keine unnötig technischen Formulierungen.
- "date" immer im Format YYYY-MM-DD, "startDate" jeder Woche ist ein Montag.`;

function fmtPB(v) { return v && String(v).trim() ? v : 'unbekannt'; }
function fmtNum(v, unit) { return (v || v === 0) ? `${v}${unit || ''}` : 'unbekannt'; }
function weekdayList(arr, names) { return (arr || []).map(d => names[d]).join(', ') || 'keine Angabe'; }

export function buildPlanPrompt({ profile, running, hr, conditions, goal, weekdayNames }) {
  const goalLine = goal.type === 'custom'
    ? `Eigenes Ziel: ${goal.customLabel || goal.eventName || 'nicht naeher beschrieben'}`
    : `Zieldistanz: ${({ '5k': '5 km', '10k': '10 km', half: 'Halbmarathon', marathon: 'Marathon' })[goal.type] || goal.type}`;
  const timeLine = goal.finishOnly ? 'Zielzeit: keine, Hauptsache ankommen' : `Zielzeit: ${fmtPB(goal.targetTime)}`;

  return `${SYSTEM_RULES}

Erstelle jetzt einen vollständigen Trainingsplan von heute (${todayForPrompt()}) bis zum Eventdatum.
Gib NUR die geforderten JSON-Felder zurück.

=== Persönliche Daten ===
Alter: ${fmtNum(profile.age)}
Geschlecht: ${profile.sex || 'keine Angabe'}
Gewicht: ${fmtNum(profile.weight, ' kg')}
Größe: ${fmtNum(profile.height, ' cm')}

=== Laufdaten ===
5-km-Bestzeit: ${fmtPB(running.pb5k)}
10-km-Bestzeit: ${fmtPB(running.pb10k)}
Halbmarathon-Bestzeit: ${fmtPB(running.pbHalf)}
Marathon-Bestzeit: ${fmtPB(running.pbMarathon)}
Durchschnittliche Wochenkilometer: ${fmtNum(running.weeklyKm, ' km')}
Längster bisheriger Lauf: ${fmtNum(running.longestRun, ' km')}
Läufe pro Woche aktuell: ${fmtNum(running.runsPerWeek)}

=== Herzfrequenz ===
Maximale HF: ${fmtNum(hr.maxHr, ' bpm')}
Ruhepuls: ${fmtNum(hr.restHr, ' bpm')}
HF-Zonen (falls angegeben): ${hr.zones || 'keine Angabe'}

=== Rahmenbedingungen ===
Verfügbare Lauftage: ${weekdayList(conditions.availableDays, weekdayNames)}
Ausgeschlossene Tage: ${weekdayList(conditions.excludedDays, weekdayNames)}
Anzahl Läufe pro Woche: ${fmtNum(conditions.runsPerWeek)}
Längster verfügbarer Trainingstag: ${weekdayNames[conditions.longRunDay] ?? 'keine Angabe'}
Zeit am längsten Tag: bis zu ${fmtNum(conditions.longestMinutes, ' min')}
Krafttraining: ${conditions.strength ? 'ja' : 'nein'}
Andere Sportarten: ${conditions.otherSports || 'keine'}
Sonstige Hinweise: ${conditions.notes || 'keine'}

=== Ziel ===
${goalLine}
Event: ${goal.eventName || 'kein Name angegeben'}
Eventdatum: ${goal.eventDate || 'kein Datum angegeben'}
${timeLine}`;
}

export function buildAnalysisPrompt({ plan, activities, weekStart, weekEnd, goal, weekdayNames, conditions }) {
  const plannedWeek = (plan?.weeks || []).find(w => w.startDate === weekStart);
  const actualRuns = activities.filter(a => a.date >= weekStart && a.date <= weekEnd);
  return `${SYSTEM_RULES}

Analysiere die vergangene Trainingswoche (${weekStart} bis ${weekEnd}) und gib eine kurze
Wochenanalyse zurück. Schlage nur dann angepasste Wochen vor (adjustedWeeks), wenn es die
absolvierten Läufe wirklich nahelegen (deutlich mehr/weniger als geplant, verpasste Läufe,
auffällige Herzfrequenz). Passe nur zukünftige, noch nicht begonnene Wochen an, niemals die
Vergangenheit. Gib NUR die geforderten JSON-Felder zurück.

=== Geplante Woche ===
${plannedWeek ? JSON.stringify(plannedWeek) : 'kein Plan für diese Woche vorhanden'}

=== Tatsächlich absolvierte Läufe dieser Woche ===
${actualRuns.length ? JSON.stringify(actualRuns) : 'keine Läufe eingetragen'}

=== Restlicher Plan (kommende Wochen, zur Orientierung) ===
${JSON.stringify((plan?.weeks || []).filter(w => w.startDate > weekStart))}

=== Rahmenbedingungen ===
Verfügbare Lauftage: ${weekdayList(conditions.availableDays, weekdayNames)}
Ausgeschlossene Tage: ${weekdayList(conditions.excludedDays, weekdayNames)}

=== Ziel ===
${goal.eventName || 'kein Event'} am ${goal.eventDate || 'unbekannt'}, Zielzeit: ${goal.finishOnly ? 'Hauptsache ankommen' : fmtPB(goal.targetTime)}`;
}

function todayForPrompt() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function validatePlanShape(obj) {
  if (!obj || !Array.isArray(obj.weeks) || !obj.weeks.length) return 'Plan enthält keine Wochen.';
  for (const w of obj.weeks) {
    if (!w.startDate || !Array.isArray(w.workouts)) return 'Eine Woche im Plan ist unvollständig.';
    for (const wo of w.workouts) {
      if (!wo.date || !wo.type) return 'Ein Training im Plan ist unvollständig.';
    }
  }
  return null;
}

export async function generatePlan(inputData) {
  const prompt = buildPlanPrompt(inputData);
  const obj = await gemini([{ text: prompt }], PLAN_SCHEMA, 0.4);
  const err = validatePlanShape(obj);
  if (err) throw new Error('Ungültige Antwort erhalten: ' + err);
  return obj;
}

export async function analyzeWeek(inputData) {
  const prompt = buildAnalysisPrompt(inputData);
  const obj = await gemini([{ text: prompt }], ANALYSIS_SCHEMA, 0.3);
  if (typeof obj?.summary !== 'string') throw new Error('Ungültige Antwort erhalten.');
  if (obj.adjustedWeeks && obj.adjustedWeeks.length) {
    const err = validatePlanShape({ weeks: obj.adjustedWeeks });
    if (err) throw new Error('Ungültiger Anpassungsvorschlag: ' + err);
  }
  return obj;
}
