import { BaseGeographyRepository } from './BaseGeographyRepository'
import type { Commune } from '../entities/geography.types'
import { firebaseCollectionNames } from '@/constantes/firebase-collection-names'

/**
 * Repository Commune V2 avec pagination et recherche côté serveur
 */
export class CommuneRepositoryV2 extends BaseGeographyRepository<Commune> {
  readonly name = 'CommuneRepositoryV2'
  protected readonly collectionName = firebaseCollectionNames.communes || 'communes'

  protected mapDocToEntity(id: string, data: any): Commune {
    return {
      id,
      departmentId: data.departmentId,
      name: data.name,
      postalCode: data.postalCode ?? undefined,
      alias: data.alias ?? undefined,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      createdBy: data.createdBy,
      updatedBy: data.updatedBy ?? undefined,
    }
  }

  protected generateSearchableText(name: string, code?: string): string {
    // Pour les communes, on inclut aussi l'alias et le code postal
    return super.generateSearchableText(name, code)
  }

  protected getParentIdField(): string {
    return 'departmentId'
  }
}
