import { legacyPwaCaches } from '@/components/browser/retire-legacy-pwa'

// App Hosting ne sert pas ce fichier JS du dossier public : une route explicite
// assure aussi le retrait des anciens clients qui ne chargent pas encore le layout.
export const dynamic = 'force-dynamic'
export function GET() {
  const source = `self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const legacy = ${JSON.stringify(legacyPwaCaches)};
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith('workbox-') || legacy.includes(name)).map(name => caches.delete(name)));
    await self.registration.unregister();
  })());
});`
  return new Response(source, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
      'Service-Worker-Allowed': '/',
    },
  })
}
