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
  if (!sessionCookie) return null

  try {
    const claims = await verifySessionCookie(sessionCookie, { checkRevoked: true })
    if (hasAdminRoleFromClaims(claims)) return claims

    // Fallback de compatibilité: certains comptes admin historiques n'ont pas de custom claim role.
    if (adminFirestore) {
      const adminDoc = await adminFirestore.collection('admins').doc(claims.uid).get()
      if (adminDoc.exists) return claims
    }

    return null
  } catch {
    return null
  }
}
