// Einfaches, mehrstufiges Onboarding: wenig Felder pro Schritt, jederzeit
// zurueckspringbar. Sammelt alles in onbData und schreibt es erst am Ende
// gesammelt in den Speicher.
import { $, $$, esc, toast, tap, animIn } from './ui.js';
import { store, DEF_PROFILE, DEF_RUNNING, DEF_HR, DEF_CONDITIONS, DEF_GOAL, GOAL_TYPES } from './store.js';
import { textField, textareaField, segField, dayPicker, switchField, wireSeg, wireDayPick, readSeg, readDayPick } from './fields.js';
import { paintIcons, ico } from './icons.js';
import { testApiKey } from './gemini.js';

let data = {};
let step = 0;
let onFinish = null;

const STEPS = ['welcome', 'personal', 'pbs', 'volume', 'heartrate', 'days', 'other', 'goalType', 'goalDetails', 'apiKey'];

export function startOnboarding(finishCb) {
  onFinish = finishCb;
  data = {
    profile: { ...DEF_PROFILE, ...store.profile },
    running: { ...DEF_RUNNING, ...store.running },
    hr: { ...DEF_HR, ...store.hr },
    conditions: { ...DEF_CONDITIONS, ...store.conditions },
    goal: { ...DEF_GOAL, ...store.goal },
    apiKey: store.key
  };
  step = 0;
  $('#onb').classList.remove('hidden');
  render();
}

function dots() {
  $('#onbDots').innerHTML = STEPS.map((_, i) => `<div class="dot ${i <= step ? 'on' : ''}"></div>`).join('');
}

function nav(canBack, nextLabel) {
  return `<div class="onb-nav">
    ${canBack ? `<button class="btn-ghost" id="onbBack">${ico('chev', 16)}</button>` : ''}
    <button class="btn" id="onbNext">${nextLabel || 'Weiter'}</button>
  </div>`;
}

function render() {
  dots();
  const body = $('#onbBody');
  body.innerHTML = renderStep(STEPS[step]);
  paintIcons(body);
  wireStep(STEPS[step], body);
  const back = $('#onbBack');
  if (back) back.onclick = () => { tap(); step = Math.max(0, step - 1); render(); };
  const next = $('#onbNext');
  if (next) next.onclick = () => { tap(); handleNext(STEPS[step]); };
  animIn(body);
}

