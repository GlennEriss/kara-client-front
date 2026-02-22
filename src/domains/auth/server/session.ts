import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'
import { adminAuth } from '@/firebase/adminAuth'

export const SESSION_COOKIE_NAME = '__session'
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 jours

export type SessionClaims = {
  uid: string
  email?: string
  role?: string
  [key: string]: unknown
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
