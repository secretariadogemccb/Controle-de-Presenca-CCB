/* Cache offline dos arquivos públicos do site. */
const CACHE = 'ccb-presenca-v3-20261018-sem-sincronizacao';
const FILES = ['./','./index.html','./style.css','./app.js','./exports.js','./vendor/jszip.min.js','./assets/logo-ccb.png','./assets/clave-sol.png','./assets/clave-fa.png','./assets/lixeira.png','./assets/emoji-check.png','./assets/emoji-cross.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('ccb-presenca-') && k !== CACHE).map(k => caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
    if (response.ok) { const copy = response.clone(); caches.open(CACHE).then(cache=>cache.put(request,copy)); }
    return response;
  })));
});
