import { Filleul, User } from "@/types/types";
import { IRepository } from "../IRepository";

export interface IMemberRepository extends IRepository {
    getFilleulsByIntermediaryCode(intermediaryCode: string): Promise<Filleul[]>;
    getMemberById(memberId: string): Promise<User | null>;
    searchMembers(searchQuery: string): Promise<User[]>;
    updateMemberRoles(memberId: string, roles: string[]): Promise<void>;
}
