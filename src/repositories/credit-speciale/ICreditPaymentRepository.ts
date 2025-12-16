import { CreditPayment, CreditPaymentMode } from "@/types/types";
import { IRepository } from "../IRepository";

export interface CreditPaymentFilters {
    creditId?: string;
    paymentDateFrom?: Date;
    paymentDateTo?: Date;
    mode?: CreditPaymentMode | 'all';
    page?: number;
    limit?: number;
    orderByField?: string;
    orderByDirection?: 'asc' | 'desc';
}

export interface CreditPaymentStats {
    total: number;
    totalAmount: number;
    byMode: {
        cash: number;
        mobile_money: number;
        bank_transfer: number;
        cheque: number;
    };
}

export interface ICreditPaymentRepository extends IRepository {
    createPayment(data: Omit<CreditPayment, 'id' | 'createdAt' | 'updatedAt'>, customId?: string): Promise<CreditPayment>;
    getPaymentById(id: string): Promise<CreditPayment | null>;
    getAllPayments(): Promise<CreditPayment[]>;
    getPaymentsWithFilters(filters?: CreditPaymentFilters): Promise<CreditPayment[]>;
    getPaymentsByCreditId(creditId: string): Promise<CreditPayment[]>;
    getPaymentsStats(filters?: CreditPaymentFilters): Promise<CreditPaymentStats>;
    updatePayment(id: string, data: Partial<Omit<CreditPayment, 'id' | 'createdAt'>>): Promise<CreditPayment | null>;
    deletePayment(id: string): Promise<void>;
}

