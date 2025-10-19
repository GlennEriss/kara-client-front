import { useMemo } from 'react'
import { PaymentCI, ContractCI } from '@/types/types'

export interface PaymentsCIStats {
  totalVerse: number
  totalDue: number
  totalPenalties: number
  nombreVersements: number
  tauxProgression: number
  moisPayes: number
  moisEnCours: number
}

/**
 * Hook pour calculer les statistiques des paiements d'un contrat CI
 */
export const usePaymentsCIStats = (contract: ContractCI | null, payments: PaymentCI[]): PaymentsCIStats => {
  return useMemo(() => {
    if (!contract || !payments.length) {
      return {
        totalVerse: 0,
        totalDue: 0,
        totalPenalties: 0,
        nombreVersements: 0,
        tauxProgression: 0,
        moisPayes: 0,
        moisEnCours: 0,
      }
    }

    const totalVerse = payments.reduce((sum, payment) => sum + payment.accumulatedAmount, 0)
    const totalTarget = contract.subscriptionCIAmountPerMonth * contract.subscriptionCIDuration
    const totalDue = Math.max(0, totalTarget - totalVerse)
    const totalPenalties = payments.reduce((sum, payment) => {
      return sum + (payment.versements?.reduce((vSum, v) => vSum + (v.penalty || 0), 0) || 0)
    }, 0)
    const nombreVersements = payments.reduce((sum, payment) => sum + (payment.versements?.length || 0), 0)
    const tauxProgression = totalTarget > 0 ? Math.min(100, (totalVerse / totalTarget) * 100) : 0
    const moisPayes = payments.filter(p => p.status === 'PAID').length
    const moisEnCours = payments.filter(p => p.status === 'PARTIAL').length

    return {
      totalVerse,
      totalDue,
      totalPenalties,
      nombreVersements,
      tauxProgression,
      moisPayes,
      moisEnCours,
    }
  }, [contract, payments])
}

