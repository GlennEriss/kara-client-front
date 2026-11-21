import { NextRequest, NextResponse } from 'next/server'
import { requireAdminCaller } from '@/domains/auth/server/requireAdminCaller'
import { loadAdminAccess } from '@/domains/auth/server/admin-access'
import { canWithAccess } from '@/domains/auth/access-policy'
import { adminFirestore } from '@/firebase/adminFirestore'
import { getVehicleCalendar } from '@/domains/vehicles/calendar-server'
import { isMobileMonth } from '@/domains/mobile/contracts'
import { mobileJson } from '@/domains/mobile/server/access'
export const runtime = 'nodejs'
export async function GET(request: NextRequest) {
  const caller = await requireAdminCaller(request, { allowRestricted: true })
  if (caller instanceof NextResponse) return caller
  const access = await loadAdminAccess(caller.claims)
  if (
    !access ||
    !canWithAccess(access, 'calendar.view') ||
    !canWithAccess(access, 'vehicules.view')
  )
    return mobileJson(
      { error: 'Vous ne pouvez pas consulter ce calendrier.' },
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
