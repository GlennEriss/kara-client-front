/**
 * Tests unitaires pour ProvinceRepositoryV2
 * 
 * @see https://vitest.dev/
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ProvinceRepositoryV2 } from '../../repositories/ProvinceRepositoryV2'
import type { Province } from '../../entities/geography.types'

// Mock de BaseGeographyRepository
vi.mock('../../repositories/BaseGeographyRepository', () => {
  const actual = vi.importActual('../../repositories/BaseGeographyRepository')
  return {
    ...actual,
    BaseGeographyRepository: class {
      protected collectionName = 'provinces'
      readonly name = 'MockBaseRepository'
      
      async getPaginated() {
        return { items: [], hasNextPage: false, nextCursor: null }
      }
      
      async getCount() {
        return 0
      }
      
      async create() {
        return {} as any
      }
      
      async update() {
        return {} as any
      }
      
      async delete() {
        return void 0
      }
      
      protected generateSearchableText() {
        return 'test'
      }
      
      protected getParentIdField() {
        return '__none__'
      }
    },
  }
})

describe('ProvinceRepositoryV2', () => {
  let repository: ProvinceRepositoryV2

  beforeEach(() => {
    repository = new ProvinceRepositoryV2()
    vi.clearAllMocks()
  })

  describe('name', () => {
    it('devrait avoir le bon nom', () => {
      expect(repository.name).toBe('ProvinceRepositoryV2')
    })
  })

  describe('mapDocToEntity', () => {
    it('devrait mapper correctement un document Firestore en Province', () => {
      const mockData = {
        code: 'EST',
        name: 'Estuaire',
        createdAt: { toDate: () => new Date('2024-01-01') },
        updatedAt: { toDate: () => new Date('2024-01-02') },
        createdBy: 'user1',
        updatedBy: 'user2',
      }

      const result = (repository as any).mapDocToEntity('province-1', mockData)

      expect(result).toEqual({
        id: 'province-1',
        code: 'EST',
        name: 'Estuaire',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
        createdBy: 'user1',
        updatedBy: 'user2',
      })
    })

    it('devrait gérer les dates manquantes', () => {
      const mockData = {
        code: 'EST',
        name: 'Estuaire',
        createdBy: 'user1',
      }

      const result = (repository as any).mapDocToEntity('province-1', mockData)
      const now = new Date()

      expect(result.id).toBe('province-1')
      expect(result.code).toBe('EST')
      expect(result.name).toBe('Estuaire')
      expect(result.createdAt).toBeInstanceOf(Date)
      expect(result.updatedAt).toBeInstanceOf(Date)
      expect(result.createdBy).toBe('user1')
      expect(result.updatedBy).toBeUndefined()
    })
  })

  describe('generateSearchableText', () => {
    it('devrait générer le texte de recherche', () => {
      const result = (repository as any).generateSearchableText('Estuaire', 'EST')
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe('getParentIdField', () => {
    it('devrait retourner __none__ car les provinces n\'ont pas de parent', () => {
      const result = (repository as any).getParentIdField()
      expect(result).toBe('__none__')
    })
  })
})
