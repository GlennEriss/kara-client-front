'use client'

import { useQuery } from '@tanstack/react-query'
import { addDays, differenceInCalendarDays, endOfDay, startOfDay } from 'date-fns'
import { getAllContracts } from '@/db/caisse/contracts.db'
import { listPayments } from '@/db/caisse/payments.db'
import { getGroupById } from '@/db/group.db'
import { getUserById } from '@/db/user.db'
import { ServiceFactory } from '@/factories/ServiceFactory'
import type { CaisseContract, CaissePayment, CaisseType } from '@/services/caisse/types'
import type { ContractCI, CreditContract, CreditInstallment, CreditType, PaymentCI, Placement } from '@/types/types'
import { computeCreditInstallments } from '@/utils/credit-installments'
import { getPaymentDueDate } from '@/utils/caisse-imprevue-utils'
import { calendarFocusKey, calendarPaymentHref } from '@/utils/calendar-payment-link'
import type { OverdueProduct } from './useOverduePayments'

export const UPCOMING_PAYMENT_HORIZONS = [7, 30, 60, 90] as const
export const DEFAULT_UPCOMING_PAYMENT_HORIZON = 30

export interface UpcomingPayment {
  key: string
  product: OverdueProduct
  contractId: string
  memberId?: string
  groupId?: string
  matricule?: string
  name: string
  isGroup: boolean
  phone?: string
  whatsappNumber?: string
  typeLabel: string
  amount: number
  dueAt: Date
  daysUntil: number
  paymentHref: string
}

const CAISSE_TYPE_LABELS: Record<CaisseType, string> = {
  JOURNALIERE: 'Journalière',
  STANDARD: 'Standard',
  LIBRE: 'Libre',
  STANDARD_CHARITABLE: 'Standard Charitable',
  JOURNALIERE_CHARITABLE: 'Journalière Charitable',
  LIBRE_CHARITABLE: 'Libre Charitable',
}

const CREDIT_PRODUCT_TO_TYPE: Partial<Record<OverdueProduct, CreditType>> = {
  'Crédit Spéciale': 'SPECIALE',
  'Crédit Fixe': 'FIXE',
  'Crédit Aide': 'AIDE',
}

function extractPhone(contacts: unknown): string | undefined {
  if (Array.isArray(contacts)) {
    const first = contacts.find(Boolean)
    return first ? String(first) : undefined
  }
  return contacts ? String(contacts) : undefined
}

function makeUserCache() {
  const cache = new Map<string, Promise<any>>()
  return (id: string | undefined | null): Promise<any> => {
    if (!id) return Promise.resolve(null)
    if (!cache.has(id)) cache.set(id, getUserById(id).catch(() => null))
    return cache.get(id)!
  }
}

function isInWindow(date: Date, today: Date, until: Date): boolean {
  const day = startOfDay(date)
  return day >= today && day <= until
}

async function fetchUpcomingCaisseSpeciale(today: Date, until: Date): Promise<UpcomingPayment[]> {
  const contracts = (await getAllContracts({
    statuses: ['ACTIVE', 'LATE_NO_PENALTY', 'LATE_WITH_PENALTY'],
  })) as CaisseContract[]
  const getUser = makeUserCache()

  const chunks = await Promise.all(contracts.map(async (contract): Promise<UpcomingPayment[]> => {
    try {
      const payments = (await listPayments(contract.id || '')) as CaissePayment[]
      const upcoming = payments.filter((payment: CaissePayment) => {
        if (payment.status !== 'DUE' || !payment.dueAt) return false
        const dueAt = payment.dueAt instanceof Date ? payment.dueAt : new Date(payment.dueAt)
        return isInWindow(dueAt, today, until)
      })
      if (upcoming.length === 0) return []

      let name = '—'
      let phone: string | undefined
      let whatsappNumber: string | undefined
      let matricule: string | undefined
      let memberId: string | undefined
      let groupId: string | undefined
      let isGroup = false

      if (contract.contractType === 'GROUP' && contract.groupeId) {
        isGroup = true
        groupId = contract.groupeId
        const group = await getGroupById(contract.groupeId).catch(() => null)
        if (group) name = group.name
      } else if (contract.memberId) {
        memberId = contract.memberId
        const member = await getUser(contract.memberId)
        if (member) {
          name = `${member.firstName || ''} ${member.lastName || ''}`.trim() || '—'
          phone = extractPhone(member.contacts)
          whatsappNumber = member.whatsappNumber || undefined
          matricule = member.matricule
        }
      }

      return upcoming.map((payment: CaissePayment) => {
        const dueAt = payment.dueAt instanceof Date ? payment.dueAt : new Date(payment.dueAt)
        const focusKey = calendarFocusKey.caisseSpeciale(contract.id || '', payment.id)
        return {
          key: `upcoming-cs-${contract.id}-${payment.id}`,
          contractId: contract.id,
          product: 'Caisse Spéciale',
          memberId,
          groupId,
          matricule,
          name,
          isGroup,
          phone,
          whatsappNumber,
          typeLabel: CAISSE_TYPE_LABELS[contract.caisseType] || contract.caisseType,
          amount: payment.amount,
          dueAt,
          daysUntil: differenceInCalendarDays(startOfDay(dueAt), today),
          paymentHref: calendarPaymentHref('Caisse Spéciale', dueAt, focusKey),
        }
      })
    } catch (error) {
      console.error(`[upcoming][CS] contrat ${contract.id}:`, error)
      return []
    }
  }))
  return chunks.flat()
}

