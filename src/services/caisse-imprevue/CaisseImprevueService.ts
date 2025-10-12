import { User } from "@/types/types";
import { ICaisseImprevueService } from "./ICaisseImprevueService";
import { IMemberRepository } from "@/repositories/members/IMemberRepository";

export class CaisseImprevueService implements ICaisseImprevueService {
    readonly name = "CaisseImprevueService"

    constructor(private memberRepository: IMemberRepository) {
        this.memberRepository = memberRepository
    }

    async searchMembers(searchQuery: string): Promise<User[]> {
        return await this.memberRepository.searchMembers(searchQuery)
    }
}