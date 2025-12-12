import { CreditDemand, CreditContract, CreditPayment, CreditPenalty, GuarantorRemuneration, CreditDemandStatus, CreditContractStatus, CreditType, StandardSimulation, CustomSimulation } from "@/types/types";
import { CreditDemandFilters, CreditDemandStats } from "@/repositories/credit-speciale/ICreditDemandRepository";
import { CreditContractFilters, CreditContractStats } from "@/repositories/credit-speciale/ICreditContractRepository";
import { CreditPaymentFilters } from "@/repositories/credit-speciale/ICreditPaymentRepository";
import { CreditPenaltyFilters } from "@/repositories/credit-speciale/ICreditPenaltyRepository";
import { GuarantorRemunerationFilters } from "@/repositories/credit-speciale/IGuarantorRemunerationRepository";

export interface ICreditSpecialeService {
    // Demandes
    createDemand(data: Omit<CreditDemand, 'id' | 'createdAt' | 'updatedAt'>): Promise<CreditDemand>;
    getDemandById(id: string): Promise<CreditDemand | null>;
    getDemandsWithFilters(filters?: CreditDemandFilters): Promise<CreditDemand[]>;
    getDemandsStats(filters?: CreditDemandFilters): Promise<CreditDemandStats>;
    updateDemandStatus(id: string, status: CreditDemandStatus, adminId: string, comments?: string): Promise<CreditDemand | null>;
    
    // Contrats
    createContractFromDemand(
        demandId: string, 
        adminId: string, 
        simulationData: {
            interestRate: number;
            monthlyPaymentAmount: number;
            duration: number;
            firstPaymentDate: Date;
            totalAmount: number;
        }
    ): Promise<CreditContract>;
    getContractById(id: string): Promise<CreditContract | null>;
    getContractsWithFilters(filters?: CreditContractFilters): Promise<CreditContract[]>;
    getContractsStats(filters?: CreditContractFilters): Promise<CreditContractStats>;
    updateContractStatus(id: string, status: CreditContractStatus, adminId: string): Promise<CreditContract | null>;
    
    // Génération et upload de contrats PDF
    generateContractPDF(contractId: string, blank?: boolean): Promise<{ url: string; path: string; documentId: string }>;
    uploadSignedContract(contractId: string, signedContractFile: File, adminId: string): Promise<CreditContract>;
    
    // Simulations
    calculateStandardSimulation(amount: number, interestRate: number, monthlyPayment: number, firstPaymentDate: Date, creditType: CreditType): Promise<StandardSimulation>;
    calculateCustomSimulation(amount: number, interestRate: number, monthlyPayments: Array<{ month: number; amount: number }>, firstPaymentDate: Date, creditType: CreditType): Promise<CustomSimulation>;
    calculateProposedSimulation(totalAmount: number, duration: number, interestRate: number, firstPaymentDate: Date, creditType: CreditType): Promise<StandardSimulation>;
    
    // Paiements
    createPayment(data: Omit<CreditPayment, 'id' | 'createdAt' | 'updatedAt'>, proofFile?: File, penaltyIds?: string[]): Promise<CreditPayment>;
    getPaymentsByCreditId(creditId: string): Promise<CreditPayment[]>;
    getPaymentsWithFilters(filters?: CreditPaymentFilters): Promise<CreditPayment[]>;
    
    // Pénalités
    calculatePenalties(creditId: string, daysLate: number, monthlyPaymentAmount: number): Promise<number>;
    createPenalty(data: Omit<CreditPenalty, 'id' | 'createdAt' | 'updatedAt'>): Promise<CreditPenalty>;
    getPenaltiesByCreditId(creditId: string): Promise<CreditPenalty[]>;
    getUnpaidPenaltiesByCreditId(creditId: string): Promise<CreditPenalty[]>;
    
    // Rémunération garant
    getRemunerationsByCreditId(creditId: string): Promise<GuarantorRemuneration[]>;
    getRemunerationsByGuarantorId(guarantorId: string): Promise<GuarantorRemuneration[]>;
    getRemunerationsWithFilters(filters?: GuarantorRemunerationFilters): Promise<GuarantorRemuneration[]>;
    
    // Éligibilité
    checkEligibility(clientId: string, guarantorId?: string): Promise<{ eligible: boolean; reason?: string }>;
}

