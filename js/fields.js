// Wiederverwendete Formularbausteine fuer Onboarding und Einstellungen,
// damit beide dieselbe Sprache sprechen statt Markup zu duplizieren.
import { esc } from './ui.js';
import { WEEKDAY_SHORT } from './store.js';

export function textField({ id, label, value = '', placeholder = '', type = 'text', inputmode, step, hint }) {
  return `<div class="field">
    <label for="${id}">${esc(label)}</label>
    <input id="${id}" type="${type}" value="${esc(value ?? '')}" placeholder="${esc(placeholder)}"
      ${inputmode ? `inputmode="${inputmode}"` : ''} ${step ? `step="${step}"` : ''} autocomplete="off">
    ${hint ? `<div class="hint">${hint}</div>` : ''}
  </div>`;
}

export function textareaField({ id, label, value = '', placeholder = '', hint }) {
  return `<div class="field">
    <label for="${id}">${esc(label)}</label>
    <textarea id="${id}" placeholder="${esc(placeholder)}">${esc(value ?? '')}</textarea>
    ${hint ? `<div class="hint">${hint}</div>` : ''}
  </div>`;
}

export function segField({ label, name, options, value, columns }) {
  return `<div class="field">
    ${label ? `<label>${esc(label)}</label>` : ''}
    <div class="seg${columns ? ' col' : ''}" data-seg="${name}">
      ${options.map(o => `<button type="button" data-val="${esc(o.value)}" class="${o.value === value ? 'on' : ''}">${esc(o.label)}${o.hint ? `<small>${esc(o.hint)}</small>` : ''}</button>`).join('')}
    </div>
  </div>`;
}

export function dayPicker({ label, name, selected = [], hint }) {
  return `<div class="field">
    ${label ? `<label>${esc(label)}</label>` : ''}
    <div class="seg days" data-daypick="${name}">
      ${WEEKDAY_SHORT.map((d, i) => `<button type="button" data-day="${i}" class="${selected.includes(i) ? 'on' : ''}">${d}</button>`).join('')}
    </div>
    ${hint ? `<div class="hint">${hint}</div>` : ''}
  </div>`;
}

export function switchField({ id, label, checked, sub }) {
  return `<label class="sw" for="${id}">
    <input type="checkbox" id="${id}" ${checked ? 'checked' : ''}>
    <span class="sw-track"><span class="sw-knob"></span></span>
    <span class="sw-lbl">${esc(label)}${sub ? `<br>${esc(sub)}` : ''}</span>
  </label>`;
}

export function readSeg(root, name) {
  const btn = root.querySelector(`[data-seg="${name}"] button.on`);
  return btn ? btn.dataset.val : null;
}
export function wireSeg(root, name, onChange) {
  const wrap = root.querySelector(`[data-seg="${name}"]`);
  if (!wrap) return;
  wrap.querySelectorAll('button').forEach(b => b.onclick = () => {
    wrap.querySelectorAll('button').forEach(x => x.classList.remove('on'));
    b.classList.add('on');
    onChange && onChange(b.dataset.val);
  });
}
export function readDayPick(root, name) {
  return [...root.querySelectorAll(`[data-daypick="${name}"] button.on`)].map(b => Number(b.dataset.day));
}
export function wireDayPick(root, name, onChange) {
  const wrap = root.querySelector(`[data-daypick="${name}"]`);
  if (!wrap) return;
  wrap.querySelectorAll('button').forEach(b => b.onclick = () => {
    b.classList.toggle('on');
    onChange && onChange(readDayPick(root, name));
  });
}
