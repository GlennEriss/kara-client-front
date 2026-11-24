/* eslint-disable no-restricted-imports -- Réutilise les calculs de dates métier officiels sans exposer les opérations admin. */
import type { Firestore } from 'firebase-admin/firestore'
import {
  resolveContractEndAt,
  computeDueAt,
} from '@/services/caisse/contractDates'
import { getContractEndDate } from '@/utils/caisse-imprevue-utils'
import {
  businessWallTime,
  civilDayToTimestamp,
  getMobileCIDueDate,
  withBusinessDates,
} from '@/domains/mobile/server/calendar-dates'
import { addContractMonths } from '@/utils/contract-months'
import { mobileDateKey } from '@/domains/mobile/contracts'
import type { MemberCaller, MemberData } from './access'
import {
  iso,
  MemberError,
  memberIdentifier,
  memberIds,
  ownedRows,
} from './data'
import { memberSubscriptions } from './read-model'

export const memberFinanceModules = [
  'caisse-speciale',
  'caisse-imprevue',
] as const
export type MemberFinanceModule = (typeof memberFinanceModules)[number]
export const financeCollections = (module: MemberFinanceModule) =>
  module === 'caisse-speciale'
    ? {
        contracts: 'caisseContracts',
        demands: 'caisseSpecialeDemands',
        refunds: 'refunds',
      }
    : {
        contracts: 'contractsCI',
        demands: 'caisseImprevueDemands',
        refunds: 'earlyRefunds',
      }
export function memberFinanceModule(value: unknown): MemberFinanceModule {
  if (!memberFinanceModules.includes(value as MemberFinanceModule))
    throw new MemberError('Section inconnue.', 404)
  return value as MemberFinanceModule
}
export const text = (v: unknown) => (typeof v === 'string' ? v : '')
export const number = (v: unknown) =>
  Number.isFinite(Number(v)) ? Number(v) : 0
