// Läufe: manuell erfassen, Pace automatisch berechnen, Verlauf mit Bearbeiten/Löschen.
import { $, esc, r1, todayIso, fmtDate, animIn, toast, tap } from './ui.js';
import { store, addActivity, updateActivity, deleteActivity, uid } from './store.js';
import { ico, paintIcons } from './icons.js';
import { parseDuration, formatDuration, calcPaceSecPerKm, formatPace } from './pace.js';

let formOpen = false;
let editingId = null;

export function renderActivities() {
  const el = $('#v-activities');
  const acts = store.activities;
  el.innerHTML = `
    <div style="margin-top:20px;display:flex;align-items:center">
      <h2 style="margin:0">Läufe</h2>
      <span class="spacer" style="flex:1"></span>
      <button class="btn-ghost btn-sm" id="toggleForm">${ico(formOpen ? 'close' : 'plus', 15)} ${formOpen ? 'Abbrechen' : 'Lauf hinzufügen'}</button>
    </div>
    <div id="actForm">${formOpen ? formMarkup() : ''}</div>
    <h2>Verlauf</h2>
    <div class="card">
      ${acts.length ? acts.map(a => rowMarkup(a)).join('') : `<div class="empty"><span class="ico" style="display:block;margin:0 auto 8px">${ico('run', 30)}</span>Noch keine Läufe eingetragen.</div>`}
    </div>
  `;
  paintIcons(el);
  animIn(el);
  wire(el);
}

function formMarkup(edit) {
  const a = edit || { date: todayIso(), distance: '', time: '', avgHr: '', maxHr: '', elevation: '', rpe: '', note: '' };
  return `<div class="card pad anim-in" style="margin-top:10px">
    <div class="field">
      <label for="aDate">Datum</label>
      <input id="aDate" type="date" value="${esc(a.date)}" max="${todayIso()}">
    </div>
    <div class="row" style="margin-top:14px">
      <div class="field" style="margin:0">
        <label for="aDist">Distanz km</label>
        <input id="aDist" type="number" inputmode="decimal" step="0.01" value="${esc(a.distance)}" placeholder="z.B. 10.2">
      </div>
      <div class="field" style="margin:0">
        <label for="aTime">Zeit</label>
        <input id="aTime" inputmode="decimal" value="${esc(a.time)}" placeholder="58:32">
      </div>
    </div>
    <div class="hint" id="pacePreview" style="text-align:center">Pace erscheint automatisch</div>
    <div class="row" style="margin-top:14px">
      <div class="field" style="margin:0">
        <label for="aHr">Ø Herzfrequenz</label>
        <input id="aHr" type="number" inputmode="numeric" value="${esc(a.avgHr)}" placeholder="z.B. 152">
      </div>
      <div class="field" style="margin:0">
        <label for="aMaxHr">Max HF (optional)</label>
        <input id="aMaxHr" type="number" inputmode="numeric" value="${esc(a.maxHr)}" placeholder="z.B. 172">
      </div>
    </div>
    <div class="row" style="margin-top:14px">
      <div class="field" style="margin:0">
        <label for="aElev">Höhenmeter (optional)</label>
        <input id="aElev" type="number" inputmode="numeric" value="${esc(a.elevation)}" placeholder="z.B. 120">
      </div>
      <div class="field" style="margin:0">
        <label for="aRpe">RPE 1–10 (optional)</label>
        <input id="aRpe" type="number" inputmode="numeric" min="1" max="10" value="${esc(a.rpe)}" placeholder="z.B. 6">
      </div>
    </div>
    <div class="field" style="margin-top:14px">
      <label for="aNote">Notiz (optional)</label>
      <textarea id="aNote" placeholder="z.B. Regen, Seitenstechen ab km 7">${esc(a.note)}</textarea>
    </div>
    <button class="btn" id="aSave" style="margin-top:16px">${edit ? 'Speichern' : 'Hinzufügen'}</button>
    ${edit ? `<button class="btn-ghost" id="aDelete" style="width:100%;margin-top:10px;color:var(--err)">${ico('trash', 16)} Löschen</button>` : ''}
  </div>`;
}

