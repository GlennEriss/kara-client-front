import { createSessionCookieFromIdToken, setSessionCookieInResponseHeaders } from '@/domains/auth/server/session'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const { idToken } = (await request.json()) as { idToken?: string }
    if (!idToken) return NextResponse.json({ ok: false, error: 'MISSING_ID_TOKEN' }, { status: 400 })

    const { sessionCookie, decoded } = await createSessionCookieFromIdToken(idToken)
    const headers = new Headers()
    setSessionCookieInResponseHeaders(headers, sessionCookie)

    return NextResponse.json(
      {
        ok: true,
        uid: decoded.uid,
        email: decoded.email ?? null,
        claims: decoded,
      },
      { headers }
    )
  } catch (error) {
    console.error('[api/auth/session] error:', error)
    return NextResponse.json({ ok: false, error: 'SESSION_CREATE_FAILED' }, { status: 401 })
  }
}

