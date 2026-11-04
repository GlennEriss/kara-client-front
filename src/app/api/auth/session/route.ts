import {
  createSessionCookieFromIdToken,
  SESSION_COOKIE_NAME,
  SESSION_TTL_MS,
} from '@/domains/auth/server/session'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const { idToken } = (await request.json()) as { idToken?: string }
    if (!idToken) return NextResponse.json({ ok: false, error: 'MISSING_ID_TOKEN' }, { status: 400 })

    const { sessionCookie, decoded } = await createSessionCookieFromIdToken(idToken)
    const response = NextResponse.json(
      {
        ok: true,
        uid: decoded.uid,
        email: decoded.email ?? null,
        claims: decoded,
      }
    )

    // Utiliser l'API cookies de NextResponse afin que les adaptateurs de
    // déploiement (notamment Firebase App Hosting) conservent Set-Cookie.
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: sessionCookie,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: Math.floor(SESSION_TTL_MS / 1000),
    })

    return response
  } catch (error) {
    console.error('[api/auth/session] error:', error)
    return NextResponse.json({ ok: false, error: 'SESSION_CREATE_FAILED' }, { status: 401 })
  }
}

