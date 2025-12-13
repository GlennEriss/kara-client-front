"use client"

import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { startOfMonth, endOfMonth, startOfDay, format, addDays, addMonths } from 'date-fns'
import { ServiceFactory } from '@/factories/ServiceFactory'
import { ContractCI, PaymentCI, CaisseImprevuePaymentFrequency } from '@/types/types'

export interface CalendarPaymentItemCI extends PaymentCI {
  contract: ContractCI
  dueDate: Date
  memberDisplayName: string
  color: 'green' | 'orange' | 'yellow' | 'red' | 'gray'
}

export interface DayPaymentsCI {
  date: Date
  payments: CalendarPaymentItemCI[]
  totalAmount: number
  paidAmount: number
  remainingAmount: number
  count: number
  statuses: ('DUE' | 'PAID' | 'PARTIAL')[]
  paymentFrequencies: CaisseImprevuePaymentFrequency[]
  color: 'green' | 'orange' | 'yellow' | 'red' | 'gray'
}

const IMMINENT_DAYS = 2 // Configurable

// Fonction pour calculer la date d'échéance
function calculateDueDate(contract: ContractCI, payment: PaymentCI): Date {
  const firstPaymentDate = new Date(contract.firstPaymentDate)
  
  if (contract.paymentFrequency === 'DAILY') {
    // Pour les contrats journaliers, chaque jour correspond à un versement
    return addDays(firstPaymentDate, payment.monthIndex)
  } else {
    // Pour les contrats mensuels, chaque mois correspond à un versement
    return addMonths(firstPaymentDate, payment.monthIndex)
  }
}

// Fonction pour calculer la couleur d'un versement individuel
function getPaymentColor(
  payment: PaymentCI,
  dueDate: Date,
  today: Date
): 'green' | 'orange' | 'yellow' | 'red' | 'gray' {
  const isPaid = payment.status === 'PAID' || 
                 (payment.status === 'PARTIAL' && payment.accumulatedAmount >= payment.targetAmount)
  if (isPaid) return 'green'
  
  const isDue = payment.status === 'DUE' || 
                (payment.status === 'PARTIAL' && payment.accumulatedAmount < payment.targetAmount)
  if (!isDue) return 'gray'
  
  const todayStart = startOfDay(today)
  const dueDateStart = startOfDay(dueDate)
  
  if (dueDateStart < todayStart) return 'red'
  
  const diffDays = Math.floor(
    (dueDateStart.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24)
  )
  return diffDays <= IMMINENT_DAYS ? 'orange' : 'yellow'
}

// Fonction pour calculer la couleur d'un jour
function calculateDayColor(
  payments: CalendarPaymentItemCI[],
  today: Date
): 'green' | 'orange' | 'yellow' | 'red' | 'gray' {
  if (payments.length === 0) return 'gray'

  const todayStart = startOfDay(today)

  // Vérifier s'il y a des versements en retard (rouge)
  const hasOverdue = payments.some((p) => {
    const isDue = p.status === 'DUE' || 
                  (p.status === 'PARTIAL' && p.accumulatedAmount < p.targetAmount)
    if (!isDue) return false
    const dueStart = startOfDay(p.dueDate)
    return dueStart < todayStart
  })
  if (hasOverdue) return 'red'

  // Vérifier s'il y a des versements imminents (orange)
  const hasImminent = payments.some((p) => {
    const isDue = p.status === 'DUE' || 
                  (p.status === 'PARTIAL' && p.accumulatedAmount < p.targetAmount)
    if (!isDue) return false
    const dueStart = startOfDay(p.dueDate)
    const diffDays = Math.floor(
      (dueStart.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24)
    )
    return diffDays >= 0 && diffDays <= IMMINENT_DAYS
  })
  if (hasImminent) return 'orange'

  // Vérifier s'il y a des versements à venir (jaune)
  const hasUpcoming = payments.some((p) => {
    const isDue = p.status === 'DUE' || 
                  (p.status === 'PARTIAL' && p.accumulatedAmount < p.targetAmount)
    if (!isDue) return false
    const dueStart = startOfDay(p.dueDate)
    const diffDays = Math.floor(
      (dueStart.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24)
    )
    return diffDays > IMMINENT_DAYS
  })
  if (hasUpcoming) return 'yellow'
  
  // Vérifier si tous les versements sont payés (vert)
  const allPaid = payments.every((p) => 
    p.status === 'PAID' || 
    (p.status === 'PARTIAL' && p.accumulatedAmount >= p.targetAmount)
  )
  if (allPaid) return 'green'
  
  return 'yellow'
}

