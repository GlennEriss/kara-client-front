import { NextResponse } from 'next/server'
import { clearSessionCookieInResponseHeaders } from '@/domains/auth/server/session'

export const runtime = 'nodejs'

export async function POST() {
  const headers = new Headers()
  clearSessionCookieInResponseHeaders(headers)
  return NextResponse.json({ ok: true }, { headers })
}

