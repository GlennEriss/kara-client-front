"use client"

import { ServiceFactory } from "@/factories/ServiceFactory"
import { useQuery } from "@tanstack/react-query"
import { endOfMonth, format, startOfDay, startOfMonth } from "date-fns"
import type {
  CreditContract,
  CreditContractStatus,
  CreditInstallment,
  CreditType,
} from "@/types/types"

export interface CalendarPaymentItemCredit {
  contract: CreditContract
  installment: CreditInstallment
  dueDate: Date
  amount: number
  paidAmount: number
  remainingAmount: number
  status: CreditInstallment["status"]
  clientDisplayName: string
  color: "green" | "orange" | "yellow" | "red" | "gray"
}

export interface DayPaymentsCredit {
  date: Date
  payments: CalendarPaymentItemCredit[]
  totalAmount: number
  paidAmount: number
  remainingAmount: number
  count: number
  color: "green" | "orange" | "yellow" | "red" | "gray"
}

const ACTIVE_CONTRACT_STATUSES: CreditContractStatus[] = [
  "ACTIVE",
  "OVERDUE",
  "PARTIAL",
  "BLOCKED",
]

const IMMINENT_DAYS = 2

function getPaymentColor(
  installment: CreditInstallment,
  dueDate: Date,
  today: Date
): "green" | "orange" | "yellow" | "red" | "gray" {
  if (installment.status === "PAID") return "green"
  if (installment.status === "OVERDUE") return "red"
  if (installment.status === "PENDING") return "gray"

  const todayStart = startOfDay(today)
  const dueStart = startOfDay(dueDate)
  if (dueStart < todayStart) return "red"

  const diffDays = Math.floor(
    (dueStart.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24)
  )
  return diffDays <= IMMINENT_DAYS ? "orange" : "yellow"
}

function calculateDayColor(
  payments: CalendarPaymentItemCredit[],
  today: Date
): "green" | "orange" | "yellow" | "red" | "gray" {
  if (payments.length === 0) return "gray"

  const todayStart = startOfDay(today)
  const hasOverdue = payments.some(
    (p) =>
      (p.status === "DUE" || p.status === "PARTIAL" || p.status === "OVERDUE") &&
      startOfDay(p.dueDate) < todayStart
  )
  if (hasOverdue) return "red"

  const hasImminent = payments.some((p) => {
    if (!(p.status === "DUE" || p.status === "PARTIAL")) return false
    const dueStart = startOfDay(p.dueDate)
    const diffDays = Math.floor(
      (dueStart.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24)
    )
    return diffDays >= 0 && diffDays <= IMMINENT_DAYS
  })
  if (hasImminent) return "orange"

  const hasUpcoming = payments.some((p) => p.status === "DUE" || p.status === "PARTIAL")
  if (hasUpcoming) return "yellow"

  const allPaid = payments.every((p) => p.status === "PAID")
  if (allPaid) return "green"

  return "gray"
}

export function useCalendarCreditSpeciale(month: Date, creditType: CreditType, enabled: boolean = true) {
  return useQuery({
    queryKey: ["calendar-credit-speciale", creditType, format(month, "yyyy-MM")],
    queryFn: async (): Promise<DayPaymentsCredit[]> => {
      const service = ServiceFactory.getCreditSpecialeService()
      const today = new Date()
      const monthStart = startOfMonth(month)
      const monthEnd = endOfMonth(month)

      const contracts = await service.getContractsWithFilters()
      const activeContracts = contracts.filter(
        (contract) =>
          ACTIVE_CONTRACT_STATUSES.includes(contract.status) &&
          contract.creditType === creditType
      )

      const allItems: CalendarPaymentItemCredit[] = []

      for (const contract of activeContracts) {
        try {
          const installments = await service.getInstallmentsByCreditId(contract.id)
          for (const installment of installments) {
            const dueDate =
              installment.dueDate instanceof Date
                ? installment.dueDate
                : new Date(installment.dueDate)
            const dueStart = startOfDay(dueDate)
            if (dueStart < monthStart || dueStart > monthEnd) continue

            allItems.push({
              contract,
              installment,
              dueDate,
              amount: installment.totalAmount,
              paidAmount: installment.paidAmount || 0,
              remainingAmount: Math.max(installment.remainingAmount || 0, 0),
              status: installment.status,
              clientDisplayName: `${contract.clientFirstName} ${contract.clientLastName}`.trim(),
              color: getPaymentColor(installment, dueDate, today),
            })
          }
        } catch (error) {
          console.error(
            `Erreur lors du chargement des échéances crédit pour le contrat ${contract.id}:`,
            error
          )
        }
      }

      const grouped = allItems.reduce(
        (acc: Record<string, DayPaymentsCredit>, item) => {
          const dayKey = format(item.dueDate, "yyyy-MM-dd")
          if (!acc[dayKey]) {
            acc[dayKey] = {
              date: item.dueDate,
              payments: [],
              totalAmount: 0,
              paidAmount: 0,
              remainingAmount: 0,
              count: 0,
              color: "gray",
            }
          }

          acc[dayKey].payments.push(item)
          acc[dayKey].totalAmount += item.amount
          acc[dayKey].paidAmount += item.paidAmount
          acc[dayKey].remainingAmount += item.remainingAmount
          acc[dayKey].count += 1
          return acc
        },
        {} as Record<string, DayPaymentsCredit>
      )

      Object.values(grouped).forEach((day) => {
        day.color = calculateDayColor(day.payments, today)
      })

      return Object.values(grouped).sort((a, b) => a.date.getTime() - b.date.getTime())
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  })
}
