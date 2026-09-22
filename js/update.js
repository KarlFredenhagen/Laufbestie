// Erkennt, wenn eine neue Version deployt wurde (neuer Service Worker),
// und bietet ein Neuladen an, statt dass alte Tabs/installierte PWAs
// stumm auf dem alten Stand haengen bleiben.
import { $ } from './ui.js';

let registration = null;
let updateAvailable = false;

export function initUpdateCheck() {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.register('sw.js').then(reg => {
    registration = reg;
    if (reg.waiting && navigator.serviceWorker.controller) showBanner();
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      if (!nw) return;
      nw.addEventListener('statechange', () => {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) showBanner();
      });
    });
  }).catch(() => {});

  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloaded) return;
    reloaded = true;
    location.reload();
  });

  // Browser pruefen sw.js sonst nur bei Navigation — beim Zurueckkommen
  // in die App aktiv nachfragen, damit offene Tabs/installierte PWA
  // Updates auch ohne Neuladen bemerken.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && registration) registration.update().catch(() => {});
  });

  const btn = $('#updateReload');
  if (btn) btn.onclick = () => {
    btn.disabled = true;
    btn.textContent = 'Lädt …';
    location.reload();
  };
}

function showBanner() {
  updateAvailable = true;
  const bar = $('#updateBar');
  if (bar) bar.classList.add('on');
}

// Fuer den manuellen "Nach Updates suchen"-Button unter "Mehr".
export async function checkForUpdateNow() {
  if (!('serviceWorker' in navigator)) return { ok: false, message: 'Service Worker wird hier nicht unterstützt.' };
  const reg = registration || (await navigator.serviceWorker.getRegistration());
  if (!reg) return { ok: false, message: 'Keine Service-Worker-Registrierung gefunden.' };
  updateAvailable = false;
  try {
    await reg.update();
  } catch {
    return { ok: false, message: 'Konnte nicht auf Updates prüfen — bist du online?' };
  }
  await new Promise(r => setTimeout(r, 1500));
  if (updateAvailable) return { ok: true, message: 'Update gefunden — lädt gleich neu.', reload: true };
  return { ok: true, message: 'Du bist bereits auf dem neuesten Stand.' };
}
