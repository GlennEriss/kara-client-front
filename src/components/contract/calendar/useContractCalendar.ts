"use client"

import { useCaisseContract } from '@/hooks/useCaisseContracts'
import { useCallback, useMemo } from 'react'
import { getMonthDays, toDateSafe } from './calendar-utils'
import type { CalendarDayStatus, DayWithStatus } from './types'

export interface UseContractCalendarResult {
  /** Données du contrat (contrat + payments + refunds) */
  data: ReturnType<typeof useCaisseContract>['data']
  isLoading: boolean
  isError: boolean
  error: unknown
  refetch: () => Promise<unknown>
  /** Jours à afficher dans la grille (avec padding avant/après le mois) */
  monthDays: Date[]
  /** Pour chaque jour de monthDays, statut et paiement éventuel */
  daysWithStatus: DayWithStatus[]
  getPaymentForDate: (date: Date) => unknown
  getMonthIndexFromStart: (date: Date) => number | null
  getMonthDateRange: (monthIndex: number) => { start: Date; end: Date } | null
  getTotalForMonth: (monthIndex: number) => number
  getMonthStatus: (monthIndex: number) => string
  contractStartDate: Date | null
  isGroupContract: boolean
  /** Nombre de mois planifiés (monthsPlanned) */
  totalMonths: number
}

function getPaymentForDateInternal(
  payments: any[] | undefined,
  date: Date,
  getMonthIndexFromStart: (d: Date) => number | null,
  isGroupContract: boolean
): unknown {
  if (!payments?.length) return null

  const monthIndex = getMonthIndexFromStart(date)
  if (monthIndex === null || monthIndex < 0) return null

  if (isGroupContract) {
    const payment = payments.find((p: any) => p.dueMonthIndex === monthIndex)
    if (!payment?.groupContributions?.length) return null

    const normalizedTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const hasContrib = payment.groupContributions.some((contrib: any) => {
      const contribDate = toDateSafe(contrib.createdAt)
      return contribDate && contribDate.getTime() === normalizedTarget.getTime()
    })
    return hasContrib ? payment : null
  }

  const payment = payments.find((p: any) => p.dueMonthIndex === monthIndex)
  if (!payment?.contribs || !Array.isArray(payment.contribs)) return null

  const normalizedTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const hasContrib = payment.contribs.some((c: any) => {
    const contribDate = toDateSafe(c.paidAt)
    return contribDate && contribDate.getTime() === normalizedTarget.getTime()
  })
  return hasContrib ? payment : null
}

/**
 * Hook dédié au calendrier des versements d'un contrat caisse spéciale (journalier).
 * Centralise la logique getPaymentForDate, statuts par jour, et helpers pour le résumé mensuel.
 */
