import { ContractCI, ContractCIStatus } from "@/types/types";
import { IRepository } from "../IRepository";

export interface ContractsCIFilters {
    search?: string;
    status?: ContractCIStatus | 'all';
}

export interface ContractsCIStats {
    total: number;
    active: number;
    finished: number;
    canceled: number;
    totalAmount: number;
    activePercentage: number;
    finishedPercentage: number;
    canceledPercentage: number;
}

export interface IContractCIRepository extends IRepository {
    createContract(data: Omit<ContractCI, 'createdAt' | 'updatedAt'>): Promise<ContractCI>;
    getContractById(id: string): Promise<ContractCI | null>;
    getAllContracts(): Promise<ContractCI[]>;
    getContractsByMemberId(memberId: string): Promise<ContractCI[]>;
    getContractsWithFilters(filters?: ContractsCIFilters): Promise<ContractCI[]>;
    getContractsStats(): Promise<ContractsCIStats>;
    updateContract(id: string, data: Partial<Omit<ContractCI, 'id' | 'createdAt'>>): Promise<ContractCI | null>;
    deleteContract(id: string): Promise<void>;
}

