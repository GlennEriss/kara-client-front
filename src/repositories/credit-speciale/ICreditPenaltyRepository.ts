import { CreditPenalty } from "@/types/types";
import { IRepository } from "../IRepository";

export interface CreditPenaltyFilters {
    creditId?: string;
    paid?: boolean;
    reported?: boolean;
    dueDateFrom?: Date;
    dueDateTo?: Date;
    page?: number;
    limit?: number;
}

export interface CreditPenaltyStats {
    total: number;
    paid: number;
    unpaid: number;
    reported: number;
    totalAmount: number;
    totalPaidAmount: number;
    totalUnpaidAmount: number;
}

export interface ICreditPenaltyRepository extends IRepository {
    createPenalty(data: Omit<CreditPenalty, 'id' | 'createdAt' | 'updatedAt'>): Promise<CreditPenalty>;
    getPenaltyById(id: string): Promise<CreditPenalty | null>;
    getAllPenalties(): Promise<CreditPenalty[]>;
    getPenaltiesWithFilters(filters?: CreditPenaltyFilters): Promise<CreditPenalty[]>;
    getPenaltiesByCreditId(creditId: string): Promise<CreditPenalty[]>;
    getUnpaidPenaltiesByCreditId(creditId: string): Promise<CreditPenalty[]>;
    getPenaltiesStats(filters?: CreditPenaltyFilters): Promise<CreditPenaltyStats>;
    updatePenalty(id: string, data: Partial<Omit<CreditPenalty, 'id' | 'createdAt'>>): Promise<CreditPenalty | null>;
    deletePenalty(id: string): Promise<void>;
}

