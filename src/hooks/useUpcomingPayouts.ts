"use client"


/**
 * Hook : liste des REMISES D'ARGENT à venir (Caisse Spéciale + Caisse Imprévue + Placement).
 *
 * Règle métier : la remise finale est due exactement à la fin du contrat ou
 * du placement. Seul un retrait anticipé conserve un délai de 30 jours après
 * son approbation par l'administration.
 *
 * Un contrat sort de la liste dès que sa remise est marquée payée (refund PAID).
 * Un contrat arrêté après approbation reste donc visible jusqu'à la remise réelle.
 */

import { useQuery } from '@tanstack/react-query'
import { getAllContracts } from '@/db/caisse/contracts.db'
import { listPayments } from '@/db/caisse/payments.db'
import { getActiveSettings } from '@/db/caisse/settings.db'
import { listRefunds, listRefundsCI } from '@/db/caisse/refunds.db'
import { getUserById } from '@/db/user.db'
import { getGroupById } from '@/db/group.db'
import { ServiceFactory } from '@/factories/ServiceFactory'
import type { CaisseContract, CaissePayment } from '@/services/caisse/types'

import { createUpcomingPayoutsReader, PAYOUT_HORIZON_MONTHS, type UpcomingPayout } from '@/services/calendar/upcomingPayouts'
export { EARLY_PAYOUT_DELAY_DAYS, PAYOUT_HORIZON_MONTHS, PAYOUT_HORIZON_OPTIONS, getPayoutDueAt } from '@/services/calendar/upcomingPayouts'
export type { UpcomingPayout, PayoutProduct, PayoutKind } from '@/services/calendar/upcomingPayouts'

const readUpcomingPayouts = createUpcomingPayoutsReader({
  getAllContracts: async filters => await getAllContracts(filters) as CaisseContract[],
  listPayments: async id => await listPayments(id) as CaissePayment[],
  getActiveSettings, listRefunds, listRefundsCI, getUserById, getGroupById,
  getCaisseImprevueService: () => ServiceFactory.getCaisseImprevueService(),
  getPlacementService: () => ServiceFactory.getPlacementService(),
})
export function useUpcomingPayouts(horizonMonths: number = PAYOUT_HORIZON_MONTHS) {
  return useQuery<UpcomingPayout[]>({
    queryKey: ['upcoming-payouts', horizonMonths],
    queryFn: () => readUpcomingPayouts(horizonMonths),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}