async function fetchUpcomingCaisseImprevue(today: Date, until: Date): Promise<UpcomingPayment[]> {
  const service = ServiceFactory.getCaisseImprevueService()
  const contracts: ContractCI[] = await service.getContractsCIPaginated({ status: 'ACTIVE' })
  const getUser = makeUserCache()

  const chunks = await Promise.all(contracts.map(async (contract): Promise<UpcomingPayment[]> => {
    try {
      const duration = contract.subscriptionCIDuration || 0
      const amountPerMonth = contract.subscriptionCIAmountPerMonth || 0
      if (duration <= 0 || !contract.firstPaymentDate) return []

      const payments: PaymentCI[] = await service.getPaymentsByContractId(contract.id)
      const byIndex = new Map(payments.map((payment) => [payment.monthIndex, payment]))
      const member = await getUser(contract.memberId)
      const name = `${contract.memberFirstName || ''} ${contract.memberLastName || ''}`.trim() || '—'
      const rows: UpcomingPayment[] = []

      for (let monthIndex = 0; monthIndex < duration; monthIndex += 1) {
        const payment = byIndex.get(monthIndex)
        const target = payment?.targetAmount ?? amountPerMonth
        const accumulated = payment?.accumulatedAmount ?? 0
        const remaining = Math.max(0, target - accumulated)
        if (payment?.status === 'PAID' || remaining <= 0) continue
        const dueAt = getPaymentDueDate(contract, monthIndex)
        if (!dueAt || !isInWindow(dueAt, today, until)) continue
        const focusKey = calendarFocusKey.caisseImprevue(contract.id, monthIndex)
        rows.push({
          key: `upcoming-ci-${contract.id}-${monthIndex}`,
          contractId: contract.id,
          product: 'Caisse Imprévue',
          memberId: contract.memberId || undefined,
          matricule: member?.matricule,
          name,
          isGroup: false,
          phone: extractPhone(contract.memberContacts),
          whatsappNumber: member?.whatsappNumber || undefined,
          typeLabel: contract.paymentFrequency === 'DAILY' ? 'Journalier' : 'Mensuel',
          amount: remaining,
          dueAt,
          daysUntil: differenceInCalendarDays(startOfDay(dueAt), today),
          paymentHref: calendarPaymentHref('Caisse Imprévue', dueAt, focusKey),
        })
      }
      return rows
    } catch (error) {
      console.error(`[upcoming][CI] contrat ${contract.id}:`, error)
      return []
    }
  }))
  return chunks.flat()
}

async function fetchUpcomingCredit(
  product: OverdueProduct,
  today: Date,
  until: Date,
): Promise<UpcomingPayment[]> {
  const creditType = CREDIT_PRODUCT_TO_TYPE[product]
  if (!creditType) return []
  const service = ServiceFactory.getCreditSpecialeService()
  const contracts: CreditContract[] = (await service.getContractsWithFilters({ creditType })).filter((contract) =>
    ['ACTIVE', 'OVERDUE', 'PARTIAL', 'BLOCKED'].includes(contract.status),
  )
  const getUser = makeUserCache()

  const chunks = await Promise.all(contracts.map(async (contract): Promise<UpcomingPayment[]> => {
    try {
      const payments = await service.getPaymentsByCreditId(contract.id)
      const installments: CreditInstallment[] = computeCreditInstallments(contract, payments, today)
      const member = await getUser(contract.clientId)
      const name = `${contract.clientFirstName || ''} ${contract.clientLastName || ''}`.trim() || '—'

      return installments.flatMap((installment): UpcomingPayment[] => {
        const dueAt = installment.dueDate instanceof Date ? installment.dueDate : new Date(installment.dueDate)
        const remaining = Math.max(installment.remainingAmount ?? (installment.totalAmount - (installment.paidAmount || 0)), 0)
        if (installment.status === 'PAID' || remaining <= 0 || !isInWindow(dueAt, today, until)) return []
        const focusKey = calendarFocusKey.credit(contract.id, installment.installmentNumber)
        return [{
          key: `upcoming-credit-${contract.id}-${installment.installmentNumber}`,
          contractId: contract.id,
          product,
          memberId: contract.clientId || undefined,
          matricule: member?.matricule || contract.clientId,
          name,
          isGroup: false,
          phone: extractPhone(contract.clientContacts),
          whatsappNumber: member?.whatsappNumber || undefined,
          typeLabel: `Mensualité M${installment.installmentNumber}`,
          amount: remaining,
          dueAt,
          daysUntil: differenceInCalendarDays(startOfDay(dueAt), today),
          paymentHref: calendarPaymentHref(product, dueAt, focusKey),
        }]
      })
    } catch (error) {
      console.error(`[upcoming][${product}] contrat ${contract.id}:`, error)
      return []
    }
  }))
  return chunks.flat()
}