function renderStep(s) {
  const { profile, running, hr, conditions, goal } = data;
  if (s === 'welcome') return `
    <h1>Willkommen bei Laufbestie</h1>
    <p class="lead">Erzähl uns kurz von dir und deinem Ziel — daraus baut Gemini deinen persönlichen Laufplan. Dauert etwa zwei Minuten, alles bleibt auf deinem Gerät.</p>
    ${nav(false, 'Los geht\'s')}`;

  if (s === 'personal') return `
    <h1>Persönliche Daten</h1>
    <p class="lead">Optional, hilft aber bei der Einschätzung deiner Belastbarkeit.</p>
    <div class="row">
      ${textField({ id: 'pAge', label: 'Alter', value: profile.age, type: 'number', inputmode: 'numeric', placeholder: 'z.B. 34' })}
      ${textField({ id: 'pWeight', label: 'Gewicht kg', value: profile.weight, type: 'number', inputmode: 'decimal', placeholder: 'z.B. 72' })}
    </div>
    <div class="row" style="margin-top:14px">
      ${textField({ id: 'pHeight', label: 'Größe cm (optional)', value: profile.height, type: 'number', inputmode: 'numeric', placeholder: 'z.B. 178' })}
      <div></div>
    </div>
    ${segField({ label: 'Geschlecht (optional)', name: 'sex', value: profile.sex, options: [{ value: 'w', label: 'weiblich' }, { value: 'm', label: 'männlich' }, { value: 'd', label: 'divers' }] })}
    ${nav(true)}`;

  if (s === 'pbs') return `
    <h1>Deine Bestzeiten</h1>
    <p class="lead">Was du weißt — leer lassen, was nicht zutrifft. Format z.B. 24:30 oder 1:52:10.</p>
    <div class="row">
      ${textField({ id: 'r5k', label: '5-km-PB', value: running.pb5k, placeholder: 'mm:ss' })}
      ${textField({ id: 'r10k', label: '10-km-PB', value: running.pb10k, placeholder: 'mm:ss' })}
    </div>
    <div class="row" style="margin-top:14px">
      ${textField({ id: 'rHalf', label: 'Halbmarathon-PB', value: running.pbHalf, placeholder: 'h:mm:ss' })}
      ${textField({ id: 'rMara', label: 'Marathon-PB', value: running.pbMarathon, placeholder: 'h:mm:ss' })}
    </div>
    ${nav(true)}`;

  if (s === 'volume') return `
    <h1>Dein aktuelles Pensum</h1>
    <div class="row">
      ${textField({ id: 'rWeekly', label: 'Ø Wochenkilometer', value: running.weeklyKm, type: 'number', inputmode: 'decimal', placeholder: 'z.B. 25' })}
      ${textField({ id: 'rLongest', label: 'Längster Lauf bisher, km', value: running.longestRun, type: 'number', inputmode: 'decimal', placeholder: 'z.B. 16' })}
    </div>
    <div class="field" style="margin-top:14px">
      ${textField({ id: 'rRuns', label: 'Läufe pro Woche aktuell', value: running.runsPerWeek, type: 'number', inputmode: 'numeric', placeholder: 'z.B. 3' })}
    </div>
    ${nav(true)}`;

  if (s === 'heartrate') return `
    <h1>Herzfrequenz</h1>
    <p class="lead">Optional, macht den Plan aber genauer.</p>
    <div class="row">
      ${textField({ id: 'hMax', label: 'Maximale HF', value: hr.maxHr, type: 'number', inputmode: 'numeric', placeholder: 'z.B. 188' })}
      ${textField({ id: 'hRest', label: 'Ruhepuls', value: hr.restHr, type: 'number', inputmode: 'numeric', placeholder: 'z.B. 54' })}
    </div>
    ${textField({ id: 'hZones', label: 'HF-Zonen (optional)', value: hr.zones, placeholder: 'z.B. Zone 2: 130-148' })}
    ${nav(true)}`;

  if (s === 'days') return `
    <h1>Deine Trainingstage</h1>
    ${dayPicker({ label: 'An welchen Tagen kannst du laufen?', name: 'avail', selected: conditions.availableDays })}
    ${textField({ id: 'cRuns', label: 'Läufe pro Woche', value: conditions.runsPerWeek, type: 'number', inputmode: 'numeric', placeholder: 'z.B. 4' })}
    <div class="field">
      <label>Bevorzugter Long-Run-Tag</label>
      <div class="seg days" data-daypick-single="longday">
        ${['So','Mo','Di','Mi','Do','Fr','Sa'].map((d,i)=>`<button type="button" data-day="${i}" class="${conditions.longRunDay===i?'on':''}">${d}</button>`).join('')}
      </div>
    </div>
    ${textField({ id: 'cLongMin', label: 'Zeit am längsten Tag, Minuten', value: conditions.longestMinutes, type: 'number', inputmode: 'numeric', placeholder: 'z.B. 90' })}
    ${nav(true)}`;

  if (s === 'other') return `
    <h1>Sonstiges</h1>
    ${dayPicker({ label: 'Ausgeschlossene Tage (nie Training)', name: 'excl', selected: conditions.excludedDays })}
    ${switchField({ id: 'cStrength', label: 'Krafttraining', sub: 'baust du regelmäßig ein', checked: conditions.strength })}
    ${textField({ id: 'cOther', label: 'Radfahren / andere Sportarten', value: conditions.otherSports, placeholder: 'z.B. 1× Rad, 1× Schwimmen' })}
    ${textareaField({ id: 'cNotes', label: 'Sonstige Hinweise', value: conditions.notes, placeholder: 'z.B. altes Knieproblem, Reise in Woche 4, ...' })}
    ${nav(true)}`;

  if (s === 'goalType') return `
    <h1>Dein Ziel</h1>
    ${segField({ label: 'Zieldistanz', name: 'goalType', value: goal.type, columns: true, options: [
      { value: '5k', label: '5 km' }, { value: '10k', label: '10 km' },
      { value: 'half', label: 'Halbmarathon' }, { value: 'marathon', label: 'Marathon' },
      { value: 'custom', label: 'Eigenes Ziel' }
    ] })}
    ${nav(true)}`;

  if (s === 'goalDetails') return `
    <h1>Event</h1>
    ${goal.type === 'custom' ? textField({ id: 'gCustom', label: 'Beschreibe dein Ziel', value: goal.customLabel, placeholder: 'z.B. 10× 5 km ohne Pause laufen' }) : ''}
    ${textField({ id: 'gName', label: 'Eventname', value: goal.eventName, placeholder: 'z.B. Vienna City Marathon' })}
    ${textField({ id: 'gDate', label: 'Eventdatum', value: goal.eventDate, type: 'date' })}
    ${switchField({ id: 'gFinish', label: 'Hauptsache ankommen', sub: 'keine feste Zielzeit', checked: goal.finishOnly })}
    <div class="field" id="gTimeField" style="${goal.finishOnly ? 'display:none' : ''}">
      ${textField({ id: 'gTime', label: 'Zielzeit', value: goal.targetTime, placeholder: 'h:mm:ss, z.B. 4:59:00' })}
    </div>
    ${nav(true)}`;

  if (s === 'apiKey') return `
    <h1>Gemini API Key</h1>
    <p class="lead">Damit Gemini deinen Plan erstellen kann. Bleibt nur auf diesem Gerät, geht nie über einen eigenen Server. Du kannst ihn jederzeit unter „Mehr" ändern oder löschen.</p>
    <div class="field pw">
      <label for="apiKeyInput">API Key</label>
      <input id="apiKeyInput" class="masked" value="${esc(data.apiKey)}" placeholder="Key einfügen" autocomplete="off" spellcheck="false">
      <button type="button" class="pw-eye" id="apiKeyEye">${ico('eye', 16)}</button>
    </div>
    <div class="hint">Kostenlosen Key holen: <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a></div>
    <div id="onbKeyStatus"></div>
    ${nav(true, 'Fertig')}`;

  return '';
}

