/** Retire uniquement les anciens caches/installations PWA ; le worker FCM reste actif. */
export const legacyPwaCaches = [
  'firebase-storage',
  'google-fonts-stylesheets',
  'google-fonts-webfonts',
  'static-images',
  'start-url',
  'pages',
  'pages-rsc',
  'pages-rsc-prefetch',
  'next-data',
  'next-image',
  'next-static-js-assets',
  'static-font-assets',
  'static-image-assets',
  'static-js-assets',
  'static-style-assets',
  'static-audio-assets',
  'static-video-assets',
  'static-data-assets',
  'cross-origin',
  'apis',
]
export const isLegacyPwaCache = (name: string) =>
  name.startsWith('workbox-') || legacyPwaCaches.includes(name)
export async function retireLegacyPwa(
  serviceWorkers: Pick<ServiceWorkerContainer, 'getRegistrations'> | undefined,
  cacheStorage: Pick<CacheStorage, 'keys' | 'delete'> | undefined,
  origin: string,
) {
  if (serviceWorkers) {
    const registrations = await serviceWorkers.getRegistrations()
    await Promise.allSettled(
      registrations.map(async (registration) => {
        const scripts = [
          registration.active,
          registration.waiting,
          registration.installing,
        ].flatMap((worker) =>
          worker?.scriptURL ? [new URL(worker.scriptURL, origin)] : [],
        )
        // Un worker FCM déjà actif, en attente ou en cours d’installation ne doit
        // jamais perdre son inscription au profit du retrait de l’ancienne PWA.
        if (
          scripts.length &&
          scripts.every(
            (url) =>
              url.origin === origin &&
              ['/sw.js', '/service-worker.js'].includes(url.pathname),
          )
        )
          await registration.unregister()
      }),
    )
  }
  if (cacheStorage) {
    const names = await cacheStorage.keys()
    await Promise.allSettled(
      names.filter(isLegacyPwaCache).map((name) => cacheStorage.delete(name)),
    )
  }
}

let browserRetirement: Promise<void> | undefined
/** Partagé avec l’initialisation FCM : finir le retrait avant de réinscrire le push. */
export function retireLegacyPwaForBrowser(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  return (browserRetirement ??= retireLegacyPwa(
    'serviceWorker' in navigator ? navigator.serviceWorker : undefined,
    'caches' in window ? window.caches : undefined,
    window.location.origin,
  ).catch(() => {
    /* Le mode privé peut interdire les caches. Le push reste utilisable. */
  }))
}