export function useContractCalendar(
  contractId: string,
  currentMonth: Date
): UseContractCalendarResult {
  const { data, isLoading, isError, error, refetch } = useCaisseContract(contractId)

  const contractStartDate = useMemo(() => {
    const raw = (data as any)?.contractStartAt ?? data?.firstPaymentDate
    if (!raw) return null
    try {
      const start = typeof raw?.toDate === 'function' ? raw.toDate() : new Date(raw)
      if (isNaN(start.getTime())) return null
      start.setHours(0, 0, 0, 0)
      return start
    } catch {
      return null
    }
  }, [(data as any)?.contractStartAt, data?.firstPaymentDate])

  const caisseType = (data as any)?.caisseType
  const isGroupContract = (data as any)?.contractType === 'GROUP' || !!(data as any)?.groupeId
  const payments = data?.payments ?? []

  const getMonthIndexFromStart = useCallback(
    (date: Date): number | null => {
      if (!contractStartDate) return null

      const normalizedTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      const normalizedStart = new Date(
        contractStartDate.getFullYear(),
        contractStartDate.getMonth(),
        contractStartDate.getDate()
      )
      if (normalizedTarget < normalizedStart) return null

      const isJournalier =
        caisseType === 'JOURNALIERE' || caisseType === 'JOURNALIERE_CHARITABLE'
      if (isJournalier) {
        const msPerDay = 24 * 60 * 60 * 1000
        const days = Math.floor(
          (normalizedTarget.getTime() - normalizedStart.getTime()) / msPerDay
        )
        return Math.floor(days / 30)
      }

      let diffMonths =
        (normalizedTarget.getFullYear() - contractStartDate.getFullYear()) * 12 +
        (normalizedTarget.getMonth() - contractStartDate.getMonth())
      let boundaryStart = new Date(contractStartDate)
      boundaryStart.setMonth(boundaryStart.getMonth() + diffMonths)

      while (boundaryStart > normalizedTarget && diffMonths > 0) {
        diffMonths -= 1
        boundaryStart = new Date(contractStartDate)
        boundaryStart.setMonth(boundaryStart.getMonth() + diffMonths)
      }

      let nextBoundary = new Date(boundaryStart)
      nextBoundary.setMonth(nextBoundary.getMonth() + 1)
      while (normalizedTarget >= nextBoundary) {
        diffMonths += 1
        boundaryStart = nextBoundary
        nextBoundary = new Date(boundaryStart)
        nextBoundary.setMonth(nextBoundary.getMonth() + 1)
      }
      return diffMonths
    },
    [contractStartDate, caisseType]
  )

  const getPaymentForDate = useCallback(
    (date: Date) =>
      getPaymentForDateInternal(
        payments,
        date,
        getMonthIndexFromStart,
        isGroupContract
      ),
    [payments, getMonthIndexFromStart, isGroupContract]
  )

  const getMonthDateRange = useCallback(
    (monthIndex: number): { start: Date; end: Date } | null => {
      if (!contractStartDate) return null

      const start = new Date(contractStartDate)
      const end = new Date(contractStartDate)
      const isJournalier =
        caisseType === 'JOURNALIERE' || caisseType === 'JOURNALIERE_CHARITABLE'

      if (isJournalier) {
        start.setDate(start.getDate() + monthIndex * 30)
        end.setDate(end.getDate() + (monthIndex + 1) * 30 - 1)
      } else {
        start.setMonth(start.getMonth() + monthIndex)
        end.setMonth(end.getMonth() + monthIndex + 1)
      }
      return { start, end }
    },
    [contractStartDate, caisseType]
  )

  const getTotalForMonth = useCallback(
    (monthIndex: number) => {
      const payment = payments.find((p: any) => p.dueMonthIndex === monthIndex)
      return payment?.accumulatedAmount ?? 0
    },
    [payments]
  )

  const getMonthStatus = useCallback(
    (monthIndex: number): string => {
      const payment = payments.find((p: any) => p.dueMonthIndex === monthIndex)
      if (!payment) return 'DUE'

      if (isGroupContract && payment.groupContributions) {
        const totalContributed = payment.groupContributions.reduce(
          (sum: number, c: any) => sum + (c.amount ?? 0),
          0
        )
        const monthlyTarget = (data as any)?.monthlyAmount ?? 0
        return totalContributed >= monthlyTarget ? 'PAID' : 'PARTIAL'
      }
      return payment.status ?? 'DUE'
    },
    [payments, isGroupContract, data]
  )

  const monthDays = useMemo(() => getMonthDays(currentMonth), [currentMonth])

  const today = useMemo(() => {
    const t = new Date()
    t.setHours(0, 0, 0, 0)
    return t
  }, [])

  const firstPaymentDate = useMemo(() => {
    const raw = (data as any)?.contractStartAt ?? data?.firstPaymentDate
    if (!raw) return null
    const d = typeof raw?.toDate === 'function' ? raw.toDate() : new Date(raw)
    d.setHours(0, 0, 0, 0)
    return d
  }, [(data as any)?.contractStartAt, data?.firstPaymentDate])

  const daysWithStatus = useMemo((): DayWithStatus[] => {
    return monthDays.map((date) => {
      const isCurrentMonth =
        date.getMonth() === currentMonth.getMonth() &&
        date.getFullYear() === currentMonth.getFullYear()
      const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      const isToday = dateOnly.getTime() === today.getTime()

      if (!isCurrentMonth) {
        return { date, status: 'unavailable', payment: null, isToday: false }
      }

      if (firstPaymentDate && dateOnly < firstPaymentDate) {
        return { date, status: 'unavailable', payment: null, isToday: false }
      }

      const payment = getPaymentForDateInternal(
        payments,
        date,
        getMonthIndexFromStart,
        isGroupContract
      )

      if (payment) {
        return {
          date,
          status: 'paid' as CalendarDayStatus,
          payment,
          isToday,
        }
      }

      const isPastDay = dateOnly < today
      const status: CalendarDayStatus = isPastDay ? 'due' : 'upcoming'
      return { date, status, payment: null, isToday }
    })
  }, [
    monthDays,
    currentMonth,
    today,
    firstPaymentDate,
    payments,
    getMonthIndexFromStart,
    isGroupContract,
  ])

  const totalMonths = (data as any)?.monthsPlanned ?? 0

  return {
    data,
    isLoading,
    isError,
    error,
    refetch,
    monthDays,
    daysWithStatus,
    getPaymentForDate,
    getMonthIndexFromStart,
    getMonthDateRange,
    getTotalForMonth,
    getMonthStatus,
    contractStartDate,
    isGroupContract,
    totalMonths,
  }
}
