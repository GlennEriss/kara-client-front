import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { adminFirestore } from '@/firebase/adminFirestore'
import { mobileJson } from '@/domains/mobile/server/access'
import { requireMemberCaller } from '@/domains/member-mobile/server/access'
import { MemberError } from '@/domains/member-mobile/server/data'
import {
  memberNotificationInbox,
  markMemberNotifications,
} from '@/domains/member-mobile/server/notifications'
export const runtime = 'nodejs'
function failure(error: unknown) {
  return error instanceof MemberError
    ? mobileJson({ error: error.message }, error.status)
    : error instanceof z.ZodError
      ? mobileJson({ error: 'Demande de notification invalide.' }, 422)
      : mobileJson(
          { error: 'Les notifications sont momentanément indisponibles.' },
          503,
        )
}
export async function GET(request: NextRequest) {
  const caller = await requireMemberCaller(request)
  if (caller instanceof NextResponse) return caller
  try {
    return mobileJson(
      await memberNotificationInbox(
        adminFirestore!,
        caller,
        request.nextUrl.searchParams.get('id'),
      ),
    )
  } catch (error) {
    return failure(error)
  }
}
export async function POST(request: NextRequest) {
  const caller = await requireMemberCaller(request)
  if (caller instanceof NextResponse) return caller
  try {
    return mobileJson(
      await markMemberNotifications(
        adminFirestore!,
        caller,
        await request.json(),
      ),
    )
  } catch (error) {
    return failure(error)
  }
}
