import { isCreditModule, creditTypeForModule } from '../credit-module'
/* eslint-disable no-restricted-imports -- Réutilise les calculs métier purs du site pour préserver les échéances et les soldes. */
import { fromFirestore } from '@/domains/mobile/server/calendar-service'
import {
  businessWallTime,
  withBusinessDates,
  getMobileCIDueDate,
} from '@/domains/mobile/server/calendar-dates'
import { mapWithConcurrency } from '@/utils/mapWithConcurrency'
import {
  computeDueAt,
  resolveContractEndAt,
} from '@/services/caisse/contractDates'
import {
  getPaymentDueDate,
  getContractEndDate,
} from '@/utils/caisse-imprevue-utils'
import { findOverdueMonths } from '@/services/caisse-imprevue/overdueDetection'
import { getCreditContractEndDate } from '@/services/credit-speciale/creditContractDates'
import {
  getCreditContractFixedPhase,
  canCreditContractBeInFixedPhase,
} from '@/utils/credit-speciale-history'
import { computeCreditInstallments } from '@/utils/credit-installments'
import type { CreditContract, CreditPayment } from '@/types/types'
import type { FinanceModule } from '../actions'
import type { FinanceServices } from './services'
import { enrichFinanceRows, financeCollection } from './read-model'

type Row = Record<string, any>
export interface PresentationFilters {
  search?: string
  status?: string
  type?: string
  profile?: string
  category?: string
  tab?: string
  earlyWithdrawal?: string
  monthlyMin?: number
  monthlyMax?: number
  amountMin?: number
  amountMax?: number
  paidMin?: number
  paidMax?: number
  remainingMin?: number
  remainingMax?: number
  durationMin?: number
  durationMax?: number
  createdFrom?: string
  createdTo?: string
  dueFrom?: string
  dueTo?: string
}
const number = (value: unknown) =>
  Number.isFinite(Number(value)) ? Number(value) : 0
const date = (value: any): string | null => {
  const d = value?.toDate?.() || (value ? new Date(value) : null)
  return d && !Number.isNaN(d.getTime()) ? d.toISOString() : null
}
const ended = new Set([
  'CLOSED',
  'RESCINDED',
  'FINISHED',
  'CANCELED',
  'DISCHARGED',
  'WRITTEN_OFF',
])
const day = (value: any) => date(value)?.slice(0, 10) || ''
const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
const range = (value: number, min?: number, max?: number) =>
  (min == null || value >= min) && (max == null || value <= max)
const dateRange = (value: any, from?: string, to?: string) =>
  (!from && !to) ||
  (!!day(value) && (!from || day(value) >= from) && (!to || day(value) <= to))

/** Filters run before pagination; summary always describes the complete matching set. */
export function filterPresentedRows(
  rows: Row[],
  input: PresentationFilters,
  now = new Date(),
) {
  const month = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Libreville',
    year: 'numeric',
    month: '2-digit',
  }).format(now)
  return rows.filter((row) => {
    const v = row.financeView
    if (!v) return false
    if (
      input.search &&
      !normalize(
        [
          row.id,
          row.memberName,
          row.memberId,
          row.clientId,
          row.memberContacts?.join(' '),
          row.subscriptionCICode,
        ].join(' '),
      ).includes(normalize(input.search))
    )
      return false
    if (input.status && row.status !== input.status) return false
    if (
      input.type &&
      v.type !== input.type &&
      !(
        input.type.endsWith('_FAMILY') &&
        v.type.replace('_CHARITABLE', '') === input.type.replace('_FAMILY', '')
      )
    )
      return false
    if (input.profile && row.contractType !== input.profile) return false
    if (input.category && row.subscriptionCIID !== input.category) return false
    if (
      input.earlyWithdrawal &&
      !v.earlyWithdrawals.includes(input.earlyWithdrawal)
    )
      return false
    if (
      input.tab === 'active' &&
      ![
        'ACTIVE',
        'PARTIAL',
        'OVERDUE',
        'LATE_NO_PENALTY',
        'LATE_WITH_PENALTY',
      ].includes(row.status)
    )
      return false
    if (input.tab === 'closed' && !ended.has(row.status)) return false
    if (input.tab === 'overdue' && !v.overdue) return false
    if (input.tab === 'fixed' && !v.fixedPhase) return false
    if (input.tab === 'writtenOff' && row.status !== 'WRITTEN_OFF') return false
    if (input.tab === 'currentMonth' && day(v.nextDueAt).slice(0, 7) !== month)
      return false
    return (
      range(v.monthly, input.monthlyMin, input.monthlyMax) &&
      range(v.total, input.amountMin, input.amountMax) &&
      range(v.paid, input.paidMin, input.paidMax) &&
      range(v.remaining, input.remainingMin, input.remainingMax) &&
      range(v.duration, input.durationMin, input.durationMax) &&
      dateRange(row.createdAt, input.createdFrom, input.createdTo) &&
      dateRange(v.nextDueAt, input.dueFrom, input.dueTo)
    )
  })
}

