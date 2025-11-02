import { IRepository } from "../IRepository";
import { EarlyRefundCI } from "@/types/types";

export interface IEarlyRefundCIRepository extends IRepository {
    /**
     * Crée une nouvelle demande de retrait anticipé CI
     */
    createEarlyRefund(
        contractId: string,
        data: Omit<EarlyRefundCI, 'id' | 'createdAt' | 'updatedAt'>
    ): Promise<EarlyRefundCI>;

    /**
     * Récupère une demande de retrait anticipé par ID
     */
    getEarlyRefundById(
        contractId: string,
        refundId: string
    ): Promise<EarlyRefundCI | null>;

    /**
     * Récupère toutes les demandes de retrait anticipé d'un contrat
     */
    getEarlyRefundsByContractId(
        contractId: string
    ): Promise<EarlyRefundCI[]>;

    /**
     * Met à jour une demande de retrait anticipé
     */
    updateEarlyRefund(
        contractId: string,
        refundId: string,
        updates: Partial<Omit<EarlyRefundCI, 'id' | 'createdAt' | 'updatedAt'>>
    ): Promise<EarlyRefundCI | null>;

    /**
     * Supprime une demande de retrait anticipé (soft delete via statut ARCHIVED)
     */
    deleteEarlyRefund(
        contractId: string,
        refundId: string
    ): Promise<void>;
}

