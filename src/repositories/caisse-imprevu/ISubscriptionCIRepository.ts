import { SubscriptionCI } from "@/types/types";
import { IRepository } from "../IRepository";

export interface ISubscriptionCIRepository extends IRepository {
    getAllSubscriptions(): Promise<SubscriptionCI[]>;
    getSubscriptionById(id: string): Promise<SubscriptionCI | null>;
    createSubscription(data: Omit<SubscriptionCI, 'id' | 'createdAt' | 'updatedAt'>): Promise<SubscriptionCI>;
    updateSubscription(id: string, data: Partial<Omit<SubscriptionCI, 'id' | 'createdAt'>>): Promise<SubscriptionCI | null>;
    deleteSubscription(id: string): Promise<void>;
}