function wireStep(s, body) {
  if (s === 'personal') wireSeg(body, 'sex');
  if (s === 'days') {
    wireDayPick(body, 'avail');
    const single = body.querySelector('[data-daypick-single="longday"]');
    if (single) single.querySelectorAll('button').forEach(b => b.onclick = () => {
      single.querySelectorAll('button').forEach(x => x.classList.remove('on'));
      b.classList.add('on');
    });
  }
  if (s === 'other') wireDayPick(body, 'excl');
  if (s === 'goalType') wireSeg(body, 'goalType');
  if (s === 'goalDetails') {
    const fin = $('#gFinish');
    if (fin) fin.onchange = () => { $('#gTimeField').style.display = fin.checked ? 'none' : ''; };
  }
  if (s === 'apiKey') {
    const inp = $('#apiKeyInput');
    const eye = $('#apiKeyEye');
    if (eye) eye.onclick = () => {
      inp.classList.toggle('masked');
      eye.innerHTML = ico(inp.classList.contains('masked') ? 'eye' : 'eyeOff', 16);
    };
  }
}

function handleNext(s) {
  const body = $('#onbBody');
  if (s === 'personal') {
    data.profile.age = numOrNull($('#pAge').value);
    data.profile.weight = numOrNull($('#pWeight').value);
    data.profile.height = numOrNull($('#pHeight').value);
    data.profile.sex = readSeg(body, 'sex') || '';
  }
  if (s === 'pbs') {
    data.running.pb5k = $('#r5k').value.trim();
    data.running.pb10k = $('#r10k').value.trim();
    data.running.pbHalf = $('#rHalf').value.trim();
    data.running.pbMarathon = $('#rMara').value.trim();
  }
  if (s === 'volume') {
    data.running.weeklyKm = numOrNull($('#rWeekly').value);
    data.running.longestRun = numOrNull($('#rLongest').value);
    data.running.runsPerWeek = numOrNull($('#rRuns').value);
  }
  if (s === 'heartrate') {
    data.hr.maxHr = numOrNull($('#hMax').value);
    data.hr.restHr = numOrNull($('#hRest').value);
    data.hr.zones = $('#hZones').value.trim();
  }
  if (s === 'days') {
    data.conditions.availableDays = readDayPick(body, 'avail');
    data.conditions.runsPerWeek = numOrNull($('#cRuns').value) ?? data.conditions.runsPerWeek;
    const single = body.querySelector('[data-daypick-single="longday"] button.on');
    data.conditions.longRunDay = single ? Number(single.dataset.day) : data.conditions.longRunDay;
    data.conditions.longestMinutes = numOrNull($('#cLongMin').value) ?? data.conditions.longestMinutes;
  }
  if (s === 'other') {
    data.conditions.excludedDays = readDayPick(body, 'excl');
    data.conditions.strength = $('#cStrength').checked;
    data.conditions.otherSports = $('#cOther').value.trim();
    data.conditions.notes = $('#cNotes').value.trim();
  }
  if (s === 'goalType') {
    const v = readSeg(body, 'goalType');
    if (!v) { toast('Bitte eine Zieldistanz wählen'); return; }
    data.goal.type = v;
  }
  if (s === 'goalDetails') {
    if (data.goal.type === 'custom') data.goal.customLabel = $('#gCustom').value.trim();
    data.goal.eventName = $('#gName').value.trim();
    data.goal.eventDate = $('#gDate').value;
    data.goal.finishOnly = $('#gFinish').checked;
    data.goal.targetTime = data.goal.finishOnly ? '' : $('#gTime').value.trim();
    if (data.goal.eventDate) {
      const today = new Date(); today.setHours(0,0,0,0);
      const ev = new Date(data.goal.eventDate + 'T00:00:00');
      if (ev < today) { toast('Das Eventdatum liegt in der Vergangenheit'); return; }
    }
  }
  if (s === 'apiKey') {
    data.apiKey = $('#apiKeyInput').value.trim();
    finish();
    return;
  }
  step = Math.min(STEPS.length - 1, step + 1);
  render();
}

function numOrNull(v) {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return isFinite(n) ? n : null;
}

function finish() {
  store.profile = data.profile;
  store.running = data.running;
  store.hr = data.hr;
  store.conditions = data.conditions;
  store.goal = data.goal;
  store.key = data.apiKey;
  store.onbDone = true;
  $('#onb').classList.add('hidden');
  toast('Eingerichtet — willkommen!');
  onFinish && onFinish();
}
