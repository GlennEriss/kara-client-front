/**
 * Tests unitaires pour AlgoliaSearchService
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AlgoliaSearchService, getAlgoliaSearchService } from '../AlgoliaSearchService'
import type { SearchOptions } from '../AlgoliaSearchService'

// Mock Algolia - créer un mock réutilisable
const mockSearch = vi.fn().mockResolvedValue({
  results: [{
    hits: [],
    nbHits: 0,
    nbPages: 0,
    page: 0,
  }],
})

vi.mock('algoliasearch/lite', () => {
  return {
    liteClient: vi.fn(() => ({
      search: mockSearch,
    })),
  }
})

// Mock Firestore
vi.mock('@/firebase/firestore', () => {
  return {
    db: {},
    collection: vi.fn(),
    getDocs: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
  }
})

// Mock constants
vi.mock('@/constantes/membership-requests', () => ({
  MEMBERSHIP_REQUEST_COLLECTIONS: {
    REQUESTS: 'membership-requests',
  },
}))

describe('AlgoliaSearchService', () => {
  let service: AlgoliaSearchService

  beforeEach(() => {
    // Réinitialiser les variables d'environnement
    process.env.NEXT_PUBLIC_ALGOLIA_APP_ID = 'test-app-id'
    process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY = 'test-search-key'
    process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME = 'membership-requests-dev'
    
    // Réinitialiser le mock
    mockSearch.mockResolvedValue({
      results: [{
        hits: [],
        nbHits: 0,
        nbPages: 0,
        page: 0,
      }],
    })
    
    service = new AlgoliaSearchService()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('search', () => {
    it('devrait retourner une réponse vide si aucun résultat', async () => {
      mockSearch.mockResolvedValue({
        results: [{
          hits: [],
          nbHits: 0,
          nbPages: 0,
          page: 0,
        }],
      })

      const options: SearchOptions = {
        query: 'test',
        page: 1,
        hitsPerPage: 20,
      }

      const result = await service.search(options)

      expect(result.items).toEqual([])
      expect(result.pagination.totalItems).toBe(0)
      expect(result.pagination.totalPages).toBe(0)
      expect(result.pagination.hasNextPage).toBe(false)
      expect(result.pagination.hasPrevPage).toBe(false)
    })

    it('devrait construire les filtres Algolia correctement', async () => {
      mockSearch.mockResolvedValue({
        results: [{
          hits: [],
          nbHits: 0,
          nbPages: 0,
          page: 0,
        }],
      })

      const options: SearchOptions = {
        query: 'test',
        filters: {
          isPaid: true,
          status: 'pending',
        },
        page: 1,
        hitsPerPage: 20,
      }

      await service.search(options)

      expect(mockSearch).toHaveBeenCalledWith({
        requests: [{
          indexName: 'membership-requests-dev',
          query: 'test',
          filters: 'isPaid:true AND status:"pending"',
          page: 0,
          hitsPerPage: 20,
          attributesToRetrieve: ['objectID'],
        }],
      })
    })

    it('devrait convertir la pagination de 0-based à 1-based', async () => {
      mockSearch.mockResolvedValue({
        results: [{
          hits: [{ objectID: 'req-1' }],
          nbHits: 50,
          nbPages: 3,
          page: 1, // Page 2 en 0-based
        }],
      })

      const { getDocs } = await import('@/firebase/firestore')
      vi.mocked(getDocs).mockResolvedValue({
        forEach: vi.fn((callback) => {
          callback({
            id: 'req-1',
            data: () => ({
              id: 'req-1',
              matricule: '1234.MK.5678',
              identity: {
                firstName: 'Jean',
                lastName: 'Dupont',
                email: 'jean@example.com',
                contacts: [],
              },
              status: 'pending',
              isPaid: false,
              createdAt: { toDate: () => new Date() },
              updatedAt: { toDate: () => new Date() },
            }),
          })
        }),
      } as any)

      const options: SearchOptions = {
        query: 'test',
        page: 2,
        hitsPerPage: 20,
      }

      const result = await service.search(options)

      expect(result.pagination.page).toBe(2) // Converti de 1-based à 1-based (page 2)
      expect(result.pagination.totalItems).toBe(50)
      expect(result.pagination.totalPages).toBe(3)
      expect(result.pagination.hasNextPage).toBe(true)
      expect(result.pagination.hasPrevPage).toBe(true)
    })
  })

  describe('getAlgoliaSearchService', () => {
    it('devrait retourner une instance singleton', () => {
      const instance1 = getAlgoliaSearchService()
      const instance2 = getAlgoliaSearchService()

      expect(instance1).toBe(instance2)
    })
  })
})