function rowMarkup(a) {
  const pace = calcPaceSecPerKm(a.distance, a.durationSec);
  return `<div class="entry" data-id="${a.id}" style="cursor:pointer">
    <div class="dot" style="background:var(--accent)"></div>
    <div class="txt">
      <b>${r1(a.distance)} km</b>
      <small>${fmtDate(a.date)} · ${formatDuration(a.durationSec)} · ${a.avgHr ? a.avgHr + ' bpm' : 'keine HF'}</small>
    </div>
    <div class="r">${formatPace(pace)}</div>
  </div>`;
}

function wire(el) {
  const toggle = $('#toggleForm');
  if (toggle) toggle.onclick = () => { tap(); formOpen = !formOpen; editingId = null; renderActivities(); };

  const distEl = $('#aDist'), timeEl = $('#aTime');
  const updatePreview = () => {
    const d = Number(distEl.value.replace(',', '.'));
    const sec = parseDuration(timeEl.value);
    const prev = $('#pacePreview');
    if (d > 0 && sec > 0) prev.textContent = `→ ${formatPace(calcPaceSecPerKm(d, sec))}`;
    else prev.textContent = 'Pace erscheint automatisch';
  };
  if (distEl) { distEl.oninput = updatePreview; timeEl.oninput = updatePreview; }

  const save = $('#aSave');
  if (save) save.onclick = onSave;
  const del = $('#aDelete');
  if (del) del.onclick = onDelete;

  el.querySelectorAll('.entry').forEach(row => row.onclick = () => openEdit(row.dataset.id));
}

function openEdit(id) {
  const a = store.activities.find(x => x.id === id);
  if (!a) return;
  editingId = id;
  formOpen = true;
  const el = $('#actForm');
  el.innerHTML = formMarkup({
    date: a.date, distance: a.distance, time: formatDuration(a.durationSec),
    avgHr: a.avgHr ?? '', maxHr: a.maxHr ?? '', elevation: a.elevation ?? '', rpe: a.rpe ?? '', note: a.note ?? ''
  });
  wire($('#v-activities'));
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function onSave() {
  const date = $('#aDate').value;
  const distance = Number($('#aDist').value.replace(',', '.'));
  const durationSec = parseDuration($('#aTime').value);
  const avgHr = $('#aHr').value ? Number($('#aHr').value) : null;

  if (!date) { toast('Bitte ein Datum eintragen'); return; }
  if (!(distance > 0)) { toast('Bitte eine gültige Distanz eintragen'); return; }
  if (!(durationSec > 0)) { toast('Bitte eine gültige Zeit eintragen, z.B. 58:32'); return; }
  if (!avgHr) { toast('Bitte die durchschnittliche Herzfrequenz eintragen'); return; }

  const patch = {
    date, distance, durationSec, avgHr,
    maxHr: $('#aMaxHr').value ? Number($('#aMaxHr').value) : null,
    elevation: $('#aElev').value ? Number($('#aElev').value) : null,
    rpe: $('#aRpe').value ? Number($('#aRpe').value) : null,
    note: $('#aNote').value.trim()
  };

  try {
    if (editingId) {
      updateActivity(editingId, patch);
      toast('Lauf aktualisiert');
    } else {
      addActivity({ id: uid(), ...patch });
      toast('Lauf hinzugefügt');
    }
  } catch (e) {
    toast('Konnte nicht gespeichert werden: ' + (e.message || 'Speicherfehler'));
    return;
  }
  formOpen = false;
  editingId = null;
  renderActivities();
}

function onDelete() {
  if (!editingId) return;
  if (!window.confirm('Diesen Lauf wirklich löschen?')) return;
  deleteActivity(editingId);
  toast('Lauf gelöscht');
  formOpen = false;
  editingId = null;
  renderActivities();
}