export function summarizePresentedRows(rows: Row[], module: FinanceModule) {
  const count = (...states: string[]) =>
    rows.filter((r) => states.includes(r.status)).length
  const sum = (key: string) =>
    rows.reduce((total, r) => total + number(r.financeView[key]), 0)
  const byType = new Map<string, number>()
  for (const row of rows) {
    const key = isCreditModule(module) ? row.status : row.financeView.type
    byType.set(key, (byType.get(key) || 0) + 1)
  }
  return {
    total: rows.length,
    active: count('ACTIVE'),
    closed: rows.filter((r) => ended.has(r.status)).length,
    partial: count('PARTIAL'),
    overdue: isCreditModule(module)
      ? count('OVERDUE')
      : rows.filter((r) => r.financeView.overdue).length,
    finished: count('FINISHED'),
    canceled: count('CANCELED', 'RESCINDED'),
    transformed: count('TRANSFORMED'),
    discharged: count('DISCHARGED'),
    writtenOff: count('WRITTEN_OFF'),
    group: rows.filter((r) => r.contractType === 'GROUP').length,
    individual: rows.filter((r) => r.contractType !== 'GROUP').length,
    paid: sum('paid'),
    remaining: sum('remaining'),
    penalties: sum('penalties'),
    fixed: rows.filter((r) => r.financeView.fixedPhase).length,
    distribution: Array.from(byType, ([key, value]) => ({ key, value })),
  }
}

export function financeTimeline(
  module: FinanceModule,
  row: Row,
  payments: Row[],
  now = new Date(),
) {
  if (isCreditModule(module)) return []
  const cs = module === 'caisse-speciale'
  const duration = number(cs ? row.monthsPlanned : row.subscriptionCIDuration)
  if (duration > 1200) throw new Error('Durée du contrat invalide.')
  return Array.from({ length: duration }, (_, index) => {
    const payment = payments.find(
      (p) => (cs ? p.dueMonthIndex : p.monthIndex) === index,
    )
    const target = number(
      payment?.targetAmount ??
        (cs ? row.monthlyAmount : row.subscriptionCIAmountPerMonth),
    )
    const paid = number(
      cs
        ? (payment?.accumulatedAmount ??
            (payment?.status === 'PAID' ? payment?.amount : 0))
        : payment?.accumulatedAmount,
    )
    const due = cs
      ? computeDueAt(row.contractStartAt, index, row.caisseType)
      : getMobileCIDueDate(row, index)
    const isPaid = payment?.status === 'PAID' || (target > 0 && paid >= target)
    return {
      id: payment?.id || `month-${index}`,
      paymentId: payment?.id,
      installmentNumber: index + 1,
      dueDate: date(due),
      totalAmount: target,
      paidAmount: paid,
      remainingAmount: Math.max(0, target - paid),
      status: isPaid
        ? 'PAID'
        : !ended.has(row.status) && due && day(due) < day(now)
          ? 'OVERDUE'
          : paid > 0
            ? 'PARTIAL'
            : 'DUE',
    }
  })
}

