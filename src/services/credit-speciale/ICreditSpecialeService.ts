import { CreditDemand, CreditContract, CreditPayment, CreditPenalty, CreditInstallment, GuarantorRemuneration, GuarantorPayment, CreditDemandStatus, CreditContractStatus, CreditType, CreditPaymentMode, PaymentMode, StandardSimulation, CustomSimulation, Notification, SignedQuittanceUploadData } from "@/types/types";
import { EmergencyContact } from "@/schemas/emergency-contact.schema";
import { CreditDemandFilters, CreditDemandStats } from "@/repositories/credit-speciale/ICreditDemandRepository";
import { CreditContractFilters, CreditContractStats } from "@/repositories/credit-speciale/ICreditContractRepository";
import { CreditPaymentFilters } from "@/repositories/credit-speciale/ICreditPaymentRepository";
import { GuarantorRemunerationFilters } from "@/repositories/credit-speciale/IGuarantorRemunerationRepository";

/** Champs modifiables d'une demande de crédit (uniquement pour statut PENDING). */
export type UpdateCreditDemandInput = Partial<Pick<
  CreditDemand,
  | 'creditType'
  | 'amount'
  | 'monthlyPaymentAmount'
  | 'desiredDate'
  | 'cause'
  | 'guarantorId'
  | 'guarantorFirstName'
  | 'guarantorLastName'
  | 'guarantorRelation'
  | 'guarantorIsMember'
>>;

export interface ICreditSpecialeService {
    // Demandes
    createDemand(data: Omit<CreditDemand, 'id' | 'createdAt' | 'updatedAt'>): Promise<CreditDemand>;
    getDemandById(id: string): Promise<CreditDemand | null>;
    getDemandsWithFilters(filters?: CreditDemandFilters): Promise<CreditDemand[]>;
    getDemandsStats(filters?: CreditDemandFilters): Promise<CreditDemandStats>;
    updateDemandStatus(id: string, status: CreditDemandStatus, adminId: string, comments?: string): Promise<CreditDemand | null>;
    /** Modifie les champs métier d'une demande (uniquement si status === PENDING). */
    updateDemandDetails(demandId: string, data: UpdateCreditDemandInput, adminId: string): Promise<CreditDemand | null>;
    /** Supprime une demande (uniquement si PENDING et sans contrat). */
    deleteDemand(demandId: string): Promise<void>;

    // Contrats
    createContractFromDemand(
        demandId: string, 
        adminId: string, 
        simulationData: {
            amount: number; // Montant du crédit (principal) issu de la simulation
            interestRate: number;
            monthlyPaymentAmount: number;
            duration: number;
            firstPaymentDate: Date;
            totalAmount: number;
            /** Échéancier personnalisé (simulation personnalisée uniquement) */
            customSchedule?: Array<{ month: number; amount: number }>;
            emergencyContact?: EmergencyContact;
            guarantorRemunerationPercentage?: number;
            disbursementPaymentMode?: PaymentMode;
            disbursementWithFees?: boolean;
            disbursementLocation?: string;
            disbursementDate?: Date;
            disbursementPaymentMethodOther?: string;
        }
    ): Promise<CreditContract>;
    getContractById(id: string): Promise<CreditContract | null>;
    getContractsWithFilters(filters?: CreditContractFilters): Promise<CreditContract[]>;
    getContractsStats(filters?: CreditContractFilters): Promise<CreditContractStats>;
    updateContractStatus(id: string, status: CreditContractStatus, adminId: string): Promise<CreditContract | null>;
    /** Enregistre un mois de repos (échéance reportée sans paiement ni pénalité). */
    recordRestMonth(creditId: string, monthNumber: number, reason: string, recordedBy: string, recordedByName: string): Promise<void>;
    deleteContract(id: string, adminId: string): Promise<void>;

    // Génération et upload de contrats PDF
    generateContractPDF(contractId: string, blank?: boolean, pdfFile?: File): Promise<{ url: string; path: string; documentId: string }>;
    uploadSignedContract(contractId: string, signedContractFile: File, adminId: string): Promise<CreditContract>;
    replaceSignedContract(contractId: string, file: File, adminId: string): Promise<CreditContract>;

    // Clôture de contrat (remboursement final, quittance, clôture)
    validateDischarge(contractId: string, motif: string, adminId: string): Promise<CreditContract>;
    generateQuittancePDF(contractId: string, pdfFile: File): Promise<{ url: string; documentId: string }>;
    uploadSignedQuittance(contractId: string, file: File, adminId: string, data: SignedQuittanceUploadData): Promise<CreditContract>;
    replaceSignedQuittance(contractId: string, file: File, adminId: string, adminDisplayName: string, data: SignedQuittanceUploadData, modificationMotif: string): Promise<CreditContract>;
    closeContract(contractId: string, data: { closedAt: Date; closedBy: string; motifCloture: string }): Promise<CreditContract>;
    