const day = (v: unknown) => {
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v
  const value = iso(v)
  return value ? mobileDateKey(new Date(value)) : ''
}
export async function checkMemberFinanceAccess(
  db: Firestore,
  caller: MemberCaller,
  module: MemberFinanceModule,
) {
  // Le layout Caisse spéciale du site membre exige une cotisation annuelle active.
  if (
    module === 'caisse-speciale' &&
    !(await memberSubscriptions(db, caller)).some((s) => s.status === 'active')
  )
    throw new MemberError(
      'Un abonnement actif est nécessaire pour accéder à la caisse spéciale.',
      403,
      'SUBSCRIPTION_REQUIRED',
    )
}
export async function ownedFinanceRecord(
  db: Firestore,
  caller: MemberCaller,
  module: MemberFinanceModule,
  id: string,
  kind = 'contracts',
) {
  if (!memberIdentifier(id) || !['contracts', 'demands'].includes(kind))
    throw new MemberError('Dossier introuvable.', 404)
  const collection = financeCollections(module)[kind as 'contracts' | 'demands']
  const snap = await db.collection(collection).doc(id).get(),
    data = snap.data()
  if (!data || !memberIds(caller).includes(data.memberId))
    throw new MemberError('Dossier introuvable.', 404)
  return { ...data, id: snap.id } as MemberData
}
const contact = (c: MemberData = {}) => ({
  lastName: text(c.lastName),
  firstName: text(c.firstName),
  phone1: text(c.phone1),
  phone2: text(c.phone2),
  relationship: text(c.relationship),
  idNumber: text(c.idNumber),
  typeId: text(c.typeId),
})
export function memberContractEnd(
  module: MemberFinanceModule,
  record: MemberData,
): string {
  const normalized = withBusinessDates(
    Object.fromEntries(
      Object.entries(record).map(([k, v]) => [k, v?.toDate?.() ?? v]),
    ),
  ) as MemberData
  const end =
    module === 'caisse-speciale'
      ? resolveContractEndAt(normalized)
      : getContractEndDate(normalized)
  return end && Number.isFinite(end.getTime())
    ? civilDayToTimestamp(end).toISOString()
    : ''
}
export async function financeChildren(
  db: Firestore,
  module: MemberFinanceModule,
  id: string,
) {
  const names = financeCollections(module),
    ref = db.collection(names.contracts).doc(id)
  const read = async (name: string) =>
    (await ref.collection(name).get()).docs.map(
      (d) => ({ ...d.data(), id: d.id }) as MemberData,
    )
  const [payments, declarations, refunds, supports] = await Promise.all([
    read('payments'),
    read('declaredVersements'),
    read(names.refunds),
    module === 'caisse-imprevue' ? read('supports') : Promise.resolve([]),
  ])
  return { payments, declarations, refunds, supports }
}
export type FinanceChildren = Awaited<ReturnType<typeof financeChildren>>
export function financePolicy(
  module: MemberFinanceModule,
  c: MemberData,
  children: FinanceChildren,
  now = new Date(),
) {
  const { payments, refunds, supports } = children
  const pendingRefund = refunds.some((r) =>
    ['PENDING', 'APPROVED'].includes(r.status),
  )
  const paidRefund = refunds.some((r) => r.status === 'PAID')
  const finished = ['FINISHED', 'CLOSED'].includes(c.status)
  const stopped =
    finished ||
    ['CANCELED', 'RESCINDED'].includes(c.status) ||
    pendingRefund ||
    paidRefund
  const paidMonths = payments.filter((p) => p.status === 'PAID').length
  const hasPayment = payments.some((p) =>
    ['PAID', 'PARTIAL'].includes(p.status),
  )
  const end = memberContractEnd(module, c)
  const matured = !!end && mobileDateKey(now) >= mobileDateKey(new Date(end))
  const locked =
    module === 'caisse-speciale' &&
    number(c.currentMonthIndex) < number(c.withdrawLockedUntilM)
  const activeSupport = supports.some((s) =>
    ['ACTIVE', 'PENDING_ADMIN'].includes(s.status),
  )
  const supportReason =
    module !== 'caisse-imprevue'
      ? ''
      : c.status !== 'ACTIVE'
        ? 'Le contrat n’est pas actif.'
        : paidMonths < 3
          ? `Trois mois entièrement payés sont nécessaires (${paidMonths}/3).`
          : activeSupport
            ? 'Une aide est déjà en cours ou en attente de validation.'
            : ''
  return {
    declare: !stopped,
    uploadSigned:
      !(module === 'caisse-speciale'
        ? c.contractPdf?.url
        : c.contractStartId) && c.memberSignedStatus !== 'PENDING_ADMIN',
    earlyRefund: hasPayment && !stopped && !locked,
    finalRefund:
      !!end &&
      (finished || matured) &&
      !pendingRefund &&
      !paidRefund &&
      !['CANCELED', 'RESCINDED'].includes(c.status),
    support: module === 'caisse-imprevue' && !supportReason && !stopped,
    supportReason:
      supportReason ||
      (stopped ? 'Ce contrat ne permet plus de nouvelle opération.' : ''),
    refundReason: paidRefund
      ? 'La remise de ce contrat a déjà été effectuée.'
      : pendingRefund
        ? 'Une demande de retrait est déjà en cours.'
        : locked && !matured
          ? `Le retrait anticipé est verrouillé jusqu’au mois ${number(c.withdrawLockedUntilM) + 1}.`
          : '',
  }
}
const memberPaymentTime = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Africa/Libreville',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})
function versement(v: MemberData, index: number) {
  const paidAt = !/^\d{4}-\d{2}-\d{2}$/.test(text(v.paidAt || v.date))
    ? iso(v.paidAt || v.date)
    : ''
  return {
    id: text(v.id) || String(index),
    date: day(v.date || v.paidAt),
    time: text(v.time || v.paidAtTime) || (paidAt ? memberPaymentTime.format(new Date(paidAt)) : ''),
    amount: number(v.amount),
    mode: text(v.mode),
    withFees: typeof v.withFees === 'boolean' ? v.withFees : null,
    paymentMethodOther: text(v.paymentMethodOther),
    penalty: number(v.penalty),
    daysLate:
      v.penaltyDays == null && v.daysLate == null
        ? null
        : number(v.penaltyDays ?? v.daysLate),
    supportRepaymentAmount: number(v.supportRepaymentAmount),
    hasProof: !!v.proofUrl,
  }
}
export function recordedContributions(p: MemberData): MemberData[] {
  if (Array.isArray(p.contribs) && p.contribs.length) return p.contribs
  return Array.isArray(p.versements) ? p.versements : []
}

export function isLegacyPayment(p: MemberData, contract: MemberData) {
  return contract.contractType !== 'GROUP' &&
    p.status === 'PAID' &&
    recordedContributions(p).length === 0 &&
    !(Array.isArray(p.groupContributions) && p.groupContributions.length)
}

