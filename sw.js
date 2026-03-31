// Service worker: adds ngrok-skip-browser-warning to every request
// so the ngrok interstitial is bypassed on all visits after the first.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', event => {
  const req = event.request;

  // Only intercept same-origin or ngrok tunnel requests
  if (req.method !== 'GET') return;

  event.respondWith(
    fetch(req.url, {
      method: req.method,
      headers: (() => {
        const h = new Headers(req.headers);
        h.set('ngrok-skip-browser-warning', '69420');
        return h;
      })(),
      credentials: req.credentials,
      redirect: 'follow',
      cache: 'no-store',
    })
  );
});
