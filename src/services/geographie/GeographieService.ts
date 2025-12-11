import { IService } from '../interfaces/IService'
import type { Province, Department, Commune, District, Quarter } from '@/types/types'
import type { ProvinceFormData, DepartmentFormData, CommuneFormData, DistrictFormData, QuarterFormData } from '@/schemas/geographie.schema'
import { ProvinceRepository } from '@/repositories/geographie/ProvinceRepository'
import { DepartmentRepository } from '@/repositories/geographie/DepartmentRepository'
import { CommuneRepository } from '@/repositories/geographie/CommuneRepository'
import { DistrictRepository } from '@/repositories/geographie/DistrictRepository'
import { QuarterRepository } from '@/repositories/geographie/QuarterRepository'

export class GeographieService implements IService {
  readonly name = 'GeographieService'

  constructor(
    private provinceRepository: ProvinceRepository,
    private departmentRepository: DepartmentRepository,
    private communeRepository: CommuneRepository,
    private districtRepository: DistrictRepository,
    private quarterRepository: QuarterRepository
  ) {}

  // ================== PROVINCES ==================

  /**
   * Crée une nouvelle province avec validation
   */
  async createProvince(data: ProvinceFormData, userId: string): Promise<Province> {
    // Vérifier que le code n'existe pas déjà
    const existingProvinces = await this.provinceRepository.getAll()
    const codeExists = existingProvinces.some(p => p.code.toUpperCase() === data.code.toUpperCase())
    
    if (codeExists) {
      throw new Error('Une province avec ce code existe déjà')
    }

    return this.provinceRepository.create({
      ...data,
      code: data.code.toUpperCase(),
      createdBy: userId,
    })
  }

  /**
   * Met à jour une province
   */
  async updateProvince(id: string, data: Partial<ProvinceFormData>, userId: string): Promise<Province> {
    // Vérifier que la province existe
    const existing = await this.provinceRepository.getById(id)
    if (!existing) {
      throw new Error('Province introuvable')
    }

    // Si le code change, vérifier qu'il n'existe pas déjà
    if (data.code && data.code.toUpperCase() !== existing.code) {
      const allProvinces = await this.provinceRepository.getAll()
      const upperCode = data.code.toUpperCase()
      const codeExists = allProvinces.some(p => p.id !== id && p.code.toUpperCase() === upperCode)
      if (codeExists) {
        throw new Error('Une province avec ce code existe déjà')
      }
    }

    return this.provinceRepository.update(id, {
      ...data,
      code: data.code ? data.code.toUpperCase() : undefined,
      updatedBy: userId,
    })
  }

  /**
   * Supprime une province (vérifie qu'elle n'a pas de départements)
   */
  async deleteProvince(id: string): Promise<void> {
    const departments = await this.departmentRepository.getByProvinceId(id)
    if (departments.length > 0) {
      throw new Error('Impossible de supprimer cette province car elle contient des départements')
    }

    await this.provinceRepository.delete(id)
  }

  /**
   * Récupère toutes les provinces
   */
  async getAllProvinces(): Promise<Province[]> {
    return this.provinceRepository.getAll()
  }

  /**
   * Récupère une province par ID
   */
  async getProvinceById(id: string): Promise<Province | null> {
    return this.provinceRepository.getById(id)
  }

  /**
   * Recherche des provinces
   */
  async searchProvinces(searchTerm: string): Promise<Province[]> {
    return this.provinceRepository.searchByName(searchTerm)
  }

  // ================== DÉPARTEMENTS ==================

  /**
   * Crée un nouveau département avec validation
   */
  async createDepartment(data: DepartmentFormData, userId: string): Promise<Department> {
    // Vérifier que la province existe
    const province = await this.provinceRepository.getById(data.provinceId)
    if (!province) {
      throw new Error('Province introuvable')
    }

    return this.departmentRepository.create({
      ...data,
      code: data.code ? data.code.toUpperCase() : undefined,
      createdBy: userId,
    })
  }

  /**
   * Met à jour un département
   */
  async updateDepartment(id: string, data: Partial<DepartmentFormData>, userId: string): Promise<Department> {
    const existing = await this.departmentRepository.getById(id)
    if (!existing) {
      throw new Error('Département introuvable')
    }

    // Si la province change, vérifier qu'elle existe
    if (data.provinceId && data.provinceId !== existing.provinceId) {
      const province = await this.provinceRepository.getById(data.provinceId)
      if (!province) {
        throw new Error('Province introuvable')
      }
    }

    return this.departmentRepository.update(id, {
      ...data,
      code: data.code ? data.code.toUpperCase() : undefined,
      updatedBy: userId,
    })
  }

