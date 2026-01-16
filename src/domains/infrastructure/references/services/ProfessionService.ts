import { IProfessionRepository } from '../repositories/IProfessionRepository'
import { Profession, ProfessionSearchResult, ProfessionFilters, PaginatedProfessions } from '../entities/profession.types'

export class ProfessionService {
  constructor(private readonly repository: IProfessionRepository) {}

  /**
   * Recherche une profession par nom
   */
  async findByName(professionName: string): Promise<ProfessionSearchResult> {
    return this.repository.findByName(professionName)
  }

  /**
   * Crée une nouvelle profession
   */
  async create(data: Omit<Profession, 'id' | 'createdAt' | 'updatedAt'>, adminId: string): Promise<Profession> {
    return this.repository.create(data, adminId)
  }

  /**
   * Récupère une profession par son ID
   */
  async getById(id: string): Promise<Profession | null> {
    return this.repository.getById(id)
  }

  /**
   * Récupère toutes les professions avec filtres
   */
  async getAll(filters?: ProfessionFilters): Promise<Profession[]> {
    return this.repository.getAll(filters)
  }

  /**
   * Récupère les professions avec pagination
   */
  async getPaginated(filters?: ProfessionFilters, page?: number, limit?: number): Promise<PaginatedProfessions> {
    return this.repository.getPaginated(filters, page, limit)
  }

  /**
   * Met à jour une profession
   */
  async update(id: string, updates: Partial<Omit<Profession, 'id' | 'createdAt' | 'createdBy'>>): Promise<Profession | null> {
    return this.repository.update(id, updates)
  }

  /**
   * Supprime une profession
   */
  async delete(id: string): Promise<void> {
    return this.repository.delete(id)
  }

  /**
   * Trouve ou crée une profession
   */
  async findOrCreate(
    professionName: string,
    adminId: string,
    additionalData?: {
      category?: string;
      description?: string;
    }
  ): Promise<{ id: string; isNew: boolean }> {
    return this.repository.findOrCreate(professionName, adminId, additionalData)
  }
}