export function useCalendarCaisseImprevue(
  month: Date,
  paymentFrequencies: CaisseImprevuePaymentFrequency[]
) {
  const filters = useMemo(
    () => ({
      monthStart: startOfMonth(month),
      monthEnd: endOfMonth(month),
      paymentFrequencies,
    }),
    [month, paymentFrequencies]
  )

  return useQuery({
    queryKey: [
      'calendar-caisse-imprevue',
      format(month, 'yyyy-MM'),
      paymentFrequencies.join(','),
    ],
    queryFn: async (): Promise<DayPaymentsCI[]> => {
      const today = new Date()
      const service = ServiceFactory.getCaisseImprevueService()

      // 1. Récupérer tous les contrats actifs
      const allContracts = await service.getContractsCIPaginated({
        status: 'ACTIVE',
      })

      // Filtrer par types de paiement
      const filteredContracts =
        paymentFrequencies.length > 0
          ? allContracts.filter((c: ContractCI) => 
              paymentFrequencies.includes(c.paymentFrequency)
            )
          : allContracts

      // 2. Récupérer les versements pour chaque contrat
      const allPayments: Array<PaymentCI & { contract: ContractCI; dueDate: Date }> = []

      for (const contract of filteredContracts) {
        try {
          const contractPayments = await service.getPaymentsByContractId(contract.id)
          
          // Calculer la date d'échéance pour chaque versement
          const paymentsWithDueDate = contractPayments.map((p: PaymentCI) => ({
            ...p,
            contract,
            dueDate: calculateDueDate(contract, p),
          }))
          
          // Filtrer les versements du mois
          const monthPayments = paymentsWithDueDate.filter((p) => {
            const dueDateStart = startOfDay(p.dueDate)
            return dueDateStart >= filters.monthStart && dueDateStart <= filters.monthEnd
          })
          
          allPayments.push(...monthPayments)
        } catch (error) {
          console.error(
            `Erreur lors de la récupération des versements pour le contrat ${contract.id}:`,
            error
          )
        }
      }

      // 3. Enrichir avec les données des membres (déjà dans le contrat)
      const enrichedPayments: CalendarPaymentItemCI[] = allPayments.map((payment) => {
        const contract = payment.contract
        const memberDisplayName = `${contract.memberFirstName || ''} ${contract.memberLastName || ''}`.trim()
        
        const color = getPaymentColor(payment, payment.dueDate, today)

        return {
          ...payment,
          contract,
          memberDisplayName,
          color,
        }
      })

      // 4. Grouper par jour
      const groupedByDay = enrichedPayments.reduce(
        (acc: Record<string, DayPaymentsCI>, payment: CalendarPaymentItemCI) => {
          const dayKey = format(payment.dueDate, 'yyyy-MM-dd')
          if (!acc[dayKey]) {
            acc[dayKey] = {
              date: payment.dueDate,
              payments: [],
              totalAmount: 0,
              paidAmount: 0,
              remainingAmount: 0,
              count: 0,
              statuses: [],
              paymentFrequencies: [],
              color: 'gray',
            }
          }

          acc[dayKey].payments.push(payment)
          acc[dayKey].totalAmount += payment.targetAmount
          const paid = payment.status === 'PAID' || 
                       (payment.status === 'PARTIAL' && payment.accumulatedAmount >= payment.targetAmount)
          if (paid) {
            acc[dayKey].paidAmount += payment.accumulatedAmount
          } else {
            acc[dayKey].remainingAmount += (payment.targetAmount - payment.accumulatedAmount)
          }
          acc[dayKey].count++
          acc[dayKey].statuses.push(payment.status)

          if (
            !acc[dayKey].paymentFrequencies.includes(payment.contract.paymentFrequency)
          ) {
            acc[dayKey].paymentFrequencies.push(payment.contract.paymentFrequency)
          }

          return acc
        },
        {} as Record<string, DayPaymentsCI>
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
