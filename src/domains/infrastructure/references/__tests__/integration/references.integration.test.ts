/**
 * Tests d'intégration pour le module References
 * 
 * Teste l'intégration entre repositories, services et hooks
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CompanyRepository } from '../../repositories/CompanyRepository'
import { ProfessionRepository } from '../../repositories/ProfessionRepository'
import { CompanyService } from '../../services/CompanyService'
import { ProfessionService } from '../../services/ProfessionService'
import { CompanySuggestionsService } from '../../services/CompanySuggestionsService'

// Mock Firestore (similaire aux tests unitaires)
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
  serverTimestamp: mockServerTimestamp,
  db: mockDb,
}))

vi.mock('@/constantes/firebase-collection-names', () => ({
  firebaseCollectionNames: {
    companies: 'companies',
    professions: 'professions',
  },
}))

describe('References Integration Tests', () => {
  let companyRepository: CompanyRepository
  let professionRepository: ProfessionRepository
  let companyService: CompanyService
  let professionService: ProfessionService
  let companySuggestionsService: CompanySuggestionsService

  beforeEach(() => {
    companyRepository = new CompanyRepository()
    professionRepository = new ProfessionRepository()
    companyService = new CompanyService(companyRepository)
    professionService = new ProfessionService(professionRepository)
    companySuggestionsService = new CompanySuggestionsService(companyRepository)
    
    vi.clearAllMocks()
    mockCollection.mockReturnValue({})
    mockQuery.mockImplementation((...args: any[]) => args)
    mockWhere.mockReturnValue({})
    mockOrderBy.mockReturnValue({})
  })

  describe('Company Service + Repository Integration', () => {
    it('devrait créer une entreprise via le service qui utilise le repository', async () => {
      const mockDocRef = { id: 'comp-1' }
      const mockCollectionRef = {}
      mockCollection.mockReturnValue(mockCollectionRef)
      mockAddDoc.mockResolvedValue(mockDocRef)
      mockDoc.mockReturnValue({})
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: 'comp-1',
        data: () => ({
          name: 'Test Company',
          normalizedName: 'test company',
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() },
          createdBy: 'admin-1',
        }),
      })

      const result = await companyService.create({
        name: 'Test Company',
        normalizedName: 'test company',
        createdBy: 'admin-1',
      }, 'admin-1')

      expect(result.id).toBe('comp-1')
      expect(result.name).toBe('Test Company')
      expect(mockAddDoc).toHaveBeenCalled()
    })

    it('devrait rechercher une entreprise via le service', async () => {
      const mockCompany = {
        id: 'comp-1',
        data: () => ({
          name: 'Test Company',
          normalizedName: 'test company',
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() },
          createdBy: 'admin-1',
        }),
      }

      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [mockCompany],
      })

      const result = await companyService.findByName('Test Company')

      expect(result.found).toBe(true)
      expect(result.company?.name).toBe('Test Company')
    })
  })

  describe('Profession Service + Repository Integration', () => {
    it('devrait créer une profession via le service qui utilise le repository', async () => {
      const mockDocRef = { id: 'prof-1' }
      const mockCollectionRef = {}
      mockCollection.mockReturnValue(mockCollectionRef)
      mockAddDoc.mockResolvedValue(mockDocRef)
      mockDoc.mockReturnValue({})
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: 'prof-1',
        data: () => ({
          name: 'Test Profession',
          normalizedName: 'test profession',
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() },
          createdBy: 'admin-1',
        }),
      })

      const result = await professionService.create({
        name: 'Test Profession',
        normalizedName: 'test profession',
        createdBy: 'admin-1',
      }, 'admin-1')

      expect(result.id).toBe('prof-1')
      expect(result.name).toBe('Test Profession')
      expect(mockAddDoc).toHaveBeenCalled()
    })
  })

  describe('CompanySuggestionsService Integration', () => {
    it('devrait rechercher des entreprises et retourner des suggestions', async () => {
      const mockCompany = {
        id: 'comp-1',
        data: () => ({
          name: 'Total Gabon',
          normalizedName: 'total gabon',
          address: { province: 'Estuaire' },
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() },
          createdBy: 'admin-1',
        }),
      }

      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [mockCompany],
      })

      const suggestions = await companySuggestionsService.searchCompanies('Total')

      expect(suggestions.length).toBeGreaterThan(0)
      expect(suggestions[0].name).toBe('Total Gabon')
      expect(suggestions[0].isNew).toBe(false)
      expect(suggestions[0].hasAddress).toBe(true)
    })

    it('devrait charger l\'adresse d\'une entreprise', async () => {
      const mockCompany = {
        id: 'comp-1',
        data: () => ({
          name: 'Total Gabon',
          normalizedName: 'total gabon',
          address: {
            province: 'Estuaire',
            city: 'Libreville',
            district: 'Akanda',
          },
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() },
          createdBy: 'admin-1',
        }),
      }

      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [mockCompany],
      })

      const address = await companySuggestionsService.loadCompanyAddress('Total Gabon')

      expect(address).not.toBeNull()
      expect(address?.province).toBe('Estuaire')
      expect(address?.city).toBe('Libreville')
    })
  })
})
