import { describe, it, expect, vi } from 'vitest'
import { retireLegacyPwa } from '../retire-legacy-pwa'
describe('retrait de la PWA', () => {
  it('retire les anciens workers et caches PWA en conservant FCM et les autres caches', async () => {
    const old = vi.fn(),
      push = vi.fn(),
      external = vi.fn(),
      remove = vi.fn()
    const workers = {
      getRegistrations: async () => [
        { active: { scriptURL: 'https://kara.test/sw.js' }, unregister: old },
        {
          waiting: { scriptURL: 'https://kara.test/firebase-messaging-sw.js' },
          unregister: push,
        },
        {
          active: { scriptURL: 'https://other.test/sw.js' },
          unregister: external,
        },
      ],
    } as unknown as Pick<ServiceWorkerContainer, 'getRegistrations'>
    await retireLegacyPwa(
      workers,
      {
        keys: async () => [
          'workbox-precache-v2',
          'static-images',
          'start-url',
          'pages',
          'documents-personnels',
          'fcm-data',
        ],
        delete: remove,
      },
      'https://kara.test',
    )
    expect(old).toHaveBeenCalledOnce()
    expect(push).not.toHaveBeenCalled()
    expect(external).not.toHaveBeenCalled()
    expect(remove.mock.calls.map((c) => c[0])).toEqual([
      'workbox-precache-v2',
      'static-images',
      'start-url',
      'pages',
    ])
  })
  it('fonctionne sans service workers et continue le nettoyage si une désinscription échoue', async () => {
    const remove = vi.fn()
    await retireLegacyPwa(undefined, undefined, 'https://kara.test')
    await retireLegacyPwa(
      {
        getRegistrations: async () => [
          {
            active: { scriptURL: 'https://kara.test/sw.js' },
            unregister: () => Promise.reject(Error('bloqué')),
          },
        ],
      } as unknown as Pick<ServiceWorkerContainer, 'getRegistrations'>,
      { keys: async () => ['workbox-runtime'], delete: remove },
      'https://kara.test',
    )
    expect(remove).toHaveBeenCalledWith('workbox-runtime')
  })
})

it('préserve le worker push qui prend la relève d’une ancienne PWA', async () => {
  const unregister = vi.fn()
  await retireLegacyPwa(
    {
      getRegistrations: async () => [
        {
          active: { scriptURL: 'https://kara.test/sw.js' },
          installing: {
            scriptURL: 'https://kara.test/firebase-messaging-sw.js',
          },
          unregister,
        },
      ],
    } as unknown as Pick<ServiceWorkerContainer, 'getRegistrations'>,
    undefined,
    'https://kara.test',
  )
  expect(unregister).not.toHaveBeenCalled()
})
it('partage une seule promesse de retrait avec l’initialisation du push', async () => {
  vi.resetModules()
  let finish: (value: ServiceWorkerRegistration[]) => void = () => {}
  const getRegistrations = vi.fn(
    () =>
      new Promise<ServiceWorkerRegistration[]>((resolve) => {
        finish = resolve
      }),
  )
  vi.stubGlobal('navigator', { serviceWorker: { getRegistrations } })
  try {
    const { retireLegacyPwaForBrowser } = await import('../retire-legacy-pwa')
    const startup = retireLegacyPwaForBrowser(),
      beforePush = retireLegacyPwaForBrowser()
    expect(startup).toBe(beforePush)
    expect(getRegistrations).toHaveBeenCalledOnce()
    let ready = false
    void beforePush.then(() => {
      ready = true
    })
    await Promise.resolve()
    expect(ready).toBe(false)
    finish([])
    await beforePush
    expect(ready).toBe(true)
  } finally {
    vi.unstubAllGlobals()
  }
})
