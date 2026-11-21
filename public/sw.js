/* Fin de la PWA LE KARA. Ce worker ne met aucune page en cache et ne reçoit pas les notifications FCM. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const legacy = ['firebase-storage', 'google-fonts-stylesheets', 'google-fonts-webfonts', 'static-images', 'start-url', 'pages', 'pages-rsc', 'pages-rsc-prefetch', 'next-data', 'next-image', 'next-static-js-assets', 'static-font-assets', 'static-image-assets', 'static-js-assets', 'static-style-assets', 'static-audio-assets', 'static-video-assets', 'static-data-assets', 'cross-origin', 'apis'];
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith('workbox-') || legacy.includes(name)).map(name => caches.delete(name)));
    await self.registration.unregister();
  })());
});
