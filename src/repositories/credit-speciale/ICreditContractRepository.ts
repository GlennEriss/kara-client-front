import { CreditContract, CreditContractStatus, CreditType } from "@/types/types";
import { IRepository } from "../IRepository";

export interface CreditContractFilters {
    search?: string;
    status?: CreditContractStatus | 'all';
    creditType?: CreditType | 'all';
    clientId?: string;
    guarantorId?: string;
    overdueOnly?: boolean;
    dateFrom?: Date;
    dateTo?: Date;
    page?: number;
    limit?: number;
    orderByField?: string;
    orderByDirection?: 'asc' | 'desc';
}

export interface CreditContractStats {
    total: number;
    active: number;
    overdue: number;
    partial: number;
    transformed: number;
    blocked: number;
    discharged: number;
    closed: number;
    totalAmount: number;
    totalPaid: number;
    totalRemaining: number;
    totalPenalties: number;
    byType: {
        speciale: number;
        fixe: number;
        aide: number;
    };
}

export interface ICreditContractRepository extends IRepository {
    createContract(data: Omit<CreditContract, 'id' | 'createdAt' | 'updatedAt'>, customId?: string): Promise<CreditContract>;
    getContractById(id: string): Promise<CreditContract | null>;
    getAllContracts(): Promise<CreditContract[]>;
    getContractsWithFilters(filters?: CreditContractFilters): Promise<CreditContract[]>;
    getContractsStats(filters?: CreditContractFilters): Promise<CreditContractStats>;
    getContractsByClientId(clientId: string): Promise<CreditContract[]>;
    getContractsByGuarantorId(guarantorId: string): Promise<CreditContract[]>;
    getOverdueContracts(): Promise<CreditContract[]>;
    updateContract(id: string, data: Partial<Omit<CreditContract, 'id' | 'createdAt'>>): Promise<CreditContract | null>;
    deleteContract(id: string): Promise<void>;
}

