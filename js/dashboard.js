// Home / Dashboard: Countdown, naechster Lauf, Wochenfortschritt, Ziel.
import { $, r0, r1, esc, todayIso, fmtDate, mondayOf, shiftIso, daysBetween, animIn } from './ui.js';
import { store, nextWorkout, flatWorkouts, WORKOUT_TYPES, GOAL_TYPES } from './store.js';
import { ico, paintIcons } from './icons.js';
import { formatPace, formatDuration, parseDuration } from './pace.js';

const GOAL_KM = { '5k': 5, '10k': 10, half: 21.0975, marathon: 42.195 };

// Riegel-Formel: schaetzt aus dem besten juengeren Lauf die aktuelle Form
// fuer die Zieldistanz. Keine Gemini-Anfrage noetig, nur grobe Orientierung.
function estimateGoalTime(activities, goal) {
  const targetKm = GOAL_KM[goal.type];
  if (!targetKm) return null;
  const cutoff = shiftIso(todayIso(), -90);
  const recent = activities.filter(a => a.distance >= 2.5 && a.durationSec > 0 && a.date >= cutoff);
  if (!recent.length) return null;
  let best = null;
  for (const a of recent) {
    const predicted = a.durationSec * Math.pow(targetKm / a.distance, 1.06);
    if (best === null || predicted < best) best = predicted;
  }
  return best;
}

export function renderHome() {
  const el = $('#v-home');
  const goal = store.goal;
  const plan = store.plan;
  const today = todayIso();

  el.innerHTML = `
    ${countdownCard(goal)}
    ${todayNote(plan, today)}
    <h2>Nächster Lauf</h2>
    ${nextRunCard(plan, today)}
    <h2>Diese Woche</h2>
    ${thisWeekCard(plan, today)}
    <h2>Ziel</h2>
    ${goalCard(goal)}
    <h2>Fortschritt<span class="r"><a href="#" id="homeProgressLink">alle Werte ›</a></span></h2>
    ${progressTeaser()}
  `;
  paintIcons(el);
  animIn(el);

  const link = $('#homeProgressLink');
  if (link) link.onclick = (e) => { e.preventDefault(); document.querySelector('nav [data-v="progress"]').click(); };
  const goPlan = $('#homeGoPlan');
  if (goPlan) goPlan.onclick = () => document.querySelector('nav [data-v="plan"]').click();
}

function countdownCard(goal) {
  if (!goal.eventDate) {
    return `<div class="card hero pad anim-in" style="margin-top:20px"><div class="hero-count">
      <div class="lbl">Noch kein Event eingetragen</div>
      <div class="ev">Trag dein Ziel unter „Mehr" ein</div>
    </div></div>`;
  }
  const today = todayIso();
  const d = daysBetween(today, goal.eventDate);
  const label = goal.eventName || GOAL_TYPES[goal.type] || 'dein Event';
  if (d < 0) {
    return `<div class="card hero pad anim-in" style="margin-top:20px"><div class="hero-count">
      <div class="ev">${esc(label)} liegt hinter dir</div>
      <div class="lbl">${fmtDate(goal.eventDate, { year: true })}</div>
    </div></div>`;
  }
  return `<div class="card hero pad anim-in" style="margin-top:20px"><div class="hero-count">
    <div class="n">${d}</div>
    <div class="lbl">${d === 1 ? 'Tag' : 'Tage'} bis ${esc(label)}</div>
    <div class="ev">${fmtDate(goal.eventDate, { year: true })}</div>
  </div></div>`;
}

function todayNote(plan, today) {
  if (!plan) return '';
  const wo = flatWorkouts().find(w => w.date === today);
  if (!wo || wo.type !== 'rest') return '';
  return `<div class="card pad anim-in" style="margin-top:14px;text-align:center">
    <span class="wtype rest">Ruhetag</span>
    <div class="hint" style="margin-top:8px">Heute ist laut Plan Erholung dran.</div>
  </div>`;
}

function nextRunCard(plan, today) {
  const wo = nextWorkout(today);
  if (!wo) {
    return `<div class="card pad anim-in">
      <div class="empty">
        <span class="ico" style="display:block;margin:0 auto 8px">${ico('calendar', 30)}</span>
        ${plan ? 'Kein weiteres Training im Plan.' : 'Noch kein Trainingsplan.'}
      </div>
      ${!plan ? `<button class="btn" id="homeGoPlan">Plan erstellen</button>` : ''}
    </div>`;
  }
  const wt = WORKOUT_TYPES[wo.type] || { label: wo.type, color: '--accent' };
  return `<div class="card pad anim-in">
    <div style="display:flex;align-items:center;gap:10px">
      <span class="wtype ${wo.type}">${wt.label}</span>
      <span class="spacer" style="flex:1"></span>
      <b style="font-size:13px;color:var(--muted)">${fmtDate(wo.date)}</b>
    </div>
    <div class="stat-grid" style="margin-top:14px">
      <div class="stat"><div class="v">${wo.distance || 0}</div><div class="k">km</div></div>
      <div class="stat"><div class="v">${wo.duration || 0}</div><div class="k">min</div></div>
      <div class="stat" style="grid-column:span 2"><div class="v" style="font-size:14px">${wo.pace || '–'}</div><div class="k">min/km</div></div>
    </div>
    ${wo.description ? `<div class="hint" style="margin-top:12px">${esc(wo.description)}</div>` : ''}
  </div>`;
}

