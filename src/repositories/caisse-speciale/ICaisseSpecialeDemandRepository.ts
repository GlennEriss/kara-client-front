import { CaisseSpecialeDemand, CaisseSpecialeDemandFilters, CaisseSpecialeDemandStats } from "@/types/types";
import { IRepository } from "../IRepository";

export interface ICaisseSpecialeDemandRepository extends IRepository {
    createDemand(data: Omit<CaisseSpecialeDemand, 'id' | 'createdAt' | 'updatedAt'>, customId?: string): Promise<CaisseSpecialeDemand>;
    getDemandById(id: string): Promise<CaisseSpecialeDemand | null>;
    getDemandsWithFilters(filters?: CaisseSpecialeDemandFilters): Promise<CaisseSpecialeDemand[]>;
    getDemandsStats(filters?: CaisseSpecialeDemandFilters): Promise<CaisseSpecialeDemandStats>;
    updateDemandStatus(id: string, status: CaisseSpecialeDemand['status'], adminId: string, reason: string, adminName: string): Promise<CaisseSpecialeDemand | null>;
    updateDemand(id: string, data: Partial<CaisseSpecialeDemand>): Promise<CaisseSpecialeDemand | null>;
}

