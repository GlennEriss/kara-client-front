import { GuarantorPayment } from "@/types/types";
import { IRepository } from "../IRepository";

export interface IGuarantorPaymentRepository extends IRepository {
    createPayment(data: Omit<GuarantorPayment, 'id' | 'createdAt' | 'updatedAt'>): Promise<GuarantorPayment>;
    getPaymentById(id: string): Promise<GuarantorPayment | null>;
    getPaymentsByCreditId(creditId: string): Promise<GuarantorPayment[]>;
    getPaymentsByGuarantorId(guarantorId: string): Promise<GuarantorPayment[]>;
}
