import { computeCreditInstallments } from '@/utils/credit-installments'
import { computeDueAt } from '@/services/caisse/contractDates'
import type { CreditContract, CreditPayment } from '@/types/types'
import type { Firestore } from 'firebase-admin/firestore'
import { mobileDateKey } from '@/domains/mobile/contracts'
import {
  businessWallTime,
  civilDayToTimestamp,
  getMobileCIDueDate,
  withBusinessDates,
} from '@/domains/mobile/server/calendar-dates'
import {
  iso,
  ownedRows,
  memberIds,
  memberIdentifier,
  MemberError,
} from './data'
import type { MemberCaller, MemberData } from './access'

export const memberSources = [
  'CAISSE_SPECIALE',
  'CAISSE_IMPREVUE',
  'CREDIT_SPECIALE',
  'CREDIT_FIXE',
  'CREDIT_AIDE',
] as const
export type MemberSource = (typeof memberSources)[number]
const creditSources: Record<string, MemberSource> = {
  SPECIALE: 'CREDIT_SPECIALE',
  FIXE: 'CREDIT_FIXE',
  AIDE: 'CREDIT_AIDE',
}
export const sourceLabels: Record<MemberSource, string> = {
  CAISSE_SPECIALE: 'Caisse spéciale',
  CAISSE_IMPREVUE: 'Caisse imprévue',
  CREDIT_SPECIALE: 'Accompagnement exceptionnel',
  CREDIT_FIXE: 'Accompagnement exceptionnel',
  CREDIT_AIDE: 'Accompagnement exceptionnel',
}
export interface MemberEcheance {
  id: string
  source: MemberSource
  contractId: string
  dueAt: string
  day: string
  amount?: number
  status: string
  label: string
  isOverdue: boolean
}
const number = (value: unknown) =>
  Number.isFinite(Number(value)) ? Number(value) : 0
const weekMs = 7 * 86400000
const weekStart = (date: Date) => Date.parse(`${mobileDateKey(date)}T12:00:00Z`)
const weekIndex = (first: Date, date: Date) =>
  Math.max(0, Math.floor((weekStart(date) - weekStart(first)) / weekMs))

function weeklyCreditPeriods(
  contract: MemberData,
  payments: MemberData[],
  active: boolean,
) {
  const cycles = (
    Array.isArray(contract.creditCycles) ? contract.creditCycles : []
  )
    .flatMap((cycle) => {
      const first = iso(cycle.firstPaymentDate)
      return first
        ? [{ number: Number(cycle.cycleNumber), start: new Date(first) }]
        : []
    })
    .sort((a, b) => a.number - b.number)
  const first = iso(contract.firstPaymentDate)
  if (!cycles.length && first)
    cycles.push({ number: 1, start: new Date(first) })
  const periods = new Map<
    string,
    { index: number; dueAt: Date; status: string }
  >()
  for (const payment of payments) {
    if (
      number(payment.amount) <= 0 &&
      /paiement de pénalités uniquement/i.test(String(payment.comment || ''))
    )
      continue
    const explicit = /^(?:C(\d+)_)?M(\d+)_/.exec(payment.id)
    const paidAt = iso(payment.paymentDate)
    const date = paidAt ? new Date(paidAt) : undefined
    const cycle = explicit
      ? cycles.find((item) => item.number === Number(explicit[1] ?? 1))
      : (cycles.findLast((item) => date && item.start <= date) ?? cycles[0])
    if (!cycle) continue
    const linked = /-M(\d+)$/.exec(String(payment.installmentId || ''))?.[1]
    const index = explicit
      ? Number(explicit[2]) - 1
      : linked
        ? Number(linked) - 1
        : date
          ? weekIndex(cycle.start, date)
          : -1
    if (Number.isSafeInteger(index) && index >= 0)
      periods.set(`${cycle.number}-${index}`, {
        index,
        dueAt: new Date(weekStart(cycle.start) + index * weekMs),
        status: 'PAID',
      })
  }
  const next = iso(contract.nextDueAt)
  if (!active || !next) return periods
  const dueAt = new Date(next)
  const current = cycles.at(-1)
  const index = current ? weekIndex(current.start, dueAt) : 0
  const key = `${current?.number ?? 1}-${index}`
  if (!periods.has(key)) periods.set(key, { index, dueAt, status: 'DUE' })
  if (current && Number.isSafeInteger(contract.duration)) {
    for (let i = index + 1; i < contract.duration; i++) {
      const futureKey = `${current.number}-${i}`
      if (!periods.has(futureKey))
        periods.set(futureKey, {
          index: i,
          dueAt: new Date(weekStart(current.start) + i * weekMs),
          status: 'DUE',
        })
    }
  }
  return periods
}

