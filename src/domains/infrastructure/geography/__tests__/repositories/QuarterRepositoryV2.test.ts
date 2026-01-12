/**
 * Tests unitaires pour QuarterRepositoryV2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QuarterRepositoryV2 } from '../../repositories/QuarterRepositoryV2'
import type { Quarter } from '../../entities/geography.types'

vi.mock('../../repositories/BaseGeographyRepository', () => {
  const actual = vi.importActual('../../repositories/BaseGeographyRepository')
  return {
    ...actual,
    BaseGeographyRepository: class {
      protected collectionName = 'quarters'
      readonly name = 'MockBaseRepository'
      async getPaginated() { return { items: [], hasNextPage: false, nextCursor: null } }
      async getCount() { return 0 }
      async create() { return {} as any }
      async update() { return {} as any }
      async delete() { return void 0 }
      protected generateSearchableText() { return 'test' }
      protected getParentIdField() { return 'districtId' }
    },
  }
})

describe('QuarterRepositoryV2', () => {
  let repository: QuarterRepositoryV2

  beforeEach(() => {
    repository = new QuarterRepositoryV2()
    vi.clearAllMocks()
  })

  it('devrait avoir le bon nom', () => {
    expect(repository.name).toBe('QuarterRepositoryV2')
  })

  it('devrait mapper correctement un document', () => {
    const mockData = {
      name: 'Quartier A',
      districtId: 'district-1',
      createdAt: { toDate: () => new Date('2024-01-01') },
      updatedAt: { toDate: () => new Date('2024-01-02') },
      createdBy: 'user1',
    }

    const result = (repository as any).mapDocToEntity('quarter-1', mockData)

    expect(result).toEqual({
      id: 'quarter-1',
      name: 'Quartier A',
      districtId: 'district-1',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
      createdBy: 'user1',
      updatedBy: undefined,
    })
  })

  it('devrait retourner districtId comme parent', () => {
    const result = (repository as any).getParentIdField()
    expect(result).toBe('districtId')
  })
})