export async function presentedContracts(
  services: FinanceServices,
  module: FinanceModule,
  input: PresentationFilters & { cursor?: string; limit: number },
) {
  // Explicit ceiling: never show a partial scan as a global statistic.
  let source = services.db
    .collection(financeCollection(module, 'contract'))
    .limit(5001)
  if (isCreditModule(module))
    source = source.where('creditType', '==', creditTypeForModule(module))
  const snapshot = await source.get()
  if (snapshot.size > 5000)
    throw new Error(
      'Le volume nécessite une agrégation serveur. Les statistiques ne sont pas disponibles.',
    )
  const raw = snapshot.docs.map((d) => ({
    ...(fromFirestore(d.data()) as Row),
    id: d.id,
  }))
  raw.sort(
    (a: Row, b: Row) =>
      String(date(b.createdAt)).localeCompare(String(date(a.createdAt))) ||
      a.id.localeCompare(b.id),
  )
  const named = await enrichFinanceRows(services, module, raw)
  const now = new Date()
  const penalties = isCreditModule(module)
    ? await services.creditPenalties.getAllPenalties()
    : []
  const rows: Row[] = await mapWithConcurrency(named, 6, (row) =>
    projectFinanceContract(
      services,
      module,
      row,
      now,
      isCreditModule(module)
        ? { penalties: penalties.filter((p) => p.creditId === row.id) }
        : {},
    ),
  )
  const filtered = filterPresentedRows(rows, input, now)
  const start = input.cursor
    ? filtered.findIndex((r) => r.id === input.cursor) + 1
    : 0
  if (input.cursor && start === 0)
    throw new Error('La liste a changé. Actualisez les dossiers.')
  return {
    items: filtered.slice(start, start + input.limit),
    total: filtered.length,
    nextCursor:
      start + input.limit < filtered.length
        ? filtered[start + input.limit - 1].id
        : null,
    summary: summarizePresentedRows(filtered, module),
    categories: [
      ...new Map(
        rows
          .filter((r) => r.subscriptionCIID)
          .map((r) => [
            r.subscriptionCIID,
            {
              value: r.subscriptionCIID,
              label:
                r.subscriptionCILabel ||
                r.subscriptionCICode ||
                r.subscriptionCIID,
            },
          ]),
      ).values(),
    ],
  }
}

