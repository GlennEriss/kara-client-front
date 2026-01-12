import { BaseGeographyRepository } from './BaseGeographyRepository'
import type { Department } from '../entities/geography.types'
import { firebaseCollectionNames } from '@/constantes/firebase-collection-names'

/**
 * Repository Department V2 avec pagination et recherche côté serveur
 */
export class DepartmentRepositoryV2 extends BaseGeographyRepository<Department> {
  readonly name = 'DepartmentRepositoryV2'
  protected readonly collectionName = firebaseCollectionNames.departments || 'departments'

  protected mapDocToEntity(id: string, data: any): Department {
    return {
      id,
      provinceId: data.provinceId,
      code: data.code ?? undefined,
      name: data.name,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      createdBy: data.createdBy,
      updatedBy: data.updatedBy ?? undefined,
    }
  }

  protected getParentIdField(): string {
    return 'provinceId'
  }
}
