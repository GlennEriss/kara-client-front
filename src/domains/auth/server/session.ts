import { adminAuth } from '@/firebase/adminAuth'
import { adminFirestore } from '@/firebase/adminFirestore'
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'

export const SESSION_COOKIE_NAME = '__session'
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 jours

export type SessionClaims = {
  uid: string
  email?: string
  role?: string
  [key: string]: unknown
}

function hasAdminRoleFromClaims(claims: SessionClaims | null): boolean {
  if (!claims) return false
  const role = typeof claims.role === 'string' ? claims.role.toLowerCase() : ''
  if (role.includes('admin') || role.includes('secretary')) return true
  return claims.admin === true
}

function isAdminRoleName(role: unknown): boolean {
  const x = typeof role === 'string' ? role.toLowerCase() : ''
  return x.includes('admin') || x.includes('secretary')
}

/**
 * Cherche le document `users` correspondant à un admin connecté, par :
 *  1) id du document == uid Firebase ;
 *  2) champ `id` == uid ;
 *  3) champ `email` == email du token.
 * Retourne les rôles trouvés (ou null si aucun document).
 */
async function findUserRoles(claims: SessionClaims): Promise<unknown[] | null> {
  if (!adminFirestore) return null
  try {
    const byId = await adminFirestore.collection('users').doc(claims.uid).get()
    if (byId.exists) return (byId.data()?.roles ?? []) as unknown[]
  } catch {
    // ignore
  }
  try {
    const q = await adminFirestore.collection('users').where('id', '==', claims.uid).limit(1).get()
    if (!q.empty) return (q.docs[0].data()?.roles ?? []) as unknown[]
  } catch {
    // ignore
  }
  if (typeof claims.email === 'string' && claims.email) {
    try {
      const q = await adminFirestore.collection('users').where('email', '==', claims.email).limit(1).get()
      if (!q.empty) return (q.docs[0].data()?.roles ?? []) as unknown[]
    } catch {
      // ignore
    }
  }
  return null
}

/**
 * Repli sur le modèle de rôles de l'app : un admin peut être identifié par son
 * document `users` (champ `roles`) sans custom claim ni doc `admins`.
 */
async function isAdminByUserDoc(claims: SessionClaims): Promise<boolean> {
  const roles = await findUserRoles(claims)
  const ok = Array.isArray(roles) && roles.some(isAdminRoleName)
  if (!ok) {
    console.warn('[admin-auth] users-doc fallback: pas de rôle admin', {
      uid: claims.uid,
      email: claims.email,
      rolesFound: roles,
    })
  }
  return ok
}

function getBearerTokenFromRequest(request: NextRequest) {
  const authorization = request.headers.get('authorization') || ''
  const match = authorization.match(/^Bearer\s+(.+)$/i)
  return match?.[1] || null
}

async function verifyAdminClaims(claims: SessionClaims | null): Promise<SessionClaims | null> {
  if (!claims) return null
  if (hasAdminRoleFromClaims(claims)) return claims

  if (adminFirestore) {
    const adminDoc = await adminFirestore.collection('admins').doc(claims.uid).get()
    if (adminDoc.exists) return claims
  }

  if (await isAdminByUserDoc(claims)) return claims

  return null
}

export function assertAdminAuthAvailable() {
  if (!adminAuth) throw new Error('FIREBASE_ADMIN_AUTH_UNAVAILABLE')
}

export async function createSessionCookieFromIdToken(idToken: string) {
  assertAdminAuthAvailable()
  // Vérifier l'ID token d'abord (permet de rejeter tôt et d'obtenir les claims)
  const decoded = await adminAuth!.verifyIdToken(idToken)
  const sessionCookie = await adminAuth!.createSessionCookie(idToken, { expiresIn: SESSION_TTL_MS })
  return { sessionCookie, decoded }
}

export async function verifySessionCookie(sessionCookie: string, opts?: { checkRevoked?: boolean }) {
  assertAdminAuthAvailable()
  const decoded = await adminAuth!.verifySessionCookie(sessionCookie, Boolean(opts?.checkRevoked))
  return decoded as SessionClaims
}

export function setSessionCookieInResponseHeaders(headers: Headers, sessionCookie: string) {
  // Utiliser le header Set-Cookie côté API route
  // Secure en prod seulement (Next gère https en prod)
  const isProd = process.env.NODE_ENV === 'production'
  const parts = [
    `${SESSION_COOKIE_NAME}=${sessionCookie}`,
    `Path=/`,
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
    `HttpOnly`,
    `SameSite=Lax`,
  ]
  if (isProd) parts.push('Secure')
  headers.append('Set-Cookie', parts.join('; '))
}

export function clearSessionCookieInResponseHeaders(headers: Headers) {
  const isProd = process.env.NODE_ENV === 'production'
  const parts = [
    `${SESSION_COOKIE_NAME}=`,
    `Path=/`,
    `Expires=Thu, 01 Jan 1970 00:00:00 GMT`,
    `HttpOnly`,
    `SameSite=Lax`,
  ]
  if (isProd) parts.push('Secure')
  headers.append('Set-Cookie', parts.join('; '))
}

export async function getServerSessionClaims() {
  const c = await cookies()
  const sessionCookie = c.get(SESSION_COOKIE_NAME)?.value
  if (!sessionCookie) return null
  try {
    return await verifySessionCookie(sessionCookie, { checkRevoked: true })
  } catch {
    return null
  }
}

export function getSessionCookieFromRequest(request: NextRequest) {
  return request.cookies.get(SESSION_COOKIE_NAME)?.value || null
}

export async function verifyAdminSessionFromRequest(request: NextRequest): Promise<SessionClaims | null> {
  const sessionCookie = getSessionCookieFromRequest(request)
  const bearerToken = getBearerTokenFromRequest(request)
  console.warn('[admin-auth] verify', {
    hasSessionCookie: !!sessionCookie,
    hasBearer: !!bearerToken,
    adminAuth: !!adminAuth,
    adminFirestore: !!adminFirestore,
  })

  async function verifyBearerToken(): Promise<SessionClaims | null> {
    if (!bearerToken) return null
    try {
      assertAdminAuthAvailable()
      const claims = (await adminAuth!.verifyIdToken(bearerToken, true)) as SessionClaims
      console.warn('[admin-auth] bearer claims', { uid: claims.uid, role: claims.role, email: claims.email })
      return await verifyAdminClaims(claims)
    } catch (e) {
      console.warn('[admin-auth] bearer verify failed', e instanceof Error ? e.message : e)
      return null
    }
  }

  if (!sessionCookie) return await verifyBearerToken()

  try {
    const claims = await verifySessionCookie(sessionCookie, { checkRevoked: true })
    console.warn('[admin-auth] cookie claims', { uid: claims.uid, role: claims.role, email: claims.email })
    if (hasAdminRoleFromClaims(claims)) return claims

    // Fallback de compatibilité: certains comptes admin historiques n'ont pas de custom claim role.
    if (adminFirestore) {
      const adminDoc = await adminFirestore.collection('admins').doc(claims.uid).get()
      if (adminDoc.exists) return claims
    }

    // Repli sur le rôle du document users (modèle de rôles de l'app).
    if (await isAdminByUserDoc(claims)) return claims

    return await verifyBearerToken()
  } catch {
    return await verifyBearerToken()
  }
}
