/**
 * Tests unitaires pour CommuneRepositoryV2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CommuneRepositoryV2 } from '../../repositories/CommuneRepositoryV2'
import type { Commune } from '../../entities/geography.types'

vi.mock('../../repositories/BaseGeographyRepository', () => {
  const actual = vi.importActual('../../repositories/BaseGeographyRepository')
  return {
    ...actual,
    BaseGeographyRepository: class {
      protected collectionName = 'communes'
      readonly name = 'MockBaseRepository'
      async getPaginated() { return { items: [], hasNextPage: false, nextCursor: null } }
      async getCount() { return 0 }
      async create() { return {} as any }
      async update() { return {} as any }
      async delete() { return void 0 }
      protected generateSearchableText() { return 'test' }
      protected getParentIdField() { return 'departmentId' }
    },
  }
})

describe('CommuneRepositoryV2', () => {
  let repository: CommuneRepositoryV2

  beforeEach(() => {
    repository = new CommuneRepositoryV2()
    vi.clearAllMocks()
  })

  it('devrait avoir le bon nom', () => {
    expect(repository.name).toBe('CommuneRepositoryV2')
  })

  it('devrait mapper correctement un document', () => {
    const mockData = {
      name: 'Libreville',
      departmentId: 'dept-1',
      postalCode: '24100',
      alias: 'LBV',
      createdAt: { toDate: () => new Date('2024-01-01') },
      updatedAt: { toDate: () => new Date('2024-01-02') },
      createdBy: 'user1',
    }

    const result = (repository as any).mapDocToEntity('commune-1', mockData)

    expect(result).toEqual({
      id: 'commune-1',
      name: 'Libreville',
      departmentId: 'dept-1',
      postalCode: '24100',
      alias: 'LBV',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
      createdBy: 'user1',
      updatedBy: undefined,
    })
  })

  it('devrait gérer les champs optionnels manquants', () => {
    const mockData = {
      name: 'Libreville',
      departmentId: 'dept-1',
      createdAt: { toDate: () => new Date('2024-01-01') },
      updatedAt: { toDate: () => new Date('2024-01-02') },
      createdBy: 'user1',
    }

    const result = (repository as any).mapDocToEntity('commune-1', mockData)

    expect(result.postalCode).toBeUndefined()
    expect(result.alias).toBeUndefined()
  })

  it('devrait retourner departmentId comme parent', () => {
    const result = (repository as any).getParentIdField()
    expect(result).toBe('departmentId')
  })
})
