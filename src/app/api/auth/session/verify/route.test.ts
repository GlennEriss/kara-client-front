// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const mock = vi.hoisted(() => ({ cookie: vi.fn(), verify: vi.fn(), access: vi.fn() }))
vi.mock('@/domains/auth/server/session', () => ({ getSessionCookieFromRequest: mock.cookie, verifySessionCookie: mock.verify }))
vi.mock('@/domains/auth/server/admin-access', () => ({ loadAdminAccess: mock.access }))
import { GET } from './route'
beforeEach(() => {
  vi.clearAllMocks()
  mock.cookie.mockReturnValue('session')
  mock.verify.mockResolvedValue({ uid: 'admin', role: 'Admin' })
  mock.access.mockResolvedValue({ permissionsDefined: true, permissions: ['groups.view'], isSuperAdmin: false, isAgent: false, restrictedRole: null })
})
describe('vérification de session et permissions', () => {
  it('retourne les droits vérifiés sans cache partagé', async () => {
    const response = await GET(new NextRequest('https://admin.example.com/api/auth/session/verify'))
    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toContain('no-store')
    expect(await response.json()).toMatchObject({ authenticated: true, access: { permissions: ['groups.view'] } })
    expect(mock.verify).toHaveBeenCalledWith('session', { checkRevoked: true })
  })
  it('distingue une session absente, un membre et une indisponibilité des permissions', async () => {
    const request = () => new NextRequest('https://admin.example.com/api/auth/session/verify')
    mock.cookie.mockReturnValue(null)
    expect((await GET(request())).status).toBe(401)
    expect(mock.access).not.toHaveBeenCalled()
    mock.cookie.mockReturnValue('session')
    mock.access.mockResolvedValue(null)
    expect((await GET(request())).status).toBe(403)
    mock.access.mockRejectedValue(new Error('Firestore indisponible'))
    expect((await GET(request())).status).toBe(503)
  })
})
