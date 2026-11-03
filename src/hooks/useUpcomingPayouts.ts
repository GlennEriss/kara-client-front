"use client"

import { mapWithConcurrency } from '@/utils/mapWithConcurrency'

/**
 * Hook : liste des REMISES D'ARGENT à venir (Caisse Spéciale + Caisse Imprévue + Placement).
 *
 * Règle métier : la remise finale est due exactement à la fin du contrat ou
 * du placement. Seul un retrait anticipé conserve un délai de 30 jours après
 * son approbation par l'administration.
 *
 * Un contrat sort de la liste dès que sa remise est marquée payée (refund PAID).
 * Un contrat arrêté après approbation reste donc visible jusqu'à la remise réelle.
 */

import { useQuery } from '@tanstack/react-query'
import { addDays, addMonths, differenceInCalendarDays, startOfDay } from 'date-fns'
import { getAllContracts } from '@/db/caisse/contracts.db'
import { resolveContractEndAt } from '@/services/caisse/contractDates'
import { listPayments } from '@/db/caisse/payments.db'
import { getActiveSettings } from '@/db/caisse/settings.db'
import { computeCaisseSpecialePayoutAmount, recordedCaisseSpecialeRefundAmount } from '@/services/caisse/payout'
import { listRefunds, listRefundsCI } from '@/db/caisse/refunds.db'
import { getUserById } from '@/db/user.db'
import { getGroupById } from '@/db/group.db'
import { ServiceFactory } from '@/factories/ServiceFactory'
import { getContractEndDate } from '@/utils/caisse-imprevue-utils'
import type { CaisseContract, CaissePayment, CaisseType } from '@/services/caisse/types'
import type { ContractCI, PaymentCI, Placement } from '@/types/types'

/** Délai appliqué exclusivement aux demandes de retrait anticipé. */
export const EARLY_PAYOUT_DELAY_DAYS = 30

/**
 * Horizon de prévision : un contrat entre dans la liste dès que sa fin est
 * atteinte ou prévue dans les N prochains mois.
 *
 * Auparavant, seuls les contrats *entièrement* cotisés apparaissaient. Un
 * membre ayant versé 8 mois sur 12 n'était visible nulle part alors que la
 * caisse lui devra son nominal à l'échéance : l'admin n'avait aucun moyen
 * d'anticiper la trésorerie à sortir.
 */
export const PAYOUT_HORIZON_MONTHS = 3

/** Horizons proposés dans le sélecteur de l'écran Calendrier. */
export const PAYOUT_HORIZON_OPTIONS = [1, 3, 6, 12] as const

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
  /** Fait générateur : fin du contrat/placement (FINAL) ou approbation du retrait (EARLY). */
  referenceAt: Date
  /** Date à laquelle l'argent doit être remis (fin du contrat ou approbation + 30 jours). */
  dueAt: Date
  /** Jours restants (négatif = remise en retard). */
  daysUntil: number
  /**
   * `true` quand le contrat n'est pas encore arrivé à son terme : le montant
   * est une projection, pas une somme déjà exigible. Permet à l'écran de ne pas
   * faire passer une prévision pour une dette.
   */
  isProjected?: boolean
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

/**
 * Une remise finale est exigible à son terme. Le délai de 30 jours ne concerne
 * que les demandes de retrait anticipé.
 */
