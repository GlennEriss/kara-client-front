import { IRepository } from "../IRepository";
import { PaymentCI, VersementCI } from "@/types/types";

export interface IPaymentCIRepository extends IRepository {
    /**
     * Récupère un paiement par contractId et monthIndex
     */
    getPaymentByMonth(contractId: string, monthIndex: number): Promise<PaymentCI | null>;
    
    /**
     * Récupère tous les paiements d'un contrat
     */
    getPaymentsByContractId(contractId: string): Promise<PaymentCI[]>;
    
    /**
     * Crée un nouveau paiement (document mois)
     */
    createPayment(contractId: string, data: Omit<PaymentCI, 'id' | 'createdAt' | 'updatedAt'>): Promise<PaymentCI>;
    
    /**
     * Ajoute un versement à un paiement existant
     */
    addVersement(contractId: string, monthIndex: number, versement: VersementCI, userId: string): Promise<PaymentCI>;
    
    /**
     * Met à jour le statut et le montant accumulé d'un paiement
     */
    updatePaymentStatus(contractId: string, monthIndex: number, accumulatedAmount: number, status: 'DUE' | 'PAID' | 'PARTIAL', userId: string): Promise<PaymentCI | null>;
}

