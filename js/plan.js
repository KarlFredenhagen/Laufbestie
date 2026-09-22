// Plan-Ansicht: Trainingsplan erzeugen, anzeigen, woechentlich anpassen.
import { $, esc, r1, todayIso, fmtDate, mondayOf, shiftIso, animIn, toast, tap } from './ui.js';
import { store, WORKOUT_TYPES, WEEKDAY_NAMES, uid } from './store.js';
import { ico, paintIcons } from './icons.js';
import { generatePlan, analyzeWeek } from './gemini.js';
import { downloadIcs } from './ics.js';

let busy = false;

export function renderPlan() {
  const el = $('#v-plan');
  const plan = store.plan;
  el.innerHTML = `
    ${!plan ? generateCard() : planHeader(plan)}
    <div id="planStatus"></div>
    ${plan ? weeksMarkup(plan) : ''}
    ${plan ? analysisSection() : ''}
  `;
  paintIcons(el);
  animIn(el);
  wire(el);
}

function generateCard() {
  return `<div class="card pad anim-in" style="margin-top:20px">
    <div style="display:flex;align-items:center;gap:12px">
      <span class="ico" style="color:var(--accent)">${ico('sparkle', 26)}</span>
      <div>
        <div style="font-size:16px;font-weight:700">Noch kein Trainingsplan</div>
        <div class="hint" style="margin-top:2px">Gemini erstellt ihn aus deinen Daten unter „Mehr".</div>
      </div>
    </div>
    <button class="btn" id="planGenerate" style="margin-top:16px">Trainingsplan erstellen</button>
  </div>`;
}

function planHeader(plan) {
  return `<div class="card pad anim-in" style="margin-top:20px">
    <div style="font-size:14px;line-height:1.5">${esc(plan.summary || '')}</div>
    <div class="row" style="margin-top:14px">
      <button class="btn-ghost btn-sm" id="planExportIcs">${ico('calendar', 15)} In Kalender exportieren</button>
      <button class="btn-ghost btn-sm" id="planRegenerate">${ico('refresh', 15)} Neu erstellen</button>
    </div>
    <div class="hint" style="margin-top:10px">Lädt eine .ics-Datei mit allen Läufen — öffnen oder in Apple/Google/Outlook-Kalender importieren.</div>
  </div>`;
}

function weeksMarkup(plan) {
  const today = todayIso();
  return (plan.weeks || []).map(w => {
    const isPast = shiftIso(w.startDate, 6) < today;
    return `<h2>Woche ${w.week}${w.focus ? ' · ' + esc(w.focus) : ''}<span class="r">${r1(w.totalKm || sumKm(w))} km</span></h2>
    <div class="card ${isPast ? '' : ''}">
      ${(w.workouts || []).map(wo => workoutRow(wo)).join('') || `<div class="slot-empty" style="padding:14px">Keine Läufe geplant</div>`}
    </div>`;
  }).join('');
}

function sumKm(w) { return (w.workouts || []).reduce((s, x) => s + (Number(x.distance) || 0), 0); }

function workoutRow(wo) {
  const wt = WORKOUT_TYPES[wo.type] || { label: wo.type };
  return `<div class="wrow">
    <div class="d">${fmtDate(wo.date).split(',')[0]}<br>${wo.date.slice(8, 10)}.${wo.date.slice(5, 7)}.</div>
    <div class="body">
      <span class="wtype ${wo.type}">${wt.label}</span>
      ${wo.type !== 'rest' ? `<b>${wo.distance || 0} km · ${wo.duration || 0} min</b>` : ''}
      ${wo.description ? `<div class="desc">${esc(wo.description)}</div>` : ''}
      ${wo.type !== 'rest' ? `<div class="meta">${wo.pace ? `<span>${esc(wo.pace)} min/km</span>` : ''}${wo.heartRate ? `<span>${esc(wo.heartRate)}</span>` : ''}${wo.goal ? `<span>${esc(wo.goal)}</span>` : ''}</div>` : ''}
    </div>
  </div>`;
}

function analysisSection() {
  const today = todayIso();
  const monday = mondayOf(today);
  const analyses = store.analyses;
  const last = analyses.find(a => a.weekStart === monday);
  return `<h2>Wochenanalyse</h2>
  <div class="card pad">
    <div class="hint">Vergleicht die Woche ${fmtDate(monday, { weekday: false })} – ${fmtDate(shiftIso(monday, 6), { weekday: false })} mit dem, was du wirklich gelaufen bist.</div>
    <button class="btn" id="analyzeWeek" style="margin-top:14px">Woche analysieren</button>
    <div id="analysisResult">${last ? analysisResultMarkup(last) : ''}</div>
  </div>`;
}

