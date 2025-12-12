import { GuarantorRemuneration } from "@/types/types";
import { IRepository } from "../IRepository";

export interface GuarantorRemunerationFilters {
    creditId?: string;
    guarantorId?: string;
    paymentId?: string;
    month?: number;
    page?: number;
    limit?: number;
}

export interface GuarantorRemunerationStats {
    total: number;
    totalAmount: number;
    byGuarantor: Record<string, number>; // guarantorId -> total amount
}

export interface IGuarantorRemunerationRepository extends IRepository {
    createRemuneration(data: Omit<GuarantorRemuneration, 'id' | 'createdAt' | 'updatedAt'>): Promise<GuarantorRemuneration>;
    getRemunerationById(id: string): Promise<GuarantorRemuneration | null>;
    getAllRemunerations(): Promise<GuarantorRemuneration[]>;
    getRemunerationsWithFilters(filters?: GuarantorRemunerationFilters): Promise<GuarantorRemuneration[]>;
    getRemunerationsByCreditId(creditId: string): Promise<GuarantorRemuneration[]>;
    getRemunerationsByGuarantorId(guarantorId: string): Promise<GuarantorRemuneration[]>;
    getRemunerationsByPaymentId(paymentId: string): Promise<GuarantorRemuneration[]>;
    getRemunerationsStats(filters?: GuarantorRemunerationFilters): Promise<GuarantorRemunerationStats>;
    updateRemuneration(id: string, data: Partial<Omit<GuarantorRemuneration, 'id' | 'createdAt'>>): Promise<GuarantorRemuneration | null>;
    deleteRemuneration(id: string): Promise<void>;
}

