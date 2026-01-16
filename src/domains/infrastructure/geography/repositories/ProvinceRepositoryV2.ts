import { BaseGeographyRepository } from './BaseGeographyRepository'
import type { Province } from '../entities/geography.types'
import { firebaseCollectionNames } from '@/constantes/firebase-collection-names'

/**
 * Repository Province V2 avec pagination et recherche côté serveur
 */
export class ProvinceRepositoryV2 extends BaseGeographyRepository<Province> {
  readonly name = 'ProvinceRepositoryV2'
  protected readonly collectionName = firebaseCollectionNames.provinces || 'provinces'

  protected mapDocToEntity(id: string, data: any): Province {
    return {
      id,
      code: data.code,
      name: data.name,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      createdBy: data.createdBy,
      updatedBy: data.updatedBy ?? undefined,
    }
  }

  /**
   * Génère le texte de recherche pour une province
   */
  protected generateSearchableText(name: string, code?: string): string {
    return super.generateSearchableText(name, code)
  }

  /**
   * Les provinces n'ont pas de parent
   */
  protected getParentIdField(): string {
    return '__none__' // N'existe pas pour les provinces
  }
}
