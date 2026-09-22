// Kleine DOM- und UX-Helfer, im Stil der Essensbestie.
export const $  = (s, root) => (root || document).querySelector(s);
export const $$ = (s, root) => [...(root || document).querySelectorAll(s)];

export const r0 = n => Math.round(Number(n) || 0);
export const r1 = n => Math.round((Number(n) || 0) * 10) / 10;
export const r2 = n => Math.round((Number(n) || 0) * 100) / 100;
export const num = v => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : 0; };
export const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const todayIso = () => iso(new Date());
export const shiftIso = (s, n) => { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return iso(d); };
export const daysBetween = (a, b) => Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000);
export function mondayOf(isoStr) {
  const d = new Date(isoStr + 'T12:00:00');
  const offset = (d.getDay() + 6) % 7; // 0 = Montag
  d.setDate(d.getDate() - offset);
  return iso(d);
}

const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const WEEKDAYS_LONG = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
export function fmtDate(isoStr, opts = {}) {
  const d = new Date(isoStr + 'T12:00:00');
  if (isNaN(d)) return isoStr;
  const wd = opts.long ? WEEKDAYS_LONG[d.getDay()] : WEEKDAYS[d.getDay()];
  return `${opts.weekday === false ? '' : wd + ', '}${d.getDate()}. ${MONTHS[d.getMonth()]}${opts.year ? ' ' + d.getFullYear() : ''}`;
}

let toastT;
export function toast(msg) {
  const t = $('#toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('on'), 2300);
}

// App-Gefuehl: kurzer Impuls beim Antippen. Chrome verweigert vibrate(),
// bevor der Nutzer die Seite einmal beruehrt hat.
let userTapped = false;
addEventListener('pointerdown', () => { userTapped = true; }, { once: true, capture: true });
export const tap = () => {
  if (!userTapped) return;
  try { navigator.vibrate && navigator.vibrate(8); } catch {}
};

export function animIn(el) {
  if (!el) return;
  el.classList.remove('anim-in');
  void el.offsetWidth;
  el.classList.add('anim-in');
}

export function bump(el) {
  if (!el) return;
  el.classList.remove('bump');
  void el.offsetWidth;
  el.classList.add('bump');
}

// Eigenes Dropdown: das native <select> bleibt als Zustand erhalten.
export function closeSelects(keep) {
  $$('.cs.open').forEach(w => {
    if (w === keep) return;
    w.classList.remove('open');
    w.querySelector('.cs-panel').classList.add('hidden');
  });
}
function syncSelect(sel) {
  const { btn, panel } = sel._cs;
  btn.textContent = sel.options[sel.selectedIndex]?.textContent || '–';
  panel.innerHTML = '';
  [...sel.options].forEach((o, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'cs-opt' + (i === sel.selectedIndex ? ' on' : '');
    b.textContent = o.textContent;
    b.onclick = e => {
      e.stopPropagation();
      sel.value = o.value;
      closeSelects();
      syncSelect(sel);
      tap();
      sel.dispatchEvent(new Event('change'));
    };
    panel.appendChild(b);
  });
}
export function enhanceSelect(sel) {
  if (!sel || sel._cs) return;
  const wrap = document.createElement('div');
  wrap.className = 'cs';
  sel.parentNode.insertBefore(wrap, sel);
  wrap.appendChild(sel);
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'cs-btn';
  const panel = document.createElement('div');
  panel.className = 'cs-panel hidden';
  wrap.appendChild(btn);
  wrap.appendChild(panel);
  sel._cs = { btn, panel, wrap };
  btn.onclick = e => {
    e.stopPropagation();
    const open = wrap.classList.toggle('open');
    panel.classList.toggle('hidden', !open);
    if (open) closeSelects(wrap);
    tap();
  };
  syncSelect(sel);
}
document.addEventListener('click', () => closeSelects());

export function confirmDialog(msg) {
  return Promise.resolve(window.confirm(msg));
}
