import { NextRequest, NextResponse } from 'next/server'
import { POST as purge } from '@/app/api/admin/purge/route'
import { requireMobileCaller, mobileJson } from '@/domains/mobile/server/access'
export const runtime = 'nodejs'
export const maxDuration = 300
export async function POST(request: NextRequest) {
  const caller = await requireMobileCaller(request)
  if (caller instanceof NextResponse) return caller
  if (!caller.access.isSuperAdmin || caller.mustChangePassword)
    return mobileJson({ error: 'Accès non autorisé.' }, 403)
  const response = await purge(request)
  return mobileJson(await response.json(), response.status)
}
