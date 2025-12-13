"use client"

import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { startOfMonth, endOfMonth, startOfDay, format } from 'date-fns'
import { ServiceFactory } from '@/factories/ServiceFactory'
import { Placement, CommissionPaymentPlacement, PayoutMode } from '@/types/types'

export interface CalendarCommissionItem extends CommissionPaymentPlacement {
  placement: Placement
  benefactorDisplayName: string
  color: 'green' | 'orange' | 'yellow' | 'red' | 'gray'
}

export interface DayCommissions {
  date: Date
  commissions: CalendarCommissionItem[]
  totalAmount: number
  paidAmount: number
  remainingAmount: number
  count: number
  statuses: ('Due' | 'Paid' | 'Partial' | 'Canceled')[]
  payoutModes: PayoutMode[]
  color: 'green' | 'orange' | 'yellow' | 'red' | 'gray'
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

export function useCalendarPlacement(
  month: Date,
  payoutModes: PayoutMode[]
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
      const allCommissions: Array<CommissionPaymentPlacement & { placement: Placement }> = []

      for (const placement of filteredPlacements) {
        try {
          const placementCommissions = await service.listCommissions(placement.id)
          
          // Filtrer les commissions du mois
          const monthCommissions = placementCommissions.filter((c: CommissionPaymentPlacement) => {
            const dueDateStart = startOfDay(c.dueDate)
            return dueDateStart >= filters.monthStart && dueDateStart <= filters.monthEnd
          })
          
          // Enrichir avec les informations du placement
          allCommissions.push(...monthCommissions.map((c: CommissionPaymentPlacement) => ({
            ...c,
            placement,
          })))
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
        }
      })

      // 4. Grouper par jour
      const groupedByDay = enrichedCommissions.reduce(
        (acc: Record<string, DayCommissions>, commission: CalendarCommissionItem) => {
          const dayKey = format(commission.dueDate, 'yyyy-MM-dd')
          if (!acc[dayKey]) {
            acc[dayKey] = {
              date: commission.dueDate,
              commissions: [],
              totalAmount: 0,
              paidAmount: 0,
              remainingAmount: 0,
              count: 0,
              statuses: [],
              payoutModes: [],
              color: 'gray',
            }
          }

          acc[dayKey].commissions.push(commission)
          acc[dayKey].totalAmount += commission.amount
          if (commission.status === 'Paid') {
            acc[dayKey].paidAmount += commission.amount
          } else if (commission.status === 'Due' || commission.status === 'Partial') {
            acc[dayKey].remainingAmount += commission.amount
          }
          acc[dayKey].count++
          acc[dayKey].statuses.push(commission.status)

          if (
            !acc[dayKey].payoutModes.includes(commission.placement.payoutMode)
          ) {
            acc[dayKey].payoutModes.push(commission.placement.payoutMode)
          }

          return acc
        },
        {} as Record<string, DayCommissions>
      )

      // Calculer la couleur pour chaque jour
      Object.values(groupedByDay).forEach((day) => {
        day.color = calculateDayColor(day.commissions, today)
      })

      return Object.values(groupedByDay).sort(
        (a, b) => a.date.getTime() - b.date.getTime()
      )
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
