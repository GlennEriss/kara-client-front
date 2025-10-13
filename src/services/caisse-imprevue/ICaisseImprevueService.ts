import { IService } from "../interfaces/IService";
import { SubscriptionCI, User } from "@/types/types";

export interface ICaisseImprevueService extends IService{
    searchMembers(searchQuery: string): Promise<User[]>
    getAllSubscriptions(): Promise<SubscriptionCI[]>
}