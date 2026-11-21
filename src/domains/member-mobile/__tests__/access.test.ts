// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
const state = vi.hoisted(() => ({
  verify: vi.fn(),
  collection: vi.fn(),
  member: {} as Record<string, any>,
  dossier: {} as Record<string, any>,
  ids: [] as string[],
}))
vi.mock('@/firebase/adminAuth', () => ({
  adminAuth: { verifyIdToken: state.verify },
}))
vi.mock('@/firebase/adminFirestore', () => ({
  adminFirestore: { collection: state.collection },
}))
vi.mock('@/domains/mobile/server/access', async () => {
  const { NextResponse } = await import('next/server')
  return {
    mobileJson: (body: unknown, status = 200) =>
      NextResponse.json(body, { status }),
  }
})
import { requireMemberCaller } from '../server/access'
const req = (token = true) =>
  new NextRequest('https://test/api/mobile/member/me?memberId=FOREIGN', {
    headers: token ? { authorization: 'Bearer verified-token' } : {},
  })
beforeEach(() => {
  vi.clearAllMocks()
  state.ids = []
  state.verify.mockResolvedValue({ uid: 'OWN-UID', email: 'own@example.test' })
  state.member = {
    matricule: 'OWN-MATRICULE',
    reglementInterieurAccepte: { version: '2026-01' },
  }
  state.dossier = { matricule: 'OWN-MATRICULE', status: 'approved' }
  state.collection.mockImplementation((collection: string) => ({
    doc: (id: string) => {
      state.ids.push(collection + '/' + id)
      return {
        get: async () => ({
          exists: true,
          data: () => (collection === 'users' ? state.member : state.dossier),
        }),
      }
    },
  }))
})
describe('accès personnel mobile membre', () => {
  it('vérifie un jeton révocable et ignore les identifiants arbitraires du client', async () => {
    const caller = await requireMemberCaller(req())
    expect(caller).not.toBeInstanceOf(NextResponse)
    expect(caller).toMatchObject({ uid: 'OWN-UID', matricule: 'OWN-MATRICULE' })
    expect(state.verify).toHaveBeenCalledWith('verified-token', true)
    expect(state.ids).toEqual([
      'users/OWN-UID',
      'membership-requests/OWN-MATRICULE',
    ])
  })
  it('ne lit aucune donnée avec un jeton absent, invalide ou révoqué', async () => {
    expect(
      ((await requireMemberCaller(req(false))) as NextResponse).status,
    ).toBe(401)
    state.verify.mockRejectedValue(new Error('revoked'))
    expect(((await requireMemberCaller(req())) as NextResponse).status).toBe(
      401,
    )
    expect(state.collection).not.toHaveBeenCalled()
  })
  it('refuse les adhésions non validées et les comptes désactivés', async () => {
    state.dossier.status = 'pending'
    expect(((await requireMemberCaller(req())) as NextResponse).status).toBe(
      403,
    )
    state.member.isActive = false
    expect(
      ((await requireMemberCaller(req(), true)) as NextResponse).status,
    ).toBe(403)
  })
  it('permet seulement l’accueil de première connexion avant mot de passe et règlement', async () => {
    state.member.mustChangePassword = true
    expect(((await requireMemberCaller(req())) as NextResponse).status).toBe(
      403,
    )
    expect(await requireMemberCaller(req(), true)).not.toBeInstanceOf(
      NextResponse,
    )
    state.member.mustChangePassword = false
    state.member.reglementInterieurAccepte = null
    expect(((await requireMemberCaller(req())) as NextResponse).status).toBe(
      403,
    )
  })
})
