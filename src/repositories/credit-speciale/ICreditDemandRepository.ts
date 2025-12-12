import { CreditDemand, CreditDemandStatus, CreditType } from "@/types/types";
import { IRepository } from "../IRepository";

export interface CreditDemandFilters {
    search?: string;
    status?: CreditDemandStatus | 'all';
    creditType?: CreditType | 'all';
    clientId?: string;
    guarantorId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    page?: number;
    limit?: number;
    orderByField?: string;
    orderByDirection?: 'asc' | 'desc';
}

export interface CreditDemandStats {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    byType: {
        speciale: number;
        fixe: number;
        aide: number;
    };
}

export interface ICreditDemandRepository extends IRepository {
    createDemand(data: Omit<CreditDemand, 'id' | 'createdAt' | 'updatedAt'>, customId?: string): Promise<CreditDemand>;
    getDemandById(id: string): Promise<CreditDemand | null>;
    getAllDemands(): Promise<CreditDemand[]>;
    getDemandsWithFilters(filters?: CreditDemandFilters): Promise<CreditDemand[]>;
    getDemandsStats(filters?: CreditDemandFilters): Promise<CreditDemandStats>;
    getDemandsByClientId(clientId: string): Promise<CreditDemand[]>;
    getDemandsByGuarantorId(guarantorId: string): Promise<CreditDemand[]>;
    updateDemand(id: string, data: Partial<Omit<CreditDemand, 'id' | 'createdAt'>>): Promise<CreditDemand | null>;
    deleteDemand(id: string): Promise<void>;
}

