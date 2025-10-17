import { Admin } from "@/types/types";
import { IRepository } from "../IRepository";

export interface IAdminRepository extends IRepository {
    getAdminById(id: string): Promise<Admin | null>;
}

