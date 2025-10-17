import { IService } from "../interfaces/IService";
import { SubscriptionCI, User, Admin, ContractCI, Document } from "@/types/types";
import { ContractsCIFilters, ContractsCIStats } from "@/repositories/caisse-imprevu/IContractCIRepository";

export interface ICaisseImprevueService extends IService{
    searchMembers(searchQuery: string): Promise<User[]>
    getAllSubscriptions(): Promise<SubscriptionCI[]>
    getActiveSubscriptions(): Promise<SubscriptionCI[]>
    getSubscriptionById(id: string): Promise<SubscriptionCI | null>
    createSubscription(data: Omit<SubscriptionCI, 'createdAt' | 'updatedAt'>): Promise<SubscriptionCI>
    updateSubscription(id: string, data: Partial<SubscriptionCI>): Promise<SubscriptionCI>
    deleteSubscription(id: string): Promise<void>
    createContractCI(data: Omit<ContractCI, 'createdAt' | 'updatedAt'>): Promise<ContractCI>
    getAdminById(id: string): Promise<Admin | null>
    getContractsCIPaginated(filters?: ContractsCIFilters): Promise<ContractCI[]>
    getContractsCIStats(): Promise<ContractsCIStats>
    uploadContractDocument(file: File, contractId: string, memberId: string, userId: string): Promise<{ documentId: string; contract: ContractCI }>
    getDocumentById(documentId: string): Promise<Document | null>
}