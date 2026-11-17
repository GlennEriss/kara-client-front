import { beforeEach, describe, expect, it, vi } from 'vitest'
import { bootstrapToolsSession } from '../browser/bootstrap-session'
import { TOOLS_KEY, type ToolSession } from '../browser/tools-protocol'
const mock = vi.hoisted(() => ({ persist: vi.fn(), signIn: vi.fn(), signOut: vi.fn(), install: vi.fn(), getToken: vi.fn() }))
vi.mock('firebase/auth', () => ({ browserSessionPersistence: 'session', setPersistence: mock.persist, signInWithCustomToken: mock.signIn, signOut: mock.signOut }))
vi.mock('@/firebase/auth', () => ({ auth: 'test-auth' }))
vi.mock('../browser/tools-runtime', () => ({ installToolsRuntime: mock.install }))
const session = (): ToolSession => ({ version: 1, sessionId: 'a'.repeat(48), uid: 'admin', capabilities: { amounts: true, documents: true, exports: true }, customToken: 'custom-test-token',
  path: '/calendrier?tab=caisse-imprevue', exchangeBefore: Date.now() + 60_000, dark: false, reduceMotion: true })
beforeEach(() => {
  vi.clearAllMocks()
  sessionStorage.clear()
  window.ReactNativeWebView = { postMessage: vi.fn() }
  mock.persist.mockResolvedValue(undefined)
  mock.signOut.mockResolvedValue(undefined)
  mock.signIn.mockResolvedValue({ user: { uid: 'admin', getIdToken: mock.getToken } })
  mock.getToken.mockResolvedValue('test-id-token')
})
describe('ouverture authentifiée des outils', () => {
  it('rétablit le même compte, crée la session HttpOnly et ne stocke aucun jeton dans le marqueur', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    const redirect = vi.fn()
    const data = session()
    await bootstrapToolsSession(data, redirect)
    expect(mock.persist).toHaveBeenCalledWith('test-auth', 'session')
    expect(mock.signIn).toHaveBeenCalledWith('test-auth', 'custom-test-token')
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/session', expect.objectContaining({ credentials: 'same-origin', body: JSON.stringify({ idToken: 'test-id-token' }) }))
    expect(JSON.parse(sessionStorage.getItem(TOOLS_KEY)!)).toMatchObject({ uid: 'admin' })
    expect(sessionStorage.getItem(TOOLS_KEY)).not.toMatch(/token|password/i)
    expect(redirect).toHaveBeenCalledWith(new URL(data.path, window.location.origin).href)
    expect(data.customToken).toBe('')
  })
  it('refuse une identité différente avant toute création de cookie et nettoie Firebase', async () => {
    mock.signIn.mockResolvedValue({ user: { uid: 'another-admin', getIdToken: mock.getToken } })
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock)
    const redirect = vi.fn()
    await expect(bootstrapToolsSession(session(), redirect)).rejects.toThrow('identité')
    expect(mock.signOut).toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(redirect).not.toHaveBeenCalled()
    expect(sessionStorage.getItem(TOOLS_KEY)).toBeNull()
  })
  it('bloque une redirection externe, une session expirée et une ouverture annulée', async () => {
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock)
    for (const input of [{ ...session(), path: 'https://evil.example' }, { ...session(), exchangeBefore: 0 }])
      await expect(bootstrapToolsSession(input, vi.fn())).rejects.toThrow('invalide')
    await expect(bootstrapToolsSession(session(), vi.fn(), () => false)).rejects.toThrow('identité')
    expect(fetchMock).not.toHaveBeenCalled()
  })
  it('ne navigue jamais après un refus du serveur de session', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    const redirect = vi.fn()
    await expect(bootstrapToolsSession(session(), redirect)).rejects.toThrow('session')
    expect(redirect).not.toHaveBeenCalled()
    expect(sessionStorage.getItem(TOOLS_KEY)).toBeNull()
  })
})