    // Simulations
    calculateStandardSimulation(amount: number, interestRate: number, monthlyPayment: number, firstPaymentDate: Date, creditType: CreditType): Promise<StandardSimulation>;
    calculateCustomSimulation(amount: number, interestRate: number, monthlyPayments: Array<{ month: number; amount: number }>, firstPaymentDate: Date, creditType: CreditType): Promise<CustomSimulation>;
    calculateProposedSimulation(totalAmount: number, duration: number, interestRate: number, firstPaymentDate: Date, creditType: CreditType): Promise<StandardSimulation>;
    
    // Échéances (Installments)
    getInstallmentsByCreditId(creditId: string): Promise<CreditInstallment[]>;
    
    // Paiements
    createPayment(data: Omit<CreditPayment, 'id' | 'createdAt' | 'updatedAt'>, proofFile?: File, penaltyIds?: string[], installmentNumber?: number): Promise<CreditPayment>;
    updatePayment(paymentId: string, data: { paymentDate?: Date; paymentTime?: string; amount?: number; mode?: CreditPaymentMode; comment?: string; note?: number; withFees?: boolean; agentRecouvrementId?: string }, proofFile: File | undefined, modificationReason: string, userId: string): Promise<CreditPayment>;
    getPaymentsByCreditId(creditId: string): Promise<CreditPayment[]>;
    getPaymentsWithFilters(filters?: CreditPaymentFilters): Promise<CreditPayment[]>;
    
    // Pénalités
    calculatePenalties(creditId: string, daysLate: number, monthlyPaymentAmount: number): Promise<number>;
    createPenalty(data: Omit<CreditPenalty, 'id' | 'createdAt' | 'updatedAt'>): Promise<CreditPenalty>;
    getPenaltiesByCreditId(creditId: string): Promise<CreditPenalty[]>;
    getUnpaidPenaltiesByCreditId(creditId: string): Promise<CreditPenalty[]>;
    checkAndCreateMissingPenalties(creditId: string): Promise<void>;
    payPenalty(
        penaltyId: string,
        data: {
            paymentDate: Date;
            paymentTime: string;
            amount: number;
            mode: CreditPaymentMode;
            withFees?: boolean;
            agentRecouvrementId?: string;
            comment?: string;
        },
        proofFile: File | undefined,
        adminId: string
    ): Promise<CreditPenalty>;
    updatePenaltyPayment(
        penaltyId: string,
        data: {
            paymentDate: Date;
            paymentTime: string;
            amount: number;
            mode: CreditPaymentMode;
            withFees?: boolean;
            agentRecouvrementId?: string;
            comment?: string;
        },
        proofFile: File | undefined,
        adminId: string
    ): Promise<CreditPenalty>;
    
    // Rémunération garant
    getRemunerationsByCreditId(creditId: string): Promise<GuarantorRemuneration[]>;
    getRemunerationsByGuarantorId(guarantorId: string): Promise<GuarantorRemuneration[]>;
    getRemunerationsWithFilters(filters?: GuarantorRemunerationFilters): Promise<GuarantorRemuneration[]>;

    // Paiement au garant (preuve du versement effectué par la mutuelle)
    recordGuarantorPayment(
        creditId: string,
        data: { paymentDate: Date; paymentTime: string; amount: number; mode: GuarantorPayment['mode']; reference?: string; comment?: string },
        proofFile: File | undefined,
        adminId: string
    ): Promise<GuarantorPayment>;
    getGuarantorPaymentsByCreditId(creditId: string): Promise<GuarantorPayment[]>;
    
    // Éligibilité
    checkEligibility(clientId: string, guarantorId?: string): Promise<{ eligible: boolean; reason?: string }>;
    
    // Historique
    getCreditHistory(contractId: string): Promise<{
        demand: CreditDemand | null;
        contract: CreditContract | null;
        payments: CreditPayment[];
        penalties: CreditPenalty[];
        notifications: Notification[];
    }>;
    
    // Augmentation de crédit
    checkExtensionEligibility(contractId: string): Promise<{
        eligible: boolean;
        reason?: string;
        currentContract?: CreditContract;
        paymentsCount: number;
        unpaidPenaltiesCount: number;
    }>;
    
    calculateExtensionAmounts(contractId: string): Promise<{
        originalAmount: number;
        interestRate: number;
        totalPaid: number;
        remainingDue: number; // Reste dû du contrat actuel
        suggestedMinMonthlyPayment?: number; // Mensualité suggérée pour 7 mois
    }>;
    
    /** Un seul rajout autorisé par contrat ; met à jour le même contrat (pas de nouveau contrat). */
    extendContract(
        contractId: string,
        additionalAmount: number,
        cause: string,
        simulationData: {
            interestRate: number;
            monthlyPaymentAmount: number;
            duration: number;
            firstPaymentDate: Date;
            totalAmount: number;
        },
        adminId: string,
        emergencyContact?: any,
        desiredDate?: string
    ): Promise<{ updatedContract: CreditContract }>;
    
    // Récupérer le contrat enfant (si extension)
    getChildContract(parentContractId: string): Promise<CreditContract | null>;
    
    // Récupérer le contrat parent (si extension)
    getParentContract(childContractId: string): Promise<CreditContract | null>;
}
