import { BaseGeographyRepository } from './BaseGeographyRepository'
import type { Quarter } from '../entities/geography.types'
import { firebaseCollectionNames } from '@/constantes/firebase-collection-names'

/**
 * Repository Quarter V2 avec pagination et recherche côté serveur
 */
export class QuarterRepositoryV2 extends BaseGeographyRepository<Quarter> {
  readonly name = 'QuarterRepositoryV2'
  protected readonly collectionName = firebaseCollectionNames.quarters || 'quarters'

  protected mapDocToEntity(id: string, data: any): Quarter {
    return {
      id,
      districtId: data.districtId,
      name: data.name,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      createdBy: data.createdBy,
      updatedBy: data.updatedBy ?? undefined,
    }
  }

  protected getParentIdField(): string {
    return 'districtId'
  }
}
