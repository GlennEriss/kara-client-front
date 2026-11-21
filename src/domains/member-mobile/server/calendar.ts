import type { Firestore } from 'firebase-admin/firestore'
import { mobileDateKey } from '@/domains/mobile/contracts'
import { businessWallTime } from '@/domains/mobile/server/calendar-dates'
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
  'PLACEMENT_COMMISSION',
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
  PLACEMENT_COMMISSION: 'Reversement — apport solidaire',
}
export interface MemberEcheance {
  id: string
  source: MemberSource
  contractId: string
  dueAt: string
  day: string
  amount: number
  label: string
  isOverdue: boolean
}
const number = (value: unknown) =>
  Number.isFinite(Number(value)) ? Number(value) : 0
function event(
  source: MemberSource,
  c: MemberData,
  due: unknown,
  amount: unknown,
  label: string,
  now: Date,
  overdue?: boolean,
): MemberEcheance | null {
  const dueAt = iso(due)
  if (!dueAt || new Date(dueAt).getTime() === 0) return null
  return {
    id: `${source}:${c.id}`,
    source,
    contractId: c.id,
    dueAt,
    day: mobileDateKey(new Date(dueAt)),
    amount: number(amount),
    label,
    isOverdue: overdue ?? new Date(dueAt).getTime() < now.getTime(),
  }
}
/** Même projection que calendrierService du site membre : une prochaine
 * mensualité par contrat actif et les prochains reversements d'apports.
 * Ce n'est ni le calendrier global admin ni une simulation de nouvel échéancier. */
export async function memberEcheances(
  db: Firestore,
  caller: MemberCaller,
  now = new Date(),
): Promise<MemberEcheance[]> {
  const [credits, placements, cs, ci] = await Promise.all([
    ownedRows(db, 'creditContracts', 'clientId', caller),
    ownedRows(db, 'placements', 'benefactorId', caller),
    ownedRows(db, 'caisseContracts', 'memberId', caller),
    ownedRows(db, 'contractsCI', 'memberId', caller),
  ])
  const rows: (MemberEcheance | null)[] = []
  for (const c of credits)
    if (
      Object.hasOwn(creditSources, c.creditType) &&
      ['ACTIVE', 'OVERDUE', 'PARTIAL'].includes(c.status)
    )
      rows.push(
        event(
          creditSources[c.creditType],
          c,
          c.nextDueAt,
          c.monthlyPaymentAmount,
          `Mensualité ${String(c.creditType).toLowerCase()} — ${c.id.slice(-10)}`,
          now,
        ),
      )
  for (const p of placements)
    if (p.status === 'Active')
      rows.push(
        event(
          'PLACEMENT_COMMISSION',
          p,
          p.nextCommissionDate,
          Math.round((number(p.amount) * number(p.rate)) / 100),
          `Reversement apport solidaire ${p.id.slice(-10)}`,
          now,
          Boolean(p.hasOverdueCommission),
        ),
      )
  for (const c of ci) {
    const paid = number(c.totalMonthsPaid),
      start = iso(c.firstPaymentDate)
    if (
      c.status !== 'ACTIVE' ||
      paid >= number(c.subscriptionCIDuration) ||
      !start
    )
      continue
    const civil = businessWallTime(new Date(start))
    civil.setMonth(civil.getMonth() + paid)
    const due = new Date(
      Date.UTC(
        civil.getFullYear(),
        civil.getMonth(),
        civil.getDate(),
        civil.getHours(),
        civil.getMinutes(),
        civil.getSeconds(),
        civil.getMilliseconds(),
      ) - 3600000,
    )
    rows.push(
      event(
        'CAISSE_IMPREVUE',
        c,
        due,
        c.subscriptionCIAmountPerMonth,
        `Versement Caisse Imprévue — ${c.id.slice(-10)}`,
        now,
      ),
    )
  }
  await Promise.all(
    cs
      .filter((c) => ['ACTIVE', 'LATE'].includes(c.status || 'ACTIVE'))
      .map(async (c) => {
        const snapshot = await db
          .collection('caisseContracts')
          .doc(c.id)
          .collection('payments')
          .get()
        const next = snapshot.docs
          .map((d) => d.data())
          .sort((a, b) => iso(a.dueAt).localeCompare(iso(b.dueAt)))
          .find((p) => p.status !== 'PAID')
        if (next)
          rows.push(
            event(
              'CAISSE_SPECIALE',
              c,
              next.dueAt,
              next.amount || c.monthlyAmount,
              `Versement Caisse Spéciale — ${c.id.slice(-10)}`,
              now,
            ),
          )
      }),
  )
  return rows
    .filter((r): r is MemberEcheance => !!r)
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt) || a.id.localeCompare(b.id))
}
export function calendarSummary(rows: MemberEcheance[], now = new Date()) {
  const month = mobileDateKey(now).slice(0, 7)
  return {
    overdueCount: rows.filter((e) => e.isOverdue).length,
    thisMonthCount: rows.filter((e) => !e.isOverdue && e.day.startsWith(month))
      .length,
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
  PLACEMENT_COMMISSION: {
    collection: 'placements',
    owner: 'benefactorId',
    fields: [
      ['amount', 'Montant de l’apport', 'currency'],
      ['rate', 'Taux (%)'],
      ['periodMonths', 'Durée (mois)'],
      ['startDate', 'Début', 'date'],
      ['endDate', 'Fin', 'date'],
      ['nextCommissionDate', 'Prochain reversement', 'date'],
    ],
  },
}
const creditFields: [string, string, string?][] = [
  ['amount', 'Montant initial', 'currency'],
  ['monthlyPaymentAmount', 'Mensualité', 'currency'],
  ['amountPaid', 'Montant versé', 'currency'],
  ['amountRemaining', 'Montant restant', 'currency'],
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