export type CalendarFamily =
  'caisse-speciale' | 'caisse-imprevue' | 'accompagnement'

export async function memberEcheances(
  db: Firestore,
  caller: MemberCaller,
  now = new Date(),
  unavailable = new Set<CalendarFamily>(),
): Promise<MemberEcheance[]> {
  const today = mobileDateKey(now)
  const load = async (
    family: CalendarFamily,
    collection: string,
    owner: string,
  ) => {
    try {
      return await ownedRows(db, collection, owner, caller)
    } catch (error) {
      unavailable.add(family)
      console.error('[mobile/member/calendar]', family, error)
      return []
    }
  }
  const [credits, cs, ci] = await Promise.all([
    load('accompagnement', 'creditContracts', 'clientId'),
    load('caisse-speciale', 'caisseContracts', 'memberId'),
    load('caisse-imprevue', 'contractsCI', 'memberId'),
  ])
  const rows: MemberEcheance[] = []
  function add(
    source: MemberSource,
    id: string,
    index: number,
    date: unknown,
    status: string,
    amount?: number,
    key = String(index),
  ) {
    const dueAt = iso(date)
    if (!dueAt) return
    const day = mobileDateKey(new Date(dueAt))
    rows.push({
      id: `${source}:${id}:${key}`,
      source,
      contractId: id,
      dueAt,
      day,
      status,
      label: `Échéance ${index + 1}`,
      isOverdue: status !== 'PAID' && status !== 'CLOSED' && day < today,
      ...(amount === undefined ? {} : { amount }),
    })
  }
  const tasks: (() => Promise<void>)[] = []
  function schedule(family: CalendarFamily, task: () => Promise<void>) {
    tasks.push(async () => {
      try {
        await task()
      } catch (error) {
        unavailable.add(family)
        console.error('[mobile/member/calendar]', family, error)
      }
    })
  }
  for (const [collection, contracts, source] of [
    ['caisseContracts', cs, 'CAISSE_SPECIALE'],
    ['contractsCI', ci, 'CAISSE_IMPREVUE'],
  ] as const) {
    for (const c of contracts) {
      if (c.status === 'DRAFT' || c.contractType === 'GROUP') continue
      schedule(
        source === 'CAISSE_SPECIALE' ? 'caisse-speciale' : 'caisse-imprevue',
        async () => {
          const active = [
            'ACTIVE',
            'LATE',
            'LATE_NO_PENALTY',
            'LATE_WITH_PENALTY',
            'DEFAULTED_AFTER_J12',
          ].includes(c.status)
          const voluntary = ['LIBRE', 'LIBRE_CHARITABLE'].includes(c.caisseType)
          const snapshot = await db
            .collection(collection)
            .doc(c.id)
            .collection('payments')
            .get()
          const byIndex = new Map<number, MemberData>()
          const unnumbered: MemberData[] = []
          for (const d of snapshot.docs) {
            const p = { ...d.data(), id: d.id } as MemberData
            const index =
              p.dueMonthIndex ?? p.monthIndex ?? /^M(\d+)$/i.exec(d.id)?.[1]
            if (
              index != null &&
              Number.isInteger(Number(index)) &&
              Number(index) >= 0
            ) {
              byIndex.set(Number(index), p)
            } else {
              unnumbered.push(p)
            }
          }
          unnumbered.sort((a, b) => iso(a.dueAt).localeCompare(iso(b.dueAt)))
          for (const p of unnumbered) {
            let index = 0
            while (byIndex.has(index)) index++
            byIndex.set(index, p)
          }
          const special = source === 'CAISSE_SPECIALE'
          const first = iso(
            special
              ? c.contractStartAt || c.firstPaymentDate
              : c.firstPaymentDate,
          )
          const count = number(
            special ? c.monthsPlanned : c.subscriptionCIDuration,
          )
          if (first && active && !voluntary && Number.isSafeInteger(count)) {
            for (let i = 0; i < count; i++)
              if (!byIndex.has(i))
                byIndex.set(i, {
                  id: String(i),
                  status:
                    !special && i < number(c.totalMonthsPaid) ? 'PAID' : 'DUE',
                })
          }
          for (const [index, p] of byIndex) {
            const contribution =
              Array.isArray(p.contribs) && p.contribs.length
                ? p.contribs
                : p.versements
            const paid = number(
              p.accumulatedAmount ??
                (Array.isArray(contribution)
                  ? contribution.reduce((sum, v) => sum + number(v.amount), 0)
                  : 0),
            )
            const target = number(
              p.targetAmount ??
                p.amount ??
                c.monthlyAmount ??
                c.subscriptionCIAmountPerMonth,
            )
            if (voluntary && paid <= 0) continue
            const settled =
              p.status === 'PAID' || voluntary || (target > 0 && paid >= target)
            if (!active && !settled && paid <= 0) continue
            const computed =
              first &&
              (special
                ? computeDueAt(
                    businessWallTime(new Date(first)),
                    index,
                    c.caisseType,
                  )
                : getMobileCIDueDate(
                    {
                      firstPaymentDate: first,
                      paymentFrequency: c.paymentFrequency || 'MONTHLY',
                    },
                    index,
                  ))
            add(
              source,
              c.id,
              index,
              iso(p.dueAt) ||
                (computed
                  ? special
                    ? civilDayToTimestamp(computed)
                    : computed
                  : ''),
              settled
                ? 'PAID'
                : !active
                  ? 'CLOSED'
                  : p.status === 'PARTIAL'
                    ? 'PARTIAL'
                    : 'DUE',
              voluntary ? paid : target || paid,
            )
          }
          if (
            special &&
            active &&
            !voluntary &&
            !rows.some(
              (row) => row.source === source && row.contractId === c.id,
            )
          )
            add(
              source,
              c.id,
              number(c.currentMonthIndex),
              c.nextDueAt,
              'DUE',
              number(c.monthlyAmount),
            )
        },
      )
    }
  }
  for (const c of credits) {
    const source = creditSources[c.creditType]
    const active = [
      'ACTIVE',
      'OVERDUE',
      'PARTIAL',
      'BLOCKED',
      'EXTENDED',
    ].includes(c.status)
    if (
      !source ||
      (!active &&
        !['CLOSED', 'DISCHARGED', 'WRITTEN_OFF', 'TRANSFORMED'].includes(
          c.status,
        ))
    )
      continue
    schedule('accompagnement', async () => {
      const first = iso(c.firstPaymentDate)
      if (!first && c.durationUnit !== 'WEEKS') {
        if (active) add(source, c.id, 0, c.nextDueAt, 'DUE')
        return
      }
      const snapshot = await db
        .collection('creditPayments')
        .where('creditId', '==', c.id)
        .get()
      const payments = snapshot.docs.map(
        (d) => ({ ...d.data(), id: d.id }) as MemberData,
      )
      if (c.durationUnit === 'WEEKS') {
        for (const [key, period] of weeklyCreditPeriods(c, payments, active))
          add(
            source,
            c.id,
            period.index,
            period.dueAt,
            period.status,
            undefined,
            key,
          )
        return
      }
      const contract = withBusinessDates({
        ...c,
        firstPaymentDate: first,
      }) as CreditContract
      const installments = computeCreditInstallments(
        contract,
        withBusinessDates(payments) as CreditPayment[],
        businessWallTime(now),
      )
      if (!installments.length && active)
        add(source, c.id, 0, c.nextDueAt, 'DUE')
      for (const p of installments) {
        if (active || p.status === 'PAID')
          add(
            source,
            c.id,
            p.installmentNumber - 1,
            civilDayToTimestamp(p.dueDate),
            p.status,
          )
      }
    })
  }
  for (let start = 0; start < tasks.length; start += 8)
    await Promise.all(tasks.slice(start, start + 8).map((task) => task()))
  return rows.sort(
    (a, b) => a.dueAt.localeCompare(b.dueAt) || a.id.localeCompare(b.id),
  )
}
export function calendarSummary(rows: MemberEcheance[], now = new Date()) {
  const month = mobileDateKey(now).slice(0, 7)
  return {
    overdueCount: rows.filter((e) => e.isOverdue).length,
    thisMonthCount: rows.filter((e) => e.day.startsWith(month)).length,
  }
}
const definitions: Record<
  MemberSource,
  { collection: string; owner: string; fields: [string, string, string?][] }
