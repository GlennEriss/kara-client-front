import { CaisseSpecialeDemand, CaisseSpecialeDemandFilters, CaisseSpecialeDemandStats } from "@/types/types";

export interface ICaisseSpecialeService {
    readonly name: string;
    // Demandes
    createDemand(data: Omit<CaisseSpecialeDemand, 'id' | 'createdAt' | 'updatedAt'>, adminId: string): Promise<CaisseSpecialeDemand>;
    getDemandById(id: string): Promise<CaisseSpecialeDemand | null>;
    getDemandsWithFilters(filters?: CaisseSpecialeDemandFilters): Promise<CaisseSpecialeDemand[]>;
    getDemandsStats(filters?: CaisseSpecialeDemandFilters): Promise<CaisseSpecialeDemandStats>;
    approveDemand(demandId: string, adminId: string, reason: string): Promise<CaisseSpecialeDemand | null>;
    rejectDemand(demandId: string, adminId: string, reason: string): Promise<CaisseSpecialeDemand | null>;
    reopenDemand(demandId: string, adminId: string, reason: string): Promise<CaisseSpecialeDemand | null>;
    convertDemandToContract(demandId: string, adminId: string): Promise<{ demand: CaisseSpecialeDemand; contractId: string } | null>;
}

