import { browserSessionPersistence, setPersistence, signInWithCustomToken, signOut } from 'firebase/auth'
import { auth } from '@/firebase/auth'
import { TOOLS_KEY, postToolMessage, type ToolSession } from './tools-protocol'
import { installToolsRuntime } from './tools-runtime'

export async function bootstrapToolsSession(session: ToolSession,
  redirect: (url: string) => void = url => window.location.replace(url),
  isActive: () => boolean = () => true): Promise<void> {
  let cookieCreated = false
  try {
    const target = new URL(session.path, window.location.origin)
    if (session.version !== 1 || !/^[a-f0-9]{48}$/.test(session.sessionId) || !session.uid ||
      !Number.isFinite(session.exchangeBefore) || Date.now() > session.exchangeBefore ||
      target.origin !== window.location.origin ||
      !/^\/(calendrier|dashboard|caisse-speciale|caisse-imprevue|credit-speciale|credit-fixe|credit-aide|placements)(\/|\?|$)/.test(session.path))
      throw new Error('Session des outils invalide.')
    await setPersistence(auth, browserSessionPersistence)
    const credential = await signInWithCustomToken(auth, session.customToken)
    session.customToken = ''
    if (!isActive() || credential.user.uid !== session.uid) throw new Error('L’identité de la session est incohérente.')
    const response = await fetch('/api/auth/session', { method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: await credential.user.getIdToken() }) })
    if (!response.ok) throw new Error('Impossible de créer la session des outils.')
    cookieCreated = true
    if (!isActive()) throw new Error('Ouverture annulée.')
    sessionStorage.setItem(TOOLS_KEY, JSON.stringify({ version: 1, sessionId: session.sessionId,
      uid: session.uid, capabilities: session.capabilities, dark: session.dark, reduceMotion: session.reduceMotion }))
    installToolsRuntime()
    postToolMessage({ type: 'kara.tools.authenticated', sessionId: session.sessionId })
    redirect(target.href)
  } catch (cause) {
    session.customToken = ''
    await signOut(auth).catch(() => {})
    sessionStorage.removeItem(TOOLS_KEY)
    if (cookieCreated) await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => {})
    throw cause
  }
}
