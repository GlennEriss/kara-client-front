import { CaisseImprevueDemand, CaisseImprevueDemandFilters, CaisseImprevueDemandStats } from "@/types/types";
import { IRepository } from "../IRepository";

export interface ICaisseImprevueDemandRepository extends IRepository {
    createDemand(data: Omit<CaisseImprevueDemand, 'id' | 'createdAt' | 'updatedAt'>, customId?: string): Promise<CaisseImprevueDemand>;
    getDemandById(id: string): Promise<CaisseImprevueDemand | null>;
    getDemandsWithFilters(filters?: CaisseImprevueDemandFilters): Promise<CaisseImprevueDemand[]>;
    getDemandsStats(filters?: CaisseImprevueDemandFilters): Promise<CaisseImprevueDemandStats>;
    updateDemandStatus(id: string, status: CaisseImprevueDemand['status'], decisionInfo?: { adminId: string; adminName: string; reason: string; decisionMadeAt: Date }, reopenInfo?: { adminId: string; adminName: string; reason: string; reopenedAt: Date }): Promise<CaisseImprevueDemand | null>;
    updateDemand(id: string, data: Partial<CaisseImprevueDemand>): Promise<CaisseImprevueDemand | null>;
}

