import { NextResponse } from 'next/server'
import { getSessionCookieFromRequest, verifySessionCookie } from '@/domains/auth/server/session'

export const runtime = 'nodejs'

export async function GET(request: import('next/server').NextRequest) {
  try {
    const sessionCookie = getSessionCookieFromRequest(request)
    if (!sessionCookie) return NextResponse.json({ authenticated: false }, { status: 401 })
    const claims = await verifySessionCookie(sessionCookie, { checkRevoked: true })
    return NextResponse.json({ authenticated: true, claims })
  } catch (error) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }
}
