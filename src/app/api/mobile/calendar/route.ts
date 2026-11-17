import { NextRequest, NextResponse } from 'next/server'
import { mobileCapabilities, mobileJson, requireMobileCaller } from '@/domains/mobile/server/access'
import { isMobileModule, isMobileMonth, redactAmounts } from '@/domains/mobile/contracts'
import { getMobileCalendar } from '@/domains/mobile/server/calendar-service'

export const runtime = 'nodejs'
export async function GET(request: NextRequest) {
  const caller = await requireMobileCaller(request, 'calendar')
  if (caller instanceof NextResponse) return caller
  const month = request.nextUrl.searchParams.get('month')
  const module = request.nextUrl.searchParams.get('module')
  if (!isMobileMonth(month) || !isMobileModule(module)) return mobileJson({ error: 'Le mois ou l’activité demandée est invalide.' }, 400)
  try {
    const events = await getMobileCalendar(month, module)
    return mobileJson({ month, module, generatedAt: new Date().toISOString(), events: redactAmounts(events, mobileCapabilities(caller.access).amounts) })
  } catch {
    // Une lecture manquée ne devient jamais un calendrier vide ou partiellement renseigné.
    return mobileJson({ error: 'Impossible de charger toutes les échéances. Réessayez.' }, 503)
  }
}
