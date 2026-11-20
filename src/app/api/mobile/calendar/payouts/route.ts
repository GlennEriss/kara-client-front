import { NextRequest, NextResponse } from 'next/server'
import { adminFirestore } from '@/firebase/adminFirestore'
import {
  mobileCapabilities,
  mobileJson,
  requireMobileCaller,
} from '@/domains/mobile/server/access'
import { mobileDateKey } from '@/domains/mobile/contracts'
import { getMobileUpcomingPayouts } from '@/domains/mobile/server/calendar-payouts'
import {
  PAYOUT_HORIZON_OPTIONS,
  type PayoutProduct,
} from '@/services/calendar/upcomingPayouts'

export const runtime = 'nodejs'
export async function GET(request: NextRequest) {
  const caller = await requireMobileCaller(request, 'calendar')
  if (caller instanceof NextResponse) return caller
  const module = request.nextUrl.searchParams.get('module') || ''
  const products: Record<string, PayoutProduct> = {
    'caisse-speciale': 'Caisse Spéciale',
    'caisse-imprevue': 'Caisse Imprévue',
    placement: 'Placement',
  }
  const horizon = Number(request.nextUrl.searchParams.get('horizonMonths') || 3)
  if (
    !products[module] ||
    !(PAYOUT_HORIZON_OPTIONS as readonly number[]).includes(horizon)
  )
    return mobileJson({ error: 'Activité ou horizon invalide.' }, 400)
  if (!adminFirestore)
    return mobileJson({ error: 'Base de données indisponible.' }, 503)
  try {
    const rows = await getMobileUpcomingPayouts(
      adminFirestore,
      products[module],
      horizon,
    )
    const amounts = mobileCapabilities(caller.access).amounts
    return mobileJson({
      module,
      horizonMonths: horizon,
      items: rows.map((row) => ({
        key: row.key,
        product: row.product,
        kind: row.kind,
        contractId: row.contractId,
        name: row.name,
        isGroup: row.isGroup,
        typeLabel: row.typeLabel,
        daysUntil: row.daysUntil,
        isProjected: row.isProjected,
        amount: amounts ? row.amount : null,
        dueAt: mobileDateKey(row.dueAt),
        referenceAt: mobileDateKey(row.referenceAt),
      })),
    })
  } catch {
    return mobileJson(
      { error: 'Impossible de charger toutes les remises. Réessayez.' },
      503,
    )
  }
}
