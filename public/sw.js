// Service worker: caches the app shell so it opens instantly and works as an installed app.
// Supabase calls always go to the network (data must stay fresh and shared).
const VERSION = '0.10.0';
const BUILD = 'dev'; // replaced by the build number when GitHub deploys the site
const CACHE = `tool-proj-${VERSION}-${BUILD}`;
const SHELL = ['./', 'index.html', 'styles.css', 'app.js', 'data.js', 'config.js', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png'];
const CACHEABLE_HOSTS = ['cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin && !CACHEABLE_HOSTS.includes(url.hostname)) return; // Supabase & co : réseau uniquement
  // Network first (so updates show up), cache as fallback when offline.
  // `no-cache` makes the browser check with the server instead of trusting its own 10-minute copy (GitHub Pages sends max-age=600).
  e.respondWith(
    fetch(e.request, sameOrigin ? { cache: 'no-cache' } : undefined)
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || (e.request.mode === 'navigate' ? caches.match('index.html') : Response.error()))),
  );
});
