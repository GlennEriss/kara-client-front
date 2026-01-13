/**
 * Tests unitaires pour CompanyRepository
 * 
 * Note: Ces tests mockent directement Firestore via vi.mock
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CompanyRepository } from '../../repositories/CompanyRepository'
import type { Company } from '../../entities/company.types'

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
    companies: 'companies',
  },
}))

describe('CompanyRepository', () => {
  let repository: CompanyRepository

  beforeEach(() => {
    repository = new CompanyRepository()
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
    it('devrait trouver une entreprise existante', async () => {
      const mockCompany = {
        id: 'comp-1',
        data: () => ({
          name: 'Total Gabon',
          normalizedName: 'total gabon',
          industry: 'Pétrole',
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() },
          createdBy: 'admin-1',
        }),
      }

      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [mockCompany],
      })

      const result = await repository.findByName('Total Gabon')

      expect(result.found).toBe(true)
      expect(result.company?.name).toBe('Total Gabon')
    })

    it('devrait gérer les dates null ou undefined dans findByName', async () => {
      const mockCompany = {
        id: 'comp-1',
        data: () => ({
          name: 'Total Gabon',
          normalizedName: 'total gabon',
          createdAt: null,
          updatedAt: undefined,
          createdBy: 'admin-1',
        }),
      }

      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [mockCompany],
      })

      const result = await repository.findByName('Total Gabon')

      expect(result.found).toBe(true)
      expect(result.company?.createdAt).toBeInstanceOf(Date)
      expect(result.company?.updatedAt).toBeInstanceOf(Date)
    })

    it('devrait retourner des suggestions si l\'entreprise n\'existe pas', async () => {
      const mockSuggestionsDocs = [
        {
          id: 'comp-1',
          data: () => ({ name: 'Total Gabon' }),
        },
        {
          id: 'comp-2',
          data: () => ({ name: 'Total Energie' }),
        },
      ]
      
      mockGetDocs
        .mockResolvedValueOnce({ empty: true, docs: [] }) // Exact match
        .mockResolvedValueOnce({
          empty: false,
          docs: mockSuggestionsDocs,
          forEach: (callback: any) => mockSuggestionsDocs.forEach(callback),
        }) // Suggestions

      const result = await repository.findByName('Total')

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
        id: `comp-${i}`,
        data: () => ({ name: `Company ${i}` }),
      }))
      
      mockGetDocs
        .mockResolvedValueOnce({ empty: true, docs: [] })
        .mockResolvedValueOnce({
          empty: false,
          docs: mockSuggestionsDocs,
          forEach: (callback: any) => mockSuggestionsDocs.forEach(callback),
        })

      const result = await repository.findByName('Company')

      expect(result.suggestions?.length).toBeLessThanOrEqual(5)
    })
  })

  describe('create', () => {
    it('devrait créer une nouvelle entreprise', async () => {
      const newCompanyData: Omit<Company, 'id' | 'createdAt' | 'updatedAt'> = {
        name: 'Nouvelle Entreprise',
        normalizedName: 'nouvelle entreprise',
        industry: 'Tech',
        createdBy: 'admin-1',
      }

      const mockDocRef = { id: 'comp-new' }
      const mockCollectionRef = {}
      mockCollection.mockReturnValue(mockCollectionRef)
      mockAddDoc.mockResolvedValue(mockDocRef)
      mockDoc.mockReturnValue({})
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: 'comp-new',
        data: () => ({
          ...newCompanyData,
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() },
        }),
      })

      const result = await repository.create(newCompanyData, 'admin-1')

      expect(result.id).toBe('comp-new')
      expect(result.name).toBe('Nouvelle Entreprise')
      expect(mockAddDoc).toHaveBeenCalled()
    })

    it('devrait créer une entreprise avec adresse et employeeCount', async () => {
      const newCompanyData: Omit<Company, 'id' | 'createdAt' | 'updatedAt'> = {
        name: 'Nouvelle Entreprise',
        normalizedName: 'nouvelle entreprise',
        address: {
          province: 'Estuaire',
          city: 'Libreville',
        },
        employeeCount: 100,
        createdBy: 'admin-1',
      }

      const mockDocRef = { id: 'comp-new' }
      mockCollection.mockReturnValue({})
      mockAddDoc.mockResolvedValue(mockDocRef)
      mockDoc.mockReturnValue({})
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: 'comp-new',
        data: () => ({
          ...newCompanyData,
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() },
        }),
      })

      const result = await repository.create(newCompanyData, 'admin-1')

      expect(result.id).toBe('comp-new')
      expect(result.address).toBeDefined()
      expect(result.employeeCount).toBe(100)
    })

    it('devrait lancer une erreur si getById retourne null après création', async () => {
      const newCompanyData: Omit<Company, 'id' | 'createdAt' | 'updatedAt'> = {
        name: 'Nouvelle Entreprise',
        normalizedName: 'nouvelle entreprise',
        createdBy: 'admin-1',
      }

      const mockDocRef = { id: 'comp-new' }
      mockCollection.mockReturnValue({})
      mockAddDoc.mockResolvedValue(mockDocRef)
      mockDoc.mockReturnValue({})
      mockGetDoc.mockResolvedValue({
        exists: () => false,
      })

      await expect(repository.create(newCompanyData, 'admin-1')).rejects.toThrow()
    })

    it('devrait propager les erreurs lors de la création', async () => {
      const newCompanyData: Omit<Company, 'id' | 'createdAt' | 'updatedAt'> = {
        name: 'Nouvelle Entreprise',
        normalizedName: 'nouvelle entreprise',
        createdBy: 'admin-1',
      }

      mockCollection.mockReturnValue({})
      mockAddDoc.mockRejectedValue(new Error('Firestore error'))

      await expect(repository.create(newCompanyData, 'admin-1')).rejects.toThrow()
    })
  })

  describe('getById', () => {
    it('devrait retourner une entreprise existante', async () => {
      mockDoc.mockReturnValue({})
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: 'comp-1',
        data: () => ({
          name: 'Total Gabon',
          normalizedName: 'total gabon',
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() },
          createdBy: 'admin-1',
        }),
      })

      const result = await repository.getById('comp-1')

      expect(result).not.toBeNull()
      expect(result?.name).toBe('Total Gabon')
    })

    it('devrait retourner null si l\'entreprise n\'existe pas', async () => {
      mockDoc.mockReturnValue({})
      mockGetDoc.mockResolvedValue({
        exists: () => false,
      })

      const result = await repository.getById('comp-inexistant')

      expect(result).toBeNull()
    })

    it('devrait retourner null en cas d\'erreur', async () => {
      mockDoc.mockReturnValue({})
      mockGetDoc.mockRejectedValue(new Error('Firestore error'))

      const result = await repository.getById('comp-1')

      expect(result).toBeNull()
    })

    it('devrait gérer les dates null ou undefined', async () => {
      mockDoc.mockReturnValue({})
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: 'comp-1',
        data: () => ({
          name: 'Total Gabon',
          normalizedName: 'total gabon',
          createdAt: null,
          updatedAt: undefined,
          createdBy: 'admin-1',
        }),
      })

      const result = await repository.getById('comp-1')

      expect(result).not.toBeNull()
      expect(result?.createdAt).toBeInstanceOf(Date)
      expect(result?.updatedAt).toBeInstanceOf(Date)
    })
  })

  describe('getAll', () => {
    it('devrait retourner toutes les entreprises sans filtres', async () => {
      const mockDocs = [
        {
          id: 'comp-1',
          data: () => ({
            name: 'Company 1',
            normalizedName: 'company 1',
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
      expect(result[0].name).toBe('Company 1')
    })

    it('devrait filtrer par recherche', async () => {
      const mockDocs = [
        {
          id: 'comp-1',
          data: () => ({
            name: 'Total Gabon',
            normalizedName: 'total gabon',
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

      const result = await repository.getAll({ search: 'Total' })

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Total Gabon')
    })

    it('devrait retourner un tableau vide en cas d\'erreur', async () => {
      mockCollection.mockReturnValue({})
      mockGetDocs.mockRejectedValue(new Error('Firestore error'))

      const result = await repository.getAll()

      expect(result).toEqual([])
    })
  })

  describe('getPaginated', () => {
    it('devrait retourner les entreprises paginées (page 1)', async () => {
      const mockDocs = [
        {
          id: 'comp-1',
          data: () => ({
            name: 'Company 1',
            normalizedName: 'company 1',
            createdAt: { toDate: () => new Date() },
            updatedAt: { toDate: () => new Date() },
            createdBy: 'admin-1',
          }),
        },
        {
          id: 'comp-2',
          data: () => ({
            name: 'Company 2',
            normalizedName: 'company 2',
            createdAt: { toDate: () => new Date() },
            updatedAt: { toDate: () => new Date() },
            createdBy: 'admin-1',
          }),
        },
      ]

      // Mock pour page 1 : limit(11) retourne 2 docs (pas de page suivante)
      mockGetDocs.mockResolvedValue({
        docs: mockDocs,
        forEach: (callback: any) => mockDocs.forEach(callback),
      })
      
      // Mock getCountFromServer pour retourner le total
      mockGetCountFromServer.mockResolvedValue({
        data: () => ({ count: 2 })
      })

      const result = await repository.getPaginated({}, 1, 10)

      expect(result.data).toHaveLength(2)
      expect(result.pagination.currentPage).toBe(1)
      expect(result.pagination.totalItems).toBe(2)
      expect(result.pagination.hasNextPage).toBe(false)
      expect(mockLimit).toHaveBeenCalledWith(11) // limit + 1
    })

    it('devrait filtrer par recherche', async () => {
      const mockDocs = [
        {
          id: 'comp-1',
          data: () => ({
            name: 'Total Gabon',
            normalizedName: 'total gabon',
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

      const result = await repository.getPaginated({ search: 'Total' }, 1, 10)

      expect(result.data).toHaveLength(1)
      expect(result.data[0].name).toBe('Total Gabon')
    })

    it('devrait gérer la pagination avec hasNextPage et hasPrevPage', async () => {
      // Page 1 : 11 résultats (10 + 1 pour détecter la page suivante)
      const mockDocsPage1 = Array.from({ length: 11 }, (_, i) => ({
        id: `comp-${i}`,
        data: () => ({
          name: `Company ${i}`,
          normalizedName: `company ${i}`,
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() },
          createdBy: 'admin-1',
        }),
      }))

      // Page 2 : 5 résultats (pas de page suivante)
      const mockDocsPage2 = Array.from({ length: 5 }, (_, i) => ({
        id: `comp-${i + 10}`,
        data: () => ({
          name: `Company ${i + 10}`,
          normalizedName: `company ${i + 10}`,
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
        id: 'comp-9',
        data: () => ({
          name: 'Company 9',
          normalizedName: 'company 9',
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
          id: 'comp-1',
          data: () => ({
            name: 'Company 1',
            normalizedName: 'company 1',
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
    it('devrait mettre à jour une entreprise', async () => {
      const mockDocData = {
        id: 'comp-1',
        data: () => ({
          name: 'Updated Company',
          normalizedName: 'updated company',
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() },
          createdBy: 'admin-1',
        }),
        exists: () => true,
      }

      mockDoc.mockReturnValue({})
      mockUpdateDoc.mockResolvedValue(undefined)
      mockGetDoc.mockResolvedValue(mockDocData)

      const result = await repository.update('comp-1', { name: 'Updated Company' })

      expect(result?.name).toBe('Updated Company')
      expect(mockUpdateDoc).toHaveBeenCalled()
    })

    it('devrait mettre à jour normalizedName si le nom change', async () => {
      const mockDocData = {
        id: 'comp-1',
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

      await repository.update('comp-1', { name: 'New Name' })

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ normalizedName: expect.any(String) })
      )
    })

    it('devrait propager les erreurs lors de la mise à jour', async () => {
      mockDoc.mockReturnValue({})
      mockUpdateDoc.mockRejectedValue(new Error('Firestore error'))

      await expect(repository.update('comp-1', { name: 'Updated' })).rejects.toThrow()
    })
  })

  describe('delete', () => {
    it('devrait supprimer une entreprise', async () => {
      mockDoc.mockReturnValue({})
      mockDeleteDoc.mockResolvedValue(undefined)

      await repository.delete('comp-1')

      expect(mockDeleteDoc).toHaveBeenCalled()
    })

    it('devrait propager les erreurs lors de la suppression', async () => {
      mockDoc.mockReturnValue({})
      mockDeleteDoc.mockRejectedValue(new Error('Firestore error'))

      await expect(repository.delete('comp-1')).rejects.toThrow()
    })
  })

  describe('findOrCreate', () => {
    it('devrait retourner l\'entreprise existante si trouvée', async () => {
      const mockCompany = {
        id: 'comp-1',
        data: () => ({
          name: 'Total Gabon',
          normalizedName: 'total gabon',
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() },
          createdBy: 'admin-1',
        }),
      }

      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [mockCompany],
      })

      const result = await repository.findOrCreate('Total Gabon', 'admin-1')

      expect(result.isNew).toBe(false)
      expect(result.id).toBe('comp-1')
    })

    it('devrait créer une nouvelle entreprise si non trouvée', async () => {
      const mockDocRef = { id: 'comp-new' }
      
      mockGetDocs
        .mockResolvedValueOnce({ empty: true, docs: [] }) // findByName
        .mockResolvedValueOnce({ empty: true, docs: [] }) // suggestions
      
      mockAddDoc.mockResolvedValue(mockDocRef)
      mockDoc.mockReturnValue({})
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: 'comp-new',
        data: () => ({
          name: 'New Company',
          normalizedName: 'new company',
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() },
          createdBy: 'admin-1',
        }),
      })

      const result = await repository.findOrCreate('New Company', 'admin-1')

      expect(result.isNew).toBe(true)
      expect(result.id).toBe('comp-new')
    })

    it('devrait créer une entreprise avec additionalData', async () => {
      const mockDocRef = { id: 'comp-new' }
      
      mockGetDocs
        .mockResolvedValueOnce({ empty: true, docs: [] })
        .mockResolvedValueOnce({ empty: true, docs: [] })
      
      mockAddDoc.mockResolvedValue(mockDocRef)
      mockDoc.mockReturnValue({})
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: 'comp-new',
        data: () => ({
          name: 'New Company',
          normalizedName: 'new company',
          address: { province: 'Estuaire' },
          industry: 'Tech',
          employeeCount: 50,
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() },
          createdBy: 'admin-1',
        }),
      })

      const result = await repository.findOrCreate('New Company', 'admin-1', {
        address: { province: 'Estuaire' },
        industry: 'Tech',
        employeeCount: 50,
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
