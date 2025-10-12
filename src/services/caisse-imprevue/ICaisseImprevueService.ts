import { IService } from "../interfaces/IService";
import { User } from "@/types/types";

export interface ICaisseImprevueService extends IService{
    searchMembers(searchQuery: string): Promise<User[]>
}