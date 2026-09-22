// Fortschritt: km/Woche, Pace, Herzfrequenz, Long-Run-Distanz, geplant vs. tatsächlich.
import { $, r0, r1, todayIso, mondayOf, shiftIso, animIn } from './ui.js';
import { store } from './store.js';
import { drawGroupedBars, drawBars, drawLine } from './charts.js';
import { formatPace } from './pace.js';

const N_WEEKS = 8;

export function renderProgress() {
  const el = $('#v-progress');
  const acts = store.activities;
  const plan = store.plan;

  if (!acts.length && !plan) {
    el.innerHTML = `<div class="empty" style="margin-top:60px">Noch keine Daten für den Fortschritt.<br>Trag Läufe ein oder erstelle einen Plan.</div>`;
    animIn(el);
    return;
  }

  const weeks = buildWeeks(plan, acts);
  const labels = weeks.map(w => shortDate(w.startDate));

  el.innerHTML = `
    <h2 style="margin-top:20px">Kilometer pro Woche<span class="r">
      <span style="color:var(--line)">●</span> geplant &nbsp;<span style="color:var(--accent)">●</span> gelaufen</span></h2>
    <div class="card pad"><canvas id="chKm"></canvas></div>

    <h2>Pace</h2>
    <div class="card pad">
      <canvas id="chPace"></canvas>
      <div class="hint" style="text-align:center;margin-top:4px">Ø ${formatPace(lastValid(weeks.map(w => w.avgPace)))} in der letzten Woche mit Läufen</div>
    </div>

    <h2>Herzfrequenz</h2>
    <div class="card pad">
      <canvas id="chHr"></canvas>
      <div class="hint" style="text-align:center;margin-top:4px">${lastValid(weeks.map(w => w.avgHr)) ? `Ø ${r0(lastValid(weeks.map(w => w.avgHr)))} bpm in der letzten Woche mit Läufen` : 'Noch keine Herzfrequenzdaten'}</div>
    </div>

    <h2>Long-Run-Distanz</h2>
    <div class="card pad"><canvas id="chLong"></canvas></div>

    <h2>Insgesamt</h2>
    <div class="card pad">
      <div class="stat-grid">
        <div class="stat"><div class="v">${r0(sum(acts.map(a => a.distance)))}</div><div class="k">km gesamt</div></div>
        <div class="stat"><div class="v">${acts.length}</div><div class="k">Läufe</div></div>
        <div class="stat"><div class="v">${r1(sum(weeks.map(w => w.plannedKm)))}</div><div class="k">km geplant (8W)</div></div>
        <div class="stat"><div class="v">${r1(sum(weeks.map(w => w.actualKm)))}</div><div class="k">km gelaufen (8W)</div></div>
      </div>
    </div>
  `;
  animIn(el);

  drawGroupedBars($('#chKm'), labels, weeks.map(w => w.plannedKm), weeks.map(w => w.actualKm));
  drawLine($('#chPace'), labels, weeks.map(w => w.avgPace || null));
  drawLine($('#chHr'), labels, weeks.map(w => w.avgHr || null), { color: cssVarSafe('--interval') });
  drawBars($('#chLong'), labels, weeks.map(w => w.longRunKm), { color: cssVarSafe('--long') });
}

function cssVarSafe(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || undefined;
}

function buildWeeks(plan, acts) {
  const thisMonday = mondayOf(todayIso());
  const mondays = [];
  for (let i = N_WEEKS - 1; i >= 0; i--) mondays.push(shiftMonday(thisMonday, -i));

  return mondays.map(startDate => {
    const endDate = shiftIso(startDate, 6);
    const planWeek = plan?.weeks?.find(w => w.startDate === startDate);
    const plannedKm = planWeek ? sum((planWeek.workouts || []).map(w => w.distance)) : 0;
    const weekActs = acts.filter(a => a.date >= startDate && a.date <= endDate);
    const actualKm = sum(weekActs.map(a => a.distance));
    const longRunKm = weekActs.length ? Math.max(...weekActs.map(a => a.distance || 0)) : 0;
    const totalSec = sum(weekActs.map(a => a.durationSec));
    const avgPace = actualKm > 0 ? totalSec / actualKm : null;
    const hrs = weekActs.filter(a => a.avgHr).map(a => a.avgHr);
    const avgHr = hrs.length ? sum(hrs) / hrs.length : null;
    return { startDate, plannedKm, actualKm, longRunKm, avgPace, avgHr };
  });
}

function shiftMonday(monday, weeks) { return shiftIso(monday, weeks * 7); }
function sum(arr) { return arr.reduce((s, v) => s + (Number(v) || 0), 0); }
function lastValid(arr) { const r = arr.filter(v => v != null && v > 0); return r.length ? r[r.length - 1] : 0; }
function shortDate(isoStr) { const d = new Date(isoStr + 'T12:00:00'); return `${d.getDate()}.${d.getMonth() + 1}.`; }
