"use client"

import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { startOfMonth, endOfMonth, startOfDay, format } from 'date-fns'
import { getAllContracts } from '@/db/caisse/contracts.db'
import { listPayments } from '@/db/caisse/payments.db'
import { CaisseContract, CaissePayment } from '@/services/caisse/types'
import { getUserById } from '@/db/user.db'
import { getGroupById } from '@/db/group.db'
import type { CaisseType } from '@/services/caisse/types'

export interface CalendarPaymentItem extends CaissePayment {
  contract: CaisseContract
  memberDisplayName?: string
  groupDisplayName?: string
  color: 'green' | 'orange' | 'yellow' | 'red' | 'gray'
}

export interface DayPayments {
  date: Date
  payments: CalendarPaymentItem[]
  totalAmount: number
  paidAmount: number
  remainingAmount: number
  count: number
  statuses: ('DUE' | 'PAID' | 'REFUSED')[]
  caisseTypes: CaisseType[]
  color: 'green' | 'orange' | 'yellow' | 'red' | 'gray'
}

const IMMINENT_DAYS = 2 // Configurable

// Fonction pour calculer la couleur d'un versement individuel
function getPaymentColor(
  payment: CaissePayment,
  today: Date
): 'green' | 'orange' | 'yellow' | 'red' | 'gray' {
  if (payment.status === 'PAID') return 'green'
  if (payment.status === 'REFUSED') return 'gray'
  if (payment.status === 'DUE') {
    const todayStart = startOfDay(today)
    const dueDateStart = startOfDay(payment.dueAt)
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
  payments: CalendarPaymentItem[],
  today: Date
): 'green' | 'orange' | 'yellow' | 'red' | 'gray' {
  if (payments.length === 0) return 'gray'

  const todayStart = startOfDay(today)

  // Vérifier s'il y a des versements en retard (rouge)
  const hasOverdue = payments.some(
    (p) => p.status === 'DUE' && startOfDay(p.dueAt) < todayStart
  )
  if (hasOverdue) return 'red'

  // Vérifier s'il y a des versements imminents (orange)
  const hasImminent = payments.some((p) => {
    if (p.status !== 'DUE') return false
    const dueStart = startOfDay(p.dueAt)
    const diffDays = Math.floor(
      (dueStart.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24)
    )
    return diffDays >= 0 && diffDays <= IMMINENT_DAYS
  })
  if (hasImminent) return 'orange'

  // Vérifier s'il y a des versements à venir (jaune)
  const hasUpcoming = payments.some((p) => {
    if (p.status !== 'DUE') return false
    const dueStart = startOfDay(p.dueAt)
    const diffDays = Math.floor(
      (dueStart.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24)
    )
    return diffDays > IMMINENT_DAYS
  })
  if (hasUpcoming) return 'yellow'

  // Vérifier si tous les versements sont payés (vert)
  const allPaid = payments.every((p) => p.status === 'PAID')
  if (allPaid) return 'green'

  // Vérifier si tous les versements sont refusés (gris)
  const allRefused = payments.every((p) => p.status === 'REFUSED')
  if (allRefused) return 'gray'

  return 'yellow'
}

export function useCalendarCaisseSpeciale(
  month: Date,
  caisseTypes: CaisseType[]
) {
  const filters = useMemo(
    () => ({
      monthStart: startOfMonth(month),
      monthEnd: endOfMonth(month),
      caisseTypes,
    }),
    [month, caisseTypes]
  )

  return useQuery({
    queryKey: [
      'calendar-caisse-speciale',
      format(month, 'yyyy-MM'),
      caisseTypes.join(','),
    ],
    queryFn: async (): Promise<DayPayments[]> => {
      const today = new Date()

      // 1. Récupérer tous les contrats actifs
      const allContracts = await getAllContracts()
      const activeContracts = allContracts.filter(
        (c: any) =>
          c.status === 'ACTIVE' ||
          c.status === 'LATE_NO_PENALTY' ||
          c.status === 'LATE_WITH_PENALTY'
      ) as CaisseContract[]

      // Filtrer par types de caisse
      const filteredContracts =
        caisseTypes.length > 0
          ? activeContracts.filter((c: CaisseContract) => caisseTypes.includes(c.caisseType))
          : activeContracts

      // 2. Récupérer les versements pour chaque contrat
      const allPayments: Array<CaissePayment & { contract: CaisseContract }> =
        []

      for (const contract of filteredContracts) {
        try {
          const contractPayments = await listPayments(contract.id || '')
          const paymentsInMonth = contractPayments.filter((p: CaissePayment) => {
            if (!p.dueAt) return false
            const dueDate = p.dueAt instanceof Date ? p.dueAt : new Date(p.dueAt)
            return dueDate >= filters.monthStart && dueDate <= filters.monthEnd
          })

          allPayments.push(
            ...paymentsInMonth.map((p: CaissePayment) => ({
              ...p,
              contract,
            }))
          )
        } catch (error) {
          console.error(
            `Erreur lors de la récupération des versements pour le contrat ${contract.id}:`,
            error
          )
        }
      }

      // 3. Enrichir avec les données des membres/groupes
      const enrichedPayments: CalendarPaymentItem[] = await Promise.all(
        allPayments.map(async (payment) => {
          const contract = payment.contract
          let memberDisplayName: string | undefined
          let groupDisplayName: string | undefined

          if (contract.contractType === 'INDIVIDUAL' && contract.memberId) {
            try {
              const member = await getUserById(contract.memberId)
              if (member) {
                memberDisplayName = `${member.firstName || ''} ${member.lastName || ''}`.trim()
              }
            } catch (error) {
              console.error(
                `Erreur lors de la récupération du membre ${contract.memberId}:`,
                error
              )
            }
          } else if (contract.contractType === 'GROUP' && contract.groupeId) {
            try {
              const group = await getGroupById(contract.groupeId)
              if (group) {
                groupDisplayName = group.name
              }
            } catch (error) {
              console.error(
                `Erreur lors de la récupération du groupe ${contract.groupeId}:`,
                error
              )
            }
          }

          const color = getPaymentColor(payment, today)

          return {
            ...payment,
            contract,
            memberDisplayName,
            groupDisplayName,
            color,
          }
        })
      )

      // 4. Grouper par jour
      const groupedByDay = enrichedPayments.reduce(
        (acc: Record<string, DayPayments>, payment: CalendarPaymentItem) => {
          const dayKey = format(payment.dueAt, 'yyyy-MM-dd')
          if (!acc[dayKey]) {
            acc[dayKey] = {
              date: payment.dueAt,
              payments: [],
              totalAmount: 0,
              paidAmount: 0,
              remainingAmount: 0,
              count: 0,
              statuses: [],
              caisseTypes: [],
              color: 'gray',
            }
          }

          acc[dayKey].payments.push(payment)
          acc[dayKey].totalAmount += payment.amount
          if (payment.status === 'PAID') {
            acc[dayKey].paidAmount += payment.amount
          } else {
            acc[dayKey].remainingAmount += payment.amount
          }
          acc[dayKey].count++
          acc[dayKey].statuses.push(payment.status)

          if (
            !acc[dayKey].caisseTypes.includes(payment.contract.caisseType)
          ) {
            acc[dayKey].caisseTypes.push(payment.contract.caisseType)
          }

          return acc
        },
        {} as Record<string, DayPayments>
      )

      // Calculer la couleur pour chaque jour
      Object.values(groupedByDay).forEach((day) => {
        day.color = calculateDayColor(day.payments, today)
      })

      return Object.values(groupedByDay).sort(
        (a, b) => a.date.getTime() - b.date.getTime()
      )
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
