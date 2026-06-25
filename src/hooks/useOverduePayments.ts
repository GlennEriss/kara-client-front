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
import type { ContractCI, CreditContract, CreditInstallment, CreditType, PaymentCI } from '@/types/types'

export type OverdueProduct =
  | 'Caisse Spéciale'
  | 'Caisse Imprévue'
  | 'Crédit Spéciale'
  | 'Crédit Fixe'
  | 'Crédit Aide'

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

/* ---------- Caisse Spéciale ---------- */
async function fetchOverdueCaisseSpeciale(today: Date): Promise<OverduePayment[]> {
  const allContracts = await getAllContracts()
  const contracts = (allContracts as CaisseContract[]).filter(
    (c) =>
      c.status === 'ACTIVE' ||
      c.status === 'LATE_NO_PENALTY' ||
      c.status === 'LATE_WITH_PENALTY',
  )

  const items: OverduePayment[] = []

  for (const contract of contracts) {
    try {
      const payments = await listPayments(contract.id || '')
      const overdue = payments.filter((p: CaissePayment) => {
        if (p.status !== 'DUE' || !p.dueAt) return false
        const due = p.dueAt instanceof Date ? p.dueAt : new Date(p.dueAt)
        return startOfDay(due) < today
      })
      if (overdue.length === 0) continue

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
          const member = await getUserById(contract.memberId)
          if (member) {
            name = `${member.firstName || ''} ${member.lastName || ''}`.trim() || '—'
            phone = extractPhone(member.contacts)
            whatsappNumber = member.whatsappNumber || undefined
            matricule = member.matricule
          }
        } catch { /* ignore */ }
      }

      for (const p of overdue) {
        const due = p.dueAt instanceof Date ? p.dueAt : new Date(p.dueAt)
        items.push({
          key: `cs-${contract.id}-${p.id}`,
          product: 'Caisse Spéciale',
          matricule,
          name,
          isGroup,
          phone,
          whatsappNumber,
          typeLabel: CAISSE_TYPE_LABELS[contract.caisseType] || contract.caisseType,
          amount: p.amount,
          dueAt: due,
          daysOverdue: differenceInCalendarDays(today, startOfDay(due)),
        })
      }
    } catch (error) {
      console.error(`[overdue][CS] contrat ${contract.id}:`, error)
    }
  }

  return items
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

  const items: OverduePayment[] = []

  for (const contract of contracts) {
    try {
      const payments: PaymentCI[] = await service.getPaymentsByContractId(contract.id)

      const overdue = payments.filter((p) => {
        const isDue =
          p.status === 'DUE' ||
          (p.status === 'PARTIAL' && p.accumulatedAmount < p.targetAmount)
        if (!isDue) return false
        return startOfDay(ciDueDate(contract, p)) < today
      })
      if (overdue.length === 0) continue

      // Matricule : pas présent sur le contrat CI → récupéré via le membre
      let matricule: string | undefined
      let whatsappNumber: string | undefined
      try {
        const member = await getUserById(contract.memberId)
        matricule = member?.matricule
        whatsappNumber = member?.whatsappNumber || undefined
      } catch { /* ignore */ }

      const name = `${contract.memberFirstName || ''} ${contract.memberLastName || ''}`.trim() || '—'
      const phone = extractPhone(contract.memberContacts)
      const typeLabel = contract.paymentFrequency === 'DAILY' ? 'Journalier' : 'Mensuel'

      for (const p of overdue) {
        const due = ciDueDate(contract, p)
        const remaining = Math.max(0, p.targetAmount - (p.accumulatedAmount || 0))
        items.push({
          key: `ci-${contract.id}-${p.id ?? p.monthIndex}`,
          product: 'Caisse Imprévue',
          matricule,
          name,
          isGroup: false,
          phone,
          whatsappNumber,
          typeLabel,
          amount: remaining,
          dueAt: due,
          daysOverdue: differenceInCalendarDays(today, startOfDay(due)),
        })
      }
    } catch (error) {
      console.error(`[overdue][CI] contrat ${contract.id}:`, error)
    }
  }

  return items
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
  const allContracts: CreditContract[] = await service.getContractsWithFilters()
  const contracts = allContracts.filter(
    (c) =>
      c.creditType === creditType &&
      (c.status === 'ACTIVE' ||
        c.status === 'OVERDUE' ||
        c.status === 'PARTIAL' ||
        c.status === 'BLOCKED'),
  )

  const items: OverduePayment[] = []

  for (const contract of contracts) {
    try {
      const installments: CreditInstallment[] = await service.getInstallmentsByCreditId(contract.id)
      const overdue = installments.filter((inst) => {
        if (inst.status === 'PAID' || inst.status === 'PENDING') return false
        const due = inst.dueDate instanceof Date ? inst.dueDate : new Date(inst.dueDate)
        return startOfDay(due) < today
      })
      if (overdue.length === 0) continue

      // Matricule : member?.matricule sinon clientId (même logique que les factures crédit)
      let matricule: string | undefined = contract.clientId
      let whatsappNumber: string | undefined
      try {
        const member = await getUserById(contract.clientId)
        matricule = member?.matricule || contract.clientId
        whatsappNumber = member?.whatsappNumber || undefined
      } catch { /* ignore */ }

      const name = `${contract.clientFirstName || ''} ${contract.clientLastName || ''}`.trim() || '—'
      const phone = extractPhone(contract.clientContacts)

      for (const inst of overdue) {
        const due = inst.dueDate instanceof Date ? inst.dueDate : new Date(inst.dueDate)
        const remaining = Math.max(
          inst.remainingAmount ?? (inst.totalAmount - (inst.paidAmount || 0)),
          0,
        )
        items.push({
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
        })
      }
    } catch (error) {
      console.error(`[overdue][${product}] contrat ${contract.id}:`, error)
    }
  }

  return items
}

const ALL_PRODUCTS: OverdueProduct[] = [
  'Caisse Spéciale',
  'Caisse Imprévue',
  'Crédit Spéciale',
  'Crédit Fixe',
  'Crédit Aide',
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
      const results = await Promise.all(tasks)
      // Plus en retard d'abord
      return results.flat().sort((a, b) => b.daysOverdue - a.daysOverdue)
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
}