> = {
  CAISSE_SPECIALE: {
    collection: 'caisseContracts',
    owner: 'memberId',
    fields: [
      ['caisseType', 'Type de caisse'],
      ['monthlyAmount', 'Cotisation mensuelle', 'currency'],
      ['monthsPlanned', 'Durée prévue (mois)'],
      ['nominalPaid', 'Nominal versé', 'currency'],
      ['contractStartAt', 'Début du contrat', 'date'],
      ['contractEndAt', 'Fin du contrat', 'date'],
    ],
  },
  CAISSE_IMPREVUE: {
    collection: 'contractsCI',
    owner: 'memberId',
    fields: [
      ['subscriptionCILabel', 'Forfait'],
      ['paymentFrequency', 'Fréquence'],
      ['subscriptionCIAmountPerMonth', 'Cotisation mensuelle', 'currency'],
      ['subscriptionCIDuration', 'Durée prévue (mois)'],
      ['totalMonthsPaid', 'Mois payés'],
      ['firstPaymentDate', 'Premier versement', 'date'],
    ],
  },
  CREDIT_SPECIALE: {
    collection: 'creditContracts',
    owner: 'clientId',
    fields: [],
  },
  CREDIT_FIXE: { collection: 'creditContracts', owner: 'clientId', fields: [] },
  CREDIT_AIDE: { collection: 'creditContracts', owner: 'clientId', fields: [] },
}
const creditFields: [string, string, string?][] = [
  ['duration', 'Durée'],
  ['firstPaymentDate', 'Première échéance', 'date'],
  ['nextDueAt', 'Prochaine échéance', 'date'],
]
const labels: Record<string, string> = {
  ACTIVE: 'Actif',
  Active: 'Actif',
  LATE: 'En retard',
  OVERDUE: 'En retard',
  PARTIAL: 'Partiellement remboursé',
  CLOSED: 'Clôturé',
  FINISHED: 'Terminé',
  CANCELED: 'Résilié',
  RESCINDED: 'Résilié',
  DRAFT: 'Brouillon',
  Draft: 'Brouillon',
  Completed: 'Terminé',
  EarlyExit: 'Retrait anticipé',
  MONTHLY: 'Mensuel',
  DAILY: 'Journalier',
  STANDARD: 'Standard',
  JOURNALIERE: 'Journalière',
  LIBRE: 'Libre',
}
export async function ownedAccompaniment(
  db: Firestore,
  caller: MemberCaller,
  id: string,
  kind: string,
) {
  if (!memberIdentifier(id)) throw new MemberError('Dossier inconnu.', 404)
  const demand = kind === 'demand'
  const record = (
    await db
      .collection(demand ? 'creditDemands' : 'creditContracts')
      .doc(id)
      .get()
  ).data()
  if (!record || !memberIds(caller).includes(record.clientId))
    throw new MemberError('Dossier introuvable.', 404)
  const status =
    labels[record.status] ||
    (
      {
        PENDING: 'En attente',
        APPROVED: 'Approuvée',
        REJECTED: 'Refusée',
        CANCELLED: 'Annulée',
      } as Record<string, string>
    )[record.status]
  return {
    id,
    status: status || 'Statut non renseigné',
    fields: (demand
      ? [['createdAt', 'Date de la demande']]
      : creditFields.map(([field, label]) => [field, label])
    )
      .map(([field, label]) => ({
        label,
        value:
          field === 'duration'
            ? String(record[field] ?? '')
            : iso(record[field]),
        date: field !== 'duration',
      }))
      .filter((field) => field.value),
  }
}

