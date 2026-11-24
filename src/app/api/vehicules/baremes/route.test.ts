// @vitest-environment node
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ogarTariffSha256 } from '@/domains/vehicles/server/ogar-tariff'

const store = vi.hoisted(() => ({
  records: new Map<string, Record<string, unknown>>(),
  files: new Map<string, Buffer>(),
  access: vi.fn(),
  saves: vi.fn(),
}))
vi.mock('@/domains/auth/server/requireAdminCaller', () => ({
  requireAdminCaller: async () => ({ claims: { uid: 'test-admin' } }),
}))
vi.mock('@/domains/auth/server/admin-access', () => ({ loadAdminAccess: store.access }))
vi.mock('@/firebase/admin', () => ({ adminApp: {} }))
vi.mock('@/firebase/adminFirestore', () => ({
  adminFirestore: {
    collection: () => ({
      doc: (id: string) => ({
        get: async () => ({ exists: store.records.has(id), data: () => store.records.get(id) }),
        create: async (data: Record<string, unknown>) =>
          store.records.set(id, { ...data, importedAt: { toDate: () => new Date() } }),
      }),
      orderBy: () => ({
        get: async () => ({
          docs: [...store.records].reverse().map(([id, data]) => ({ id, data: () => data })),
        }),
      }),
    }),
  },
}))
vi.mock('firebase-admin/storage', () => ({
  getStorage: () => ({
    bucket: () => ({
      file: (path: string) => ({
        save: async (data: Buffer) => { store.saves(); store.files.set(path, data) },
        download: async () => [store.files.get(path)],
      }),
    }),
  }),
}))
import { GET, POST } from './route'

const url = 'https://admin.test/api/vehicules/baremes'
const oldPath = 'insurance-reference-documents/ogar-vehicules.pdf'
const pdf = '%PDF-1.4\nbarème test'
const request = (insurer: string, data: string, assetType = 'Véhicules') => {
  const body = new FormData()
  body.set('insurer', insurer)
  body.set('assetType', assetType)
  body.set('file', new File([data], 'tarif.pdf', { type: 'application/pdf' }))
  return new NextRequest(url, { method: 'POST', body })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', 'firebase.test')
  store.records.clear()
  store.files.clear()
  store.access.mockResolvedValue({ permissionsDefined: true, permissions: ['vehicules.view', 'vehicules.edit'] })
  store.records.set('ogar-vehicules', {
    insurer: 'OGAR', filename: 'OGAR-VEHICULES.pdf', storagePath: oldPath, sha256: ogarTariffSha256,
  })
  store.files.set(oldPath, Buffer.from(pdf))
})

describe('barèmes des assureurs', () => {
  it('utilise uniquement la grille vérifiée du barème OGAR véhicules en vigueur', async () => {
    const simulation = () => GET(new NextRequest(url + '?simulation=ogar'))
    expect((await POST(request('OGAR', pdf, 'Entrepôts'))).status).toBe(201)
    const { documentId, groups } = await (await simulation()).json()
    expect(documentId).toBe('ogar-vehicules')
    expect(groups.flatMap((group: { bands: { rates: number[] }[] }) =>
      group.bands.flatMap(band => band.rates)
    )).toHaveLength(203)
    expect(groups.find((group: { id: string }) => group.id === 'bus-12').bands[3].rates[3]).toBe(685533)

    expect((await POST(request('OGAR', '%PDF-1.4\nnouvelle grille véhicules'))).status).toBe(201)
    expect(await (await simulation()).json()).toEqual({ groups: [] })
  })

  it('réserve la grille du simulateur aux administrateurs autorisés', async () => {
    store.access.mockResolvedValue({ permissionsDefined: true, permissions: ['boutiques.view'] })
    const response = await GET(new NextRequest(url + '?simulation=ogar'))
    expect(response.status).toBe(403)
    expect(await response.json()).not.toHaveProperty('groups')
  })

  it('réutilise OGAR et conserve chaque ancienne version à la publication d’un nouveau PDF', async () => {
    const axa = await POST(request('AXA', pdf))
    const updated = await POST(request('OGAR', '%PDF-1.4\nnouveau barème'))
    expect(axa.status).toBe(201)
    expect(updated.status).toBe(201)

    const listed = await GET(new NextRequest(url))
    const { items } = await listed.json()
    expect(items.map((item: { insurerId: string }) => item.insurerId)).toEqual(['ogar', 'axa', 'ogar'])
    expect(items.at(-1)).toMatchObject({ id: 'ogar-vehicules', filename: 'OGAR-VEHICULES.pdf', assetType: 'Véhicules' })

    const original = await GET(new NextRequest(url + '?document=ogar-vehicules'))
    expect(original.headers.get('content-type')).toBe('application/pdf')
    expect(await original.text()).toBe(pdf)
  })

  it('ajoute un assureur absent et associe ses mises à jour au nom normalisé', async () => {
    const first = await POST(request('Équateur Assurances & Conseil', pdf))
    const next = await POST(request('équateur assurances & conseil', '%PDF-1.4\nversion 2'))
    expect(first.status).toBe(201)
    expect(next.status).toBe(201)

    const { items } = await (await GET(new NextRequest(url))).json()
    const versions = items.filter((item: { insurerId: string }) => item.insurerId === 'equateur-assurances-conseil')
    expect(versions).toHaveLength(2)
    expect(versions[0].id).toBe((await next.json()).id)
  })

  it('sépare les types de biens d’un même assureur et accepte un type inédit', async () => {
    const vehicles = await POST(request('AXA', pdf))
    const warehouse = await POST(request('AXA', pdf, 'Entrepôts frigorifiques'))
    expect(vehicles.status).toBe(201)
    expect(warehouse.status).toBe(201)
    const { id } = await warehouse.json()
    const { items } = await (await GET(new NextRequest(url))).json()
    expect(items[0]).toMatchObject({ id, insurerId: 'axa', assetTypeId: 'entrepots-frigorifiques' })
    expect(items[1]).toMatchObject({ insurerId: 'axa', assetTypeId: 'vehicules' })
    expect(await (await GET(new NextRequest(url + '?document=' + id))).text()).toBe(pdf)
  })

  it('évite les doublons et refuse les fichiers qui ne sont pas des PDF', async () => {
    expect((await POST(request('AXA', 'pas un PDF'))).status).toBe(400)
    expect((await POST(request('AXA', pdf))).status).toBe(201)
    const duplicate = await POST(request(' axa ', pdf))
    expect(await duplicate.json()).toMatchObject({ duplicate: true })
    expect(store.saves).toHaveBeenCalledTimes(1)
  })

  it('interdit toute publication sans le droit de modification et bloque les requêtes croisées', async () => {
    store.access.mockResolvedValue({ permissionsDefined: true, permissions: ['vehicules.view'] })
    expect((await POST(request('AXA', pdf))).status).toBe(403)
    const response = await GET(new NextRequest(url))
    expect(await response.json()).toMatchObject({ canPublish: false })
    expect((await POST(new NextRequest(url, { method: 'POST', headers: { 'sec-fetch-site': 'cross-site' } }))).status).toBe(403)
    expect(store.saves).not.toHaveBeenCalled()
  })
})
