import { IService } from "../interfaces/IService";
import { SubscriptionCI, User, Admin } from "@/types/types";

export interface ICaisseImprevueService extends IService{
    searchMembers(searchQuery: string): Promise<User[]>
    getAllSubscriptions(): Promise<SubscriptionCI[]>
    getActiveSubscriptions(): Promise<SubscriptionCI[]>
    getSubscriptionById(id: string): Promise<SubscriptionCI | null>
    createSubscription(data: Omit<SubscriptionCI, 'createdAt' | 'updatedAt'>): Promise<SubscriptionCI>
    updateSubscription(id: string, data: Partial<SubscriptionCI>): Promise<SubscriptionCI>
    deleteSubscription(id: string): Promise<void>
    getAdminById(id: string): Promise<Admin | null>
}