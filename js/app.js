// Einstiegspunkt: Routing zwischen den fünf Ansichten, Onboarding-Gate,
// Offline-Hinweis, globale Fehlerabsicherung — die App darf nie weiß bleiben.
import { $, $$ } from './ui.js';
import { paintIcons } from './icons.js';
import { store } from './store.js';
import { startOnboarding } from './onboarding.js';
import { renderHome } from './dashboard.js';
import { renderPlan } from './plan.js';
import { renderActivities } from './activities.js';
import { renderProgress } from './progress.js';
import { renderSettings } from './settings.js';

const VIEWS = ['home', 'plan', 'activities', 'progress', 'settings'];
const RENDERERS = {
  home: renderHome,
  plan: renderPlan,
  activities: renderActivities,
  progress: renderProgress,
  settings: () => renderSettings(handleWipe)
};

function show(v) {
  if (!VIEWS.includes(v)) v = 'home';
  VIEWS.forEach(x => $('#v-' + x).classList.toggle('hidden', x !== v));
  $$('nav button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
  window.scrollTo({ top: 0 });
  safeRender(v);
  moveNavPill();
}

function safeRender(v) {
  try {
    RENDERERS[v]();
  } catch (e) {
    console.error('Render-Fehler in Ansicht ' + v, e);
    const el = $('#v-' + v);
    if (el) {
      el.innerHTML = `<div class="card pad anim-in" style="margin-top:24px">
        <div style="font-weight:700;margin-bottom:6px">Hier ist etwas schiefgelaufen</div>
        <div class="hint" style="margin:0">${escapeHtml(e.message || 'Unbekannter Fehler.')} Deine Daten sind trotzdem sicher gespeichert.</div>
        <button class="btn-ghost" id="retryRender" style="margin-top:14px">Nochmal versuchen</button>
      </div>`;
      const retry = $('#retryRender');
      if (retry) retry.onclick = () => safeRender(v);
    }
  }
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function moveNavPill() {
  const btn = $('nav button.on'), pill = $('#navPill');
  if (!btn || !pill) return;
  pill.style.width = btn.offsetWidth + 'px';
  pill.style.transform = `translateX(${btn.offsetLeft}px)`;
}
addEventListener('resize', moveNavPill);

function wireNav() {
  $$('nav button').forEach(b => b.onclick = () => show(b.dataset.v));
}

function handleWipe() {
  // Sauberer Neustart nach "Alle Daten löschen", statt fragilen In-Memory-Zustand zu flicken.
  setTimeout(() => location.reload(), 400);
}

function updateOfflineBar() {
  $('#offlineBar').classList.toggle('on', !navigator.onLine);
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

function init() {
  paintIcons(document);
  wireNav();
  updateOfflineBar();
  addEventListener('online', updateOfflineBar);
  addEventListener('offline', updateOfflineBar);
  registerServiceWorker();

  window.addEventListener('error', e => {
    console.error('Unbehandelter Fehler', e.error || e.message);
  });
  window.addEventListener('unhandledrejection', e => {
    console.error('Unbehandelte Promise-Ablehnung', e.reason);
  });

  if (!store.onbDone) {
    startOnboarding(() => show('home'));
  } else {
    const requested = new URLSearchParams(location.search).get('view');
    show(requested || 'home');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
