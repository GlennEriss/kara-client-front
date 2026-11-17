import type { DocumentData, QueryDocumentSnapshot, Query } from 'firebase-admin/firestore'
import { adminFirestore } from '@/firebase/adminFirestore'
import { firebaseCollectionNames as names } from '@/constantes/firebase-collection-names'
import { mapWithConcurrency } from '@/utils/mapWithConcurrency'
import { computeCreditInstallments } from '@/utils/credit-installments'
import type { ContractCI, CreditContract, CreditPayment } from '@/types/types'
import { eventStatus, mobileDateKey, type MobileCalendarEvent, type MobileModule } from '../contracts'
import { businessWallTime, civilDayToTimestamp, getMobileCIDueDate, withBusinessDates } from './calendar-dates'

type Row = Record<string, unknown> & { id: string }
/** Conversion récursive pour réutiliser les calculs métier existants, y compris les cycles crédit. */
export function fromFirestore(value: unknown): unknown {
  if (value instanceof Date || value === null || typeof value !== 'object') return value
  if ('toDate' in value && typeof value.toDate === 'function') return value.toDate()
  if (Array.isArray(value)) return value.map(fromFirestore)
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, fromFirestore(item)]))
}
const row = (doc: QueryDocumentSnapshot<DocumentData>): Row => ({ ...(fromFirestore(doc.data()) as Record<string, unknown>), id: doc.id })
const amount = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0
const text = (value: unknown) => typeof value === 'string' ? value : ''
function asDate(value: unknown): Date | null {
  const date = value instanceof Date ? value : typeof value === 'string' || typeof value === 'number' ? new Date(value) : null
  return date && !Number.isNaN(date.getTime()) ? date : null
}
async function read(query: Query): Promise<Row[]> { return (await query.get()).docs.map(row) }