export function getPayoutDueAt(referenceAt: Date, kind: PayoutKind): Date {
  const referenceDay = startOfDay(referenceAt)
  return kind === 'EARLY'
    ? addDays(referenceDay, EARLY_PAYOUT_DELAY_DAYS)
    : referenceDay
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
/** Anciens retraits approuvés dont le contrat avait déjà été clôturé. */
const CS_LEGACY_APPROVED_STATUSES = ['CLOSED']

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

async function fetchUpcomingCS(today: Date, horizonMonths: number): Promise<UpcomingPayout[]> {
  const contracts = (await getAllContracts({
    statuses: [...CS_RUNNING_STATUSES, ...CS_PENDING_STATUSES, ...CS_LEGACY_APPROVED_STATUSES],
  })) as CaisseContract[]

  // Candidats : retrait/remboursement demandé, contrat entièrement cotisé, OU
  // contrat dont la fin est atteinte / proche — à condition qu'au moins un
  // versement ait été fait, sinon il n'y a rien à restituer.
  const horizon = addMonths(today, horizonMonths)
  const candidates = contracts.filter((c) => {
    if (CS_PENDING_STATUSES.includes(c.status)) return true
    if (CS_LEGACY_APPROVED_STATUSES.includes(c.status)) return true
    if ((c.monthsPlanned || 0) > 0 && (c.currentMonthIndex || 0) >= c.monthsPlanned) return true

    const hasPaid = (c.nominalPaid || 0) > 0 || (c.currentMonthIndex || 0) > 0
    if (!hasPaid) return false

    const end = resolveContractEndAt(c)
    return Boolean(end && startOfDay(end) <= horizon)
  })

  const getUser = makeUserCache()
  const settingsCache = new Map<CaisseType, ReturnType<typeof getActiveSettings>>()
  const getSettings = (type: CaisseType) => {
    if (!settingsCache.has(type)) settingsCache.set(type, getActiveSettings(type))
    return settingsCache.get(type)!
  }

  const results = await mapWithConcurrency(candidates, 6, async (c): Promise<UpcomingPayout | null> => {
      try {
        const refunds = (await listRefunds(c.id || '')) as Array<{
          type?: string
          status?: string
          createdAt?: Date
          withdrawalDate?: Date
          withdrawalAmount?: number
          amountNominal?: number
          amountBonus?: number
          approvedAt?: Date
          payoutDueAt?: Date
        }>
        // Remise déjà effectuée → plus rien à remettre.
        if (refunds.some((r) => r.status === 'PAID')) return null

        const pending = refunds.find((r) => r.status === 'PENDING' || r.status === 'APPROVED')
        if (CS_LEGACY_APPROVED_STATUSES.includes(c.status) && !pending) return null
        const isEarly =
          pending?.type === 'EARLY' ||
          c.status === 'EARLY_WITHDRAW_REQUESTED' ||
          c.status === 'EARLY_REFUND_PENDING'

        // Le délai de remise ne commence qu'après l'approbation.
        if (isEarly && pending?.status !== 'APPROVED') return null

        // Le cumul bonusAccrued historique ne représente pas le bonus global.
        // Les anciens contrats sont recalculés sans devoir migrer leurs données.
        const recordedAmount = recordedCaisseSpecialeRefundAmount(pending)
        const [payments, settings] = await Promise.all([
          listPayments(c.id || '') as Promise<CaissePayment[]>,
          recordedAmount === null ? getSettings(c.caisseType) : Promise.resolve(null),
        ])
        if (recordedAmount === null && !settings) {
          throw new Error(`Barème actif introuvable pour la caisse ${c.caisseType}`)
        }

        let referenceAt: Date | undefined
        if (isEarly) {
          referenceAt = toDate(pending?.approvedAt)
        } else {
          // Remise finale : exigible à la fin du contrat, sans délai supplémentaire.
          const start = toDate(c.contractStartAt) ?? toDate(c.createdAt)
          referenceAt =
            toDate(c.contractEndAt) ??
            (start ? addMonths(start, c.monthsPlanned || 0) : undefined) ??
            lastPaidDateCS(payments)
        }
        if (!referenceAt) return null

        const dueAt = isEarly
          ? (toDate(pending?.payoutDueAt) ?? getPayoutDueAt(referenceAt, 'EARLY'))
          : getPayoutDueAt(referenceAt, 'FINAL')
        const amount = computeCaisseSpecialePayoutAmount(c, payments, settings as any, pending, today)
        // Contrat pas encore soldé et sans demande : le montant continuera de
        // croître avec les versements restants.
        const isProjected =
          !isEarly && !pending && (c.monthsPlanned || 0) > 0 && (c.currentMonthIndex || 0) < c.monthsPlanned

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
          isProjected,
        }
      } catch (error) {
        console.error(`[payouts][CS] contrat ${c.id}:`, error)
        // Une erreur de calcul ne doit pas supprimer silencieusement un
        // engagement de la synthèse ou afficher un nominal sans son bonus.
        throw error
      }
    })

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

async function fetchUpcomingCI(today: Date, horizonMonths: number): Promise<UpcomingPayout[]> {
  const service = ServiceFactory.getCaisseImprevueService()
  const [activeContracts, canceledContracts] = await Promise.all([
    service.getContractsCIPaginated({ status: 'ACTIVE' }),
    // Un contrat CI est résilié dès l'approbation afin d'empêcher tout nouveau
    // versement. Il reste toutefois à payer tant que son refund est APPROVED.
    service.getContractsCIPaginated({ status: 'CANCELED' }),
  ])
  const contracts: ContractCI[] = [...activeContracts, ...canceledContracts]

  const getUser = makeUserCache()

  const results = await mapWithConcurrency(contracts, 6, async (c): Promise<UpcomingPayout | null> => {
      try {
        const fullyPaid =
          (c.subscriptionCIDuration || 0) > 0 && (c.totalMonthsPaid || 0) >= c.subscriptionCIDuration

        // Fin atteinte ou proche, avec au moins un versement : la caisse devra
        // restituer, même si le contrat n'est pas allé au bout de ses mois.
        const contractEnd = getContractEndDate(c)
        const endingSoon =
          (c.totalMonthsPaid || 0) > 0 &&
          Boolean(contractEnd && startOfDay(contractEnd) <= addMonths(today, horizonMonths))

        // La sous-collection earlyRefunds contient les demandes EARLY et FINAL.
        const refunds = (await listRefundsCI(c.id)) as Array<{
          type?: string
          status?: string
          createdAt?: Date
          withdrawalDate?: Date
          withdrawalAmount?: number
          approvedAt?: Date
          payoutDueAt?: Date
        }>
        if (refunds.some((r) => r.status === 'PAID')) return null

        const pending = refunds.find((r) => r.status === 'PENDING' || r.status === 'APPROVED')
        if (c.status === 'CANCELED' && !pending) return null
        if (!pending && !fullyPaid && !endingSoon) return null

        const isEarly = pending ? pending.type !== 'FINAL' : false
        if (isEarly && pending?.status !== 'APPROVED') return null
        let referenceAt: Date | undefined
        if (isEarly) {
          referenceAt = toDate(pending?.approvedAt)
        } else {
          // Contrat entièrement cotisé : remise à la DATE DE FIN du contrat
          // (début + durée du forfait), pas après le dernier versement.
          // `getContractEndDate` tient compte des périodes de 30 jours en
          // journalier, là où « début + durée mois » dérivait de quelques jours.
          const start =
            toDate(c.firstPaymentDate) ?? toDate((c as { startDate?: unknown }).startDate) ?? toDate(c.createdAt)
          referenceAt =
            contractEnd ??
            (start ? addMonths(start, c.subscriptionCIDuration || 0) : undefined) ??
            lastPaidDateCI(await service.getPaymentsByContractId(c.id))
        }
        if (!referenceAt) return null

        const dueAt = isEarly
          ? (toDate(pending?.payoutDueAt) ?? getPayoutDueAt(referenceAt, 'EARLY'))
          : getPayoutDueAt(referenceAt, 'FINAL')
        const amount =
          (pending?.withdrawalAmount && pending.withdrawalAmount > 0
            ? pending.withdrawalAmount
            : undefined) ??
          (c.totalMonthsPaid || 0) * (c.subscriptionCIAmountPerMonth || 0)
        const isProjected = !isEarly && !pending && !fullyPaid

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
          isProjected,
        }
      } catch (error) {
        console.error(`[payouts][CI] contrat ${c.id}:`, error)
        return null
      }
    })

  return results.filter(Boolean) as UpcomingPayout[]
}

