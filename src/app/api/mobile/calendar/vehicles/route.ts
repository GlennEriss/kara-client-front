import { NextRequest, NextResponse } from 'next/server'
import { adminFirestore } from '@/firebase/adminFirestore'
import { requireMobileCaller, mobileJson } from '@/domains/mobile/server/access'
import { canWithAccess } from '@/domains/auth/access-policy'
import { isMobileMonth } from '@/domains/mobile/contracts'
import { getVehicleCalendar } from '@/domains/vehicles/calendar-server'
export const runtime = 'nodejs'
export async function GET(request: NextRequest) {
  const caller = await requireMobileCaller(request, 'calendar')
  if (caller instanceof NextResponse) return caller
  if (!canWithAccess(caller.access, 'vehicules.view'))
    return mobileJson(
      { error: 'Vous ne pouvez pas consulter les véhicules.' },
      403,
    )
  const month = request.nextUrl.searchParams.get('month')
  if (!isMobileMonth(month)) return mobileJson({ error: 'Mois invalide.' }, 400)
  try {
    return mobileJson(await getVehicleCalendar(adminFirestore!, month))
  } catch {
    return mobileJson(
      { error: 'Impossible de charger les échéances des véhicules.' },
      503,
    )
  }
}
