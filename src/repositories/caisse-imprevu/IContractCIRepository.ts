import { ContractCI } from "@/types/types";
import { IRepository } from "../IRepository";

export interface IContractCIRepository extends IRepository {
    createContract(data: Omit<ContractCI, 'createdAt' | 'updatedAt'>): Promise<ContractCI>;
    getContractById(id: string): Promise<ContractCI | null>;
    getAllContracts(): Promise<ContractCI[]>;
    updateContract(id: string, data: Partial<Omit<ContractCI, 'id' | 'createdAt'>>): Promise<ContractCI | null>;
    deleteContract(id: string): Promise<void>;
}