async function fetchUpcomingPlacement(today: Date, until: Date): Promise<UpcomingPayment[]> {
  const service = ServiceFactory.getPlacementService()
  const placements: Placement[] = await service.listPlacements({ statuses: ['Active'] })
  const getUser = makeUserCache()

  const chunks = await Promise.all(placements.map(async (placement): Promise<UpcomingPayment[]> => {
    try {
      const commissions = await service.listCommissions(placement.id)
      const member = await getUser(placement.benefactorId)
      const identity = {
        memberId: placement.benefactorId || undefined,
        matricule: member?.matricule,
        name: placement.benefactorName || `${member?.firstName || ''} ${member?.lastName || ''}`.trim() || '—',
        phone: placement.benefactorPhone || extractPhone(member?.contacts),
        whatsappNumber: member?.whatsappNumber || undefined,
      }
      const rows: UpcomingPayment[] = commissions.flatMap((commission): UpcomingPayment[] => {
        const dueAt = commission.dueDate instanceof Date ? commission.dueDate : new Date(commission.dueDate)
        const remaining = Math.max(0, Math.round(commission.amount || 0) - Math.round(commission.paidAmount || 0))
        if (!['Due', 'Partial'].includes(commission.status) || remaining <= 0 || !isInWindow(dueAt, today, until)) return []
        const focusKey = calendarFocusKey.placement(placement.id, commission.id)
        return [{
          key: `upcoming-placement-${placement.id}-${commission.id}`,
          contractId: placement.id,
          product: 'Placement',
          ...identity,
          isGroup: false,
          typeLabel: 'Commission',
          amount: remaining,
          dueAt,
          daysUntil: differenceInCalendarDays(startOfDay(dueAt), today),
          paymentHref: calendarPaymentHref('Placement', dueAt, focusKey),
        }]
      })

      const capitalDueAt = placement.endDate ? new Date(placement.endDate) : null
      if (capitalDueAt && !Number.isNaN(capitalDueAt.getTime()) && isInWindow(capitalDueAt, today, until)) {
        const capitalId = `capital-restitution-${placement.id}`
        rows.push({
          key: `upcoming-placement-${placement.id}-capital`,
          contractId: placement.id,
          product: 'Placement',
          ...identity,
          isGroup: false,
          typeLabel: 'Restitution du capital',
          amount: placement.amount || 0,
          dueAt: capitalDueAt,
          daysUntil: differenceInCalendarDays(startOfDay(capitalDueAt), today),
          paymentHref: calendarPaymentHref(
            'Placement',
            capitalDueAt,
            calendarFocusKey.placement(placement.id, capitalId),
          ),
        })
      }
      return rows
    } catch (error) {
      console.error(`[upcoming][Placement] ${placement.id}:`, error)
      return []
    }
  }))
  return chunks.flat()
}

export function useUpcomingPayments(product: OverdueProduct, horizonDays = DEFAULT_UPCOMING_PAYMENT_HORIZON) {
  return useQuery<UpcomingPayment[]>({
    queryKey: ['upcoming-payments', product, horizonDays],
    queryFn: async () => {
      const today = startOfDay(new Date())
      const until = endOfDay(addDays(today, horizonDays))
      let rows: UpcomingPayment[] = []
      if (product === 'Caisse Spéciale') rows = await fetchUpcomingCaisseSpeciale(today, until)
      else if (product === 'Caisse Imprévue') rows = await fetchUpcomingCaisseImprevue(today, until)
      else if (product === 'Placement') rows = await fetchUpcomingPlacement(today, until)
      else rows = await fetchUpcomingCredit(product, today, until)
      return rows.sort((left, right) => left.dueAt.getTime() - right.dueAt.getTime())
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
}
