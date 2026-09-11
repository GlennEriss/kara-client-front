import { ContractCI, PaymentCI } from '@/types/types'
import { addMonths, parseISO } from 'date-fns'

/**
 * Échéance de l'échéancier CI. `isVirtual` marque un mois qui n'a aucun
 * document en base : il est reconstruit à l'affichage et ne doit pas être
 * présenté comme un enregistrement réel (pas de date de modification, etc.).
 */
export type ScheduledPaymentCI = PaymentCI & { isVirtual?: boolean }

const toDateSafe = (value: unknown): Date | null => {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof (value as { toDate?: () => Date })?.toDate === 'function') {
    return (value as { toDate: () => Date }).toDate()
  }
  if (typeof value === 'string') {
    const parsedIso = parseISO(value)
    if (!Number.isNaN(parsedIso.getTime())) return parsedIso
  }
  const parsed = new Date(value as string | number)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

/**
 * Reconstruit l'échéancier complet d'un contrat CI.
 *
 * Contrairement à la Caisse Spéciale, la CI ne pré-génère pas les documents de
 * paiement à la création du contrat : `contractsCI/{id}/payments` ne contient
 * que les mois ayant reçu au moins un versement (cf. `createVersement`, étape 7,
 * et l'import Excel). Les mois jamais payés n'existent donc nulle part et
 * disparaissaient de la page, du PDF et de l'Excel — ce qui faussait aussi les
 * totaux « MOIS IMPAYE » et « MONTANT IMPAYE ».
 *
 * La source de vérité de l'échéancier est le contrat lui-même
 * (`firstPaymentDate` + `subscriptionCIDuration`), comme dans
 * `usePaymentsCIStats`. On la matérialise ici, sans aucune écriture en base :
 * les mois présents sont retournés tels quels, les mois manquants sont comblés
 * par une échéance `DUE` à 0 marquée `isVirtual`.
 */
export function buildPaymentsCISchedule(
  contract: ContractCI | null | undefined,
  payments: PaymentCI[]
): ScheduledPaymentCI[] {
  const existing = [...(payments || [])].sort((a, b) => (a.monthIndex ?? 0) - (b.monthIndex ?? 0))
  if (!contract) return existing

  const byIndex = new Map<number, PaymentCI>()
  existing.forEach((payment) => {
    const index = Number(payment.monthIndex)
    if (Number.isFinite(index) && !byIndex.has(index)) byIndex.set(index, payment)
  })

  // Un contrat dont la durée a été raccourcie après coup peut avoir des
  // paiements au-delà : on ne tronque jamais ce qui existe réellement.
  const duration = Number(contract.subscriptionCIDuration) || 0
  const highestIndex = existing.reduce((max, p) => Math.max(max, Number(p.monthIndex) || 0), -1)
  const monthCount = Math.max(duration, highestIndex + 1)
  if (monthCount <= 0) return existing

  const firstPaymentDate = toDateSafe(contract.firstPaymentDate)
  const targetAmount = Number(contract.subscriptionCIAmountPerMonth) || 0

  return Array.from({ length: monthCount }, (_, monthIndex): ScheduledPaymentCI => {
    const real = byIndex.get(monthIndex)
    if (real) return real

    // Aucun horodatage n'existe pour un mois sans document : on retombe sur la
    // date d'échéance, jamais affichée grâce à `isVirtual`.
    const dueDate = firstPaymentDate ? addMonths(firstPaymentDate, monthIndex) : new Date()

    return {
      id: `month-${monthIndex}`,
      contractId: contract.id,
      monthIndex,
      status: 'DUE',
      targetAmount,
      accumulatedAmount: 0,
      versements: [],
      createdAt: dueDate,
      updatedAt: dueDate,
      createdBy: '',
      updatedBy: '',
      isVirtual: true,
    }
  })
}