export function paymentDTO(
  p: MemberData,
  c: MemberData,
  module: MemberFinanceModule,
) {
  const monthIndex = number(p.dueMonthIndex ?? p.monthIndex)
  const contributions = recordedContributions(p)
  const versements = contributions.map((v, index) => versement(v, index))
  let dueAt = iso(p.dueAt)
  if (!dueAt && module === 'caisse-imprevue') dueAt =
      iso(
          getMobileCIDueDate(
            {
              firstPaymentDate: iso(c.firstPaymentDate),
              paymentFrequency: c.paymentFrequency,
            },
            monthIndex,
          ),
        )
  if (!dueAt) {
    const start = iso(c.firstPaymentDate || c.contractStartAt)
    if (start) {
      const due =
        module === 'caisse-speciale'
          ? computeDueAt(
              businessWallTime(new Date(start)),
              monthIndex,
              c.caisseType,
            )
          : addContractMonths(businessWallTime(new Date(start)), monthIndex)
      if (due) dueAt = civilDayToTimestamp(due).toISOString()
    }
  }
  return {
    id: p.id,
    monthIndex,
    status: ['PAID', 'PARTIAL'].includes(p.status)
      ? (p.status as string)
      : 'DUE',
    targetAmount: number(
      p.targetAmount ??
        p.amount ??
        c.monthlyAmount ??
        c.subscriptionCIAmountPerMonth,
    ),
    accumulatedAmount:
      p.accumulatedAmount != null
        ? number(p.accumulatedAmount)
        : versements.length
          ? versements.reduce((s, v) => s + v.amount, 0)
          : p.status === 'PAID'
            ? number(p.amount)
            : 0,
    dueAt,
    paidAt: iso(p.paidAt),
    time: text(p.time),
    mode: text(p.mode),
    penalty: number(p.penaltyApplied),
    bonus: number(p.bonusApplied),
    supportRepaymentAmount: number(p.supportRepaymentAmount),
    legacyVersement:
      isLegacyPayment(p, c)
        ? versement({
            ...p,
            amount: p.accumulatedAmount ?? p.amount,
            penalty: p.penaltyApplied,
          }, 0)
        : null,
    versements,
    frequency:
      module === 'caisse-imprevue'
        ? text(c.paymentFrequency)
        : text(c.caisseType).startsWith('JOURNALIERE')
          ? 'DAILY'
          : 'MONTHLY',
  }
}
const recent = (rows: MemberData[]) =>
  rows.sort((a, b) =>
    iso(b.createdAt || b.declaredAt).localeCompare(
      iso(a.createdAt || a.declaredAt),
    ),
  )
