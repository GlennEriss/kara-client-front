/**
 * Tests unitaires pour DepartmentRepositoryV2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DepartmentRepositoryV2 } from '../../repositories/DepartmentRepositoryV2'
import type { Department } from '../../entities/geography.types'

vi.mock('../../repositories/BaseGeographyRepository', () => {
  const actual = vi.importActual('../../repositories/BaseGeographyRepository')
  return {
    ...actual,
    BaseGeographyRepository: class {
      protected collectionName = 'departments'
      readonly name = 'MockBaseRepository'
      async getPaginated() { return { items: [], hasNextPage: false, nextCursor: null } }
      async getCount() { return 0 }
      async create() { return {} as any }
      async update() { return {} as any }
      async delete() { return void 0 }
      protected generateSearchableText() { return 'test' }
      protected getParentIdField() { return 'provinceId' }
    },
  }
})

describe('DepartmentRepositoryV2', () => {
  let repository: DepartmentRepositoryV2

  beforeEach(() => {
    repository = new DepartmentRepositoryV2()
    vi.clearAllMocks()
  })

  it('devrait avoir le bon nom', () => {
    expect(repository.name).toBe('DepartmentRepositoryV2')
  })

  it('devrait mapper correctement un document', () => {
    const mockData = {
      name: 'Libreville',
      code: 'LBV',
      provinceId: 'province-1',
      createdAt: { toDate: () => new Date('2024-01-01') },
      updatedAt: { toDate: () => new Date('2024-01-02') },
      createdBy: 'user1',
    }

    const result = (repository as any).mapDocToEntity('dept-1', mockData)

    expect(result).toEqual({
      id: 'dept-1',
      name: 'Libreville',
      code: 'LBV',
      provinceId: 'province-1',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
      createdBy: 'user1',
      updatedBy: undefined,
    })
  })

  it('devrait retourner provinceId comme parent', () => {
    const result = (repository as any).getParentIdField()
    expect(result).toBe('provinceId')
  })
})
