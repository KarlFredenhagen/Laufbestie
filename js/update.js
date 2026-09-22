// Erkennt im Hintergrund, wenn eine neue Version deployt wurde (neuer
// Service Worker) — ohne Banner oder ungefragtes Neuladen. Sichtbar wird
// das nur ueber den manuellen "Nach Updates suchen"-Button unter "Mehr".
let registration = null;
let updateAvailable = false;

export function initUpdateCheck() {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.register('sw.js').then(reg => {
    registration = reg;
    if (reg.waiting && navigator.serviceWorker.controller) updateAvailable = true;
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      if (!nw) return;
      nw.addEventListener('statechange', () => {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) updateAvailable = true;
      });
    });
  }).catch(() => {});

  // Browser pruefen sw.js sonst nur bei Navigation — beim Zurueckkommen
  // in die App im Hintergrund nachfragen, damit der manuelle Check unter
  // "Mehr" auch ohne vorheriges Neuladen ein frisches Ergebnis zeigt.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && registration) registration.update().catch(() => {});
  });
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
