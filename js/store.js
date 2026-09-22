// Kompletter lokaler Speicher der App. Nichts verlaesst das Geraet ausser
// dem, was fuer eine Gemini-Anfrage noetig ist (siehe gemini.js).

function jget(k, def) {
  try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? def : v; }
  catch { return def; }
}
function jset(k, v) {
  try { localStorage.setItem(k, JSON.stringify(v)); return true; }
  catch (e) { console.error('Speicherfehler', e); return false; }
}

export const K = {
  key: 'lb_key', model: 'lb_model', pinned: 'lb_pinned', onb: 'lb_onb',
  profile: 'lb_profile', running: 'lb_running', hr: 'lb_hr',
  conditions: 'lb_conditions', goal: 'lb_goal',
  plan: 'lb_plan', activities: 'lb_activities', analyses: 'lb_analyses'
};

export const DEF_PROFILE = { age: null, sex: '', weight: null, height: null };
export const DEF_RUNNING = { pb5k: '', pb10k: '', pbHalf: '', pbMarathon: '', weeklyKm: null, longestRun: null, runsPerWeek: 3 };
export const DEF_HR = { maxHr: null, restHr: null, zones: '' };
export const DEF_CONDITIONS = {
  availableDays: [1, 2, 3, 4, 6], runsPerWeek: 3, longRunDay: 6, longestMinutes: 90,
  strength: false, otherSports: '', excludedDays: [], notes: ''
};
export const DEF_GOAL = { type: '', eventName: '', eventDate: '', targetTime: '', finishOnly: false };

export const WEEKDAY_NAMES = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
export const WEEKDAY_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

export const WORKOUT_TYPES = {
  easy:           { label: 'Easy Run',        color: '--easy' },
  long:           { label: 'Long Run',        color: '--long' },
  recovery:       { label: 'Recovery Run',    color: '--recovery' },
  tempo:          { label: 'Tempo',           color: '--tempo' },
  interval:       { label: 'Intervalle',      color: '--interval' },
  marathon_pace:  { label: 'Marathon Pace',   color: '--long' },
  race:           { label: 'Race Simulation', color: '--race' },
  rest:           { label: 'Rest',            color: '--rest' }
};

export const GOAL_TYPES = {
  '5k': '5 km', '10k': '10 km', half: 'Halbmarathon', marathon: 'Marathon', custom: 'Eigenes Ziel'
};

export const store = {
  get key() { return localStorage.getItem(K.key) || ''; },
  set key(v) { localStorage.setItem(K.key, v || ''); },
  get model() { return localStorage.getItem(K.model) || 'gemini-2.5-flash'; },
  set model(v) { localStorage.setItem(K.model, v); },
  get pinned() { return localStorage.getItem(K.pinned) === '1'; },
  set pinned(v) { localStorage.setItem(K.pinned, v ? '1' : '0'); },
  get onbDone() { return localStorage.getItem(K.onb) === '1'; },
  set onbDone(v) { localStorage.setItem(K.onb, v ? '1' : '0'); },

  get profile() { return { ...DEF_PROFILE, ...jget(K.profile, {}) }; },
  set profile(v) { jset(K.profile, v); },
  get running() { return { ...DEF_RUNNING, ...jget(K.running, {}) }; },
  set running(v) { jset(K.running, v); },
  get hr() { return { ...DEF_HR, ...jget(K.hr, {}) }; },
  set hr(v) { jset(K.hr, v); },
  get conditions() { return { ...DEF_CONDITIONS, ...jget(K.conditions, {}) }; },
  set conditions(v) { jset(K.conditions, v); },
  get goal() { return { ...DEF_GOAL, ...jget(K.goal, {}) }; },
  set goal(v) { jset(K.goal, v); },

  get plan() { return jget(K.plan, null); },
  set plan(v) { jset(K.plan, v); },

  get activities() { return jget(K.activities, []); },
  set activities(v) { jset(K.activities, v); },

  get analyses() { return jget(K.analyses, []); },
  set analyses(v) { jset(K.analyses, v); }
};

export function addActivity(entry) {
  const list = store.activities;
  list.unshift(entry);
  list.sort((a, b) => b.date.localeCompare(a.date));
  store.activities = list;
  return entry;
}
export function updateActivity(id, patch) {
  const list = store.activities.map(a => a.id === id ? { ...a, ...patch } : a);
  store.activities = list;
}
export function deleteActivity(id) {
  store.activities = store.activities.filter(a => a.id !== id);
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// Alle geplanten Workouts als flache, datumssortierte Liste.
export function flatWorkouts() {
  const plan = store.plan;
  if (!plan || !Array.isArray(plan.weeks)) return [];
  const out = [];
  for (const w of plan.weeks) {
    for (const wo of (w.workouts || [])) out.push({ ...wo, week: w.week });
  }
  out.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  return out;
}

export function nextWorkout(fromIso) {
  const all = flatWorkouts();
  return all.find(w => w.date >= fromIso && w.type !== 'rest') || null;
}

export function exportAll() {
  return {
    app: 'laufbestie', version: 1, exportedAt: new Date().toISOString(),
    profile: store.profile, running: store.running, hr: store.hr,
    conditions: store.conditions, goal: store.goal, plan: store.plan,
    activities: store.activities, analyses: store.analyses
  };
}

export function validateImport(data) {
  if (!data || typeof data !== 'object') return 'Datei ist kein gueltiges JSON-Objekt.';
  if (data.app !== 'laufbestie') return 'Das ist keine Laufbestie-Sicherung.';
  if (!Array.isArray(data.activities)) return 'Aktivitaeten fehlen oder sind ungueltig.';
  return null;
}

export function importAll(data) {
  if (data.profile) store.profile = data.profile;
  if (data.running) store.running = data.running;
  if (data.hr) store.hr = data.hr;
  if (data.conditions) store.conditions = data.conditions;
  if (data.goal) store.goal = data.goal;
  if (data.plan !== undefined) store.plan = data.plan;
  if (Array.isArray(data.activities)) store.activities = data.activities;
  if (Array.isArray(data.analyses)) store.analyses = data.analyses;
}

export function wipeAll() {
  Object.values(K).forEach(k => localStorage.removeItem(k));
}
