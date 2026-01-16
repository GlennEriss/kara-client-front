/**
 * Tests unitaires pour DistrictRepositoryV2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DistrictRepositoryV2 } from '../../repositories/DistrictRepositoryV2'
import type { District } from '../../entities/geography.types'

vi.mock('../../repositories/BaseGeographyRepository', () => {
  const actual = vi.importActual('../../repositories/BaseGeographyRepository')
  return {
    ...actual,
    BaseGeographyRepository: class {
      protected collectionName = 'districts'
      readonly name = 'MockBaseRepository'
      async getPaginated() { return { items: [], hasNextPage: false, nextCursor: null } }
      async getCount() { return 0 }
      async create() { return {} as any }
      async update() { return {} as any }
      async delete() { return void 0 }
      protected generateSearchableText() { return 'test' }
      protected getParentIdField() { return 'communeId' }
    },
  }
})

describe('DistrictRepositoryV2', () => {
  let repository: DistrictRepositoryV2

  beforeEach(() => {
    repository = new DistrictRepositoryV2()
    vi.clearAllMocks()
  })

  it('devrait avoir le bon nom', () => {
    expect(repository.name).toBe('DistrictRepositoryV2')
  })

  it('devrait mapper correctement un document', () => {
    const mockData = {
      name: 'Centre-Ville',
      communeId: 'commune-1',
      createdAt: { toDate: () => new Date('2024-01-01') },
      updatedAt: { toDate: () => new Date('2024-01-02') },
      createdBy: 'user1',
    }

    const result = (repository as any).mapDocToEntity('district-1', mockData)

    expect(result).toEqual({
      id: 'district-1',
      name: 'Centre-Ville',
      communeId: 'commune-1',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
      createdBy: 'user1',
      updatedBy: undefined,
    })
  })

  it('devrait retourner communeId comme parent', () => {
    const result = (repository as any).getParentIdField()
    expect(result).toBe('communeId')
  })
})
