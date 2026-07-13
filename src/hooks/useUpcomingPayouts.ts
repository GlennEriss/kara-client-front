"use client"

/**
 * Hook : liste des REMISES D'ARGENT à venir (Caisse Spéciale + Caisse Imprévue + Placement).
 *
 * Règle métier : la personne récupère son argent 30 jours après
 *  - son DERNIER VERSEMENT pour un contrat de caisse entièrement cotisé ;
 *  - la FIN DU PLACEMENT (date de terme) pour un placement actif ;
 *  - la DATE DE LA DEMANDE pour un retrait anticipé (caisses et placements).
 *
 * Un contrat sort de la liste dès que sa remise est marquée payée (refund PAID)
 * ou que le contrat/placement est clôturé/résilié.
 */

import { useQuery } from '@tanstack/react-query'
import { addDays, addMonths, differenceInCalendarDays, startOfDay } from 'date-fns'
import { getAllContracts } from '@/db/caisse/contracts.db'
import { listPayments } from '@/db/caisse/payments.db'
import { listRefunds, listRefundsCI } from '@/db/caisse/refunds.db'
import { getUserById } from '@/db/user.db'
import { getGroupById } from '@/db/group.db'
import { ServiceFactory } from '@/factories/ServiceFactory'
import type { CaisseContract, CaissePayment, CaisseType } from '@/services/caisse/types'
import type { ContractCI, PaymentCI, Placement } from '@/types/types'

/** Délai (jours) entre le fait générateur (dernier versement / fin / demande) et la remise. */
export const PAYOUT_DELAY_DAYS = 30

export type PayoutProduct = 'Caisse Spéciale' | 'Caisse Imprévue' | 'Placement'
export type PayoutKind = 'FINAL' | 'EARLY'

export interface UpcomingPayout {
  key: string
  product: PayoutProduct
  /** FINAL = contrat entièrement cotisé · EARLY = retrait anticipé demandé. */
  kind: PayoutKind
  contractId: string
  matricule?: string
  name: string
  isGroup: boolean
  phone?: string
  whatsappNumber?: string
  typeLabel: string
  /** Montant à remettre (montant demandé si connu, sinon cotisé + bonus). */
  amount: number
  /** Fait générateur : dernier versement (FINAL) ou demande de retrait (EARLY). */
  referenceAt: Date
  /** Date à laquelle l'argent doit être remis (référence + 30 jours). */
  dueAt: Date
  /** Jours restants (négatif = remise en retard). */
  daysUntil: number
}

const CAISSE_TYPE_LABELS: Record<CaisseType, string> = {
  JOURNALIERE: 'Journalière',
  STANDARD: 'Standard',
  LIBRE: 'Libre',
  STANDARD_CHARITABLE: 'Standard Charitable',
  JOURNALIERE_CHARITABLE: 'Journalière Charitable',
  LIBRE_CHARITABLE: 'Libre Charitable',
}

function extractPhone(contacts: unknown): string | undefined {
  if (Array.isArray(contacts)) {
    const first = contacts.find(Boolean)
    return first ? String(first) : undefined
  }
  return contacts ? String(contacts) : undefined
}

