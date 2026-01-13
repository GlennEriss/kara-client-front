/**
 * Tests unitaires pour ProfessionRepository
 * 
 * Note: Ces tests mockent directement Firestore via vi.mock
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ProfessionRepository } from '../../repositories/ProfessionRepository'
import type { Profession } from '../../entities/profession.types'

// Mock de Firestore - Le repository utilise getFirestore() qui importe dynamiquement
const mockCollection = vi.fn()
const mockQuery = vi.fn()
const mockWhere = vi.fn()
const mockOrderBy = vi.fn()
const mockGetDocs = vi.fn()
const mockGetDoc = vi.fn()
const mockDoc = vi.fn()
const mockAddDoc = vi.fn()
const mockUpdateDoc = vi.fn()
const mockDeleteDoc = vi.fn()
const mockLimit = vi.fn()
const mockStartAfter = vi.fn()
const mockGetCountFromServer = vi.fn()
const mockServerTimestamp = vi.fn(() => ({ seconds: Date.now(), nanoseconds: 0 }))
const mockDb = {}

vi.mock('@/firebase/firestore', () => ({
  collection: mockCollection,
  query: mockQuery,
  where: mockWhere,
  orderBy: mockOrderBy,
  getDocs: mockGetDocs,
  getDoc: mockGetDoc,
  doc: mockDoc,
  addDoc: mockAddDoc,
  updateDoc: mockUpdateDoc,
  deleteDoc: mockDeleteDoc,
  limit: mockLimit,
  startAfter: mockStartAfter,
  getCountFromServer: mockGetCountFromServer,
  serverTimestamp: mockServerTimestamp,
  db: mockDb,
}))

vi.mock('@/constantes/firebase-collection-names', () => ({
  firebaseCollectionNames: {
    professions: 'professions',
  },
}))

describe('ProfessionRepository', () => {
  let repository: ProfessionRepository

  beforeEach(() => {
    repository = new ProfessionRepository()
    vi.clearAllMocks()
    
    // Setup defaults
    mockCollection.mockReturnValue({})
    mockQuery.mockImplementation((...args: any[]) => args)
    mockWhere.mockReturnValue({})
    mockOrderBy.mockReturnValue({})
    mockLimit.mockReturnValue({})
    mockStartAfter.mockReturnValue({})
    mockGetCountFromServer.mockResolvedValue({
      data: () => ({ count: 0 })
    })
  })

  describe('findByName', () => {
    it('devrait trouver une profession existante', async () => {
      const mockProfession = {
        id: 'prof-1',
        data: () => ({
          name: 'Ingénieur',
          normalizedName: 'ingenieur',
          category: 'Technique',
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() },
          createdBy: 'admin-1',
        }),
      }

      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [mockProfession],
      })

      const result = await repository.findByName('Ingénieur')

      expect(result.found).toBe(true)
      expect(result.profession?.name).toBe('Ingénieur')
    })

    it('devrait gérer les dates null ou undefined dans findByName', async () => {
      const mockProfession = {
        id: 'prof-1',
        data: () => ({
          name: 'Ingénieur',
          normalizedName: 'ingenieur',
          createdAt: null,
          updatedAt: undefined,
          createdBy: 'admin-1',
        }),
      }

      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [mockProfession],
      })

      const result = await repository.findByName('Ingénieur')

      expect(result.found).toBe(true)
      expect(result.profession?.createdAt).toBeInstanceOf(Date)
      expect(result.profession?.updatedAt).toBeInstanceOf(Date)
    })

    it('devrait retourner des suggestions si la profession n\'existe pas', async () => {
      const mockSuggestionsDocs = [
        {
          id: 'prof-1',
          data: () => ({ name: 'Ingénieur' }),
        },
        {
          id: 'prof-2',
          data: () => ({ name: 'Ingénieur Civil' }),
        },
      ]
      
      mockGetDocs
        .mockResolvedValueOnce({ empty: true, docs: [] }) // Exact match
        .mockResolvedValueOnce({
          empty: false,
          docs: mockSuggestionsDocs,
          forEach: (callback: any) => mockSuggestionsDocs.forEach(callback),
        }) // Suggestions

      const result = await repository.findByName('Ingén')

      expect(result.found).toBe(false)
      expect(result.suggestions).toHaveLength(2)
    })

    it('devrait gérer les erreurs et retourner un résultat vide', async () => {
      mockGetDocs.mockRejectedValue(new Error('Firestore error'))

      const result = await repository.findByName('Test')

      expect(result.found).toBe(false)
      expect(result.suggestions).toEqual([])
    })

    it('devrait limiter les suggestions à 5', async () => {
      const mockSuggestionsDocs = Array.from({ length: 10 }, (_, i) => ({
        id: `prof-${i}`,
        data: () => ({ name: `Profession ${i}` }),
      }))
      
      mockGetDocs
        .mockResolvedValueOnce({ empty: true, docs: [] })
        .mockResolvedValueOnce({
          empty: false,
          docs: mockSuggestionsDocs,
          forEach: (callback: any) => mockSuggestionsDocs.forEach(callback),
        })

      const result = await repository.findByName('Profession')

      expect(result.suggestions?.length).toBeLessThanOrEqual(5)
    })
  })

  describe('create', () => {
    it('devrait créer une nouvelle profession', async () => {
      const newProfessionData: Omit<Profession, 'id' | 'createdAt' | 'updatedAt'> = {
        name: 'Nouvelle Profession',
        normalizedName: 'nouvelle profession',
        category: 'Tech',
        createdBy: 'admin-1',
      }

      const mockDocRef = { id: 'prof-new' }
      const mockCollectionRef = {}
      mockCollection.mockReturnValue(mockCollectionRef)
      mockAddDoc.mockResolvedValue(mockDocRef)
      mockDoc.mockReturnValue({})
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: 'prof-new',
        data: () => ({
          ...newProfessionData,
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() },
        }),
      })

      const result = await repository.create(newProfessionData, 'admin-1')

      expect(result.id).toBe('prof-new')
      expect(result.name).toBe('Nouvelle Profession')
      expect(mockAddDoc).toHaveBeenCalled()
    })

    it('devrait créer une profession avec category et description', async () => {
      const newProfessionData: Omit<Profession, 'id' | 'createdAt' | 'updatedAt'> = {
        name: 'Nouvelle Profession',
        normalizedName: 'nouvelle profession',
        category: 'Technique',
        description: 'Description de la profession',
        createdBy: 'admin-1',
      }

      const mockDocRef = { id: 'prof-new' }
      mockCollection.mockReturnValue({})
      mockAddDoc.mockResolvedValue(mockDocRef)
      mockDoc.mockReturnValue({})
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: 'prof-new',
        data: () => ({
          ...newProfessionData,
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() },
        }),
      })

      const result = await repository.create(newProfessionData, 'admin-1')

      expect(result.id).toBe('prof-new')
      expect(result.category).toBe('Technique')
      expect(result.description).toBe('Description de la profession')
    })

    it('devrait lancer une erreur si getById retourne null après création', async () => {
      const newProfessionData: Omit<Profession, 'id' | 'createdAt' | 'updatedAt'> = {
        name: 'Nouvelle Profession',
        normalizedName: 'nouvelle profession',
        createdBy: 'admin-1',
      }

      const mockDocRef = { id: 'prof-new' }
      mockCollection.mockReturnValue({})
      mockAddDoc.mockResolvedValue(mockDocRef)
      mockDoc.mockReturnValue({})
      mockGetDoc.mockResolvedValue({
        exists: () => false,
      })

      await expect(repository.create(newProfessionData, 'admin-1')).rejects.toThrow()
    })

    it('devrait propager les erreurs lors de la création', async () => {
      const newProfessionData: Omit<Profession, 'id' | 'createdAt' | 'updatedAt'> = {
        name: 'Nouvelle Profession',
        normalizedName: 'nouvelle profession',
        createdBy: 'admin-1',
      }

      mockCollection.mockReturnValue({})
      mockAddDoc.mockRejectedValue(new Error('Firestore error'))

      await expect(repository.create(newProfessionData, 'admin-1')).rejects.toThrow()
    })
  })

  describe('getById', () => {
    it('devrait retourner une profession existante', async () => {
      mockDoc.mockReturnValue({})
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: 'prof-1',
        data: () => ({
          name: 'Ingénieur',
          normalizedName: 'ingenieur',
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() },
          createdBy: 'admin-1',
        }),
      })

      const result = await repository.getById('prof-1')

      expect(result).not.toBeNull()
      expect(result?.name).toBe('Ingénieur')
    })

    it('devrait retourner null si la profession n\'existe pas', async () => {
      mockDoc.mockReturnValue({})
      mockGetDoc.mockResolvedValue({
        exists: () => false,
      })

      const result = await repository.getById('prof-inexistant')

      expect(result).toBeNull()
    })

    it('devrait retourner null en cas d\'erreur', async () => {
      mockDoc.mockReturnValue({})
      mockGetDoc.mockRejectedValue(new Error('Firestore error'))

      const result = await repository.getById('prof-1')

      expect(result).toBeNull()
    })

    it('devrait gérer les dates null ou undefined', async () => {
      mockDoc.mockReturnValue({})
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: 'prof-1',
        data: () => ({
          name: 'Ingénieur',
          normalizedName: 'ingenieur',
          createdAt: null,
          updatedAt: undefined,
          createdBy: 'admin-1',
        }),
      })

      const result = await repository.getById('prof-1')

      expect(result).not.toBeNull()
      expect(result?.createdAt).toBeInstanceOf(Date)
      expect(result?.updatedAt).toBeInstanceOf(Date)
    })
  })

  describe('getAll', () => {
    it('devrait retourner toutes les professions sans filtres', async () => {
      const mockDocs = [
        {
          id: 'prof-1',
          data: () => ({
            name: 'Profession 1',
            normalizedName: 'profession 1',
            createdAt: { toDate: () => new Date() },
            updatedAt: { toDate: () => new Date() },
            createdBy: 'admin-1',
          }),
        },
      ]

      mockCollection.mockReturnValue({})
      mockGetDocs.mockResolvedValue({
        forEach: (callback: any) => mockDocs.forEach(callback),
      })

      const result = await repository.getAll()

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Profession 1')
    })

    it('devrait filtrer par recherche', async () => {
      const mockDocs = [
        {
          id: 'prof-1',
          data: () => ({
            name: 'Ingénieur',
            normalizedName: 'ingenieur',
            createdAt: { toDate: () => new Date() },
            updatedAt: { toDate: () => new Date() },
            createdBy: 'admin-1',
          }),
        },
      ]

      mockCollection.mockReturnValue({})
      mockGetDocs.mockResolvedValue({
        forEach: (callback: any) => mockDocs.forEach(callback),
      })

      const result = await repository.getAll({ search: 'Ingén' })

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Ingénieur')
    })

    it('devrait retourner un tableau vide en cas d\'erreur', async () => {
      mockCollection.mockReturnValue({})
      mockGetDocs.mockRejectedValue(new Error('Firestore error'))

      const result = await repository.getAll()

      expect(result).toEqual([])
    })
  })

  describe('getPaginated', () => {
    it('devrait retourner les professions paginées (page 1)', async () => {
      const mockDocs = [
        {
          id: 'prof-1',
          data: () => ({
            name: 'Profession 1',
            normalizedName: 'profession 1',
            createdAt: { toDate: () => new Date() },
            updatedAt: { toDate: () => new Date() },
            createdBy: 'admin-1',
          }),
        },
        {
          id: 'prof-2',
          data: () => ({
            name: 'Profession 2',
            normalizedName: 'profession 2',
            createdAt: { toDate: () => new Date() },
            updatedAt: { toDate: () => new Date() },
            createdBy: 'admin-1',
          }),
        },
      ]

      mockGetDocs.mockResolvedValue({
        docs: mockDocs,
        forEach: (callback: any) => mockDocs.forEach(callback),
      })
      
      mockGetCountFromServer.mockResolvedValue({
        data: () => ({ count: 2 })
      })

      const result = await repository.getPaginated({}, 1, 10)

      expect(result.data).toHaveLength(2)
      expect(result.pagination.currentPage).toBe(1)
      expect(result.pagination.totalItems).toBe(2)
      expect(mockLimit).toHaveBeenCalledWith(11) // limit + 1
    })

    it('devrait filtrer par recherche', async () => {
      const mockDocs = [
        {
          id: 'prof-1',
          data: () => ({
            name: 'Ingénieur',
            normalizedName: 'ingenieur',
            createdAt: { toDate: () => new Date() },
            updatedAt: { toDate: () => new Date() },
            createdBy: 'admin-1',
          }),
        },
      ]

      mockGetDocs.mockResolvedValue({
        docs: mockDocs,
        forEach: (callback: any) => mockDocs.forEach(callback),
      })
      
      mockGetCountFromServer.mockResolvedValue({
        data: () => ({ count: 1 })
      })

      const result = await repository.getPaginated({ search: 'Ingén' }, 1, 10)

      expect(result.data).toHaveLength(1)
      expect(result.data[0].name).toBe('Ingénieur')
    })

    it('devrait gérer la pagination avec hasNextPage et hasPrevPage', async () => {
      // Page 1 : 11 résultats (10 + 1 pour détecter la page suivante)
      const mockDocsPage1 = Array.from({ length: 11 }, (_, i) => ({
        id: `prof-${i}`,
        data: () => ({
          name: `Profession ${i}`,
          normalizedName: `profession ${i}`,
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() },
          createdBy: 'admin-1',
        }),
      }))

      // Page 2 : 5 résultats (pas de page suivante)
      const mockDocsPage2 = Array.from({ length: 5 }, (_, i) => ({
        id: `prof-${i + 10}`,
        data: () => ({
          name: `Profession ${i + 10}`,
          normalizedName: `profession ${i + 10}`,
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() },
          createdBy: 'admin-1',
        }),
      }))

      // Mock pour page 1
      mockGetDocs
        .mockResolvedValueOnce({
          docs: mockDocsPage1,
          forEach: (callback: any) => mockDocsPage1.forEach(callback),
        })
      
      mockGetCountFromServer.mockResolvedValue({
        data: () => ({ count: 15 })
      })

      const page1 = await repository.getPaginated({}, 1, 10)
      expect(page1.pagination.hasNextPage).toBe(true)
      expect(page1.pagination.hasPrevPage).toBe(false)
      expect(page1.data).toHaveLength(10)

      // Mock pour page 2 : besoin du curseur
      const mockCursorDoc = {
        id: 'prof-9',
        data: () => ({
          name: 'Profession 9',
          normalizedName: 'profession 9',
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() },
          createdBy: 'admin-1',
        }),
        exists: () => true,
      }

      mockDoc.mockReturnValue({})
      mockGetDoc.mockResolvedValue(mockCursorDoc)
      
      mockGetDocs.mockResolvedValueOnce({
        docs: mockDocsPage2,
        forEach: (callback: any) => mockDocsPage2.forEach(callback),
      })

      const page2 = await repository.getPaginated({}, 2, 10)
      expect(page2.pagination.hasNextPage).toBe(false)
      expect(page2.pagination.hasPrevPage).toBe(true)
      expect(page2.data).toHaveLength(5)
      expect(mockStartAfter).toHaveBeenCalled()
    })

    it('devrait retourner un résultat vide en cas d\'erreur', async () => {
      mockCollection.mockReturnValue({})
      mockGetDocs.mockRejectedValue(new Error('Firestore error'))

      const result = await repository.getPaginated({}, 1, 10)

      expect(result.data).toEqual([])
      expect(result.pagination.totalItems).toBe(0)
      expect(result.pagination.currentPage).toBe(1)
      expect(result.pagination.totalPages).toBe(1)
    })
    
    it('devrait gérer le cas où getCountFromServer échoue', async () => {
      const mockDocs = [
        {
          id: 'prof-1',
          data: () => ({
            name: 'Profession 1',
            normalizedName: 'profession 1',
            createdAt: { toDate: () => new Date() },
            updatedAt: { toDate: () => new Date() },
            createdBy: 'admin-1',
          }),
        },
      ]

      mockGetDocs.mockResolvedValue({
        docs: mockDocs,
        forEach: (callback: any) => mockDocs.forEach(callback),
      })
      
      // getCountFromServer échoue (pas d'index composite)
      mockGetCountFromServer.mockRejectedValue(new Error('No index'))

      const result = await repository.getPaginated({}, 1, 10)

      // Devrait estimer le total basé sur les résultats
      expect(result.data).toHaveLength(1)
      expect(result.pagination.totalItems).toBeGreaterThanOrEqual(1)
    })
  })

  describe('update', () => {
    it('devrait mettre à jour une profession', async () => {
      const mockDocData = {
        id: 'prof-1',
        data: () => ({
          name: 'Updated Profession',
          normalizedName: 'updated profession',
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() },
          createdBy: 'admin-1',
        }),
        exists: () => true,
      }

      mockDoc.mockReturnValue({})
      mockUpdateDoc.mockResolvedValue(undefined)
      mockGetDoc.mockResolvedValue(mockDocData)

      const result = await repository.update('prof-1', { name: 'Updated Profession' })

      expect(result?.name).toBe('Updated Profession')
      expect(mockUpdateDoc).toHaveBeenCalled()
    })

    it('devrait mettre à jour normalizedName si le nom change', async () => {
      const mockDocData = {
        id: 'prof-1',
        data: () => ({
          name: 'New Name',
          normalizedName: 'new name',
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() },
          createdBy: 'admin-1',
        }),
        exists: () => true,
      }

      mockDoc.mockReturnValue({})
      mockUpdateDoc.mockResolvedValue(undefined)
      mockGetDoc.mockResolvedValue(mockDocData)

      await repository.update('prof-1', { name: 'New Name' })

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ normalizedName: expect.any(String) })
      )
    })

    it('devrait propager les erreurs lors de la mise à jour', async () => {
      mockDoc.mockReturnValue({})
      mockUpdateDoc.mockRejectedValue(new Error('Firestore error'))

      await expect(repository.update('prof-1', { name: 'Updated' })).rejects.toThrow()
    })
  })

  describe('delete', () => {
    it('devrait supprimer une profession', async () => {
      mockDoc.mockReturnValue({})
      mockDeleteDoc.mockResolvedValue(undefined)

      await repository.delete('prof-1')

      expect(mockDeleteDoc).toHaveBeenCalled()
    })

    it('devrait propager les erreurs lors de la suppression', async () => {
      mockDoc.mockReturnValue({})
      mockDeleteDoc.mockRejectedValue(new Error('Firestore error'))

      await expect(repository.delete('prof-1')).rejects.toThrow()
    })
  })

  describe('findOrCreate', () => {
    it('devrait retourner la profession existante si trouvée', async () => {
      const mockProfession = {
        id: 'prof-1',
        data: () => ({
          name: 'Ingénieur',
          normalizedName: 'ingenieur',
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() },
          createdBy: 'admin-1',
        }),
      }

      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [mockProfession],
      })

      const result = await repository.findOrCreate('Ingénieur', 'admin-1')

      expect(result.isNew).toBe(false)
      expect(result.id).toBe('prof-1')
    })

    it('devrait créer une nouvelle profession si non trouvée', async () => {
      const mockDocRef = { id: 'prof-new' }
      
      mockGetDocs
        .mockResolvedValueOnce({ empty: true, docs: [] }) // findByName
        .mockResolvedValueOnce({ empty: true, docs: [] }) // suggestions
      
      mockAddDoc.mockResolvedValue(mockDocRef)
      mockDoc.mockReturnValue({})
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: 'prof-new',
        data: () => ({
          name: 'New Profession',
          normalizedName: 'new profession',
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() },
          createdBy: 'admin-1',
        }),
      })

      const result = await repository.findOrCreate('New Profession', 'admin-1')

      expect(result.isNew).toBe(true)
      expect(result.id).toBe('prof-new')
    })

    it('devrait créer une profession avec additionalData', async () => {
      const mockDocRef = { id: 'prof-new' }
      
      mockGetDocs
        .mockResolvedValueOnce({ empty: true, docs: [] })
        .mockResolvedValueOnce({ empty: true, docs: [] })
      
      mockAddDoc.mockResolvedValue(mockDocRef)
      mockDoc.mockReturnValue({})
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: 'prof-new',
        data: () => ({
          name: 'New Profession',
          normalizedName: 'new profession',
          category: 'Technique',
          description: 'Description',
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() },
          createdBy: 'admin-1',
        }),
      })

      const result = await repository.findOrCreate('New Profession', 'admin-1', {
        category: 'Technique',
        description: 'Description',
      })

      expect(result.isNew).toBe(true)
    })

    it('devrait propager les erreurs lors de la création', async () => {
      mockGetDocs
        .mockResolvedValueOnce({ empty: true, docs: [] }) // findByName exact
        .mockResolvedValueOnce({ empty: true, docs: [] }) // findByName suggestions
      
      mockCollection.mockReturnValue({})
      mockAddDoc.mockRejectedValue(new Error('Firestore error'))

      await expect(repository.findOrCreate('Test', 'admin-1')).rejects.toThrow()
    })
  })
})
