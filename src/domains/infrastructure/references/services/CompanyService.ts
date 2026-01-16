import { ICompanyRepository, CompanyFilters, PaginatedCompanies } from '../repositories/ICompanyRepository'
import { Company, CompanySearchResult } from '../entities/company.types'

export class CompanyService {
  constructor(private readonly repository: ICompanyRepository) {}

  /**
   * Recherche une entreprise par nom
   */
  async findByName(companyName: string): Promise<CompanySearchResult> {
    return this.repository.findByName(companyName)
  }

  /**
   * Crée une nouvelle entreprise
   */
  async create(data: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>, adminId: string): Promise<Company> {
    return this.repository.create(data, adminId)
  }

  /**
   * Récupère une entreprise par son ID
   */
  async getById(id: string): Promise<Company | null> {
    return this.repository.getById(id)
  }

  /**
   * Récupère toutes les entreprises avec filtres
   */
  async getAll(filters?: CompanyFilters): Promise<Company[]> {
    return this.repository.getAll(filters)
  }

  /**
   * Récupère les entreprises avec pagination
   */
  async getPaginated(filters?: CompanyFilters, page?: number, limit?: number): Promise<PaginatedCompanies> {
    return this.repository.getPaginated(filters, page, limit)
  }

  /**
   * Met à jour une entreprise
   */
  async update(id: string, updates: Partial<Omit<Company, 'id' | 'createdAt' | 'createdBy'>>): Promise<Company | null> {
    return this.repository.update(id, updates)
  }

  /**
   * Supprime une entreprise
   */
  async delete(id: string): Promise<void> {
    return this.repository.delete(id)
  }

  /**
   * Trouve ou crée une entreprise
   */
  async findOrCreate(
    companyName: string,
    adminId: string,
    additionalData?: {
      address?: { 
        province?: string; 
        city?: string; 
        district?: string;
        arrondissement?: string;
        additionalInfo?: string;
      };
      industry?: string;
      employeeCount?: number;
    }
  ): Promise<{ id: string; isNew: boolean }> {
    return this.repository.findOrCreate(companyName, adminId, additionalData)
  }
}
