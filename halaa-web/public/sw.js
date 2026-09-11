// Retire the legacy worker. Halaa's authenticated dashboard must use current
// server responses, not an old offline copy of application code or payment data.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    await self.clients.claim();
    await self.registration.unregister();
  })());
});
// Intentionally no fetch handler: requests go directly to the network.
