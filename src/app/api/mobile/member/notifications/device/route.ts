import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { adminFirestore } from '@/firebase/adminFirestore'
import { mobileJson } from '@/domains/mobile/server/access'
import { requireMemberCaller } from '@/domains/member-mobile/server/access'
import { MemberError } from '@/domains/member-mobile/server/data'
import { saveMemberDevice } from '@/domains/member-mobile/server/notifications'
export const runtime = 'nodejs'
async function save(request: NextRequest, remove = false) {
  const caller = await requireMemberCaller(request)
  if (caller instanceof NextResponse) return caller
  try {
    return mobileJson(
      await saveMemberDevice(
        adminFirestore!,
        caller,
        await request.json(),
        remove,
      ),
    )
  } catch (error) {
    return error instanceof MemberError
      ? mobileJson({ error: error.message }, error.status)
      : error instanceof z.ZodError
        ? mobileJson({ error: 'Appareil invalide.' }, 422)
        : mobileJson(
            {
              error:
                'Impossible de mettre à jour les notifications de cet appareil.',
            },
            503,
          )
  }
}
export const PUT = (request: NextRequest) => save(request)
export const DELETE = (request: NextRequest) => save(request, true)
