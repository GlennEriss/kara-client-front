// @vitest-environment node
import { NextRequest } from 'next/server'
import { beforeEach, expect, it, vi } from 'vitest'
import { ogarTariffSha256 } from '@/domains/vehicles/server/ogar-tariff'

const store = vi.hoisted(() => ({
  caller: vi.fn(),
  archive: vi.fn(),
  partners: vi.fn(),
  download: vi.fn(),
  grid: vi.fn(),
}))

vi.mock('@/domains/mobile/server/access', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/domains/mobile/server/access')>(),
  requireMobileCaller: store.caller,
}))
vi.mock('@/firebase/admin', () => ({ adminApp: {} }))
vi.mock('@/firebase/adminAuth', () => ({ adminAuth: {} }))
vi.mock('@/firebase/adminFirestore', () => ({
  adminFirestore: { collection: () => ({ orderBy: () => ({ get: store.archive }), doc: () => ({ get: store.grid }) }) },
}))
vi.mock('@/domains/vehicles/asset-types-server', () => ({
  readInsuranceAssetTypes: async () => ({ values: ['custom:Vitrine'], inactive: ['apartment'] }),
}))
vi.mock('@/domains/finance/server/firestore-port', () => ({ createServerFirestorePort: () => ({}) }))
vi.mock('@/db/vehicle-rewards.db', () => ({
  createVehicleRewardsRepository: () => ({ listInsurancePartners: store.partners }),
}))
vi.mock('firebase-admin/storage', () => ({
  getStorage: () => ({ bucket: () => ({ file: () => ({ download: store.download }) }) }),
}))
import { GET } from './route'

const request = (suffix = '') => new NextRequest('https://admin.test/api/mobile/admin/vehicles/simulator' + suffix)
const caller = (permissions: string[], mustChangePassword = false) => ({
  access: { permissions, permissionsDefined: true },
  mustChangePassword,
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', 'test.appspot.com')
  store.caller.mockResolvedValue(caller(['vehicules.view']))
  store.grid.mockResolvedValue({ exists: false })
  store.archive.mockResolvedValue({
    docs: [{
      id: 'ogar-vehicules',
      data: () => ({
        sha256: ogarTariffSha256,
        filename: 'OGAR-VEHICULES.pdf',
        storagePath: 'insurance-reference-documents/ogar-vehicules.pdf',
      }),
    }],
  })
  store.partners.mockResolvedValue([{ id: 'ogar', name: 'OGAR', commissionRate: 10, memberSharePercent: 30, updatedBy: 'secret' }])
  store.download.mockResolvedValue([Buffer.from('%PDF-1.4')])
})

it('utilise les primes modifiées du tableau OGAR', async () => {
  store.grid.mockResolvedValue({ exists: true, id: 'ogar--vehicules', data: () => ({
    insurer: 'OGAR', assetType: 'Véhicules', revision: 1, groups: [{
      id: 'berline', label: 'Berline', assetTypes: ['car'], plans: ['1 an'],
      bands: [{ label: '4 CV', rates: [120000] }],
    }],
  }) })
  const response = await GET(request())
  const data = await response.json()
  expect(data.ogar.gridId).toBe('ogar--vehicules')
  expect(data.ogar.groups[0].bands[0].rates[0]).toBe(120000)
  expect(store.archive).not.toHaveBeenCalled()
})

it('retourne le catalogue actif, les taux et le même barème vérifié que le web', async () => {
  const response = await GET(request())
  expect(response.status).toBe(200)
  expect(response.headers.get('cache-control')).toContain('no-store')
  const data = await response.json()
  expect(data.assetTypes).toContainEqual({ value: 'custom:Vitrine', label: 'Vitrine' })
  expect(data.assetTypes).not.toContainEqual(expect.objectContaining({ value: 'apartment' }))
  expect(data.partners).toEqual([{ id: 'ogar', name: 'OGAR', commissionRate: 10, memberSharePercent: 30 }])
  expect(data.ogar).toMatchObject({
    documentId: 'ogar-vehicules',
    groups: expect.arrayContaining([expect.objectContaining({ id: 'berline-particulier' })]),
  })
})

it('protège les taux et le PDF avec la permission de la rubrique et un mot de passe personnalisé', async () => {
  store.caller.mockResolvedValue(caller(['boutiques.view']))
  expect((await GET(request())).status).toBe(403)
  store.caller.mockResolvedValue(caller(['vehicules.view'], true))
  expect((await GET(request('?document=ogar-vehicules'))).status).toBe(403)
  expect(store.archive).not.toHaveBeenCalled()
})

it('ouvre uniquement le PDF du barème actuellement vérifié', async () => {
  expect((await GET(request('?document=another-file'))).status).toBe(404)
  expect(store.download).not.toHaveBeenCalled()
  const response = await GET(request('?document=ogar-vehicules'))
  expect(await response.json()).toEqual({
    filename: 'OGAR-VEHICULES.pdf', mime: 'application/pdf', base64: Buffer.from('%PDF-1.4').toString('base64'),
  })
})
