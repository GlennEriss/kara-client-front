import { 
  Company,
  CompanySearchResult
} from "../entities/company.types";
import { IRepository } from "@/repositories/IRepository";

export interface CompanyFilters {
  search?: string
}

export interface PaginatedCompanies {
  data: Company[]
  pagination: {
    currentPage: number
    totalPages: number
    totalItems: number
    itemsPerPage: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

export interface ICompanyRepository extends IRepository {
  findByName(companyName: string): Promise<CompanySearchResult>;
  create(data: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>, adminId: string): Promise<Company>;
  getById(id: string): Promise<Company | null>;
  getAll(filters?: CompanyFilters): Promise<Company[]>;
  getPaginated(filters?: CompanyFilters, page?: number, limit?: number): Promise<PaginatedCompanies>;
  update(id: string, updates: Partial<Omit<Company, 'id' | 'createdAt' | 'createdBy'>>): Promise<Company | null>;
  delete(id: string): Promise<void>;
  findOrCreate(companyName: string, adminId: string, additionalData?: {
    address?: { 
      province?: string; 
      city?: string; 
      district?: string;
      arrondissement?: string;
      additionalInfo?: string;
    };
    industry?: string;
    employeeCount?: number;
  }): Promise<{ id: string; isNew: boolean }>;
}
