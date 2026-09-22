// "Mehr": Profil, Trainingsbedingungen, Ziel, Gemini API, Daten.
import { $, esc, toast, tap, animIn, todayIso } from './ui.js';
import {
  store, WEEKDAY_SHORT,
  exportAll, validateImport, importAll, wipeAll
} from './store.js';
import { textField, textareaField, segField, dayPicker, switchField, wireSeg, wireDayPick, readSeg, readDayPick } from './fields.js';
import { ico, paintIcons } from './icons.js';
import { testApiKey } from './gemini.js';

export function renderSettings(onWipe) {
  const el = $('#v-settings');
  const profile = store.profile, running = store.running, hr = store.hr, conditions = store.conditions, goal = store.goal;

  el.innerHTML = `
    <h2 style="margin-top:20px">Profil</h2>
    <div class="card pad">
      <div class="row">
        ${textField({ id: 'sAge', label: 'Alter', value: profile.age, type: 'number', inputmode: 'numeric' })}
        ${textField({ id: 'sWeight', label: 'Gewicht kg', value: profile.weight, type: 'number', inputmode: 'decimal' })}
      </div>
      <div class="row" style="margin-top:14px">
        ${textField({ id: 'sHeight', label: 'Größe cm', value: profile.height, type: 'number', inputmode: 'numeric' })}
        <div></div>
      </div>
      ${segField({ label: 'Geschlecht', name: 'sSex', value: profile.sex, options: [{ value: 'w', label: 'weiblich' }, { value: 'm', label: 'männlich' }, { value: 'd', label: 'divers' }] })}
      <button class="btn" id="saveProfile" style="margin-top:14px">Speichern</button>
    </div>

    <h2>Bestzeiten &amp; Pensum</h2>
    <div class="card pad">
      <div class="row">
        ${textField({ id: 'sPb5k', label: '5-km-PB', value: running.pb5k, placeholder: 'mm:ss' })}
        ${textField({ id: 'sPb10k', label: '10-km-PB', value: running.pb10k, placeholder: 'mm:ss' })}
      </div>
      <div class="row" style="margin-top:14px">
        ${textField({ id: 'sPbHalf', label: 'Halbmarathon-PB', value: running.pbHalf, placeholder: 'h:mm:ss' })}
        ${textField({ id: 'sPbMara', label: 'Marathon-PB', value: running.pbMarathon, placeholder: 'h:mm:ss' })}
      </div>
      <div class="row" style="margin-top:14px">
        ${textField({ id: 'sWeekly', label: 'Ø Wochenkilometer', value: running.weeklyKm, type: 'number', inputmode: 'decimal' })}
        ${textField({ id: 'sLongest', label: 'Längster Lauf km', value: running.longestRun, type: 'number', inputmode: 'decimal' })}
      </div>
      <button class="btn" id="saveRunning" style="margin-top:14px">Speichern</button>
    </div>

    <h2>Herzfrequenz</h2>
    <div class="card pad">
      <div class="row">
        ${textField({ id: 'sHrMax', label: 'Maximale HF', value: hr.maxHr, type: 'number', inputmode: 'numeric' })}
        ${textField({ id: 'sHrRest', label: 'Ruhepuls', value: hr.restHr, type: 'number', inputmode: 'numeric' })}
      </div>
      ${textField({ id: 'sHrZones', label: 'HF-Zonen (optional)', value: hr.zones })}
      <button class="btn" id="saveHr" style="margin-top:14px">Speichern</button>
    </div>

    <h2>Trainingstage</h2>
    <div class="card pad">
      ${dayPicker({ label: 'Verfügbare Lauftage', name: 'sAvail', selected: conditions.availableDays })}
      ${textField({ id: 'sRuns', label: 'Läufe pro Woche', value: conditions.runsPerWeek, type: 'number', inputmode: 'numeric' })}
      <div class="field">
        <label>Bevorzugter Long-Run-Tag</label>
        <div class="seg days" data-daypick-single="sLongDay">
          ${WEEKDAY_SHORT.map((d, i) => `<button type="button" data-day="${i}" class="${conditions.longRunDay === i ? 'on' : ''}">${d}</button>`).join('')}
        </div>
      </div>
      ${textField({ id: 'sLongMin', label: 'Zeit am längsten Tag, Minuten', value: conditions.longestMinutes, type: 'number', inputmode: 'numeric' })}
      ${dayPicker({ label: 'Ausgeschlossene Tage', name: 'sExcl', selected: conditions.excludedDays })}
      ${switchField({ id: 'sStrength', label: 'Krafttraining', checked: conditions.strength })}
      ${textField({ id: 'sOtherSports', label: 'Radfahren / andere Sportarten', value: conditions.otherSports })}
      ${textareaField({ id: 'sNotes', label: 'Sonstige Hinweise', value: conditions.notes })}
      <button class="btn" id="saveConditions" style="margin-top:14px">Speichern</button>
    </div>

    <h2>Ziel</h2>
    <div class="card pad">
      ${segField({ label: 'Zieldistanz', name: 'sGoalType', value: goal.type, columns: true, options: [
        { value: '5k', label: '5 km' }, { value: '10k', label: '10 km' },
        { value: 'half', label: 'Halbmarathon' }, { value: 'marathon', label: 'Marathon' },
        { value: 'custom', label: 'Eigenes Ziel' }
      ] })}
      <div id="sGoalCustomWrap">${goal.type === 'custom' ? textField({ id: 'sGoalCustom', label: 'Beschreibe dein Ziel', value: goal.customLabel }) : ''}</div>
      ${textField({ id: 'sGoalName', label: 'Eventname', value: goal.eventName })}
      ${textField({ id: 'sGoalDate', label: 'Eventdatum', value: goal.eventDate, type: 'date' })}
      ${switchField({ id: 'sGoalFinish', label: 'Hauptsache ankommen', checked: goal.finishOnly })}
      <div class="field" id="sGoalTimeWrap" style="${goal.finishOnly ? 'display:none' : ''}">
        ${textField({ id: 'sGoalTime', label: 'Zielzeit', value: goal.targetTime, placeholder: 'h:mm:ss' })}
      </div>
      <div id="sGoalWarn"></div>
      <button class="btn" id="saveGoal" style="margin-top:14px">Speichern</button>
    </div>

    <h2>Gemini API</h2>
    <div class="card pad">
      <div class="field pw">
        <label for="sApiKey">API Key</label>
        <input id="sApiKey" class="masked" value="${esc(store.key)}" placeholder="Key einfügen" autocomplete="off" spellcheck="false">
        <button type="button" class="pw-eye" id="sApiKeyEye">${ico('eye', 16)}</button>
      </div>
      <div class="hint">Wird nur in diesem Browser gespeichert, nie auf GitHub oder einem eigenen Server. Kostenlosen Key holen: <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a></div>
      <div id="apiKeyStatus"></div>
      <div class="row" style="margin-top:14px">
        <button class="btn-ghost" id="testKey">API Key testen</button>
        <button class="btn-ghost" id="deleteKey" style="color:var(--err)">API Key löschen</button>
      </div>
    </div>

    <h2>Daten</h2>
    <div class="card pad">
      <button class="btn-ghost" id="exportData" style="width:100%">${ico('download', 16)} Daten exportieren</button>
      <input type="file" id="importFile" accept="application/json" class="hidden">
      <button class="btn-ghost" id="importData" style="width:100%;margin-top:10px">${ico('upload', 16)} Daten importieren</button>
      <button class="btn-ghost" id="wipeData" style="width:100%;margin-top:10px;color:var(--err)">${ico('trash', 16)} Alle Daten löschen</button>
    </div>

    <h2>Datenschutz</h2>
    <div class="card pad">
      <div class="hint" style="margin:0">
        Deine Trainingsdaten werden auf diesem Gerät gespeichert. Wenn du Gemini für die Trainingsplanung
        verwendest, werden die dafür benötigten Daten an Google Gemini übertragen. Es gibt keinen eigenen
        Server, kein Tracking und keine Analytics.
      </div>
    </div>
  `;
  paintIcons(el);
  animIn(el);
  wire(el, onWipe);
}

