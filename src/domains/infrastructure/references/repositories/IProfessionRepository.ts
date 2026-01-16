import { 
  Profession,
  ProfessionSearchResult,
  ProfessionFilters,
  PaginatedProfessions
} from "../entities/profession.types";
import { IRepository } from "@/repositories/IRepository";

export interface IProfessionRepository extends IRepository {
  findByName(professionName: string): Promise<ProfessionSearchResult>;
  create(data: Omit<Profession, 'id' | 'createdAt' | 'updatedAt'>, adminId: string): Promise<Profession>;
  getById(id: string): Promise<Profession | null>;
  getAll(filters?: ProfessionFilters): Promise<Profession[]>;
  getPaginated(filters?: ProfessionFilters, page?: number, limit?: number): Promise<PaginatedProfessions>;
  update(id: string, updates: Partial<Omit<Profession, 'id' | 'createdAt' | 'createdBy'>>): Promise<Profession | null>;
  delete(id: string): Promise<void>;
  findOrCreate(professionName: string, adminId: string, additionalData?: {
    category?: string;
    description?: string;
  }): Promise<{ id: string; isNew: boolean }>;
}