function thisWeekCard(plan, today) {
  const monday = mondayOf(today);
  const sunday = shiftIso(monday, 6);
  const week = plan?.weeks?.find(w => w.startDate === monday);
  const plannedKm = week ? (week.workouts || []).reduce((s, w) => s + (Number(w.distance) || 0), 0) : 0;
  const actualKm = store.activities.filter(a => a.date >= monday && a.date <= sunday).reduce((s, a) => s + (Number(a.distance) || 0), 0);
  const pct = plannedKm > 0 ? Math.min(1, actualKm / plannedKm) : (actualKm > 0 ? 1 : 0);
  const circ = 2 * Math.PI * 52;
  return `<div class="card pad anim-in">
    <div class="ring-wrap">
      <div class="ring">
        <svg width="122" height="122" viewBox="0 0 122 122">
          <circle class="trk" cx="61" cy="61" r="52" stroke-width="11"/>
          <circle class="arc" cx="61" cy="61" r="52" stroke-width="11" stroke-linecap="round"
            stroke-dasharray="${circ.toFixed(1)}" stroke-dashoffset="${(circ * (1 - pct)).toFixed(1)}"/>
        </svg>
        <div class="mid"><b>${r1(actualKm)}</b><small>km gelaufen</small></div>
      </div>
      <div class="today-side">
        <div class="ts-big">${r1(plannedKm)}</div>
        <div class="ts-lbl">km geplant</div>
        <div class="ts-sub">${fmtDate(monday, { weekday: false })} – ${fmtDate(sunday, { weekday: false })}</div>
      </div>
    </div>
  </div>`;
}

function goalCard(goal) {
  if (!goal.type) return `<div class="card pad anim-in"><div class="empty">Noch kein Ziel eingetragen.</div></div>`;
  const label = goal.type === 'custom' ? (goal.customLabel || 'Eigenes Ziel') : GOAL_TYPES[goal.type];
  const time = goal.finishOnly ? 'Hauptsache ankommen' : (goal.targetTime || 'keine Zielzeit');

  let formLine = '';
  const estimateSec = estimateGoalTime(store.activities, goal);
  if (estimateSec) {
    let tag = '';
    if (!goal.finishOnly && goal.targetTime) {
      const targetSec = parseDuration(goal.targetTime);
      if (targetSec) {
        const onTrack = estimateSec <= targetSec;
        tag = `<span class="tag ${onTrack ? 'ok' : 'warn'}" style="margin-left:8px">${onTrack ? 'auf Kurs' : 'hinter Ziel'}</span>`;
      }
    }
    formLine = `<div class="hint" style="margin-top:10px">Aktuelle Form: ~${formatDuration(estimateSec)}${tag}</div>`;
  }

  return `<div class="card pad anim-in">
    <div style="display:flex;align-items:center;gap:12px">
      <span class="ico" style="color:var(--accent)">${ico('trophy', 26)}</span>
      <div>
        <div style="font-size:17px;font-weight:700;letter-spacing:-.01em">${esc(label)}</div>
        <div class="hint" style="margin-top:2px">${esc(time)}</div>
      </div>
    </div>
    ${formLine}
  </div>`;
}

function progressTeaser() {
  const acts = store.activities;
  if (!acts.length) return `<div class="card pad anim-in"><div class="empty">Noch keine Läufe eingetragen.</div></div>`;
  const totalKm = acts.reduce((s, a) => s + (Number(a.distance) || 0), 0);
  const avgPaceList = acts.filter(a => a.distance && a.durationSec).map(a => a.durationSec / a.distance);
  const avgPace = avgPaceList.length ? avgPaceList.reduce((s, p) => s + p, 0) / avgPaceList.length : 0;
  return `<div class="card pad anim-in">
    <div class="stat-grid n3">
      <div class="stat"><div class="v">${acts.length}</div><div class="k">Läufe gesamt</div></div>
      <div class="stat"><div class="v">${r0(totalKm)}</div><div class="k">km gesamt</div></div>
      <div class="stat"><div class="v" style="font-size:14px">${formatPace(avgPace)}</div><div class="k">Ø Pace</div></div>
    </div>
  </div>`;
}