/* ---------- Placement ---------- */

const PAYOUT_MODE_LABELS: Record<string, string> = {
  MonthlyCommission_CapitalEnd: 'Commissions mensuelles',
  CapitalPlusCommission_End: 'Capital + commissions',
}

async function fetchUpcomingPlacement(today: Date): Promise<UpcomingPayout[]> {
  const service = ServiceFactory.getPlacementService()
  // Filtre serveur : seuls les placements actifs (remise à terme)
  // et les retraits anticipés en cours nous intéressent.
  const candidates: Placement[] = await service.listPlacements({ statuses: ['Active', 'EarlyExit'] })

  const getUser = makeUserCache()

  const results = await mapWithConcurrency(candidates, 6, async (p): Promise<UpcomingPayout | null> => {
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
          // Placement à terme : remise à la date de fin (connue d'avance).
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

        const dueAt = getPayoutDueAt(referenceAt, isEarly ? 'EARLY' : 'FINAL')

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
    })

  return results.filter(Boolean) as UpcomingPayout[]
}

/* ---------- Hook ---------- */

/**
 * @param horizonMonths profondeur de prévision : un contrat entre dans la liste
 *   si sa fin est atteinte ou prévue dans ce délai.
 */
export function useUpcomingPayouts(horizonMonths: number = PAYOUT_HORIZON_MONTHS) {
  return useQuery<UpcomingPayout[]>({
    // L'horizon fait partie de la clé : chaque profondeur a son propre cache.
    queryKey: ['upcoming-payouts', horizonMonths],
    queryFn: async () => {
      const today = startOfDay(new Date())
      const [cs, ci, pl] = await Promise.all([
        fetchUpcomingCS(today, horizonMonths),
        fetchUpcomingCI(today, horizonMonths),
        fetchUpcomingPlacement(today),
      ])
      return [...cs, ...ci, ...pl].sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime())
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}
