import { PlacementDemand, PlacementDemandFilters, PlacementDemandStats } from "@/types/types";
import { IRepository } from "../IRepository";

export interface IPlacementDemandRepository extends IRepository {
    createDemand(data: Omit<PlacementDemand, 'id' | 'createdAt' | 'updatedAt'>, customId?: string): Promise<PlacementDemand>;
    getDemandById(id: string): Promise<PlacementDemand | null>;
    getDemandsWithFilters(filters?: PlacementDemandFilters): Promise<PlacementDemand[]>;
    getDemandsStats(filters?: PlacementDemandFilters): Promise<PlacementDemandStats>;
    updateDemandStatus(id: string, status: PlacementDemand['status'], adminId: string, reason: string, adminName: string): Promise<PlacementDemand | null>;
    updateDemand(id: string, data: Partial<PlacementDemand>): Promise<PlacementDemand | null>;
}

