/**
 * Tests unitaires pour BirthdaysAlgoliaService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BirthdaysAlgoliaService } from '../BirthdaysAlgoliaService'

// Mock algoliasearch/lite
const mockSearch = vi.fn()
const mockClient = {
  search: mockSearch,
}

vi.mock('algoliasearch/lite', () => ({
  liteClient: vi.fn(() => mockClient),
}))

// Mock des variables d'environnement
vi.stubEnv('NEXT_PUBLIC_ALGOLIA_APP_ID', 'test-app-id')
vi.stubEnv('NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY', 'test-search-key')
vi.stubEnv('NEXT_PUBLIC_ALGOLIA_MEMBERS_INDEX_NAME', 'members')

describe('BirthdaysAlgoliaService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('search', () => {
    it('UNIT-BAS-01: devrait retourner les hits avec birthMonth', async () => {
      mockSearch.mockResolvedValue({
        results: [
          {
            hits: [
              {
                objectID: '1234.MK.567890',
                firstName: 'Jean',
                lastName: 'Dupont',
                birthMonth: 3,
                birthDay: 15,
                photoURL: 'https://example.com/photo.jpg',
              },
            ],
            nbHits: 1,
          },
        ],
      })

      const result = await BirthdaysAlgoliaService.search('Dupont')

      expect(result.hits).toHaveLength(1)
      expect(result.hits[0].objectID).toBe('1234.MK.567890')
      expect(result.hits[0].firstName).toBe('Jean')
      expect(result.hits[0].lastName).toBe('Dupont')
      expect(result.hits[0].birthMonth).toBe(3)
      expect(result.hits[0].birthDay).toBe(15)
      expect(result.targetMonth).toBe(3)
      expect(mockSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          requests: [
            expect.objectContaining({
              query: 'Dupont',
              filters: 'isActive:true AND (roles:"Adherant" OR roles:"Bienfaiteur" OR roles:"Sympathisant")',
            }),
          ],
        }),
      )
    })

    it('UNIT-BAS-02: devrait retourner targetMonth null si aucun résultat', async () => {
      mockSearch.mockResolvedValue({
        results: [
          {
            hits: [],
            nbHits: 0,
          },
        ],
      })

      const result = await BirthdaysAlgoliaService.search('XXXXXXX')

      expect(result.hits).toHaveLength(0)
      expect(result.targetMonth).toBeNull()
    })

    it('UNIT-BAS-03: devrait filtrer uniquement les membres actifs', async () => {
      mockSearch.mockResolvedValue({
        results: [
          {
            hits: [],
            nbHits: 0,
          },
        ],
      })

      await BirthdaysAlgoliaService.search('test')

      expect(mockSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          requests: [
            expect.objectContaining({
              filters: expect.stringContaining('isActive:true'),
            }),
          ],
        }),
      )
    })

    it('UNIT-BAS-04: devrait retourner targetMonth du premier hit', async () => {
      mockSearch.mockResolvedValue({
        results: [
          {
            hits: [
              {
                objectID: '1',
                firstName: 'Jean',
                lastName: 'Dupont',
                birthMonth: 5,
                birthDay: 10,
              },
              {
                objectID: '2',
                firstName: 'Marie',
                lastName: 'Martin',
                birthMonth: 8,
                birthDay: 20,
              },
            ],
            nbHits: 2,
          },
        ],
      })

      const result = await BirthdaysAlgoliaService.search('test')

      expect(result.targetMonth).toBe(5) // Premier hit
      expect(result.hits).toHaveLength(2)
    })

    it('devrait filtrer les hits sans birthMonth', async () => {
      mockSearch.mockResolvedValue({
        results: [
          {
            hits: [
              {
                objectID: '1',
                firstName: 'Jean',
                lastName: 'Dupont',
                birthMonth: 3,
                birthDay: 15,
              },
              {
                objectID: '2',
                firstName: 'Marie',
                lastName: 'Martin',
                // Pas de birthMonth
              },
            ],
            nbHits: 2,
          },
        ],
      })

      const result = await BirthdaysAlgoliaService.search('test')

      expect(result.hits).toHaveLength(1)
      expect(result.hits[0].objectID).toBe('1')
    })

    it('devrait retourner un résultat vide si query est vide', async () => {
      const result = await BirthdaysAlgoliaService.search('')

      expect(result.hits).toHaveLength(0)
      expect(result.targetMonth).toBeNull()
      expect(mockSearch).not.toHaveBeenCalled()
    })

    it('devrait gérer les erreurs Algolia', async () => {
      mockSearch.mockRejectedValue(new Error('Algolia error'))

      await expect(BirthdaysAlgoliaService.search('test')).rejects.toThrow('Algolia error')
    })
  })

  describe('isAvailable', () => {
    it('devrait retourner true si les variables d\'environnement sont définies', () => {
      expect(BirthdaysAlgoliaService.isAvailable()).toBe(true)
    })

    it('devrait retourner false si les variables d\'environnement sont manquantes', () => {
      vi.stubEnv('NEXT_PUBLIC_ALGOLIA_APP_ID', '')
      vi.stubEnv('NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY', '')

      // Recharger le module pour prendre en compte les nouvelles variables
      expect(BirthdaysAlgoliaService.isAvailable()).toBe(false)
    })
  })
})