  /**
   * Supprime un département (vérifie qu'il n'a pas de communes)
   */
  async deleteDepartment(id: string): Promise<void> {
    const communes = await this.communeRepository.getByDepartmentId(id)
    if (communes.length > 0) {
      throw new Error('Impossible de supprimer ce département car il contient des communes')
    }

    await this.departmentRepository.delete(id)
  }

  /**
   * Récupère tous les départements d'une province
   */
  async getDepartmentsByProvinceId(provinceId: string): Promise<Department[]> {
    return this.departmentRepository.getByProvinceId(provinceId)
  }

  /**
   * Récupère tous les départements
   */
  async getAllDepartments(): Promise<Department[]> {
    return this.departmentRepository.getAll()
  }

  /**
   * Récupère un département par ID
   */
  async getDepartmentById(id: string): Promise<Department | null> {
    return this.departmentRepository.getById(id)
  }

  /**
   * Recherche des départements
   */
  async searchDepartments(searchTerm: string, provinceId?: string): Promise<Department[]> {
    return this.departmentRepository.searchByName(searchTerm, provinceId)
  }

  // ================== COMMUNES ==================

  /**
   * Crée une nouvelle commune avec validation
   */
  async createCommune(data: CommuneFormData, userId: string): Promise<Commune> {
    // Vérifier que le département existe
    const department = await this.departmentRepository.getById(data.departmentId)
    if (!department) {
      throw new Error('Département introuvable')
    }

    return this.communeRepository.create({
      ...data,
      postalCode: data.postalCode ?? undefined,
      alias: data.alias ?? undefined,
      createdBy: userId,
    })
  }

  /**
   * Met à jour une commune
   */
  async updateCommune(id: string, data: Partial<CommuneFormData>, userId: string): Promise<Commune> {
    const existing = await this.communeRepository.getById(id)
    if (!existing) {
      throw new Error('Commune introuvable')
    }

    // Si le département change, vérifier qu'il existe
    if (data.departmentId && data.departmentId !== existing.departmentId) {
      const department = await this.departmentRepository.getById(data.departmentId)
      if (!department) {
        throw new Error('Département introuvable')
      }
    }

    return this.communeRepository.update(id, {
      ...data,
      postalCode: data.postalCode ?? undefined,
      alias: data.alias ?? undefined,
      updatedBy: userId,
    })
  }

  /**
   * Supprime une commune (vérifie qu'elle n'a pas d'arrondissements)
   */
  async deleteCommune(id: string): Promise<void> {
    const districts = await this.districtRepository.getByCommuneId(id)
    if (districts.length > 0) {
      throw new Error('Impossible de supprimer cette commune car elle contient des arrondissements')
    }

    await this.communeRepository.delete(id)
  }

  /**
   * Récupère toutes les communes d'un département
   */
  async getCommunesByDepartmentId(departmentId: string): Promise<Commune[]> {
    return this.communeRepository.getByDepartmentId(departmentId)
  }

  /**
   * Récupère toutes les communes
   */
  async getAllCommunes(): Promise<Commune[]> {
    return this.communeRepository.getAll()
  }

  /**
   * Récupère une commune par ID
   */
  async getCommuneById(id: string): Promise<Commune | null> {
    return this.communeRepository.getById(id)
  }

  /**
   * Recherche des communes
   */
  async searchCommunes(searchTerm: string, departmentId?: string): Promise<Commune[]> {
    return this.communeRepository.searchByName(searchTerm, departmentId)
  }

  // ================== ARRONDISSEMENTS ==================

  /**
   * Crée un nouvel arrondissement avec validation
   */
  async createDistrict(data: DistrictFormData, userId: string): Promise<District> {
    // Vérifier que la commune existe
    const commune = await this.communeRepository.getById(data.communeId)
    if (!commune) {
      throw new Error('Commune introuvable')
    }

    return this.districtRepository.create({
      ...data,
      createdBy: userId,
    })
  }

