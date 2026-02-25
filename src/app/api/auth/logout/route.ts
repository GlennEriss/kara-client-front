import { clearSessionCookieInResponseHeaders } from '@/domains/auth/server/session'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST() {
  const headers = new Headers()
  clearSessionCookieInResponseHeaders(headers)
  return NextResponse.json({ ok: true }, { headers })
}

