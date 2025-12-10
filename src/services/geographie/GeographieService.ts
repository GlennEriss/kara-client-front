import { IService } from '../interfaces/IService'
import type { Province, City, District, Quarter } from '@/types/types'
import type { ProvinceFormData, CityFormData, DistrictFormData, QuarterFormData } from '@/schemas/geographie.schema'
import { ProvinceRepository } from '@/repositories/geographie/ProvinceRepository'
import { CityRepository } from '@/repositories/geographie/CityRepository'
import { DistrictRepository } from '@/repositories/geographie/DistrictRepository'
import { QuarterRepository } from '@/repositories/geographie/QuarterRepository'

export class GeographieService implements IService {
  readonly name = 'GeographieService'

  constructor(
    private provinceRepository: ProvinceRepository,
    private cityRepository: CityRepository,
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
      displayOrder: data.displayOrder ?? undefined,
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
      displayOrder: data.displayOrder ?? undefined,
      updatedBy: userId,
    })
  }

  /**
   * Supprime une province (vérifie qu'elle n'a pas de villes)
   */
  async deleteProvince(id: string): Promise<void> {
    const cities = await this.cityRepository.getByProvinceId(id)
    if (cities.length > 0) {
      throw new Error('Impossible de supprimer cette province car elle contient des villes')
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

  // ================== VILLES ==================

  /**
   * Crée une nouvelle ville avec validation
   */
  async createCity(data: CityFormData, userId: string): Promise<City> {
    // Vérifier que la province existe
    const province = await this.provinceRepository.getById(data.provinceId)
    if (!province) {
      throw new Error('Province introuvable')
    }

    return this.cityRepository.create({
      ...data,
      postalCode: data.postalCode ?? undefined,
      displayOrder: data.displayOrder ?? undefined,
      createdBy: userId,
    })
  }

  /**
   * Met à jour une ville
   */
  async updateCity(id: string, data: Partial<CityFormData>, userId: string): Promise<City> {
    const existing = await this.cityRepository.getById(id)
    if (!existing) {
      throw new Error('Ville introuvable')
    }

    // Si la province change, vérifier qu'elle existe
    if (data.provinceId && data.provinceId !== existing.provinceId) {
      const province = await this.provinceRepository.getById(data.provinceId)
      if (!province) {
        throw new Error('Province introuvable')
      }
    }

    return this.cityRepository.update(id, {
      ...data,
      postalCode: data.postalCode ?? undefined,
      displayOrder: data.displayOrder ?? undefined,
      updatedBy: userId,
    })
  }

  /**
   * Supprime une ville (vérifie qu'elle n'a pas d'arrondissements)
   */
  async deleteCity(id: string): Promise<void> {
    const districts = await this.districtRepository.getByCityId(id)
    if (districts.length > 0) {
      throw new Error('Impossible de supprimer cette ville car elle contient des arrondissements')
    }

    await this.cityRepository.delete(id)
  }

  /**
   * Récupère toutes les villes d'une province
   */
  async getCitiesByProvinceId(provinceId: string): Promise<City[]> {
    return this.cityRepository.getByProvinceId(provinceId)
  }

  /**
   * Récupère toutes les villes
   */
  async getAllCities(): Promise<City[]> {
    return this.cityRepository.getAll()
  }

  /**
   * Récupère une ville par ID
   */
  async getCityById(id: string): Promise<City | null> {
    return this.cityRepository.getById(id)
  }

  /**
   * Recherche des villes
   */
  async searchCities(searchTerm: string, provinceId?: string): Promise<City[]> {
    return this.cityRepository.searchByName(searchTerm, provinceId)
  }

  // ================== ARRONDISSEMENTS ==================

  /**
   * Crée un nouvel arrondissement avec validation
   */
  async createDistrict(data: DistrictFormData, userId: string): Promise<District> {
    // Vérifier que la ville existe
    const city = await this.cityRepository.getById(data.cityId)
    if (!city) {
      throw new Error('Ville introuvable')
    }

    return this.districtRepository.create({
      ...data,
      displayOrder: data.displayOrder ?? undefined,
      createdBy: userId,
    })
  }

  /**
   * Crée plusieurs arrondissements en masse pour une ville
   * Génère automatiquement "1er arrondissement", "2ème arrondissement", etc.
   */
  async createDistrictsBulk(cityId: string, count: number, userId: string): Promise<District[]> {
    // Vérifier que la ville existe
    const city = await this.cityRepository.getById(cityId)
    if (!city) {
      throw new Error('Ville introuvable')
    }

    // Vérifier qu'il n'y a pas déjà des arrondissements pour cette ville
    const existingDistricts = await this.districtRepository.getByCityId(cityId)
    if (existingDistricts.length > 0) {
      throw new Error('Cette ville a déjà des arrondissements. Veuillez les supprimer d\'abord ou les créer individuellement.')
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
        cityId,
        name,
        displayOrder: i,
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

    // Si la ville change, vérifier qu'elle existe
    if (data.cityId && data.cityId !== existing.cityId) {
      const city = await this.cityRepository.getById(data.cityId)
      if (!city) {
        throw new Error('Ville introuvable')
      }
    }

    return this.districtRepository.update(id, {
      ...data,
      displayOrder: data.displayOrder ?? undefined,
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
   * Récupère tous les arrondissements d'une ville
   */
  async getDistrictsByCityId(cityId: string): Promise<District[]> {
    return this.districtRepository.getByCityId(cityId)
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
  async searchDistricts(searchTerm: string, cityId?: string): Promise<District[]> {
    return this.districtRepository.searchByName(searchTerm, cityId)
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
      displayOrder: data.displayOrder ?? undefined,
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
      displayOrder: data.displayOrder ?? undefined,
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

