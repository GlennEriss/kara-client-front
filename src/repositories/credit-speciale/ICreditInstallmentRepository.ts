import { CreditInstallment } from "@/types/types";
import { IRepository } from "../IRepository";

export interface CreditInstallmentFilters {
    creditId?: string;
    status?: 'PENDING' | 'DUE' | 'PARTIAL' | 'PAID' | 'OVERDUE';
    dueDateFrom?: Date;
    dueDateTo?: Date;
    page?: number;
    limit?: number;
    orderByField?: string;
    orderByDirection?: 'asc' | 'desc';
}

export interface CreditInstallmentStats {
    total: number;
    pending: number;
    due: number;
    partial: number;
    paid: number;
    overdue: number;
    totalAmount: number;
    paidAmount: number;
    remainingAmount: number;
}

export interface ICreditInstallmentRepository extends IRepository {
    createInstallment(data: Omit<CreditInstallment, 'id' | 'createdAt' | 'updatedAt'>): Promise<CreditInstallment>;
    createInstallments(data: Array<Omit<CreditInstallment, 'id' | 'createdAt' | 'updatedAt'>>): Promise<CreditInstallment[]>;
    getInstallmentById(id: string): Promise<CreditInstallment | null>;
    getAllInstallments(): Promise<CreditInstallment[]>;
    getInstallmentsWithFilters(filters?: CreditInstallmentFilters): Promise<CreditInstallment[]>;
    getInstallmentsByCreditId(creditId: string): Promise<CreditInstallment[]>;
    getPendingInstallmentsByCreditId(creditId: string): Promise<CreditInstallment[]>;
    getOverdueInstallmentsByCreditId(creditId: string): Promise<CreditInstallment[]>;
    getNextDueInstallment(creditId: string): Promise<CreditInstallment | null>;
    getInstallmentsStats(filters?: CreditInstallmentFilters): Promise<CreditInstallmentStats>;
    updateInstallment(id: string, data: Partial<Omit<CreditInstallment, 'id' | 'createdAt'>>): Promise<CreditInstallment | null>;
    deleteInstallment(id: string): Promise<void>;
    deleteInstallmentsByCreditId(creditId: string): Promise<void>;
}

