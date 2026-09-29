import type { CreditContract, CreditPayment, GuarantorPayment, GuarantorRemuneration } from '@/types/types'
import { customRound } from './credit-speciale-calculations'
import {
  buildCreditSpecialeTimelineHistory,
  getCreditPaymentCycleNumber,
} from './credit-speciale-history'

/**
 * Commission du garant (Crédit Spéciale).
 *
 * Chaque mois de la partie spéciale d'un cycle, le garant membre perçoit
 * `taux × capital restant au début du mois`. Un rajout ouvre un nouveau cycle
 * qui repart à M1 : le garant regagne alors des commissions sur le nouveau
 * capital. Une commission est donc identifiée par le couple (cycle, mois).
 */

type CycleContract = Parameters<typeof getCreditPaymentCycleNumber>[0]

/** Identifiant Firestore déterministe : garantit une seule commission par mois et par cycle. */
export function buildGuarantorRemunerationDocId(creditId: string, cycleNumber: number, month: number): string {
  return `${creditId}_C${cycleNumber}_M${month}`
}

/**
 * Cycle d'une commission. Les documents antérieurs au stockage du cycle le
 * retrouvent via l'identifiant du paiement déclencheur (`C2_M1_…` ou `M1_…`).
 */
export function getGuarantorRemunerationCycleNumber(
  contract: CycleContract,
  remuneration: Pick<GuarantorRemuneration, 'cycleNumber' | 'paymentId' | 'createdAt'>
): number {
  if (remuneration.cycleNumber) return remuneration.cycleNumber
  return getCreditPaymentCycleNumber(contract, {
    id: remuneration.paymentId,
    paymentDate: remuneration.createdAt,
  })
}

const remunerationKey = (cycleNumber: number, month: number) => `C${cycleNumber}_M${month}`

/**
 * Une seule commission par (cycle, mois) : la plus ancienne. Les doublons
 * viennent de l'ancien fonctionnement, qui créait une commission à chaque
 * paiement, y compris partiel ou à 0 FCFA.
 */
export function dedupeGuarantorRemunerations(
  contract: CycleContract,
  remunerations: GuarantorRemuneration[]
): { kept: Array<GuarantorRemuneration & { cycleNumber: number }>; duplicates: GuarantorRemuneration[] } {
  const ordered = [...remunerations].sort(
    (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
  )
  const keptByKey = new Map<string, GuarantorRemuneration & { cycleNumber: number }>()
  const duplicates: GuarantorRemuneration[] = []

  for (const remuneration of ordered) {
    const cycleNumber = getGuarantorRemunerationCycleNumber(contract, remuneration)
    const key = remunerationKey(cycleNumber, remuneration.month)
    if (keptByKey.has(key)) {
      duplicates.push(remuneration)
    } else {
      keptByKey.set(key, { ...remuneration, cycleNumber })
    }
  }

  return { kept: [...keptByKey.values()], duplicates }
}

export interface GuarantorCommissionRow {
  id: string
  cycleNumber: number
  month: number
  /** Libellé autonome pour les exports : « M3 · mars 2026 », préfixé du rajout au-delà du cycle initial. */
  monthLabel: string
  /** Date d'échéance du mois : après un rajout, les mois repartent à M1, la date lève l'ambiguïté. */
  dueDate?: Date
  /** Capital restant dû au début du mois, avant les intérêts du mois : l'assiette de la commission. */
  capitalAtStartOfMonth: number
  commissionPercentage: number
  /** Montant enregistré au paiement, celui notifié au garant. */
  commissionAmount: number
}

/** « mai 2026 » : le mois calendaire de l'échéance. */
export function formatGuarantorCommissionMonth(date: Date): string {
  return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

export function getGuarantorCycleTitle(cycleNumber: number): string {
  return cycleNumber === 1 ? 'Cycle initial' : `Après rajout n°${cycleNumber - 1}`
}

export function buildGuarantorCommissionRows(
  contract: Parameters<typeof buildCreditSpecialeTimelineHistory>[0] & Pick<CreditContract, 'guarantorRemunerationPercentage'>,
  remunerations: GuarantorRemuneration[],
  payments: CreditPayment[]
): GuarantorCommissionRow[] {
  const percentage = contract.guarantorRemunerationPercentage ?? 0
  const historyByKey = new Map(
    buildCreditSpecialeTimelineHistory(contract, payments).map((row) => [
      remunerationKey(row.cycleNumber, row.month),
      row,
    ])
  )

  return dedupeGuarantorRemunerations(contract, remunerations)
    .kept.sort((left, right) => left.cycleNumber - right.cycleNumber || left.month - right.month)
    .map((remuneration) => {
      const history = historyByKey.get(remunerationKey(remuneration.cycleNumber, remuneration.month))
      const monthWithDate = history
        ? `M${remuneration.month} · ${formatGuarantorCommissionMonth(history.date)}`
        : `M${remuneration.month}`
      return {
        id: remuneration.id,
        cycleNumber: remuneration.cycleNumber,
        month: remuneration.month,
        monthLabel: remuneration.cycleNumber > 1
          ? `Après rajout ${remuneration.cycleNumber - 1} · ${monthWithDate}`
          : monthWithDate,
        dueDate: history?.date,
        capitalAtStartOfMonth:
          history?.capitalStart ??
          (percentage > 0 ? customRound((remuneration.amount * 100) / percentage) : 0),
        commissionPercentage: percentage,
        commissionAmount: remuneration.amount,
      }
    })
}

export interface GuarantorCommissionBalance {
  totalEarned: number
  totalPaid: number
  /** Jamais négatif : un trop-versé n'est pas une dette du garant envers l'association. */
  remaining: number
}

export function buildGuarantorCommissionBalance(
  rows: Pick<GuarantorCommissionRow, 'commissionAmount'>[],
  guarantorPayments: Pick<GuarantorPayment, 'amount'>[]
): GuarantorCommissionBalance {
  const totalEarned = rows.reduce((sum, row) => sum + row.commissionAmount, 0)
  const totalPaid = guarantorPayments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0)
  return { totalEarned, totalPaid, remaining: Math.max(0, totalEarned - totalPaid) }
}
