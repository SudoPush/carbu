// Carbu service worker : l'app s'ouvre même sans réseau.
const VERSION = 'carbu-v1';
const SHELL = ['./', './index.html', './support.js', './react-bundle.js', './ds/styles.css',
  './manifest.webmanifest', './icons/apple-touch-icon.png', './icons/icon-192.png'];
const LIBS = ['https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL).then(() =>
    Promise.all(LIBS.map(u => fetch(u, { mode: 'no-cors' }).then(r => c.put(u, r)).catch(() => {})))
  )).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Page : réseau d'abord (pour recevoir les mises à jour), cache si hors ligne.
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(r => { const c = r.clone(); caches.open(VERSION).then(x => x.put('./index.html', c)); return r; })
      .catch(() => caches.match('./index.html')));
    return;
  }
  // Fichiers de l'app et Leaflet : cache d'abord, mis à jour en arrière-plan.
  if (url.origin === location.origin || LIBS.includes(req.url)) {
    e.respondWith(caches.match(req).then(hit => {
      const net = fetch(req).then(r => { if (r && (r.ok || r.type === 'opaque')) { const c = r.clone(); caches.open(VERSION).then(x => x.put(req, c)); } return r; }).catch(() => hit);
      return hit || net;
    }));
  }
  // Le reste (fonds de carte, prix, ville) passe directement par le réseau.
});
