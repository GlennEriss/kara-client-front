"use client"

/**
 * Hook : liste de TOUS les versements en retard (statut dû avec échéance passée),
 * toutes périodes confondues, pour la Caisse Spéciale ET la Caisse Imprévue.
 *
 * Sert au suivi des retards / envoi de rappels.
 */

import { useQuery } from '@tanstack/react-query'
import { addDays, addMonths, differenceInCalendarDays, startOfDay } from 'date-fns'
import { getAllContracts } from '@/db/caisse/contracts.db'
import { listPayments } from '@/db/caisse/payments.db'
import { getUserById } from '@/db/user.db'
import { getGroupById } from '@/db/group.db'
import { ServiceFactory } from '@/factories/ServiceFactory'
import type { CaisseContract, CaissePayment, CaisseType } from '@/services/caisse/types'
import type { ContractCI, CreditContract, CreditInstallment, CreditType, PaymentCI, Placement } from '@/types/types'

export type OverdueProduct =
  | 'Caisse Spéciale'
  | 'Caisse Imprévue'
  | 'Crédit Spéciale'
  | 'Crédit Fixe'
  | 'Crédit Aide'
  | 'Placement'

export interface OverduePayment {
  key: string
  product: OverdueProduct
  matricule?: string
  name: string
  isGroup: boolean
  phone?: string
  /** Numéro WhatsApp saisi (facultatif). Si absent, on retombe sur `phone`. */
  whatsappNumber?: string
  typeLabel: string
  amount: number
  dueAt: Date
  daysOverdue: number
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

/**
 * Fabrique un lecteur de membre mémoïsé : le même membre n'est lu qu'une fois
 * par exécution (dédup des appels concurrents via mise en cache de la promesse).
 */
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
const OVERDUE_CS_STATUSES = ['ACTIVE', 'LATE_NO_PENALTY', 'LATE_WITH_PENALTY']

async function fetchOverdueCaisseSpeciale(today: Date): Promise<OverduePayment[]> {
  // Filtre serveur : on ne charge que les contrats actifs/en retard (au lieu de toute la collection).
  const contracts = (await getAllContracts({ statuses: OVERDUE_CS_STATUSES })) as CaisseContract[]

  const getUser = makeUserCache()

  const perContract = await Promise.all(
    contracts.map(async (contract): Promise<OverduePayment[]> => {
      try {
        const payments = await listPayments(contract.id || '')
        const overdue = payments.filter((p: CaissePayment) => {
          if (p.status !== 'DUE' || !p.dueAt) return false
          const due = p.dueAt instanceof Date ? p.dueAt : new Date(p.dueAt)
          return startOfDay(due) < today
        })
        if (overdue.length === 0) return []

        let name = '—'
        let phone: string | undefined
        let whatsappNumber: string | undefined
        let matricule: string | undefined
        let isGroup = false

        if (contract.contractType === 'GROUP' && contract.groupeId) {
          isGroup = true
          try {
            const group = await getGroupById(contract.groupeId)
            if (group) name = group.name
          } catch { /* ignore */ }
        } else if (contract.memberId) {
          try {
            const member = await getUser(contract.memberId)
            if (member) {
              name = `${member.firstName || ''} ${member.lastName || ''}`.trim() || '—'
              phone = extractPhone(member.contacts)
              whatsappNumber = member.whatsappNumber || undefined
              matricule = member.matricule
            }
          } catch { /* ignore */ }
        }

        return overdue.map((p: CaissePayment) => {
          const due = p.dueAt instanceof Date ? p.dueAt : new Date(p.dueAt)
          return {
            key: `cs-${contract.id}-${p.id}`,
            product: 'Caisse Spéciale' as const,
            matricule,
            name,
            isGroup,
            phone,
            whatsappNumber,
            typeLabel: CAISSE_TYPE_LABELS[contract.caisseType] || contract.caisseType,
            amount: p.amount,
            dueAt: due,
            daysOverdue: differenceInCalendarDays(today, startOfDay(due)),
          }
        })
      } catch (error) {
        console.error(`[overdue][CS] contrat ${contract.id}:`, error)
        return []
      }
    }),
  )

  return perContract.flat()
}

/* ---------- Caisse Imprévue ---------- */
function ciDueDate(contract: ContractCI, payment: PaymentCI): Date {
  const first = new Date(contract.firstPaymentDate)
  return contract.paymentFrequency === 'DAILY'
    ? addDays(first, payment.monthIndex)
    : addMonths(first, payment.monthIndex)
}

async function fetchOverdueCaisseImprevue(today: Date): Promise<OverduePayment[]> {
  const service = ServiceFactory.getCaisseImprevueService()
  const contracts: ContractCI[] = await service.getContractsCIPaginated({ status: 'ACTIVE' })

  const getUser = makeUserCache()

  const perContract = await Promise.all(
    contracts.map(async (contract): Promise<OverduePayment[]> => {
      try {
        const duration = contract.subscriptionCIDuration || 0
        const amountPerMonth = contract.subscriptionCIAmountPerMonth || 0
        if (duration <= 0 || !contract.firstPaymentDate) return []

        // Les contrats CI ne pré-créent PAS les échéances : un mois sans document
        // = mois « DUE ». On reconstitue donc l'échéancier 0..durée (comme la fiche
        // contrat) au lieu de n'itérer que les documents existants — sinon un
        // contrat jamais payé (0 document) n'apparaissait jamais en retard.
        const payments: PaymentCI[] = await service.getPaymentsByContractId(contract.id)
        const byIndex = new Map<number, PaymentCI>()
        for (const p of payments) byIndex.set(p.monthIndex, p)

        const overdueMonths: { monthIndex: number; due: Date; remaining: number }[] = []
        for (let mi = 0; mi < duration; mi++) {
          const p = byIndex.get(mi)
          const target = p?.targetAmount ?? amountPerMonth
          const accumulated = p?.accumulatedAmount ?? 0
          const isPaid = p?.status === 'PAID' || (p?.status === 'PARTIAL' && accumulated >= target)
          if (isPaid) continue
          const due = ciDueDate(contract, { monthIndex: mi } as PaymentCI)
          if (startOfDay(due) >= today) continue // échéance encore à venir
          overdueMonths.push({ monthIndex: mi, due, remaining: Math.max(0, target - accumulated) })
        }
        if (overdueMonths.length === 0) return []

        // Matricule : pas présent sur le contrat CI → récupéré via le membre
        let matricule: string | undefined
        let whatsappNumber: string | undefined
        try {
          const member = await getUser(contract.memberId)
          matricule = member?.matricule
          whatsappNumber = member?.whatsappNumber || undefined
        } catch { /* ignore */ }

        const name = `${contract.memberFirstName || ''} ${contract.memberLastName || ''}`.trim() || '—'
        const phone = extractPhone(contract.memberContacts)
        const typeLabel = contract.paymentFrequency === 'DAILY' ? 'Journalier' : 'Mensuel'

        return overdueMonths.map(({ monthIndex, due, remaining }) => ({
          key: `ci-${contract.id}-${monthIndex}`,
          product: 'Caisse Imprévue' as const,
          matricule,
          name,
          isGroup: false,
          phone,
          whatsappNumber,
          typeLabel,
          amount: remaining,
          dueAt: due,
          daysOverdue: differenceInCalendarDays(today, startOfDay(due)),
        }))
      } catch (error) {
        console.error(`[overdue][CI] contrat ${contract.id}:`, error)
        return []
      }
    }),
  )

  return perContract.flat()
}

/* ---------- Crédit (Spéciale / Fixe / Aide) ---------- */
const CREDIT_PRODUCT_TO_TYPE: Record<string, CreditType> = {
  'Crédit Spéciale': 'SPECIALE',
  'Crédit Fixe': 'FIXE',
  'Crédit Aide': 'AIDE',
}

async function fetchOverdueCredit(product: OverdueProduct, today: Date): Promise<OverduePayment[]> {
  const creditType = CREDIT_PRODUCT_TO_TYPE[product]
  if (!creditType) return []

  const service = ServiceFactory.getCreditSpecialeService()
  // Filtre serveur sur le type de crédit (index (creditType, createdAt) présent) ;
  // le statut multi-valeurs reste filtré côté client.
  const typeContracts: CreditContract[] = await service.getContractsWithFilters({ creditType })
  const contracts = typeContracts.filter(
    (c) =>
      c.status === 'ACTIVE' ||
      c.status === 'OVERDUE' ||
      c.status === 'PARTIAL' ||
      c.status === 'BLOCKED',
  )

  const getUser = makeUserCache()

  const perContract = await Promise.all(
    contracts.map(async (contract): Promise<OverduePayment[]> => {
      try {
        const installments: CreditInstallment[] = await service.getInstallmentsByCreditId(contract.id)
        const overdue = installments.filter((inst) => {
          if (inst.status === 'PAID' || inst.status === 'PENDING') return false
          const due = inst.dueDate instanceof Date ? inst.dueDate : new Date(inst.dueDate)
          return startOfDay(due) < today
        })
        if (overdue.length === 0) return []

        // Matricule : member?.matricule sinon clientId (même logique que les factures crédit)
        let matricule: string | undefined = contract.clientId
        let whatsappNumber: string | undefined
        try {
          const member = await getUser(contract.clientId)
          matricule = member?.matricule || contract.clientId
          whatsappNumber = member?.whatsappNumber || undefined
        } catch { /* ignore */ }

        const name = `${contract.clientFirstName || ''} ${contract.clientLastName || ''}`.trim() || '—'
        const phone = extractPhone(contract.clientContacts)

        return overdue.map((inst) => {
          const due = inst.dueDate instanceof Date ? inst.dueDate : new Date(inst.dueDate)
          const remaining = Math.max(
            inst.remainingAmount ?? (inst.totalAmount - (inst.paidAmount || 0)),
            0,
          )
          return {
            key: `credit-${contract.id}-${inst.dueDate}`,
            product,
            matricule,
            name,
            isGroup: false,
            phone,
            whatsappNumber,
            typeLabel: 'Mensualité',
            amount: remaining,
            dueAt: due,
            daysOverdue: differenceInCalendarDays(today, startOfDay(due)),
          }
        })
      } catch (error) {
        console.error(`[overdue][${product}] contrat ${contract.id}:`, error)
        return []
      }
    }),
  )

  return perContract.flat()
}

/* ---------- Placement (commissions dues aux bienfaiteurs) ---------- */

async function fetchOverduePlacement(today: Date): Promise<OverduePayment[]> {
  const service = ServiceFactory.getPlacementService()
  const placements: Placement[] = await service.listPlacements({ statuses: ['Active'] })

  const getUser = makeUserCache()

  const perPlacement = await Promise.all(
    placements.map(async (pl): Promise<OverduePayment[]> => {
      try {
        const commissions = await service.listCommissions(pl.id)
        const overdue = commissions.filter((c) => {
          if (c.status !== 'Due' && c.status !== 'Partial') return false
          const due = c.dueDate instanceof Date ? c.dueDate : new Date(c.dueDate)
          return startOfDay(due) < today
        })
        if (overdue.length === 0) return []

        let matricule: string | undefined
        let whatsappNumber: string | undefined
        let name = pl.benefactorName || '—'
        let phone: string | undefined = pl.benefactorPhone || undefined
        try {
          const member = await getUser(pl.benefactorId)
          if (member) {
            matricule = member.matricule
            whatsappNumber = member.whatsappNumber || undefined
            if (!pl.benefactorName) name = `${member.firstName || ''} ${member.lastName || ''}`.trim() || name
            phone = phone ?? extractPhone(member.contacts)
          }
        } catch { /* ignore */ }

        return overdue.map((c) => {
          const due = c.dueDate instanceof Date ? c.dueDate : new Date(c.dueDate)
          return {
            key: `pl-${pl.id}-${c.id}`,
            product: 'Placement' as const,
            matricule,
            name,
            isGroup: false,
            phone,
            whatsappNumber,
            typeLabel: 'Commission',
            amount: c.amount || 0,
            dueAt: due,
            daysOverdue: differenceInCalendarDays(today, startOfDay(due)),
          }
        })
      } catch (error) {
        console.error(`[overdue][Placement] ${pl.id}:`, error)
        return []
      }
    }),
  )

  return perPlacement.flat()
}

const ALL_PRODUCTS: OverdueProduct[] = [
  'Caisse Spéciale',
  'Caisse Imprévue',
  'Crédit Spéciale',
  'Crédit Fixe',
  'Crédit Aide',
  'Placement',
]

/**
 * Versements en retard, filtrés par produit.
 * @param products produits à inclure (par défaut : tous)
 */
export function useOverduePayments(products: OverdueProduct[] = ALL_PRODUCTS) {
  const key = [...products].sort().join(',')
  return useQuery<OverduePayment[]>({
    queryKey: ['overdue-payments', key],
    queryFn: async () => {
      const today = startOfDay(new Date())
      const tasks: Promise<OverduePayment[]>[] = []
      if (products.includes('Caisse Spéciale')) tasks.push(fetchOverdueCaisseSpeciale(today))
      if (products.includes('Caisse Imprévue')) tasks.push(fetchOverdueCaisseImprevue(today))
      for (const credit of ['Crédit Spéciale', 'Crédit Fixe', 'Crédit Aide'] as OverdueProduct[]) {
        if (products.includes(credit)) tasks.push(fetchOverdueCredit(credit, today))
      }
      if (products.includes('Placement')) tasks.push(fetchOverduePlacement(today))
      const results = await Promise.all(tasks)
      // Plus en retard d'abord
      return results.flat().sort((a, b) => b.daysOverdue - a.daysOverdue)
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
}
