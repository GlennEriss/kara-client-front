import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextResponse, type NextRequest } from 'next/server'

const verifyMock = vi.fn()
const adminDocRoles: { roles?: string[] } = {}
const userDocRoles: { roles?: string[] } = {}

vi.mock('../session', () => ({
  verifyAdminSessionFromRequest: (...args: unknown[]) => verifyMock(...args),
}))
vi.mock('@/firebase/adminFirestore', () => ({
  adminFirestore: {
    collection: (name: string) => ({
      doc: () => ({
        get: async () => ({ exists: !!(name === 'admins' ? adminDocRoles.roles : userDocRoles.roles), data: () => ({ roles: name === 'admins' ? adminDocRoles.roles : userDocRoles.roles }) }),
      }),
      where: () => ({ limit: () => ({ get: async () => ({ empty: true, docs: [] }) }) }),
    }),
  },
}))

import { requireAdminCaller } from '../requireAdminCaller'

const req = {} as NextRequest

describe('requireAdminCaller', () => {
  beforeEach(() => {
    verifyMock.mockReset()
    delete adminDocRoles.roles
    delete userDocRoles.roles
  })

  it('refuse un appel sans session admin (401)', async () => {
    verifyMock.mockResolvedValue(null)
    const res = await requireAdminCaller(req)
    expect(res).toBeInstanceOf(NextResponse)
    expect((res as NextResponse).status).toBe(401)
  })

  it('réserve les actions SuperAdmin au SuperAdmin (403)', async () => {
    verifyMock.mockResolvedValue({ uid: 'u1', role: 'Admin' })
    const res = await requireAdminCaller(req, { superAdmin: true })
    expect((res as NextResponse).status).toBe(403)
  })

  it('reconnaît un SuperAdmin par sa fiche admins', async () => {
    verifyMock.mockResolvedValue({ uid: 'u1' })
    adminDocRoles.roles = ['SuperAdmin']
    const res = await requireAdminCaller(req, { superAdmin: true })
    expect(res).not.toBeInstanceOf(NextResponse)
  })
  it('reconnaît aussi un SuperAdmin historique dont le rôle est uniquement dans users', async () => {
    verifyMock.mockResolvedValue({ uid: 'legacy-superadmin', role: 'Admin' })
    userDocRoles.roles = ['SuperAdmin']
    const result = await requireAdminCaller(req, { superAdmin: true })
    expect(result).not.toBeInstanceOf(NextResponse)
  })

  it('refuse les rôles restreints sauf autorisation explicite', async () => {
    verifyMock.mockResolvedValue({ uid: 'u2', role: 'AgentRecouvrement' })
    expect(((await requireAdminCaller(req)) as NextResponse).status).toBe(403)
    const allowed = await requireAdminCaller(req, { allowRestricted: true })
    expect(allowed).not.toBeInstanceOf(NextResponse)
  })
})
