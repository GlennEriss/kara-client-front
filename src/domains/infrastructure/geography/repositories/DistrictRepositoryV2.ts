import { BaseGeographyRepository } from './BaseGeographyRepository'
import type { District } from '../entities/geography.types'
import { firebaseCollectionNames } from '@/constantes/firebase-collection-names'

/**
 * Repository District V2 avec pagination et recherche côté serveur
 */
export class DistrictRepositoryV2 extends BaseGeographyRepository<District> {
  readonly name = 'DistrictRepositoryV2'
  protected readonly collectionName = firebaseCollectionNames.districts || 'districts'

  protected mapDocToEntity(id: string, data: any): District {
    return {
      id,
      communeId: data.communeId,
      name: data.name,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      createdBy: data.createdBy,
      updatedBy: data.updatedBy ?? undefined,
    }
  }

  protected getParentIdField(): string {
    return 'communeId'
  }
}
