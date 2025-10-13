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
}