function toDate(v: unknown): Date | undefined {
  if (!v) return undefined
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? undefined : v
  if (typeof (v as { toDate?: () => Date }).toDate === 'function') {
    return (v as { toDate: () => Date }).toDate()
  }
  const parsed = new Date(v as string)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

function maxDate(a: Date | undefined, b: Date | undefined): Date | undefined {
  if (!a) return b
  if (!b) return a
  return a > b ? a : b
}

/** Le même membre n'est lu qu'une fois par exécution (cache de promesses). */
function makeUserCache() {
  const cache = new Map<string, Promise<any>>()
  return (id: string | undefined | null): Promise<any> => {
    if (!id) return Promise.resolve(null)
    let p = cache.get(id)
    if (!p) {
      p = getUserById(id).catch(() => null)
      cache.set(id, p)
    }
    return p
  }
}

/* ---------- Caisse Spéciale ---------- */

/** Statuts « contrat en cours » (candidats remise finale si tout est cotisé). */
const CS_RUNNING_STATUSES = ['ACTIVE', 'LATE_NO_PENALTY', 'LATE_WITH_PENALTY']
/** Statuts « remise déjà demandée » (retrait anticipé ou remboursement en attente). */
const CS_PENDING_STATUSES = ['EARLY_WITHDRAW_REQUESTED', 'EARLY_REFUND_PENDING', 'FINAL_REFUND_PENDING']

/** Date du dernier versement d'un contrat CS (paidAt du paiement ou de ses contribs). */
function lastPaidDateCS(payments: CaissePayment[]): Date | undefined {
  let last: Date | undefined
  for (const p of payments) {
    if (p.status === 'PAID') last = maxDate(last, toDate(p.paidAt))
    const contribs = (p as { contribs?: Array<{ paidAt?: unknown }> }).contribs
    if (Array.isArray(contribs)) {
      for (const c of contribs) last = maxDate(last, toDate(c.paidAt))
    }
  }
  return last
}

async function fetchUpcomingCS(today: Date): Promise<UpcomingPayout[]> {
  const contracts = (await getAllContracts({
    statuses: [...CS_RUNNING_STATUSES, ...CS_PENDING_STATUSES],
  })) as CaisseContract[]

  // Candidats : retrait/remboursement demandé, OU contrat entièrement cotisé.
  const candidates = contracts.filter(
    (c) =>
      CS_PENDING_STATUSES.includes(c.status) ||
      ((c.monthsPlanned || 0) > 0 && (c.currentMonthIndex || 0) >= c.monthsPlanned),
  )

  const getUser = makeUserCache()

  const results = await Promise.all(
    candidates.map(async (c): Promise<UpcomingPayout | null> => {
      try {
        const refunds = (await listRefunds(c.id || '')) as Array<{
          type?: string
          status?: string
          createdAt?: Date
          withdrawalDate?: Date
          withdrawalAmount?: number
          amountNominal?: number
          amountBonus?: number
        }>
        // Remise déjà effectuée → plus rien à remettre.
        if (refunds.some((r) => r.status === 'PAID')) return null

        const pending = refunds.find((r) => r.status === 'PENDING' || r.status === 'APPROVED')
        const isEarly =
          pending?.type === 'EARLY' ||
          c.status === 'EARLY_WITHDRAW_REQUESTED' ||
          c.status === 'EARLY_REFUND_PENDING'

        let referenceAt: Date | undefined
        if (isEarly) {
          // Retrait anticipé : les 30 jours courent depuis la demande.
          referenceAt = toDate(pending?.createdAt) ?? toDate(pending?.withdrawalDate) ?? toDate(c.updatedAt)
        } else {
          // Contrat entièrement cotisé : depuis le dernier versement.
          const payments = (await listPayments(c.id || '')) as CaissePayment[]
          referenceAt = lastPaidDateCS(payments) ?? toDate(pending?.createdAt)
        }
        if (!referenceAt) return null

        const dueAt = addDays(startOfDay(referenceAt), PAYOUT_DELAY_DAYS)
        const amount =
          (pending?.withdrawalAmount && pending.withdrawalAmount > 0
            ? pending.withdrawalAmount
            : undefined) ?? (c.nominalPaid || 0) + (c.bonusAccrued || 0)

        let name = '—'
        let phone: string | undefined
        let whatsappNumber: string | undefined
        let matricule: string | undefined
        let isGroup = false
        if (c.contractType === 'GROUP' && c.groupeId) {
          isGroup = true
          try {
            const group = await getGroupById(c.groupeId)
            if (group) name = group.name
          } catch { /* ignore */ }
        } else if (c.memberId) {
          const member = await getUser(c.memberId)
          if (member) {
            name = `${member.firstName || ''} ${member.lastName || ''}`.trim() || '—'
            phone = extractPhone(member.contacts)
            whatsappNumber = member.whatsappNumber || undefined
            matricule = member.matricule
          }
        }

        return {
          key: `cs-${c.id}`,
          product: 'Caisse Spéciale',
          kind: isEarly ? 'EARLY' : 'FINAL',
          contractId: c.id || '',
          matricule,
          name,
          isGroup,
          phone,
          whatsappNumber,
          typeLabel: CAISSE_TYPE_LABELS[c.caisseType] ?? c.caisseType ?? '—',
          amount,
          referenceAt,
          dueAt,
          daysUntil: differenceInCalendarDays(dueAt, today),
        }
      } catch (error) {
        console.error(`[payouts][CS] contrat ${c.id}:`, error)
        return null
      }
    }),
  )

  return results.filter(Boolean) as UpcomingPayout[]
}

/* ---------- Caisse Imprévue ---------- */

/** Date du dernier versement d'un contrat CI (les versements portent une date "YYYY-MM-DD"). */
function lastPaidDateCI(payments: PaymentCI[]): Date | undefined {
  let last: Date | undefined
  for (const p of payments) {
    for (const v of p.versements || []) {
      last = maxDate(last, toDate(v.date) ?? toDate(v.createdAt))
    }
    if ((p.status === 'PAID' || p.status === 'PARTIAL') && !p.versements?.length) {
      last = maxDate(last, toDate(p.updatedAt))
    }
  }
  return last
}

async function fetchUpcomingCI(today: Date): Promise<UpcomingPayout[]> {
  const service = ServiceFactory.getCaisseImprevueService()
  const contracts: ContractCI[] = await service.getContractsCIPaginated({ status: 'ACTIVE' })

  const getUser = makeUserCache()

  const results = await Promise.all(
    contracts.map(async (c): Promise<UpcomingPayout | null> => {
      try {
        const fullyPaid =
          (c.subscriptionCIDuration || 0) > 0 && (c.totalMonthsPaid || 0) >= c.subscriptionCIDuration

        // La sous-collection earlyRefunds contient les demandes EARLY et FINAL.
        const refunds = (await listRefundsCI(c.id)) as Array<{
          type?: string
          status?: string
          createdAt?: Date
          withdrawalDate?: Date
          withdrawalAmount?: number
        }>
        if (refunds.some((r) => r.status === 'PAID')) return null

        const pending = refunds.find((r) => r.status === 'PENDING' || r.status === 'APPROVED')
        if (!pending && !fullyPaid) return null

        const isEarly = pending ? pending.type !== 'FINAL' : false
        let referenceAt: Date | undefined
        if (isEarly) {
          referenceAt = toDate(pending?.createdAt) ?? toDate(pending?.withdrawalDate)
        } else {
          const payments: PaymentCI[] = await service.getPaymentsByContractId(c.id)
          referenceAt = lastPaidDateCI(payments) ?? toDate(pending?.createdAt)
        }
        if (!referenceAt) return null

        const dueAt = addDays(startOfDay(referenceAt), PAYOUT_DELAY_DAYS)
        const amount =
          (pending?.withdrawalAmount && pending.withdrawalAmount > 0
            ? pending.withdrawalAmount
            : undefined) ??
          (c.totalMonthsPaid || 0) * (c.subscriptionCIAmountPerMonth || 0)

        // Matricule / WhatsApp : pas sur le contrat CI → via le membre.
        let matricule: string | undefined
        let whatsappNumber: string | undefined
        try {
          const member = await getUser(c.memberId)
          matricule = member?.matricule
          whatsappNumber = member?.whatsappNumber || undefined
        } catch { /* ignore */ }

        return {
          key: `ci-${c.id}`,
          product: 'Caisse Imprévue',
          kind: isEarly ? 'EARLY' : 'FINAL',
          contractId: c.id,
          matricule,
          name: `${c.memberFirstName || ''} ${c.memberLastName || ''}`.trim() || '—',
          isGroup: false,
          phone: extractPhone(c.memberContacts),
          whatsappNumber,
          typeLabel: c.paymentFrequency === 'DAILY' ? 'Journalier' : 'Mensuel',
          amount,
          referenceAt,
          dueAt,
          daysUntil: differenceInCalendarDays(dueAt, today),
        }
      } catch (error) {
        console.error(`[payouts][CI] contrat ${c.id}:`, error)
        return null
      }
    }),
  )

  return results.filter(Boolean) as UpcomingPayout[]
}

/* ---------- Placement ---------- */

const PAYOUT_MODE_LABELS: Record<string, string> = {
  MonthlyCommission_CapitalEnd: 'Commissions mensuelles',
  CapitalPlusCommission_End: 'Capital + commissions',
}

async function fetchUpcomingPlacement(today: Date): Promise<UpcomingPayout[]> {
  const service = ServiceFactory.getPlacementService()
  const placements: Placement[] = await service.listPlacements()
  // Actifs (remise du capital à terme + 30 j) et retraits anticipés en cours.
  const candidates = placements.filter((p) => p.status === 'Active' || p.status === 'EarlyExit')

  const getUser = makeUserCache()

  const results = await Promise.all(
    candidates.map(async (p): Promise<UpcomingPayout | null> => {
      try {
        const isEarly = p.status === 'EarlyExit'
        let referenceAt: Date | undefined
        let amount = p.amount || 0

        if (isEarly) {
          // Retrait anticipé : 30 jours depuis la demande.
          const exit = await service.getEarlyExit(p.id)
          referenceAt = toDate(exit?.requestedAt) ?? toDate(p.updatedAt)
          amount = exit?.withdrawalAmount || exit?.payoutAmount || amount
        } else {
          // Placement à terme : 30 jours après la date de fin (connue d'avance).
          referenceAt =
            toDate(p.endDate) ??
            (toDate(p.startDate) ? addMonths(toDate(p.startDate) as Date, p.periodMonths || 0) : undefined)
          // Capital + commissions encore dues à la clôture.
          try {
            const commissions = await service.listCommissions(p.id)
            amount += commissions
              .filter((c) => c.status === 'Due' || c.status === 'Partial')
              .reduce((s, c) => s + (c.amount || 0), 0)
          } catch { /* capital seul si les commissions sont indisponibles */ }
        }
        if (!referenceAt) return null

        const dueAt = addDays(startOfDay(referenceAt), PAYOUT_DELAY_DAYS)

        // Matricule / WhatsApp du bienfaiteur via sa fiche membre.
        let matricule: string | undefined
        let whatsappNumber: string | undefined
        let name = p.benefactorName || '—'
        let phone = p.benefactorPhone || undefined
        try {
          const member = await getUser(p.benefactorId)
          if (member) {
            matricule = member.matricule
            whatsappNumber = member.whatsappNumber || undefined
            if (!p.benefactorName) {
              name = `${member.firstName || ''} ${member.lastName || ''}`.trim() || name
            }
            phone = phone ?? extractPhone(member.contacts)
          }
        } catch { /* ignore */ }

        return {
          key: `pl-${p.id}`,
          product: 'Placement',
          kind: isEarly ? 'EARLY' : 'FINAL',
          contractId: p.id,
          matricule,
          name,
          isGroup: false,
          phone,
          whatsappNumber,
          typeLabel: PAYOUT_MODE_LABELS[p.payoutMode] ?? p.payoutMode ?? '—',
          amount,
          referenceAt,
          dueAt,
          daysUntil: differenceInCalendarDays(dueAt, today),
        }
      } catch (error) {
        console.error(`[payouts][Placement] ${p.id}:`, error)
        return null
      }
    }),
  )

  return results.filter(Boolean) as UpcomingPayout[]
}

/* ---------- Hook ---------- */

export function useUpcomingPayouts() {
  return useQuery<UpcomingPayout[]>({
    queryKey: ['upcoming-payouts'],
    queryFn: async () => {
      const today = startOfDay(new Date())
      const [cs, ci, pl] = await Promise.all([
        fetchUpcomingCS(today),
        fetchUpcomingCI(today),
        fetchUpcomingPlacement(today),
      ])
      return [...cs, ...ci, ...pl].sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime())
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}