function analysisResultMarkup(a) {
  const rec = a.result.recommendation;
  const tagClass = rec === 'weiter wie geplant' ? 'ok' : (rec === 'deutlich anpassen' ? 'err' : 'warn');
  return `<div class="sep"></div>
    <div class="stat-grid n3">
      <div class="stat"><div class="v">${r1(a.result.actualKm)}/${r1(a.result.plannedKm)}</div><div class="k">km</div></div>
      <div class="stat"><div class="v">${a.result.runsCompleted}/${a.result.runsPlanned}</div><div class="k">Läufe</div></div>
      <div class="stat"><div class="v">${r1(a.result.longRunKm || 0)}</div><div class="k">Long Run</div></div>
    </div>
    <div class="analysis" style="margin-top:14px">${esc(a.result.summary)}</div>
    <div style="margin-top:10px"><span class="tag ${tagClass}">${esc(rec)}</span></div>
    ${a.result.adjustedWeeks && a.result.adjustedWeeks.length ? `
      ${a.result.adjustment ? `<div class="hint" style="margin-top:10px">${esc(a.result.adjustment)}</div>` : ''}
      <button class="btn" id="applyAdjustment" style="margin-top:14px">Trainingsplan anpassen</button>
    ` : ''}`;
}

function wire(el) {
  const gen = $('#planGenerate');
  if (gen) gen.onclick = () => doGenerate(false);
  const regen = $('#planRegenerate');
  if (regen) regen.onclick = () => {
    if (window.confirm('Neuen Plan erstellen? Der bestehende Plan wird ersetzt.')) doGenerate(true);
  };
  const analyze = $('#analyzeWeek');
  if (analyze) analyze.onclick = doAnalyze;
  const exportIcs = $('#planExportIcs');
  if (exportIcs) exportIcs.onclick = () => {
    const plan = store.plan;
    if (!plan) return;
    const hasWorkouts = (plan.weeks || []).some(w => (w.workouts || []).some(wo => wo.type !== 'rest'));
    if (!hasWorkouts) { toast('Keine Läufe im Plan zum Exportieren'); return; }
    tap();
    downloadIcs(plan, `laufbestie-plan-${todayIso()}.ics`);
    toast('Kalenderdatei wird heruntergeladen');
  };
}

async function doGenerate(isRegen) {
  if (busy) return;
  if (!store.key.trim()) { toast('Trag zuerst deinen Gemini API Key unter „Mehr" ein'); return; }
  if (!store.goal.eventDate) { toast('Trag zuerst dein Ziel unter „Mehr" ein'); return; }
  busy = true;
  tap();
  setStatus('load', 'Gemini erstellt deinen Plan …');
  try {
    const plan = await generatePlan({
      profile: store.profile, running: store.running, hr: store.hr,
      conditions: store.conditions, goal: store.goal, weekdayNames: WEEKDAY_NAMES
    });
    store.plan = plan;
    setStatus(null);
    toast(isRegen ? 'Neuer Plan erstellt' : 'Plan erstellt');
    renderPlan();
  } catch (e) {
    setStatus('err', e.message || 'Unbekannter Fehler beim Erstellen des Plans.');
  } finally {
    busy = false;
  }
}

async function doAnalyze() {
  if (busy) return;
  const plan = store.plan;
  if (!plan) { toast('Erst einen Plan erstellen'); return; }
  if (!store.key.trim()) { toast('Trag zuerst deinen Gemini API Key unter „Mehr" ein'); return; }
  busy = true;
  tap();
  const btn = $('#analyzeWeek');
  const resultBox = $('#analysisResult');
  if (btn) btn.disabled = true;
  resultBox.innerHTML = `<div class="status load"><div class="spin"></div>Gemini analysiert deine Woche …</div>`;
  try {
    const monday = mondayOf(todayIso());
    const sunday = shiftIso(monday, 6);
    const result = await analyzeWeek({
      plan, activities: store.activities, weekStart: monday, weekEnd: sunday,
      goal: store.goal, weekdayNames: WEEKDAY_NAMES, conditions: store.conditions
    });
    const analyses = store.analyses.filter(a => a.weekStart !== monday);
    analyses.unshift({ id: uid(), weekStart: monday, generatedAt: new Date().toISOString(), result });
    store.analyses = analyses;
    resultBox.innerHTML = analysisResultMarkup({ weekStart: monday, result });
    const applyBtn = $('#applyAdjustment');
    if (applyBtn) applyBtn.onclick = () => applyAdjustment(result.adjustedWeeks);
    toast('Wochenanalyse erstellt');
  } catch (e) {
    resultBox.innerHTML = `<div class="status err">${ico('warn', 16)} ${esc(e.message || 'Unbekannter Fehler bei der Analyse.')}</div>`;
  } finally {
    busy = false;
    if (btn) btn.disabled = false;
  }
}

function applyAdjustment(adjustedWeeks) {
  if (!adjustedWeeks || !adjustedWeeks.length) return;
  if (!window.confirm('Trainingsplan wirklich anpassen? Die betroffenen kommenden Wochen werden ersetzt.')) return;
  const plan = store.plan;
  const byStart = new Map(adjustedWeeks.map(w => [w.startDate, w]));
  const merged = plan.weeks.map(w => byStart.has(w.startDate) ? byStart.get(w.startDate) : w);
  for (const w of adjustedWeeks) if (!merged.some(m => m.startDate === w.startDate)) merged.push(w);
  merged.sort((a, b) => a.startDate.localeCompare(b.startDate));
  store.plan = { ...plan, weeks: merged };
  toast('Plan angepasst');
  renderPlan();
}

function setStatus(kind, msg) {
  const box = $('#planStatus');
  if (!box) return;
  if (!kind) { box.innerHTML = ''; return; }
  box.innerHTML = `<div class="status ${kind}">${kind === 'load' ? '<div class="spin"></div>' : ico('warn', 16)} ${esc(msg)}</div>`;
}
