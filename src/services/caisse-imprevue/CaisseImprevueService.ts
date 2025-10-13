import { User } from "@/types/types";
import { ICaisseImprevueService } from "./ICaisseImprevueService";
import { IMemberRepository } from "@/repositories/members/IMemberRepository";
import { SubscriptionCI } from "@/types/types";
import { ISubscriptionCIRepository } from "@/repositories/caisse-imprevu/ISubscriptionCIRepository";

export class CaisseImprevueService implements ICaisseImprevueService {
    readonly name = "CaisseImprevueService"

    constructor(private memberRepository: IMemberRepository, private subscriptionCIRepository: ISubscriptionCIRepository) {
        this.memberRepository = memberRepository
        this.subscriptionCIRepository = subscriptionCIRepository
    }

    async searchMembers(searchQuery: string): Promise<User[]> {
        return await this.memberRepository.searchMembers(searchQuery)
    }

    async getAllSubscriptions(): Promise<SubscriptionCI[]> {
        return await this.subscriptionCIRepository.getAllSubscriptions()
    }

    async getSubscriptionById(id: string): Promise<SubscriptionCI | null> {
        return await this.subscriptionCIRepository.getSubscriptionById(id)
    }

    async createSubscription(data: Omit<SubscriptionCI, 'id' | 'createdAt' | 'updatedAt'>): Promise<SubscriptionCI> {
        return await this.subscriptionCIRepository.createSubscription(data)
    }

    async updateSubscription(id: string, data: Partial<SubscriptionCI>): Promise<SubscriptionCI> {
        const result = await this.subscriptionCIRepository.updateSubscription(id, data)
        if (!result) {
            throw new Error(`Forfait avec l'ID ${id} introuvable`)
        }
        return result
    }

    async deleteSubscription(id: string): Promise<void> {
        return await this.subscriptionCIRepository.deleteSubscription(id)
    }
}