  /**
   * Crée plusieurs arrondissements en masse pour une commune
   * Génère automatiquement "1er arrondissement", "2ème arrondissement", etc.
   */
  async createDistrictsBulk(communeId: string, count: number, userId: string): Promise<District[]> {
    // Vérifier que la commune existe
    const commune = await this.communeRepository.getById(communeId)
    if (!commune) {
      throw new Error('Commune introuvable')
    }

    // Vérifier qu'il n'y a pas déjà des arrondissements pour cette commune
    const existingDistricts = await this.districtRepository.getByCommuneId(communeId)
    if (existingDistricts.length > 0) {
      throw new Error('Cette commune a déjà des arrondissements. Veuillez les supprimer d\'abord ou les créer individuellement.')
    }

    // Générer les noms des arrondissements
    const districts: Omit<District, 'id' | 'createdAt' | 'updatedAt'>[] = []
    
    for (let i = 1; i <= count; i++) {
      let name: string
      if (i === 1) {
        name = '1er arrondissement'
      } else {
        name = `${i}ème arrondissement`
      }

      districts.push({
        communeId,
        name,
        createdBy: userId,
      })
    }

    // Créer tous les arrondissements
    const createdDistricts: District[] = []
    for (const districtData of districts) {
      const created = await this.districtRepository.create(districtData)
      createdDistricts.push(created)
    }

    return createdDistricts
  }

  /**
   * Met à jour un arrondissement
   */
  async updateDistrict(id: string, data: Partial<DistrictFormData>, userId: string): Promise<District> {
    const existing = await this.districtRepository.getById(id)
    if (!existing) {
      throw new Error('Arrondissement introuvable')
    }

    // Si la commune change, vérifier qu'elle existe
    if (data.communeId && data.communeId !== existing.communeId) {
      const commune = await this.communeRepository.getById(data.communeId)
      if (!commune) {
        throw new Error('Commune introuvable')
      }
    }

    return this.districtRepository.update(id, {
      ...data,
      updatedBy: userId,
    })
  }

  /**
   * Supprime un arrondissement (vérifie qu'il n'a pas de quartiers)
   */
  async deleteDistrict(id: string): Promise<void> {
    const quarters = await this.quarterRepository.getByDistrictId(id)
    if (quarters.length > 0) {
      throw new Error('Impossible de supprimer cet arrondissement car il contient des quartiers')
    }

    await this.districtRepository.delete(id)
  }

  /**
   * Récupère tous les arrondissements d'une commune
   */
  async getDistrictsByCommuneId(communeId: string): Promise<District[]> {
    return this.districtRepository.getByCommuneId(communeId)
  }

  /**
   * Récupère tous les arrondissements
   */
  async getAllDistricts(): Promise<District[]> {
    return this.districtRepository.getAll()
  }

  /**
   * Récupère un arrondissement par ID
   */
  async getDistrictById(id: string): Promise<District | null> {
    return this.districtRepository.getById(id)
  }

  /**
   * Recherche des arrondissements
   */
  async searchDistricts(searchTerm: string, communeId?: string): Promise<District[]> {
    return this.districtRepository.searchByName(searchTerm, communeId)
  }

  // ================== QUARTIERS ==================

  /**
   * Crée un nouveau quartier avec validation
   */
  async createQuarter(data: QuarterFormData, userId: string): Promise<Quarter> {
    // Vérifier que l'arrondissement existe
    const district = await this.districtRepository.getById(data.districtId)
    if (!district) {
      throw new Error('Arrondissement introuvable')
    }

    return this.quarterRepository.create({
      ...data,
      createdBy: userId,
    })
  }

  /**
   * Met à jour un quartier
   */
  async updateQuarter(id: string, data: Partial<QuarterFormData>, userId: string): Promise<Quarter> {
    const existing = await this.quarterRepository.getById(id)
    if (!existing) {
      throw new Error('Quartier introuvable')
    }

    // Si l'arrondissement change, vérifier qu'il existe
    if (data.districtId && data.districtId !== existing.districtId) {
      const district = await this.districtRepository.getById(data.districtId)
      if (!district) {
        throw new Error('Arrondissement introuvable')
      }
    }

    return this.quarterRepository.update(id, {
      ...data,
      updatedBy: userId,
    })
  }

  /**
   * Supprime un quartier
   */
  async deleteQuarter(id: string): Promise<void> {
    await this.quarterRepository.delete(id)
  }

  /**
   * Récupère tous les quartiers d'un arrondissement
   */
  async getQuartersByDistrictId(districtId: string): Promise<Quarter[]> {
    return this.quarterRepository.getByDistrictId(districtId)
  }

  /**
   * Récupère tous les quartiers
   */
  async getAllQuarters(): Promise<Quarter[]> {
    return this.quarterRepository.getAll()
  }

  /**
   * Récupère un quartier par ID
   */
  async getQuarterById(id: string): Promise<Quarter | null> {
    return this.quarterRepository.getById(id)
  }

  /**
   * Recherche des quartiers
   */
  async searchQuarters(searchTerm: string, districtId?: string): Promise<Quarter[]> {
    return this.quarterRepository.searchByName(searchTerm, districtId)
  }
}

