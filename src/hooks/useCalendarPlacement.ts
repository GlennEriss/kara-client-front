"use client"

import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { startOfMonth, endOfMonth, startOfDay, format } from 'date-fns'
import { ServiceFactory } from '@/factories/ServiceFactory'
import { Placement, CommissionPaymentPlacement, PayoutMode } from '@/types/types'
import { roundFcfa } from '@/utils/placementMoney'

/**
 * Une échéance de placement est soit une commission réelle (document Firestore),
 * soit la restitution du capital — obligation contractuelle qui tombe à la date
 * de fin mais n'existe pas en base tant que le placement n'est pas clôturé.
 */
export type PlacementScheduleKind = 'commission' | 'capital'

export interface CalendarCommissionItem extends CommissionPaymentPlacement {
  placement: Placement
  benefactorDisplayName: string
  color: 'green' | 'orange' | 'yellow' | 'red' | 'gray'
  kind: PlacementScheduleKind
}

export interface DayCommissions {
  date: Date
  commissions: CalendarCommissionItem[]
  totalAmount: number
  paidAmount: number
  remainingAmount: number
  /** Part du total correspondant à des restitutions de capital. */
  capitalAmount: number
  count: number
  statuses: ('Due' | 'Paid' | 'Partial' | 'Canceled')[]
  payoutModes: PayoutMode[]
  color: 'green' | 'orange' | 'yellow' | 'red' | 'gray'
}

/**
 * Identifiant synthétique de la restitution du capital. Préfixé pour qu'aucun
 * appel de paiement ne puisse le confondre avec un id de commission Firestore.
 */
export const buildCapitalRestitutionId = (placementId: string): string =>
  `capital-restitution-${placementId}`

export const isCapitalRestitution = (item: Pick<CalendarCommissionItem, 'kind'>): boolean =>
  item.kind === 'capital'

/**
 * Date à laquelle le capital doit être restitué : la fin du placement, qui
 * coïncide avec la dernière commission dans les deux modes de règlement.
 */
function resolveCapitalDueDate(
  placement: Placement,
  commissions: CommissionPaymentPlacement[]
): Date | null {
  if (placement.endDate) {
    const end = new Date(placement.endDate)
    if (!Number.isNaN(end.getTime())) return end
  }
  if (commissions.length === 0) return null
  return new Date(Math.max(...commissions.map((c) => c.dueDate.getTime())))
}

const IMMINENT_DAYS = 2 // Configurable

// Fonction pour calculer la couleur d'une commission individuelle
function getCommissionColor(
  commission: CommissionPaymentPlacement,
  today: Date
): 'green' | 'orange' | 'yellow' | 'red' | 'gray' {
  if (commission.status === 'Paid') return 'green'
  if (commission.status === 'Canceled') return 'gray'
  if (commission.status === 'Due') {
    const todayStart = startOfDay(today)
    const dueDateStart = startOfDay(commission.dueDate)
    if (dueDateStart < todayStart) return 'red'
    const diffDays = Math.floor(
      (dueDateStart.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24)
    )
    return diffDays <= IMMINENT_DAYS ? 'orange' : 'yellow'
  }
  if (commission.status === 'Partial') {
    // Pour les commissions partielles, on considère qu'elles sont encore dues
    const todayStart = startOfDay(today)
    const dueDateStart = startOfDay(commission.dueDate)
    if (dueDateStart < todayStart) return 'red'
    const diffDays = Math.floor(
      (dueDateStart.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24)
    )
    return diffDays <= IMMINENT_DAYS ? 'orange' : 'yellow'
  }
  return 'gray'
}

// Fonction pour calculer la couleur d'un jour
function calculateDayColor(
  commissions: CalendarCommissionItem[],
  today: Date
): 'green' | 'orange' | 'yellow' | 'red' | 'gray' {
  if (commissions.length === 0) return 'gray'

  const todayStart = startOfDay(today)

  // Vérifier s'il y a des commissions en retard (rouge)
  const hasOverdue = commissions.some(
    (c) => (c.status === 'Due' || c.status === 'Partial') && startOfDay(c.dueDate) < todayStart
  )
  if (hasOverdue) return 'red'

  // Vérifier s'il y a des commissions imminentes (orange)
  const hasImminent = commissions.some((c) => {
    if (c.status !== 'Due' && c.status !== 'Partial') return false
    const dueStart = startOfDay(c.dueDate)
    const diffDays = Math.floor(
      (dueStart.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24)
    )
    return diffDays >= 0 && diffDays <= IMMINENT_DAYS
  })
  if (hasImminent) return 'orange'

  // Vérifier s'il y a des commissions à venir (jaune)
  const hasUpcoming = commissions.some((c) => {
    if (c.status !== 'Due' && c.status !== 'Partial') return false
    const dueStart = startOfDay(c.dueDate)
    const diffDays = Math.floor(
      (dueStart.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24)
    )
    return diffDays > IMMINENT_DAYS
  })
  if (hasUpcoming) return 'yellow'
  
  // Vérifier si toutes les commissions sont payées (vert)
  const allPaid = commissions.every((c) => c.status === 'Paid')
  if (allPaid) return 'green'
  
  // Vérifier si toutes les commissions sont annulées (gris)
  const allCanceled = commissions.every((c) => c.status === 'Canceled')
  if (allCanceled) return 'gray'
  
  return 'yellow'
}

/**
 * Agrège les échéances (commissions + restitutions de capital) par jour.
 * Exporté pour être testable : c'est ici que se joue le total réellement à
 * remettre au bienfaiteur pour une date donnée.
 */
