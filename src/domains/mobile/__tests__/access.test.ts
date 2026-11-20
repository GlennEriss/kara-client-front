// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { mobileCapabilities, requireMobileCaller } from '../server/access'
import type { ResolvedAdminAccess } from '@/domains/auth/access-policy'
const mock = vi.hoisted(() => ({ verifyIdToken: vi.fn(), loadAccess: vi.fn(), findRef: vi.fn(), getDoc: vi.fn() }))
vi.mock('@/firebase/adminAuth', () => ({ adminAuth: { verifyIdToken: mock.verifyIdToken } }))
vi.mock('@/firebase/adminFirestore', () => ({ adminFirestore: {} }))
vi.mock('@/domains/auth/server/admin-access', () => ({ loadAdminAccess: mock.loadAccess }))
vi.mock('@/domains/auth/server/adminAccountDoc', () => ({ findAdminDocRef: mock.findRef }))
const access: ResolvedAdminAccess = { isSuperAdmin: false, isAgent: false, restrictedRole: null, permissions: ['calendar.view'], permissionsDefined: true }
const request = (token = 'valid') => new NextRequest('https://admin.example/api/mobile/me', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
beforeEach(() => {
  vi.clearAllMocks()
  mock.verifyIdToken.mockResolvedValue({ uid: 'admin', email: 'admin@example.com' })
  mock.loadAccess.mockResolvedValue(access)
  mock.findRef.mockResolvedValue({ get: mock.getDoc })
  mock.getDoc.mockResolvedValue({ data: () => ({ mustChangePassword: false }) })
})
describe('autorisations des API mobiles', () => {
  it('exige un jeton, vérifie sa révocation et refuse un membre', async () => {
    const missing = await requireMobileCaller(request('')) as NextResponse
    expect(missing.status).toBe(401)
    mock.loadAccess.mockResolvedValue(null)
    const denied = await requireMobileCaller(request()) as NextResponse
    expect(denied.status).toBe(403)
    expect(mock.verifyIdToken).toHaveBeenCalledWith('valid', true)
  })
  it('retire le dashboard et les montants à un agent tout en conservant son calendrier', async () => {
    const agent = { ...access, isAgent: true, restrictedRole: 'AgentRecouvrement' }
    mock.loadAccess.mockResolvedValue(agent)
    const capabilities = mobileCapabilities(agent)
    expect(capabilities).toMatchObject({ dashboard: false, calendar: true, amounts: false, finance: { 'caisse-speciale': false, 'caisse-imprevue': false, 'credit-speciale': false, 'credit-fixe': false, 'caisse-aide': false } })
    expect(Object.values(capabilities.finance).every(value => value === false)).toBe(true)
    expect(capabilities.sections).toMatchObject({ calls: true, help: true, members: false, groups: false, reports: false, admins: false, 'cs-settings': false, 'ci-settings': false })
    expect(capabilities.sections).not.toHaveProperty('reset')
    expect(capabilities.sections).not.toHaveProperty('import-members')
    expect((await requireMobileCaller(request(), 'dashboard') as NextResponse).status).toBe(403)
    expect(await requireMobileCaller(request(), 'calendar')).not.toBeInstanceOf(NextResponse)
  })
  it('respecte les permissions explicites vides', async () => {
    mock.loadAccess.mockResolvedValue({ ...access, permissions: [] })
    expect((await requireMobileCaller(request(), 'calendar') as NextResponse).status).toBe(403)
  })
  it('bloque les données derrière le changement obligatoire du mot de passe', async () => {
    mock.getDoc.mockResolvedValue({ data: () => ({ mustChangePassword: true }) })
    const profile = await requireMobileCaller(request())
    expect(profile).toMatchObject({ mustChangePassword: true })
    expect((await requireMobileCaller(request(), 'dashboard') as NextResponse).status).toBe(403)
    expect((await requireMobileCaller(request(), 'calendar') as NextResponse).status).toBe(403)
  })
  it('refuse un jeton révoqué et ne transforme pas une panne de permissions en autorisation', async () => {
    mock.verifyIdToken.mockRejectedValueOnce(new Error('revoked'))
    expect((await requireMobileCaller(request()) as NextResponse).status).toBe(401)
    mock.loadAccess.mockRejectedValueOnce(new Error('Firestore unavailable'))
    const response = await requireMobileCaller(request()) as NextResponse
    expect(response.status).toBe(503)
    expect(response.headers.get('Cache-Control')).toContain('no-store')
  })
})