export function contractDTO(
  module: MemberFinanceModule,
  c: MemberData,
  children: FinanceChildren,
  now = new Date(),
) {
  const payments = children.payments
    .map((p) => paymentDTO(p, c, module))
    .sort((a, b) => a.monthIndex - b.monthIndex)
  const totalPaid = payments.reduce((s, p) => s + p.accumulatedAmount, 0)
  const duration = number(c.monthsPlanned ?? c.subscriptionCIDuration)
  const amount = number(c.monthlyAmount ?? c.subscriptionCIAmountPerMonth)
  const refunds = recent(children.refunds).map((r) => ({
    id: r.id,
    type: text(r.type),
    status: text(r.status),
    reason: text(r.reason),
    withdrawalAmount: number(r.withdrawalAmount ?? r.amountNominal),
    amountBonus: number(r.amountBonus),
    withdrawalMode: text(r.withdrawalMode),
    paymentMethodOther: text(r.paymentMethodOther),
    withdrawalDate: iso(r.withdrawalDate),
    withdrawalTime: text(r.withdrawalTime),
    createdAt: iso(r.createdAt),
    approvedAt: iso(r.approvedAt),
    paidAt: iso(r.paidAt),
    paidAtTime: text(r.paidAtTime),
    deadlineAt: iso(r.deadlineAt),
    payoutDueAt: iso(r.payoutDueAt),
    hasProof: !!r.proofUrl,
    hasDocument: !!(r.adminDocumentUrl || r.documentUrl || r.documentId),
  }))
  return {
    id: c.id,
    status: text(c.status),
    type: text(c.caisseType || c.subscriptionCILabel || c.subscriptionCICode),
    amount,
    duration,
    frequency:
      text(c.paymentFrequency) ||
      (text(c.caisseType).startsWith('JOURNALIERE') ? 'DAILY' : 'MONTHLY'),
    startAt: iso(c.contractStartAt || c.firstPaymentDate),
    firstPaymentDate: iso(c.firstPaymentDate),
    endAt: memberContractEnd(module, c),
    nextDueAt:
      iso(c.nextDueAt) ||
      payments.find((p) => p.status !== 'PAID')?.dueAt ||
      '',
    createdAt: iso(c.createdAt),
    paidMonths: payments.filter((p) => p.status === 'PAID').length,
    totalPaid,
    nominalPaid: number(c.nominalPaid) || totalPaid,
    bonusAccrued: number(c.bonusAccrued),
    penaltiesTotal:
      number(c.penaltiesTotal) ||
      payments.reduce(
        (s, p) =>
          s +
          (p.penalty || p.versements.reduce((sum, v) => sum + v.penalty, 0)),
        0,
      ),
    supportMin: number(c.subscriptionCISupportMin),
    supportMax: number(c.subscriptionCISupportMax),
    emergencyContact: contact(c.emergencyContact),
    signedStatus: text(c.memberSignedStatus),
    hasOfficialDocument:
      module === 'caisse-speciale' ? !!c.contractPdf?.url : !!c.contractStartId,
    hasSubmittedDocument: !!c.memberSignedDocumentId,
    actions: financePolicy(module, c, children, now),
    payments,
    refunds,
    declarations: recent(children.declarations).map((d) => ({
      id: d.id,
      monthIndex: number(d.monthIndex),
      amount: number(d.amount),
      mode: text(d.mode),
      withFees: typeof d.withFees === 'boolean' ? d.withFees : null,
      paymentMethodOther: text(d.paymentMethodOther),
      date: day(d.date),
      time: text(d.time),
      comment: text(d.comment),
      status: text(d.status),
      rejectionReason: text(d.rejectionReason),
      declaredAt: iso(d.declaredAt),
      validatedAt: iso(d.validatedAt),
      rejectedAt: iso(d.rejectedAt),
      hasProof: !!d.proofUrl,
    })),
    supports: recent(children.supports).map((s) => ({
      id: s.id,
      amount: number(s.amount),
      motif: text(s.motif),
      status: text(s.status),
      amountRepaid: number(s.amountRepaid),
      amountRemaining: number(s.amountRemaining),
      requestedAt: iso(s.requestedAt),
      approvedAt: iso(s.approvedAt),
      repaidAt: iso(s.repaidAt),
      rejectionReason: text(s.rejectionReason),
      hasDocument: !!(s.adminDocumentUrl || s.documentUrl || s.documentId),
      repayments: (Array.isArray(s.repayments) ? s.repayments : []).map(
        (r: MemberData, i: number) => ({
          id: text(r.id) || String(i),
          amount: number(r.amount),
          date: day(r.date),
          time: text(r.time),
          monthIndex: number(r.monthIndex),
        }),
      ),
      deductions: (Array.isArray(s.deductions) ? s.deductions : []).map(
        (r: MemberData) => ({
          monthIndex: number(r.monthIndex),
          amount: number(r.amount),
        }),
      ),
    })),
  }
}
export function demandDTO(d: MemberData) {
  return {
    id: d.id,
    status: text(d.status),
    type: text(d.caisseType || d.subscriptionCILabel || d.subscriptionCICode),
    amount: number(d.monthlyAmount ?? d.subscriptionCIAmountPerMonth),
    duration: number(d.monthsPlanned ?? d.subscriptionCIDuration),
    frequency:
      text(d.paymentFrequency) ||
      (text(d.caisseType).startsWith('JOURNALIERE') ? 'DAILY' : 'MONTHLY'),
    cause: text(d.cause),
    desiredDate: day(d.desiredDate || d.desiredStartDate),
    createdAt: iso(d.createdAt),
    updatedAt: iso(d.updatedAt),
    decisionReason: text(d.decisionReason || d.rejectReason || d.approveReason),
    decisionDate: iso(
      d.decisionDate || d.approvedAt || d.rejectedAt || d.acceptedAt,
    ),
    reopenReason: text(d.reopenReason),
    contractId: text(d.contractId),
    emergencyContact: contact(d.emergencyContact),
    canCancel: d.status === 'PENDING',
  }
}
export async function memberFinanceList(
  db: Firestore,
  caller: MemberCaller,
  module: MemberFinanceModule,
) {
  const names = financeCollections(module)
  const [contracts, demands, plans] = await Promise.all([
    ownedRows(db, names.contracts, 'memberId', caller),
    ownedRows(db, names.demands, 'memberId', caller),
    module === 'caisse-imprevue'
      ? db.collection('subscriptionsCI').where('status', '==', 'ACTIVE').get()
      : Promise.resolve(null),
  ])
  return {
    contracts: await Promise.all(
      recent(contracts).map(async (c) =>
        contractDTO(module, c, await financeChildren(db, module, c.id)),
      ),
    ),
    demands: recent(demands).map(demandDTO),
    plans:
      plans?.docs
        .map((d) => {
          const p = d.data()
          return {
            id: d.id,
            label: text(p.label || p.code),
            code: text(p.code),
            amount: number(p.amountPerMonth),
            duration: number(p.durationInMonths),
            nominal: number(p.nominal),
            supportMin: number(p.supportMin),
            supportMax: number(p.supportMax),
          }
        })
        .sort((a, b) => a.amount - b.amount) ?? [],
  }
}
