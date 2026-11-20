// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/mobile/tools/session/route'
const mock = vi.hoisted(() => ({ caller: vi.fn(), token: vi.fn() }))
vi.mock('../server/access', async importOriginal => {
  const actual = await importOriginal<typeof import('../server/access')>()
  return { ...actual, requireMobileCaller: mock.caller }
})
vi.mock('@/firebase/adminAuth', () => ({ adminAuth: { createCustomToken: mock.token } }))
const access = { isAgent: false, isSuperAdmin: false, restrictedRole: null, permissionsDefined: true,
  permissions: ['calendar.view', 'calendar.contracts', 'caisseSpeciale.view'] }
const req = (body: unknown) => new NextRequest('https://admin.example/api/mobile/tools/session', {
  method: 'POST', headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
beforeEach(() => {
  vi.clearAllMocks()
  mock.caller.mockResolvedValue({ claims: { uid: 'admin', email: 'admin@example.com' }, access, mustChangePassword: false })
  mock.token.mockResolvedValue('custom-test-token')
})
describe('session dédiée aux outils mobiles', () => {
  it('émet un jeton pour le seul UID vérifié et ne place aucun secret dans le lien', async () => {
    const response = await POST(req({ target: 'calendar', module: 'caisse-speciale', eventId: 'caisse-speciale:C1:P1' }))
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(mock.token).toHaveBeenCalledTimes(1)
    expect(mock.token).toHaveBeenCalledWith('admin')
    expect(data).toMatchObject({ uid: 'admin', customToken: 'custom-test-token', version: 1 })
    expect(data.sessionId).toMatch(/^[a-f0-9]{48}$/)
    expect(data.path).not.toContain('token')
    expect(response.headers.get('Cache-Control')).toContain('no-store')
  })
  it('bloque le changement obligatoire de mot de passe et les droits manquants avant de créer un jeton', async () => {
    mock.caller.mockResolvedValueOnce({ claims: { uid: 'admin' }, access, mustChangePassword: true })
    expect((await POST(req({ target: 'calendar' }))).status).toBe(403)
    mock.caller.mockResolvedValueOnce({ claims: { uid: 'admin' }, access: { ...access, permissions: [] }, mustChangePassword: false })
    expect((await POST(req({ target: 'calendar' }))).status).toBe(403)
    mock.caller.mockResolvedValueOnce({ claims: { uid: 'agent' }, access: { ...access, isAgent: true }, mustChangePassword: false })
    expect((await POST(req({ target: 'dashboard' }))).status).toBe(403)
    expect(mock.token).not.toHaveBeenCalled()
  })
  it('respecte les droits du contrat cible et les identifiants fournis', async () => {
    const allowed = await POST(req({ target: 'contract', module: 'caisse-speciale', contractId: 'C1' }))
    expect((await allowed.json()).path).toBe('/caisse-speciale/contrats/C1')
    mock.caller.mockResolvedValueOnce({ claims: { uid: 'admin' }, access: { ...access, permissions: ['calendar.view'] }, mustChangePassword: false })
    expect((await POST(req({ target: 'contract', module: 'caisse-speciale', contractId: 'C1' }))).status).toBe(403)
    expect((await POST(req({ target: 'calendar', eventId: 'caisse-speciale:bad/id:P1' }))).status).toBe(400)
    expect((await POST(req({ target: 'calendar', uid: 'another-admin' }))).status).toBe(400)
  })
  it('propage le refus d’authentification et masque les erreurs du service de signature', async () => {
    const { NextResponse } = await import('next/server')
    mock.caller.mockResolvedValueOnce(NextResponse.json({ error: 'Session expirée.' }, { status: 401 }))
    expect((await POST(req({ target: 'calendar' }))).status).toBe(401)
    mock.token.mockRejectedValueOnce(new Error('private signing detail'))
    const response = await POST(req({ target: 'calendar' }))
    expect(response.status).toBe(503)
    expect(JSON.stringify(await response.json())).not.toContain('private signing detail')
  })
})
