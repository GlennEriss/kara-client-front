import { IService } from "../interfaces/IService";
import { SubscriptionCI, User, Admin, ContractCI, PaymentCI, PaymentMode, SupportCI, SupportRepaymentCI, EarlyRefundCI, FinalRefundCI, CaisseImprevueDemand, CaisseImprevueDemandFilters, CaisseImprevueDemandStats } from "@/types/types";
import { Document } from "@/domains/infrastructure/documents/entities/document.types";
import { ContractsCIFilters, ContractsCIStats } from "@/repositories/caisse-imprevu/IContractCIRepository";

export interface VersementFormData {
  date: string
  time: string
  amount: number
  mode: PaymentMode
  penalty?: number
  daysLate?: number
  agentRecouvrementId?: string
}

export interface ICaisseImprevueService extends IService{
    searchMembers(searchQuery: string): Promise<User[]>
    getAllSubscriptions(): Promise<SubscriptionCI[]>
    getActiveSubscriptions(): Promise<SubscriptionCI[]>
    getSubscriptionById(id: string): Promise<SubscriptionCI | null>
    createSubscription(data: Omit<SubscriptionCI, 'createdAt' | 'updatedAt'>): Promise<SubscriptionCI>
    updateSubscription(id: string, data: Partial<SubscriptionCI>): Promise<SubscriptionCI>
    deleteSubscription(id: string): Promise<void>
    createContractCI(data: Omit<ContractCI, 'createdAt' | 'updatedAt'>): Promise<ContractCI>
    getContractCIById(id: string): Promise<ContractCI | null>
    getContractsCIByMemberId(memberId: string): Promise<ContractCI[]>
    getAdminById(id: string): Promise<Admin | null>
    getContractsCIPaginated(filters?: ContractsCIFilters): Promise<ContractCI[]>
    getContractsCIStats(filters?: ContractsCIFilters): Promise<ContractsCIStats>
    uploadContractDocument(file: File, contractId: string, memberId: string, userId: string): Promise<{ documentId: string; contract: ContractCI }>
    uploadEmergencyContactImage(imageUrl: string, memberId: string, contractId: string): Promise<{ url: string; path: string }>
    getDocumentById(documentId: string): Promise<Document | null>
    
    // Méthodes de paiement
    getPaymentsByContractId(contractId: string): Promise<PaymentCI[]>
    createVersement(contractId: string, monthIndex: number, versementData: VersementFormData, proofFile: File, userId: string): Promise<PaymentCI>
    
    // Méthodes de gestion des supports
    requestSupport(contractId: string, amount: number, adminId: string, documentFile: File): Promise<SupportCI>
    getActiveSupport(contractId: string): Promise<SupportCI | null>
    getSupportHistory(contractId: string): Promise<SupportCI[]>
    calculateRepayment(contractId: string, paymentAmount: number): Promise<{ supportRepayment: number; remainingForMonth: number }>
    recordRepayment(contractId: string, supportId: string, monthIndex: number, repayment: Omit<SupportRepaymentCI, 'createdAt' | 'createdBy'>): Promise<void>
    checkEligibilityForSupport(contractId: string): Promise<boolean>
    
    // Méthodes de statistiques de paiement
    getContractPaymentStats(contractId: string): Promise<{ totalAmountPaid: number; paymentCount: number; supportCount: number }>
    
    // Méthodes de retrait anticipé
    requestEarlyRefundCI(
        contractId: string,
        data: {
            reason: string
            withdrawalDate: string
            withdrawalTime: string
            withdrawalAmount: number
            withdrawalMode: 'cash' | 'bank_transfer' | 'airtel_money' | 'mobicash'
            withdrawalProof: File
            documentPdf: File
            userId: string
        }
    ): Promise<EarlyRefundCI>

    // Méthodes de remboursement final
    requestFinalRefundCI(
        contractId: string,
        data: {
            reason: string
            withdrawalDate: string
            withdrawalTime: string
            withdrawalMode: 'cash' | 'bank_transfer' | 'airtel_money' | 'mobicash'
            withdrawalProof: File
            documentPdf: File
            userId: string
        }
    ): Promise<FinalRefundCI>
    
    // Méthodes de gestion des demandes
    createDemand(data: Omit<CaisseImprevueDemand, 'id' | 'createdAt' | 'updatedAt'>, adminId: string): Promise<CaisseImprevueDemand>
    getDemandById(id: string): Promise<CaisseImprevueDemand | null>
    getDemandsWithFilters(filters?: CaisseImprevueDemandFilters): Promise<CaisseImprevueDemand[]>
    getDemandsStats(filters?: CaisseImprevueDemandFilters): Promise<CaisseImprevueDemandStats>
    approveDemand(demandId: string, adminId: string, reason: string): Promise<CaisseImprevueDemand | null>
    rejectDemand(demandId: string, adminId: string, reason: string): Promise<CaisseImprevueDemand | null>
    reopenDemand(demandId: string, adminId: string, reason: string): Promise<CaisseImprevueDemand | null>
    convertDemandToContract(demandId: string, adminId: string, contractData?: Partial<ContractCI>): Promise<{ demand: CaisseImprevueDemand; contract: ContractCI } | null>
}