function wire(el, onWipe) {
  wireSeg(el, 'sSex');
  wireSeg(el, 'sGoalType', v => {
    $('#sGoalCustomWrap').innerHTML = v === 'custom' ? textField({ id: 'sGoalCustom', label: 'Beschreibe dein Ziel', value: store.goal.customLabel }) : '';
  });
  wireDayPick(el, 'sAvail');
  wireDayPick(el, 'sExcl');
  const single = el.querySelector('[data-daypick-single="sLongDay"]');
  if (single) single.querySelectorAll('button').forEach(b => b.onclick = () => {
    single.querySelectorAll('button').forEach(x => x.classList.remove('on'));
    b.classList.add('on');
  });
  const fin = $('#sGoalFinish');
  if (fin) fin.onchange = () => { $('#sGoalTimeWrap').style.display = fin.checked ? 'none' : ''; };

  $('#saveProfile').onclick = () => {
    store.profile = {
      age: numOrNull($('#sAge').value), weight: numOrNull($('#sWeight').value),
      height: numOrNull($('#sHeight').value), sex: readSeg(el, 'sSex') || ''
    };
    toast('Profil gespeichert'); tap();
  };
  $('#saveRunning').onclick = () => {
    store.running = {
      ...store.running,
      pb5k: $('#sPb5k').value.trim(), pb10k: $('#sPb10k').value.trim(),
      pbHalf: $('#sPbHalf').value.trim(), pbMarathon: $('#sPbMara').value.trim(),
      weeklyKm: numOrNull($('#sWeekly').value), longestRun: numOrNull($('#sLongest').value)
    };
    toast('Gespeichert'); tap();
  };
  $('#saveHr').onclick = () => {
    store.hr = { maxHr: numOrNull($('#sHrMax').value), restHr: numOrNull($('#sHrRest').value), zones: $('#sHrZones').value.trim() };
    toast('Gespeichert'); tap();
  };
  $('#saveConditions').onclick = () => {
    const singleBtn = el.querySelector('[data-daypick-single="sLongDay"] button.on');
    store.conditions = {
      availableDays: readDayPick(el, 'sAvail'),
      excludedDays: readDayPick(el, 'sExcl'),
      runsPerWeek: numOrNull($('#sRuns').value) ?? store.conditions.runsPerWeek,
      longRunDay: singleBtn ? Number(singleBtn.dataset.day) : store.conditions.longRunDay,
      longestMinutes: numOrNull($('#sLongMin').value) ?? store.conditions.longestMinutes,
      strength: $('#sStrength').checked,
      otherSports: $('#sOtherSports').value.trim(),
      notes: $('#sNotes').value.trim()
    };
    toast('Gespeichert'); tap();
  };
  $('#saveGoal').onclick = () => {
    const type = readSeg(el, 'sGoalType');
    if (!type) { toast('Bitte eine Zieldistanz wählen'); return; }
    const eventDate = $('#sGoalDate').value;
    const warnBox = $('#sGoalWarn');
    warnBox.innerHTML = '';
    if (eventDate) {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const ev = new Date(eventDate + 'T00:00:00');
      if (ev < today) { warnBox.innerHTML = `<div class="status err">${ico('warn', 16)} Das Eventdatum liegt in der Vergangenheit.</div>`; return; }
    }
    const customEl = $('#sGoalCustom');
    store.goal = {
      type, eventName: $('#sGoalName').value.trim(), eventDate,
      finishOnly: $('#sGoalFinish').checked,
      targetTime: $('#sGoalFinish').checked ? '' : $('#sGoalTime').value.trim(),
      customLabel: customEl ? customEl.value.trim() : store.goal.customLabel
    };
    toast('Ziel gespeichert'); tap();
  };

  const keyInput = $('#sApiKey');
  keyInput.oninput = () => { store.key = keyInput.value.trim(); store.pinned = false; };
  $('#sApiKeyEye').onclick = () => {
    keyInput.classList.toggle('masked');
    $('#sApiKeyEye').innerHTML = ico(keyInput.classList.contains('masked') ? 'eye' : 'eyeOff', 16);
  };
  $('#testKey').onclick = async () => {
    const box = $('#apiKeyStatus');
    box.innerHTML = `<div class="status load"><div class="spin"></div>Teste Key …</div>`;
    const res = await testApiKey(keyInput.value.trim());
    box.innerHTML = `<div class="status ${res.ok ? 'ok' : 'err'}">${res.ok ? ico('check', 16) : ico('warn', 16)} ${esc(res.message)}</div>`;
  };
  $('#deleteKey').onclick = () => {
    if (!window.confirm('API Key wirklich löschen?')) return;
    store.key = '';
    keyInput.value = '';
    toast('API Key gelöscht');
  };

  $('#exportData').onclick = () => {
    const data = exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `laufbestie-backup-${todayIso()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast('Export gestartet');
  };
  const fileInput = $('#importFile');
  $('#importData').onclick = () => fileInput.click();
  fileInput.onchange = async () => {
    const file = fileInput.files[0];
    fileInput.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const err = validateImport(data);
      if (err) { toast(err); return; }
      if (!window.confirm('Import überschreibt deine aktuellen Daten. Fortfahren?')) return;
      importAll(data);
      toast('Import erfolgreich');
      renderSettings(onWipe);
    } catch {
      toast('Datei konnte nicht gelesen werden — ist es eine gültige Laufbestie-Sicherung?');
    }
  };
  $('#wipeData').onclick = () => {
    if (!window.confirm('Wirklich ALLE Daten löschen? Das kann nicht rückgängig gemacht werden.')) return;
    wipeAll();
    toast('Alle Daten gelöscht');
    onWipe && onWipe();
  };
}

function numOrNull(v) {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return isFinite(n) ? n : null;
}