/** Consultation depuis une échéance : aucun droit de mutation ou de gestion admin. */
export async function ownedCalendarContract(
  db: Firestore,
  caller: MemberCaller,
  source: string,
  id: string,
) {
  if (!memberSources.includes(source as MemberSource) || !memberIdentifier(id))
    throw new MemberError('Contrat inconnu.', 404)
  const definition = definitions[source as MemberSource],
    snap = await db.collection(definition.collection).doc(id).get(),
    c = snap.data()
  if (!c || !memberIds(caller).includes(c[definition.owner]))
    throw new MemberError('Contrat introuvable.', 404)
  if (source.startsWith('CREDIT_') && creditSources[c.creditType] !== source)
    throw new MemberError('Contrat introuvable.', 404)
  const fields = source.startsWith('CREDIT_') ? creditFields : definition.fields
  return {
    id,
    source,
    label: sourceLabels[source as MemberSource],
    status: labels[c.status] || 'Statut non renseigné',
    fields: fields.map(([key, label, format]) => ({
      key,
      label,
      format: format || 'text',
      value:
        format === 'date'
          ? iso(c[key])
          : typeof c[key] === 'number'
            ? c[key]
            : typeof c[key] === 'string'
              ? labels[c[key]] || c[key]
              : null,
    })),
  }
}
