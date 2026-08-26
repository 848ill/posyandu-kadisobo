/* Catat Posyandu — service worker
   Strategi:
   - App shell (index.html + ikon) di-precache saat install.
   - Navigasi: coba jaringan dulu, kalau gagal pakai salinan cache.
     Jadi kader tetap bisa membuka aplikasi tanpa sinyal.
   - Aset statis: pakai cache dulu supaya hemat kuota.
   - Data kader TIDAK pernah lewat sini. Data tersimpan di localStorage
     perangkat masing-masing dan tidak dikirim ke mana pun.
*/

const VERSI = 'catat-posyandu-v1';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-64.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSI)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== VERSI).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (e) => {
  if (e.data === 'PAKAI_VERSI_BARU') self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Halaman: jaringan dulu, jatuh ke cache bila offline.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const salinan = res.clone();
          caches.open(VERSI).then((c) => c.put('./index.html', salinan));
          return res;
        })
        .catch(() => caches.match('./index.html', { ignoreSearch: true }))
    );
    return;
  }

  // Aset: cache dulu, isi cache di belakang layar bila belum ada.
  e.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const salinan = res.clone();
          caches.open(VERSI).then((c) => c.put(req, salinan));
        }
        return res;
      });
    })
  );
});
