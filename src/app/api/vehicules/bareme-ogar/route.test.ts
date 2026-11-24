// @vitest-environment node
import { NextRequest, NextResponse } from 'next/server'
import { beforeEach, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  caller: vi.fn(),
  access: vi.fn(),
  read: vi.fn(),
  download: vi.fn(),
}))
vi.mock('@/domains/auth/server/requireAdminCaller', () => ({ requireAdminCaller: state.caller }))
vi.mock('@/domains/auth/server/admin-access', () => ({ loadAdminAccess: state.access }))
vi.mock('@/firebase/admin', () => ({ adminApp: {} }))
vi.mock('@/firebase/adminFirestore', () => ({
  adminFirestore: { collection: () => ({ doc: () => ({ get: state.read }) }) },
}))
vi.mock('firebase-admin/storage', () => ({
  getStorage: () => ({ bucket: () => ({ file: () => ({ download: state.download }) }) }),
}))
import { GET } from './route'

const request = new NextRequest('https://admin.test/api/vehicules/bareme-ogar')
const pdf = Buffer.from('%PDF-1.4\n')
const archivePath = 'insurance-reference-documents/ogar-vehicules.pdf'

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', 'fixture.test')
  state.caller.mockResolvedValue({ claims: { uid: 'vehicle-manager' } })
  state.access.mockResolvedValue({ permissionsDefined: true, permissions: ['vehicules.view'] })
  state.read.mockResolvedValue({ exists: true, data: () => ({ storagePath: archivePath }) })
  state.download.mockResolvedValue([pdf])
})

it('renvoie le PDF original en consultation privée aux gestionnaires autorisés', async () => {
  const response = await GET(request)
  expect(response.status).toBe(200)
  expect(response.headers.get('content-type')).toBe('application/pdf')
  expect(response.headers.get('cache-control')).toBe('private, no-store')
  expect(response.headers.get('content-disposition')).toBe('inline; filename="OGAR-VEHICULES.pdf"')
  expect(Buffer.from(await response.arrayBuffer())).toEqual(pdf)
})

it('refuse le téléchargement sans session admin ou sans droit de consultation', async () => {
  state.caller.mockResolvedValueOnce(NextResponse.json({}, { status: 401 }))
  expect((await GET(request)).status).toBe(401)
  state.access.mockResolvedValueOnce({ permissionsDefined: true, permissions: ['boutiques.view'] })
  expect((await GET(request)).status).toBe(403)
  expect(state.read).not.toHaveBeenCalled()
  expect(state.download).not.toHaveBeenCalled()
})

it('ne lit aucun fichier lorsque la référence attendue est absente ou différente', async () => {
  state.read.mockResolvedValueOnce({ exists: false })
  expect((await GET(request)).status).toBe(404)
  state.read.mockResolvedValueOnce({ exists: true, data: () => ({ storagePath: 'other.pdf' }) })
  expect((await GET(request)).status).toBe(404)
  expect(state.download).not.toHaveBeenCalled()
})
