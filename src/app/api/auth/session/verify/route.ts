import { getSessionCookieFromRequest, verifySessionCookie } from '@/domains/auth/server/session'
import { NextResponse } from 'next/server'
import { loadAdminAccess } from '@/domains/auth/server/admin-access'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: import('next/server').NextRequest) {
  try {
    const sessionCookie = getSessionCookieFromRequest(request)
    if (!sessionCookie) return NextResponse.json({ authenticated: false }, { status: 401 })
    const claims = await verifySessionCookie(sessionCookie, { checkRevoked: true })
    try {
      const access = await loadAdminAccess(claims)
      if (!access) return NextResponse.json({ authenticated: false }, { status: 403, headers: { 'Cache-Control': 'private, no-store' } })
      return NextResponse.json({ authenticated: true, claims, access }, { headers: { 'Cache-Control': 'private, no-store' } })
    } catch {
      return NextResponse.json({ authenticated: true, error: 'ACCESS_UNAVAILABLE' }, { status: 503, headers: { 'Cache-Control': 'private, no-store' } })
    }
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }
}
