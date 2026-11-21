// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
const state = vi.hoisted(() => ({
  caller: vi.fn(),
  profile: vi.fn(),
  subscriptions: vi.fn(),
  dashboard: vi.fn(),
  write: vi.fn(),
  updateUser: vi.fn(),
  revoke: vi.fn(),
  doc: vi.fn(),
  storage: vi.fn(),
  metadata: vi.fn(),
  download: vi.fn(),
}))
vi.mock('../server/access', () => ({ requireMemberCaller: state.caller }))
vi.mock('../server/read-model', () => ({
  memberProfile: state.profile,
  memberSubscriptions: state.subscriptions,
  memberDashboard: state.dashboard,
}))
vi.mock('@/firebase/adminAuth', () => ({
  adminAuth: {
    updateUser: state.updateUser,
    revokeRefreshTokens: state.revoke,
  },
}))
vi.mock('@/firebase/adminFirestore', () => ({
  adminFirestore: { collection: () => ({ doc: state.doc }) },
}))
vi.mock('@/firebase/admin', () => ({ adminApp: {} }))
vi.mock('firebase-admin/storage', () => ({ getStorage: state.storage }))
vi.mock('@/domains/mobile/server/access', async () => {
  const { NextResponse } = await import('next/server')
  return {
    mobileJson: (body: unknown, status = 200) =>
      NextResponse.json(body, {
        status,
        headers: { 'Cache-Control': 'no-store, private' },
      }),
  }
})
import { GET, POST } from '@/app/api/mobile/member/[resource]/route'
import { GET as fileGET } from '@/app/api/mobile/member/file/route'
const context = (resource: string) => ({
  params: Promise.resolve({ resource }),
})
const request = (path = 'me', body?: unknown) =>
  new NextRequest('https://test/api/mobile/member/' + path, {
    ...(body ? { method: 'POST', body: JSON.stringify(body) } : {}),
  })
beforeEach(() => {
  vi.clearAllMocks()
  state.caller.mockResolvedValue({
    uid: 'OWN',
    email: 'own@test.ga',
    matricule: 'MAT',
    member: {},
    dossier: {},
  })
  state.profile.mockReturnValue({
    identity: { firstName: 'Marie', lastName: 'Test' },
    documents: {},
  })
  state.subscriptions.mockResolvedValue([])
  state.dashboard.mockResolvedValue({ activeCIContracts: 1 })
  state.doc.mockReturnValue({
    set: state.write,
    update: state.write,
    get: async () => ({
      data: () => ({
        userId: 'OTHER',
        adhesionPdfURL: 'https://evil.test/private.pdf',
      }),
    }),
  })
  state.storage.mockReturnValue({
    bucket: () => ({
      file: () => ({ getMetadata: state.metadata, download: state.download }),
    }),
  })
  state.metadata.mockResolvedValue([
    { size: '10', contentType: 'application/pdf' },
  ])
  state.download.mockResolvedValue([Buffer.from('%PDF-test')])
})
describe('API mobile personnelle, sans accès admin', () => {
  it('le profil de session membre ne donne aucune capacité d’administration', async () => {
    const response = await GET(request('me?uid=OTHER'), context('me')),
      body = await response.json()
    expect(response.headers.get('cache-control')).toBe('no-store, private')
    expect(body).toMatchObject({
      uid: 'OWN',
      matricule: 'MAT',
      space: 'member',
      mustAcceptRules: true,
      capabilities: {
        dashboard: false,
        calendar: false,
        sections: {},
        finance: {},
      },
    })
  })
  it('ne lance pas les lectures métier quand le contrôle d’accès refuse', async () => {
    state.caller.mockResolvedValue(NextResponse.json({}, { status: 403 }))
    expect((await GET(request('dashboard'), context('dashboard'))).status).toBe(
      403,
    )
    expect(state.dashboard).not.toHaveBeenCalled()
  })
  it('une panne de données est une erreur, pas un tableau de bord vide', async () => {
    state.dashboard.mockRejectedValue(new Error('offline'))
    expect((await GET(request('dashboard'), context('dashboard'))).status).toBe(
      503,
    )
  })
  it('exige une acceptation explicite de la version actuelle et écrit seulement sur le membre connecté', async () => {
    expect(
      (
        await POST(
          request('accept-rules', { version: 'old', accepted: true }),
          context('accept-rules'),
        )
      ).status,
    ).toBe(400)
    expect(
      (
        await POST(
          request('accept-rules', { version: '2026-01', accepted: false }),
          context('accept-rules'),
        )
      ).status,
    ).toBe(400)
    expect(state.write).not.toHaveBeenCalled()
    expect(
      (
        await POST(
          request('accept-rules', { version: '2026-01', accepted: true }),
          context('accept-rules'),
        )
      ).status,
    ).toBe(200)
    expect(state.doc).toHaveBeenCalledWith('OWN')
  })
  it('refuse tout changement de mot de passe visant un identifiant transmis par le client', async () => {
    expect(
      (
        await POST(
          request('change-password', {
            newPassword: 'Valide123',
            uid: 'OTHER',
          }),
          context('change-password'),
        )
      ).status,
    ).toBe(400)
    expect(state.updateUser).not.toHaveBeenCalled()
  })
  it('ne télécharge pas les attestations d’un autre membre', async () => {
    expect(
      (await fileGET(request('file?kind=subscription&id=FOREIGN'))).status,
    ).toBe(404)
    expect(state.storage).not.toHaveBeenCalled()
  })
  it('ne suit jamais une URL externe depuis un document de profil', async () => {
    state.profile.mockReturnValue({
      documents: { documentPhotoFrontURL: 'https://evil.test/private.jpg' },
    })
    expect((await fileGET(request('file?kind=profile&id=front'))).status).toBe(
      400,
    )
    expect(state.storage).not.toHaveBeenCalled()
  })
  it('sert uniquement le fichier référencé dans le dossier autorisé et le bucket attendu', async () => {
    vi.stubEnv('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', 'test-bucket')
    state.profile.mockReturnValue({
      documents: {
        documentPhotoFrontURL:
          'https://firebasestorage.googleapis.com/v0/b/test-bucket/o/member%2Fown.pdf?token=ignored',
      },
    })
    const result = await fileGET(request('file?kind=profile&id=front'))
    expect(result.status).toBe(200)
    expect(await result.json()).toMatchObject({
      mime: 'application/pdf',
      filename: 'identite-front.pdf',
    })
    state.metadata.mockResolvedValue([
      { size: String(21 * 1024 * 1024), contentType: 'application/pdf' },
    ])
    expect((await fileGET(request('file?kind=profile&id=front'))).status).toBe(
      400,
    )
    expect(state.download).toHaveBeenCalledOnce()
    vi.unstubAllEnvs()
  })
})