export function groupPlacementScheduleByDay(
  items: CalendarCommissionItem[],
  today: Date
): DayCommissions[] {
  const groupedByDay = items.reduce(
    (acc: Record<string, DayCommissions>, item: CalendarCommissionItem) => {
      const dayKey = format(item.dueDate, 'yyyy-MM-dd')
      if (!acc[dayKey]) {
        acc[dayKey] = {
          date: item.dueDate,
          commissions: [],
          totalAmount: 0,
          paidAmount: 0,
          remainingAmount: 0,
          capitalAmount: 0,
          count: 0,
          statuses: [],
          payoutModes: [],
          color: 'gray',
        }
      }

      const day = acc[dayKey]
      day.commissions.push(item)

      const dueAmount = roundFcfa(item.amount)
      const paidAmount = roundFcfa(item.paidAmount ?? (item.status === 'Paid' ? dueAmount : 0))

      // Une échéance annulée (commission soldée par une sortie anticipée) ne
      // représente plus aucun engagement : elle reste listée dans le jour mais
      // sort des totaux, comme dans les statistiques, la fiche et les exports.
      if (item.status !== 'Canceled') {
        day.totalAmount = roundFcfa(day.totalAmount + dueAmount)

        if (item.kind === 'capital') {
          day.capitalAmount = roundFcfa(day.capitalAmount + dueAmount)
        }
      }

      if (item.status === 'Paid') {
        day.paidAmount = roundFcfa(day.paidAmount + paidAmount)
      } else if (item.status === 'Partial') {
        day.paidAmount = roundFcfa(day.paidAmount + paidAmount)
        day.remainingAmount = roundFcfa(day.remainingAmount + Math.max(0, dueAmount - paidAmount))
      } else if (item.status === 'Due') {
        day.remainingAmount = roundFcfa(day.remainingAmount + dueAmount)
      }

      day.count++
      day.statuses.push(item.status)

      if (!day.payoutModes.includes(item.placement.payoutMode)) {
        day.payoutModes.push(item.placement.payoutMode)
      }

      return acc
    },
    {} as Record<string, DayCommissions>
  )

  Object.values(groupedByDay).forEach((day) => {
    day.color = calculateDayColor(day.commissions, today)
  })

  return Object.values(groupedByDay).sort((a, b) => a.date.getTime() - b.date.getTime())
}

export function useCalendarPlacement(
  month: Date,
  payoutModes: PayoutMode[],
  enabled: boolean = true
) {
  const filters = useMemo(
    () => ({
      monthStart: startOfMonth(month),
      monthEnd: endOfMonth(month),
      payoutModes,
    }),
    [month, payoutModes]
  )

  return useQuery({
    queryKey: [
      'calendar-placements',
      format(month, 'yyyy-MM'),
      payoutModes.join(','),
    ],
    queryFn: async (): Promise<DayCommissions[]> => {
      const today = new Date()
      const service = ServiceFactory.getPlacementService()

      // 1. Récupérer tous les placements actifs
      const allPlacements = await service.listPlacements()
      const activePlacements = allPlacements.filter(
        (p: Placement) => p.status === 'Active'
      )

      // Filtrer par modes de règlement
      const filteredPlacements =
        payoutModes.length > 0
          ? activePlacements.filter((p: Placement) => 
              payoutModes.includes(p.payoutMode)
            )
          : activePlacements

      // 2. Récupérer les commissions pour chaque placement
      const allCommissions: Array<
        CommissionPaymentPlacement & { placement: Placement; kind: PlacementScheduleKind }
      > = []

      const isInMonth = (date: Date) => {
        const dayStart = startOfDay(date)
        return dayStart >= filters.monthStart && dayStart <= filters.monthEnd
      }

      for (const placement of filteredPlacements) {
        try {
          const placementCommissions = await service.listCommissions(placement.id)

          // Filtrer les commissions du mois
          const monthCommissions = placementCommissions.filter((c: CommissionPaymentPlacement) =>
            isInMonth(c.dueDate)
          )

          // Enrichir avec les informations du placement
          allCommissions.push(...monthCommissions.map((c: CommissionPaymentPlacement) => ({
            ...c,
            placement,
            kind: 'commission' as const,
          })))

          // Restitution du capital : le placement étant actif, le capital est
          // par construction encore dû (la clôture le solde et bascule en
          // « Closed », donc hors périmètre de ce calendrier).
          const capitalDueDate = resolveCapitalDueDate(placement, placementCommissions)
          if (capitalDueDate && isInMonth(capitalDueDate)) {
            allCommissions.push({
              id: buildCapitalRestitutionId(placement.id),
              placementId: placement.id,
              dueDate: capitalDueDate,
              amount: roundFcfa(placement.amount),
              status: 'Due',
              createdAt: placement.createdAt,
              updatedAt: placement.updatedAt,
              createdBy: placement.createdBy,
              placement,
              kind: 'capital' as const,
            })
          }
        } catch (error) {
          console.error(
            `Erreur lors de la récupération des commissions pour le placement ${placement.id}:`,
            error
          )
        }
      }

      // 3. Enrichir avec les données du bienfaiteur (déjà dans le placement)
      const enrichedCommissions: CalendarCommissionItem[] = allCommissions.map((commission) => {
        const placement = commission.placement
        const benefactorDisplayName = placement.benefactorName || `Bienfaiteur ${placement.benefactorId.slice(-8)}`
        
        const color = getCommissionColor(commission, today)

        return {
          ...commission,
          placement,
          benefactorDisplayName,
          color,
          kind: commission.kind,
        }
      })

      // 4. Grouper par jour
      return groupPlacementScheduleByDay(enrichedCommissions, today)
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
