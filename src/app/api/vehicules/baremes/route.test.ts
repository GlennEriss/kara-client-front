// @vitest-environment node
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ogarTariffSha256 } from '@/domains/vehicles/server/ogar-tariff'

const store = vi.hoisted(() => ({
  records: new Map<string, Record<string, unknown>>(),
  grids: new Map<string, Record<string, unknown>>(),
  files: new Map<string, Buffer>(),
  access: vi.fn(),
  saves: vi.fn(),
}))
const gridDocument = (id: string) => ({ id, exists: store.grids.has(id), data: () => store.grids.get(id) })
vi.mock('@/domains/auth/server/requireAdminCaller', () => ({
  requireAdminCaller: async () => ({ claims: { uid: 'test-admin' } }),
}))
vi.mock('@/domains/auth/server/admin-access', () => ({ loadAdminAccess: store.access }))
vi.mock('@/firebase/admin', () => ({ adminApp: {} }))
vi.mock('@/firebase/adminFirestore', () => ({
  adminFirestore: {
    collection: (name: string) => name === 'insurance-tariff-grids' ? ({
      doc: (id: string) => ({ id, get: async () => gridDocument(id) }),
      get: async () => ({ docs: [...store.grids].map(([id, data]) => ({ id, data: () => data })) }),
    }) : ({
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
    runTransaction: async (operation: (transaction: object) => Promise<boolean>) => operation({
      get: async ({ id }: { id: string }) => gridDocument(id),
      set: ({ id }: { id: string }, data: Record<string, unknown>) =>
        store.grids.set(id, { ...data, updatedAt: { toDate: () => new Date() } }),
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
import { GET as listGrids, PUT } from './grilles/route'

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
  store.grids.clear()
  store.files.clear()
  store.access.mockResolvedValue({ permissionsDefined: true, permissions: ['vehicules.view', 'vehicules.edit'] })
  store.records.set('ogar-vehicules', {
    insurer: 'OGAR', filename: 'OGAR-VEHICULES.pdf', storagePath: oldPath, sha256: ogarTariffSha256,
  })
  store.files.set(oldPath, Buffer.from(pdf))
})

describe('barèmes des assureurs', () => {
  it('préremplit le tableau OGAR et conserve ses tarifs quand un nouveau PDF est archivé', async () => {
    const simulation = () => GET(new NextRequest(url + '?simulation=ogar'))
    expect((await POST(request('OGAR', pdf, 'Entrepôts'))).status).toBe(201)
    const { documentId, groups } = await (await simulation()).json()
    expect(documentId).toBe('ogar-vehicules')
    expect(groups.flatMap((group: { bands: { rates: number[] }[] }) =>
      group.bands.flatMap(band => band.rates)
    )).toHaveLength(203)
    expect(groups.find((group: { id: string }) => group.id === 'bus-12').bands[3].rates[3]).toBe(685533)

    expect((await POST(request('OGAR', '%PDF-1.4\nnouvelle grille véhicules'))).status).toBe(201)
    expect(await (await simulation()).json()).toMatchObject({ gridId: 'ogar--vehicules', groups })
  })

  it('enregistre une correction qui alimente le simulateur et rejette une révision obsolète', async () => {
    const urlGrid = url + '/grilles'
    const { items } = await (await listGrids(new NextRequest(urlGrid))).json()
    const original = items[0]
    expect(original).toMatchObject({ id: 'ogar--vehicules', insurer: 'OGAR', revision: 0 })
    const changed = structuredClone(original)
    changed.groups[0].bands[0].rates[0] = 120000
    const save = (data: unknown) => PUT(new NextRequest(urlGrid, { method: 'PUT', body: JSON.stringify(data) }))

    expect((await save(changed)).status).toBe(200)
    const { items: updated } = await (await listGrids(new NextRequest(urlGrid))).json()
    expect(updated[0].revision).toBe(1)
    const { groups } = await (await GET(new NextRequest(url + '?simulation=ogar'))).json()
    expect(groups[0].bands[0].rates[0]).toBe(120000)
    expect((await save(original)).status).toBe(409)
  })

  it('ajoute une grille pour un autre assureur et contrôle les droits et les montants', async () => {
    const urlGrid = url + '/grilles'
    const save = (data: unknown) => PUT(new NextRequest(urlGrid, { method: 'PUT', body: JSON.stringify(data) }))
    const data = { insurer: 'AXA', assetType: 'Entrepôts', revision: null, groups: [{
      id: 'stockage', label: 'Stockage', assetTypes: [], plans: ['1 an'],
      bands: [{ label: 'Moins de 500 m²', rates: [250000] }],
    }] }
    store.access.mockResolvedValue({ permissionsDefined: true, permissions: ['vehicules.view'] })
    expect((await save(data)).status).toBe(403)
    store.access.mockResolvedValue({ permissionsDefined: true, permissions: ['vehicules.view', 'vehicules.edit'] })
    expect((await save({ ...data, groups: [{ ...data.groups[0], bands: [{ label: 'Entrepôt', rates: [-1] }] }] })).status).toBe(400)
    expect(await (await save(data)).json()).toEqual({ id: 'axa--entrepots' })
    const { items } = await (await listGrids(new NextRequest(urlGrid))).json()
    expect(items.map((item: { id: string }) => item.id)).toEqual(['axa--entrepots', 'ogar--vehicules'])
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
