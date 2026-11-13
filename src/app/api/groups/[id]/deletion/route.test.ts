// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
const mock = vi.hoisted(() => ({ authorize: vi.fn(), remove: vi.fn(), proofs: vi.fn() }))
vi.mock('@/domains/auth/server/requireAdminCaller', () => ({ requireAdminCaller: mock.authorize }))
vi.mock('@/firebase/admin', () => ({ adminApp: {} }))
vi.mock('@/firebase/adminFirestore', () => ({ adminFirestore: {} }))
vi.mock('firebase-admin/storage', () => ({ getStorage: () => ({ bucket: () => ({ deleteFiles: mock.proofs }) }) }))
vi.mock('@/domains/groups/server/delete-group', async importOriginal => ({ ...await importOriginal<object>(), deleteGroupPermanently: mock.remove }))
import { DELETE } from './route'
const request = (confirmationId: string) => new NextRequest('https://admin.example.com/api/groups/g1/deletion', { method: 'DELETE', body: JSON.stringify({ confirmationId }) })
const context = { params: Promise.resolve({ id: 'g1' }) }
beforeEach(() => {
  vi.clearAllMocks()
  mock.authorize.mockResolvedValue({ claims: { uid: 'superadmin', email: 'admin@example.com' }, isSuperAdmin: true })
  mock.remove.mockResolvedValue(undefined)
})
describe('API de suppression des groupes', () => {
  it('réserve le nettoyage au SuperAdmin avant toute opération', async () => {
    mock.authorize.mockResolvedValue(NextResponse.json({ error: 'Interdit' }, { status: 403 }))
    expect((await DELETE(request('g1'), context)).status).toBe(403)
    expect(mock.authorize).toHaveBeenCalledWith(expect.anything(), { superAdmin: true })
    expect(mock.remove).not.toHaveBeenCalled()
  })
  it('rejette une mauvaise confirmation puis transmet la suppression confirmée', async () => {
    expect((await DELETE(request('autre'), context)).status).toBe(400)
    expect(mock.remove).not.toHaveBeenCalled()
    expect((await DELETE(request('g1'), context)).status).toBe(200)
    expect(mock.remove).toHaveBeenCalledWith(expect.anything(), 'g1', expect.objectContaining({ id: 'superadmin' }), expect.any(Function))
  })
})