export async function getMobileCalendar(month: string, module: MobileModule, now = new Date()): Promise<MobileCalendarEvent[]> {
  if (!adminFirestore) throw new Error('Firestore indisponible')
  const db = adminFirestore
  const today = mobileDateKey(now)
  const inMonth = (value: unknown) => { const date = asDate(value); return date && mobileDateKey(date).startsWith(month) ? date : null }
  const events: MobileCalendarEvent[] = []
  function add(input: Omit<MobileCalendarEvent, 'module' | 'status' | 'date'> & { date: Date; rawStatus: string; partial?: boolean }) {
    const { rawStatus, partial, ...data } = input
    const date = mobileDateKey(input.date)
    events.push({ ...data, date, module, status: eventStatus(rawStatus, date, today, partial) })
  }

  if (module === 'caisse-speciale') {
    const contracts = await read(db.collection(names.caisseContracts).where('status', 'in', ['ACTIVE', 'LATE_NO_PENALTY', 'LATE_WITH_PENALTY']))
    const memberNames = new Map<string, Promise<string>>()
    const displayName = (contract: Row) => {
      const group = contract.contractType === 'GROUP'
      const id = text(group ? contract.groupeId : contract.memberId)
      if (!id) return Promise.resolve('Membre KARA')
      const path = `${group ? names.groups : names.users}/${id}`
      if (!memberNames.has(path)) memberNames.set(path, db.doc(path).get().then(snap => {
        const data = snap.data()
        return (group ? text(data?.name) : `${text(data?.firstName)} ${text(data?.lastName)}`.trim()) || (group ? 'Groupe KARA' : 'Membre KARA')
      }))
      return memberNames.get(path)!
    }
    await mapWithConcurrency(contracts, 6, async contract => {
      const payments = await read(db.collection(`${names.caisseContracts}/${contract.id}/payments`))
      const visible = payments.filter(payment => inMonth(payment.dueAt))
      if (!visible.length) return
      const memberName = await displayName(contract)
      for (const payment of visible) {
        const total = amount(payment.amount)
        const paid = payment.status === 'PAID' ? total : 0
        add({ id: `${module}:${contract.id}:${payment.id}`, contractId: contract.id, date: inMonth(payment.dueAt)!, memberName,
          label: `Versement ${Number(payment.dueMonthIndex ?? 0) + 1}`, rawStatus: text(payment.status),
          amount: total, paidAmount: paid, remainingAmount: payment.status === 'REFUSED' ? 0 : Math.max(0, total - paid), contractType: text(contract.caisseType) })
      }
    })
  } else if (module === 'caisse-imprevue') {
    const contracts = await read(db.collection(names.contractsCI).where('status', '==', 'ACTIVE'))
    await mapWithConcurrency(contracts, 6, async contract => {
      const ci = contract as unknown as ContractCI
      const periods = Array.from({ length: ci.subscriptionCIDuration || 0 }, (_, index) => ({ index, date: getMobileCIDueDate(ci, index) }))
        .filter((period): period is { index: number; date: Date } => !!period.date && !!inMonth(period.date))
      if (!periods.length) return
      const payments = await read(db.collection(`${names.contractsCI}/${contract.id}/payments`)
        .where('monthIndex', '>=', Math.min(...periods.map(p => p.index))).where('monthIndex', '<=', Math.max(...periods.map(p => p.index))))
      const byIndex = new Map(payments.map(payment => [payment.monthIndex, payment]))
      for (const period of periods) {
        const payment = byIndex.get(period.index)
        const total = amount(payment?.targetAmount ?? ci.subscriptionCIAmountPerMonth)
        const paid = amount(payment?.accumulatedAmount)
        const paidInFull = payment?.status === 'PAID' || paid >= total && payment?.status === 'PARTIAL'
        add({ id: `${module}:${contract.id}:${period.index}`, contractId: contract.id, date: period.date,
          memberName: `${ci.memberFirstName || ''} ${ci.memberLastName || ''}`.trim() || 'Membre KARA', label: `Versement ${period.index + 1}`,
          rawStatus: paidInFull ? 'PAID' : text(payment?.status) || 'DUE', partial: paid > 0,
          amount: total, paidAmount: paid, remainingAmount: paidInFull ? 0 : Math.max(0, total - paid), contractType: ci.paymentFrequency })
      }
    })
  } else if (module === 'placement') {
    const placements = await read(db.collection(names.placements).where('status', '==', 'Active'))
    await mapWithConcurrency(placements, 6, async placement => {
      const commissions = await read(db.collection(`${names.placements}/${placement.id}/commissions`))
      const memberName = text(placement.benefactorName) || 'Bienfaiteur KARA'
      for (const commission of commissions) {
        const date = inMonth(commission.dueDate)
        if (!date) continue
        const cancelled = commission.status === 'Canceled'
        const total = cancelled ? 0 : amount(commission.amount)
        const paid = cancelled ? 0 : amount(commission.paidAmount ?? (commission.status === 'Paid' ? total : 0))
        add({ id: `${module}:${placement.id}:${commission.id}`, contractId: placement.id, date, memberName, label: 'Commission de placement',
          rawStatus: text(commission.status), amount: total, paidAmount: paid, remainingAmount: Math.max(0, total - paid) })
      }
      const lastDate = commissions.map(c => asDate(c.dueDate)).filter((date): date is Date => !!date).sort((a, b) => b.getTime() - a.getTime())[0]
      const end = inMonth(asDate(placement.endDate) ?? lastDate)
      if (end) add({ id: `${module}:${placement.id}:capital`, contractId: placement.id, date: end, memberName, label: 'Restitution du capital', rawStatus: 'Due', amount: amount(placement.amount), paidAmount: 0, remainingAmount: amount(placement.amount) })
    })
  } else {
    const creditType = module === 'credit-speciale' ? 'SPECIALE' : module === 'credit-fixe' ? 'FIXE' : 'AIDE'
    const contracts = (await read(db.collection(names.creditContracts).where('status', 'in', ['ACTIVE', 'OVERDUE', 'PARTIAL', 'BLOCKED'])))
      .filter(contract => contract.creditType === creditType)
    await mapWithConcurrency(contracts, 6, async contract => {
      const payments = await read(db.collection(names.creditPayments).where('creditId', '==', contract.id))
      const installments = computeCreditInstallments(withBusinessDates(contract) as CreditContract, withBusinessDates(payments) as CreditPayment[], businessWallTime(now))
      for (const installment of installments) {
        const date = inMonth(civilDayToTimestamp(installment.dueDate))
        if (!date) continue
        add({ id: `${module}:${contract.id}:${installment.id}`, contractId: contract.id, date,
          memberName: `${text(contract.clientFirstName)} ${text(contract.clientLastName)}`.trim() || 'Membre KARA', label: `Échéance ${installment.installmentNumber}`,
          rawStatus: installment.status, amount: amount(installment.totalAmount), paidAmount: amount(installment.paidAmount), remainingAmount: amount(installment.remainingAmount) })
      }
    })
  }
  return events.sort((a, b) => a.date.localeCompare(b.date) || a.memberName.localeCompare(b.memberName, 'fr') || a.id.localeCompare(b.id))
}
