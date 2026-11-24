import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installToolsRuntime } from '../browser/tools-runtime'
import { TOOLS_KEY } from '../browser/tools-protocol'
vi.mock('@/firebase/auth', () => ({ auth: { app: { options: { storageBucket: 'kara-gabon.appspot.com' } } } }))
vi.mock('firebase/auth', () => ({ signOut: vi.fn().mockResolvedValue(undefined) }))
let cleanup: () => void = () => {}
const post = vi.fn()
beforeEach(() => {
  vi.clearAllMocks(); sessionStorage.clear()
  window.ReactNativeWebView = { postMessage: post }
  sessionStorage.setItem(TOOLS_KEY, JSON.stringify({ version: 1, sessionId: 'a'.repeat(48), uid: 'admin', capabilities: { amounts: true, documents: true, exports: true }, dark: false, reduceMotion: true }))
})
afterEach(() => { cleanup(); document.body.innerHTML = ''; sessionStorage.clear(); delete window.ReactNativeWebView })
describe('documents et apparence dans les outils intégrés', () => {
  it('applique le bleu aux contrôles et respecte le thème et la réduction des mouvements', () => {
    cleanup = installToolsRuntime()
    expect(document.documentElement.dataset.karaMotion).toBe('reduce')
    expect(document.head.textContent).toContain('background-color:#234D65')
    window.KaraMobileAppearance?.({ dark: true, reduceMotion: false })
    expect(document.documentElement.dataset.karaTheme).toBe('dark')
    expect(JSON.parse(sessionStorage.getItem(TOOLS_KEY)!).dark).toBe(true)
  })
  it('transmet un PDF généré au téléphone avec le bon identifiant de session', async () => {
    const blobUrl = `blob:${window.location.origin}/document-test`
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(['%PDF-1.4 test'], { type: 'application/pdf' }) }))
    cleanup = installToolsRuntime()
    const anchor = document.createElement('a'); anchor.href = blobUrl; anchor.download = 'recu.pdf'; document.body.append(anchor); anchor.click()
    await vi.waitFor(() => expect(post).toHaveBeenCalled())
    const data = JSON.parse(post.mock.calls[0][0])
    expect(data).toMatchObject({ type: 'kara.tools.file', sessionId: 'a'.repeat(48), filename: 'recu.pdf', mime: 'application/pdf' })
    expect(data.base64).toMatch(/^JVBER/)
  })
  it.each(['click', 'dispatch'] as const)('intercepte un lien détaché de générateur de document (%s)', async method => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(['%PDF-1.4 detached'], { type: 'application/pdf' }) }))
    cleanup = installToolsRuntime()
    const anchor = document.createElement('a')
    anchor.href = `blob:${window.location.origin}/detached`
    anchor.download = 'export.pdf'
    if (method === 'click') anchor.click()
    else anchor.dispatchEvent(new MouseEvent('click'))
    await vi.waitFor(() => expect(post).toHaveBeenCalledTimes(1))
    expect(JSON.parse(post.mock.calls[0][0])).toMatchObject({ type: 'kara.tools.file', filename: 'export.pdf', mime: 'application/pdf' })
  })
  it('restaure le comportement des liens à la fermeture des outils', () => {
    const click = HTMLAnchorElement.prototype.click
    const dispatch = HTMLAnchorElement.prototype.dispatchEvent
    cleanup = installToolsRuntime()
    cleanup()
    expect(HTMLAnchorElement.prototype.click).toBe(click)
    expect(HTMLAnchorElement.prototype.dispatchEvent).toBe(dispatch)
    expect(document.documentElement).not.toHaveAttribute('data-kara-mobile')
    expect(document.documentElement).not.toHaveAttribute('data-kara-theme')
    expect(document.documentElement).not.toHaveAttribute('data-kara-motion')
  })
  it('ne télécharge pas un fichier hébergé sur un projet étranger', async () => {
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock)
    cleanup = installToolsRuntime()
    window.KaraMobileDownload?.('https://firebasestorage.googleapis.com/v0/b/evil-project/o/proof')
    await vi.waitFor(() => expect(post).toHaveBeenCalled())
    expect(fetchMock).not.toHaveBeenCalled()
    expect(JSON.parse(post.mock.calls[0][0]).type).toBe('kara.tools.error')
  })
  it('ferme la session web sans toucher à la session Firebase native', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true }); vi.stubGlobal('fetch', fetchMock)
    cleanup = installToolsRuntime()
    await window.KaraMobileLogout?.()
    expect(sessionStorage.getItem(TOOLS_KEY)).toBeNull()
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/logout', expect.objectContaining({ method: 'POST' }))
    expect(JSON.parse(post.mock.calls[0][0]).type).toBe('kara.tools.closed')
  })
})
