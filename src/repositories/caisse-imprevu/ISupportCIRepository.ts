import { SupportCI, SupportRepaymentCI } from '@/types/types'

/**
 * Interface pour le repository des supports de Caisse Imprévue
 */
export interface ISupportCIRepository {
  /**
   * Crée un nouveau support
   */
  createSupport(
    contractId: string,
    support: Omit<SupportCI, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<SupportCI>

  /**
   * Récupère un support par son ID
   */
  getSupportById(contractId: string, supportId: string): Promise<SupportCI | null>

  /**
   * Récupère le support actif d'un contrat
   */
  getActiveSupportByContractId(contractId: string): Promise<SupportCI | null>

  /**
   * Récupère l'historique complet des supports d'un contrat
   */
  getSupportHistory(contractId: string): Promise<SupportCI[]>

  /**
   * Ajoute un remboursement à un support
   */
  addRepayment(
    contractId: string,
    supportId: string,
    repayment: Omit<SupportRepaymentCI, 'createdAt'>
  ): Promise<void>

  /**
   * Met à jour le statut d'un support
   */
  updateSupportStatus(
    contractId: string,
    supportId: string,
    status: 'ACTIVE' | 'REPAID',
    repaidAt?: Date
  ): Promise<void>

  /**
   * Met à jour les montants remboursés d'un support
   */
  updateSupportAmounts(
    contractId: string,
    supportId: string,
    amountRepaid: number,
    amountRemaining: number
  ): Promise<void>
}

