// Offline-Huelle fuer Laufbestie. Die Gemini-API wird nie gecacht.
const CACHE = 'laufbestie-v1';
const SHELL = [
  './', './index.html', './style.css', './manifest.json',
  './js/app.js', './js/ui.js', './js/store.js', './js/icons.js', './js/pace.js',
  './js/fields.js', './js/gemini.js', './js/onboarding.js', './js/dashboard.js',
  './js/plan.js', './js/activities.js', './js/progress.js', './js/settings.js', './js/charts.js',
  './icons/icon.svg', './icons/icon-maskable.svg', './icons/icon-192.png', './icons/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  // Netz zuerst, damit Updates ankommen; Cache als Fallback offline.
  e.respondWith(
    fetch(req)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
  );
});