export async function projectFinanceContract(
  services: FinanceServices,
  module: FinanceModule,
  row: Row,
  now = new Date(),
  loaded: Row = {},
): Promise<Row> {
  const wallNow = businessWallTime(now)
  const contract = withBusinessDates(row) as any
  let monthly = 0,
    paid = 0,
    total = 0,
    duration = 0,
    paidPeriods = 0
  let nextDueAt: any = null,
    endAt: any = null,
    overdue = false,
    fixedPhase = false,
    penalties = number(row.penaltiesTotal)
  let refunds: Row[] = []
  if (module === 'caisse-speciale') {
    const payments: Row[] =
      loaded.payments || (await services.csPayments.listPayments(row.id))
    monthly = number(row.monthlyAmount)
    duration = number(row.monthsPlanned)
    paid = number(row.nominalPaid)
    total = monthly * duration
    paidPeriods = payments.filter(
      (p: any) =>
        p.status === 'PAID' ||
        (p.status === 'DUE' &&
          number(p.accumulatedAmount) >= monthly &&
          monthly > 0),
    ).length
    nextDueAt =
      row.nextDueAt ||
      computeDueAt(
        contract.contractStartAt,
        number(row.currentMonthIndex),
        row.caisseType,
      )
    endAt = resolveContractEndAt(contract)
    overdue =
      !ended.has(row.status) &&
      ((!!nextDueAt && day(nextDueAt) < day(now)) ||
        String(row.status).startsWith('LATE'))
    refunds = loaded.refunds || (await services.csRefunds.listRefunds(row.id))
  } else if (module === 'caisse-imprevue') {
    const payments: Row[] =
      loaded.payments ||
      (await services.caisseImprevue.getPaymentsByContractId(row.id))
    monthly = number(row.subscriptionCIAmountPerMonth)
    duration = number(row.subscriptionCIDuration)
    paid = payments.reduce((s, p) => s + number(p.accumulatedAmount), 0)
    total = monthly * duration
    paidPeriods = payments.filter(
      (p) =>
        p.status === 'PAID' ||
        (p.targetAmount > 0 && p.accumulatedAmount >= p.targetAmount),
    ).length
    const firstUnpaid = Array.from({ length: duration }, (_, i) => i).find(
      (i) =>
        !payments.some(
          (p) =>
            p.monthIndex === i &&
            (p.status === 'PAID' ||
              (p.targetAmount > 0 && p.accumulatedAmount >= p.targetAmount)),
        ),
    )
    nextDueAt =
      firstUnpaid == null ? null : getPaymentDueDate(contract, firstUnpaid)
    endAt = getContractEndDate(contract)
    overdue =
      row.status === 'ACTIVE' &&
      findOverdueMonths(contract, payments, { today: wallNow }).length > 0
    refunds =
      loaded.refunds ||
      (await services.ciRefunds.getEarlyRefundsByContractId(row.id))
  } else {
    const payments =
      loaded.payments ||
      (await services.creditSpeciale.getPaymentsByCreditId(row.id))
    const normalized = withBusinessDates(payments) as CreditPayment[]
    const installments = computeCreditInstallments(
      contract as CreditContract,
      normalized,
      wallNow,
    )
    monthly = number(row.monthlyPaymentAmount)
    duration = number(row.duration)
    paid = number(row.amountPaid)
    total = number(row.totalAmount)
    paidPeriods = installments.filter((p) => p.status === 'PAID').length
    nextDueAt =
      installments.find((p) => p.status !== 'PAID')?.dueDate || row.nextDueAt
    endAt = getCreditContractEndDate(contract)
    overdue =
      ['ACTIVE', 'PARTIAL', 'OVERDUE', 'BLOCKED'].includes(row.status) &&
      installments.some((p) => p.status === 'OVERDUE')
    const fixed =
      canCreditContractBeInFixedPhase(contract) &&
      getCreditContractFixedPhase(contract, normalized)
    fixedPhase = !!fixed
    const penaltyRows: Row[] =
      loaded.penalties ||
      (await services.creditSpeciale.getPenaltiesByCreditId(row.id))
    penalties = penaltyRows.reduce((s, p) => s + number(p.amount), 0)
  }
  return {
    ...row,
    financeView: {
      monthly,
      paid,
      total,
      penalties,
      remaining: isCreditModule(module)
        ? number(row.amountRemaining)
        : Math.max(0, total - paid),
      duration,
      durationUnit: row.durationUnit || 'MONTHS',
      paidPeriods,
      progress: total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0,
      nextDueAt: ended.has(row.status) ? null : date(nextDueAt),
      endAt: date(endAt),
      overdue,
      fixedPhase,
      type: row.caisseType || row.paymentFrequency || row.creditType,
      documentStatus:
        row.memberSignedStatus === 'PENDING_ADMIN'
          ? 'PENDING_ADMIN'
          : row.contractPdf || row.contractStartId || row.signedContractUrl
            ? 'SIGNED'
            : 'MISSING',
      earlyWithdrawals: [
        ...new Set(
          refunds
            .filter((r) => !r.type || r.type === 'EARLY')
            .flatMap((r) =>
              ['PENDING', 'APPROVED'].includes(r.status)
                ? ['IN_PROGRESS']
                : r.status === 'PAID'
                  ? ['FINALIZED']
                  : [],
            ),
        ),
      ],
    },
  }
}
