/**
 * Tests unitaires pour MembersRepositoryV2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MembersRepositoryV2 } from '../../../repositories/MembersRepositoryV2'
import type { UserFilters } from '@/types/types'
import type { PaginatedMembers } from '@/db/member.db'

// Mock getMembers et getMemberWithSubscription
const mockGetMembers = vi.fn()
const mockGetMemberWithSubscription = vi.fn()

vi.mock('@/db/member.db', () => ({
  getMembers: (...args: unknown[]) => mockGetMembers(...args),
  getMemberWithSubscription: (...args: unknown[]) => mockGetMemberWithSubscription(...args),
}))

// Mock Algolia Service
const mockAlgoliaService = {
  isAvailable: vi.fn(() => true),
  search: vi.fn(),
}

const mockGetMembersAlgoliaSearchService = vi.fn(() => mockAlgoliaService)

vi.mock('@/services/search/MembersAlgoliaSearchService', () => ({
  getMembersAlgoliaSearchService: () => mockGetMembersAlgoliaSearchService(),
}))

describe('MembersRepositoryV2', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset singleton instance
    ;(MembersRepositoryV2 as any).instance = undefined
  })

  describe('getInstance', () => {
    it('devrait retourner une instance singleton', () => {
      const instance1 = MembersRepositoryV2.getInstance()
      const instance2 = MembersRepositoryV2.getInstance()
      
      expect(instance1).toBe(instance2)
      expect(instance1).toBeInstanceOf(MembersRepositoryV2)
    })
  })

  describe('getAll', () => {
    it('devrait utiliser Firestore si pas de searchQuery', async () => {
      const mockResult: PaginatedMembers = {
        data: [],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          itemsPerPage: 12,
          hasNextPage: false,
          hasPrevPage: false,
          nextCursor: null,
          prevCursor: null,
        },
      }
      
      mockGetMembers.mockResolvedValue(mockResult)
      
      const repository = MembersRepositoryV2.getInstance()
      const filters: UserFilters = { membershipType: ['adherant'] }
      const result = await repository.getAll(filters, 1, 12)
      
      expect(mockGetMembers).toHaveBeenCalledWith(filters, 1, 12, undefined)
      expect(result).toEqual(mockResult)
    })

    it('devrait utiliser Firestore si searchQuery est vide', async () => {
      const mockResult: PaginatedMembers = {
        data: [],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          itemsPerPage: 12,
          hasNextPage: false,
          hasPrevPage: false,
          nextCursor: null,
          prevCursor: null,
        },
      }
      
      mockGetMembers.mockResolvedValue(mockResult)
      
      const repository = MembersRepositoryV2.getInstance()
      const filters: UserFilters = { searchQuery: '   ' } // Espaces uniquement
      const result = await repository.getAll(filters, 1, 12)
      
      expect(mockGetMembers).toHaveBeenCalledWith(filters, 1, 12, undefined)
      expect(result).toEqual(mockResult)
    })

    it('devrait utiliser Algolia si searchQuery est présent', async () => {
      const mockAlgoliaResult = {
        items: [
          { id: 'user1', firstName: 'John', lastName: 'Doe' },
          { id: 'user2', firstName: 'Jane', lastName: 'Smith' },
        ],
        pagination: {
          page: 1,
          totalPages: 1,
          totalItems: 2,
          limit: 12,
          hasNextPage: false,
          hasPrevPage: false,
        },
      }
      
      const mockEnrichedMembers = [
        {
          id: 'user1',
          firstName: 'John',
          lastName: 'Doe',
          lastSubscription: null,
          isSubscriptionValid: false,
        },
        {
          id: 'user2',
          firstName: 'Jane',
          lastName: 'Smith',
          lastSubscription: null,
          isSubscriptionValid: false,
        },
      ]
      
      mockAlgoliaService.search.mockResolvedValue(mockAlgoliaResult)
      mockGetMemberWithSubscription
        .mockResolvedValueOnce(mockEnrichedMembers[0])
        .mockResolvedValueOnce(mockEnrichedMembers[1])
      
      const repository = MembersRepositoryV2.getInstance()
      const filters: UserFilters = { searchQuery: 'John' }
      const result = await repository.getAll(filters, 1, 12)
      
      expect(mockAlgoliaService.search).toHaveBeenCalled()
      expect(mockGetMemberWithSubscription).toHaveBeenCalledTimes(2)
      expect(result.data).toHaveLength(2)
      expect(result.pagination.currentPage).toBe(1)
    })

    it('devrait passer le cursor à Firestore si fourni', async () => {
      const mockCursor = { id: 'cursor123' } as any
      const mockResult: PaginatedMembers = {
        data: [],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          itemsPerPage: 12,
          hasNextPage: false,
          hasPrevPage: false,
          nextCursor: null,
          prevCursor: null,
        },
      }
      
      mockGetMembers.mockResolvedValue(mockResult)
      
      const repository = MembersRepositoryV2.getInstance()
      const filters: UserFilters = {}
      await repository.getAll(filters, 1, 12, mockCursor)
      
      expect(mockGetMembers).toHaveBeenCalledWith(filters, 1, 12, mockCursor)
    })
  })

  describe('getAllWithAlgolia', () => {
    beforeEach(() => {
      // Réinitialiser isAvailable à true par défaut pour les tests Algolia
      mockAlgoliaService.isAvailable.mockReturnValue(true)
    })

    it('devrait fallback vers Firestore si Algolia n\'est pas disponible', async () => {
      mockAlgoliaService.isAvailable.mockReturnValue(false)
      const mockResult: PaginatedMembers = {
        data: [],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          itemsPerPage: 12,
          hasNextPage: false,
          hasPrevPage: false,
          nextCursor: null,
          prevCursor: null,
        },
      }
      
      mockGetMembers.mockResolvedValue(mockResult)
      
      const repository = MembersRepositoryV2.getInstance()
      const filters: UserFilters = { searchQuery: 'test' }
      const result = await repository.getAll(filters, 1, 12)
      
      expect(mockAlgoliaService.isAvailable).toHaveBeenCalled()
      expect(mockGetMembers).toHaveBeenCalledWith(filters, 1, 12)
      expect(result).toEqual(mockResult)
    })

    it('devrait combiner searchQuery, companyName, profession et district dans la query Algolia', async () => {
      mockAlgoliaService.isAvailable.mockReturnValue(true)
      const mockAlgoliaResult = {
        items: [],
        pagination: {
          page: 1,
          totalPages: 0,
          totalItems: 0,
          limit: 12,
          hasNextPage: false,
          hasPrevPage: false,
        },
      }
      
      mockAlgoliaService.search.mockResolvedValue(mockAlgoliaResult)
      mockGetMemberWithSubscription.mockResolvedValue(null)
      
      const repository = MembersRepositoryV2.getInstance()
      const filters: UserFilters = {
        searchQuery: 'John',
        companyName: 'Acme Corp',
        profession: 'Engineer',
        district: 'District 1',
      }
      
      await repository.getAll(filters, 1, 12)
      
      expect(mockAlgoliaService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'John Acme Corp Engineer District 1',
        })
      )
    })

    it('devrait mapper les filtres UserFilters vers MembersSearchFilters', async () => {
      mockAlgoliaService.isAvailable.mockReturnValue(true)
      const mockAlgoliaResult = {
        items: [],
        pagination: {
          page: 1,
          totalPages: 0,
          totalItems: 0,
          limit: 12,
          hasNextPage: false,
          hasPrevPage: false,
        },
      }
      
      mockAlgoliaService.search.mockResolvedValue(mockAlgoliaResult)
      mockGetMemberWithSubscription.mockResolvedValue(null)
      
      const repository = MembersRepositoryV2.getInstance()
      const filters: UserFilters = {
        searchQuery: 'test',
        membershipType: ['adherant'],
        roles: ['Adherant'],
        isActive: true,
        hasCar: false,
        province: 'Estuaire',
        city: 'Libreville',
        arrondissement: 'Arrondissement 1',
      }
      
      await repository.getAll(filters, 1, 12)
      
      expect(mockAlgoliaService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: expect.objectContaining({
            membershipType: 'adherant',
            roles: ['Adherant'],
            isActive: true,
            hasCar: false,
            province: 'Estuaire',
            city: 'Libreville',
            arrondissement: 'Arrondissement 1',
          }),
        })
      )
    })

    it('devrait utiliser name_asc si orderByField est lastName et orderByDirection est asc', async () => {
      mockAlgoliaService.isAvailable.mockReturnValue(true)
      const mockAlgoliaResult = {
        items: [],
        pagination: {
          page: 1,
          totalPages: 0,
          totalItems: 0,
          limit: 12,
          hasNextPage: false,
          hasPrevPage: false,
        },
      }
      
      mockAlgoliaService.search.mockResolvedValue(mockAlgoliaResult)
      mockGetMemberWithSubscription.mockResolvedValue(null)
      
      const repository = MembersRepositoryV2.getInstance()
      const filters: UserFilters = {
        searchQuery: 'test',
        orderByField: 'lastName',
        orderByDirection: 'asc',
      }
      
      await repository.getAll(filters, 1, 12)
      
      expect(mockAlgoliaService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: 'name_asc',
        })
      )
    })

    it('devrait utiliser created_desc par défaut pour le tri', async () => {
      mockAlgoliaService.isAvailable.mockReturnValue(true)
      const mockAlgoliaResult = {
        items: [],
        pagination: {
          page: 1,
          totalPages: 0,
          totalItems: 0,
          limit: 12,
          hasNextPage: false,
          hasPrevPage: false,
        },
      }
      
      mockAlgoliaService.search.mockResolvedValue(mockAlgoliaResult)
      mockGetMemberWithSubscription.mockResolvedValue(null)
      
      const repository = MembersRepositoryV2.getInstance()
      const filters: UserFilters = {
        searchQuery: 'test',
      }
      
      await repository.getAll(filters, 1, 12)
      
      expect(mockAlgoliaService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: 'created_desc',
        })
      )
    })

    it('devrait enrichir les résultats Algolia avec les abonnements', async () => {
      mockAlgoliaService.isAvailable.mockReturnValue(true)
      const mockAlgoliaResult = {
        items: [
          { id: 'user1', firstName: 'John', lastName: 'Doe' },
          { id: 'user2', firstName: 'Jane', lastName: 'Smith' },
        ],
        pagination: {
          page: 1,
          totalPages: 1,
          totalItems: 2,
          limit: 12,
          hasNextPage: false,
          hasPrevPage: false,
        },
      }
      
      const mockEnrichedMember1 = {
        id: 'user1',
        firstName: 'John',
        lastName: 'Doe',
        lastSubscription: { id: 'sub1', type: 'adherant' },
        isSubscriptionValid: true,
      }
      
      const mockEnrichedMember2 = {
        id: 'user2',
        firstName: 'Jane',
        lastName: 'Smith',
        lastSubscription: null,
        isSubscriptionValid: false,
      }
      
      mockAlgoliaService.search.mockResolvedValue(mockAlgoliaResult)
      mockGetMemberWithSubscription
        .mockResolvedValueOnce(mockEnrichedMember1)
        .mockResolvedValueOnce(mockEnrichedMember2)
      
      const repository = MembersRepositoryV2.getInstance()
      const filters: UserFilters = { searchQuery: 'test' }
      const result = await repository.getAll(filters, 1, 12)
      
      expect(mockGetMemberWithSubscription).toHaveBeenCalledWith('user1')
      expect(mockGetMemberWithSubscription).toHaveBeenCalledWith('user2')
      expect(result.data).toEqual([mockEnrichedMember1, mockEnrichedMember2])
    })

    it('devrait filtrer les membres null après enrichissement', async () => {
      mockAlgoliaService.isAvailable.mockReturnValue(true)
      const mockAlgoliaResult = {
        items: [
          { id: 'user1', firstName: 'John', lastName: 'Doe' },
          { id: 'user2', firstName: 'Jane', lastName: 'Smith' },
        ],
        pagination: {
          page: 1,
          totalPages: 1,
          totalItems: 2,
          limit: 12,
          hasNextPage: false,
          hasPrevPage: false,
        },
      }
      
      const mockEnrichedMember1 = {
        id: 'user1',
        firstName: 'John',
        lastName: 'Doe',
        lastSubscription: null,
        isSubscriptionValid: false,
      }
      
      mockAlgoliaService.search.mockResolvedValue(mockAlgoliaResult)
      mockGetMemberWithSubscription
        .mockResolvedValueOnce(mockEnrichedMember1)
        .mockResolvedValueOnce(null) // user2 retourne null
      
      const repository = MembersRepositoryV2.getInstance()
      const filters: UserFilters = { searchQuery: 'test' }
      const result = await repository.getAll(filters, 1, 12)
      
      expect(result.data).toHaveLength(1)
      expect(result.data[0]).toEqual(mockEnrichedMember1)
    })

    it('devrait convertir la pagination Algolia vers PaginatedMembers', async () => {
      mockAlgoliaService.isAvailable.mockReturnValue(true)
      const mockAlgoliaResult = {
        items: [],
        pagination: {
          page: 2,
          totalPages: 5,
          totalItems: 50,
          limit: 12,
          hasNextPage: true,
          hasPrevPage: true,
        },
      }
      
      mockAlgoliaService.search.mockResolvedValue(mockAlgoliaResult)
      mockGetMemberWithSubscription.mockResolvedValue(null)
      
      const repository = MembersRepositoryV2.getInstance()
      const filters: UserFilters = { searchQuery: 'test' }
      const result = await repository.getAll(filters, 2, 12)
      
      expect(result.pagination).toEqual({
        currentPage: 2,
        totalPages: 5,
        totalItems: 50,
        itemsPerPage: 12,
        hasNextPage: true,
        hasPrevPage: true,
        nextCursor: null,
        prevCursor: null,
      })
    })

    it('devrait fallback vers Firestore en cas d\'erreur Algolia', async () => {
      mockAlgoliaService.isAvailable.mockReturnValue(true)
      const mockResult: PaginatedMembers = {
        data: [],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          itemsPerPage: 12,
          hasNextPage: false,
          hasPrevPage: false,
          nextCursor: null,
          prevCursor: null,
        },
      }
      
      mockAlgoliaService.search.mockRejectedValue(new Error('Algolia error'))
      mockGetMembers.mockResolvedValue(mockResult)
      
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      const repository = MembersRepositoryV2.getInstance()
      const filters: UserFilters = { searchQuery: 'test' }
      const result = await repository.getAll(filters, 1, 12)
      
      expect(consoleErrorSpy).toHaveBeenCalled()
      expect(mockGetMembers).toHaveBeenCalledWith(filters, 1, 12)
      expect(result).toEqual(mockResult)
      
      consoleErrorSpy.mockRestore()
    })
  })
})
