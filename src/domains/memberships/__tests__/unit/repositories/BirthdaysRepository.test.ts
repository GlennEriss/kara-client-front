/**
 * Tests unitaires pour BirthdaysRepository
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BirthdaysRepository } from '../../../repositories/BirthdaysRepository'
import { BirthdaysService } from '../../../services/BirthdaysService'
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  getCountFromServer,
} from 'firebase/firestore'
import { createBirthdayFixture } from '../../fixtures/birthday.fixture'
import type { User } from '@/types/types'

/**
 * Helper pour créer un objet User complet pour les tests
 */
function createMockUser(overrides: Partial<User & { birthMonth?: number; birthDay?: number; birthDayOfYear?: number }> = {}): User & { birthMonth?: number; birthDay?: number; birthDayOfYear?: number } {
  return {
    id: overrides.id || 'test-user-id',
    matricule: overrides.matricule || '1234.MK.567890',
    firstName: overrides.firstName || 'Jean',
    lastName: overrides.lastName || 'Dupont',
    birthDate: overrides.birthDate || '1990-01-15',
    contacts: overrides.contacts || [],
    gender: overrides.gender || 'Homme',
    nationality: overrides.nationality || 'Gabonaise',
    hasCar: overrides.hasCar ?? false,
    address: overrides.address || {
      province: '',
      city: '',
      district: '',
      arrondissement: '',
    },
    subscriptions: overrides.subscriptions || [],
    dossier: overrides.dossier || '',
    membershipType: overrides.membershipType || 'adherant',
    roles: overrides.roles || ['Adherant'],
    createdAt: overrides.createdAt || new Date(),
    updatedAt: overrides.updatedAt || new Date(),
    isActive: overrides.isActive ?? true,
    birthMonth: overrides.birthMonth,
    birthDay: overrides.birthDay,
    birthDayOfYear: overrides.birthDayOfYear,
    ...overrides,
  }
}

// Mock Firebase
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  getDocs: vi.fn(),
  getCountFromServer: vi.fn(),
}))

vi.mock('@/firebase/firestore', () => ({
  db: {},
}))

vi.mock('@/constantes/firebase-collection-names', () => ({
  firebaseCollectionNames: {
    users: 'users',
  },
}))

// Mock BirthdaysService
vi.mock('../../../services/BirthdaysService', () => ({
  BirthdaysService: {
    calculateDayOfYear: vi.fn((date: Date) => {
      const start = new Date(date.getFullYear(), 0, 0)
      const diff = date.getTime() - start.getTime()
      return Math.floor(diff / (1000 * 60 * 60 * 24))
    }),
    transformToBirthdayMember: vi.fn((user: User & { birthMonth?: number; birthDay?: number; birthDayOfYear?: number }, year?: number) => {
      const extendedUser = user as User & { birthMonth?: number; birthDay?: number; birthDayOfYear?: number }
      return createBirthdayFixture({
        id: extendedUser.id,
        matricule: extendedUser.matricule,
        firstName: extendedUser.firstName,
        lastName: extendedUser.lastName,
        birthDate: extendedUser.birthDate,
        birthMonth: extendedUser.birthMonth || 1,
        birthDay: extendedUser.birthDay || 1,
      })
    }),
  },
}))

describe('BirthdaysRepository', () => {
  let repository: BirthdaysRepository
  let mockGetDocs: any
  let mockGetCountFromServer: any

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset instance pour chaque test
    ;(BirthdaysRepository as any).instance = null
    repository = BirthdaysRepository.getInstance()

    mockGetDocs = vi.mocked(getDocs)
    mockGetCountFromServer = vi.mocked(getCountFromServer)

    // Réinitialiser le mock de transformToBirthdayMember par défaut
    vi.mocked(BirthdaysService.transformToBirthdayMember).mockImplementation((user: User & { birthMonth?: number; birthDay?: number; birthDayOfYear?: number }, year?: number) => {
      return createBirthdayFixture({
        id: user.id,
        matricule: user.matricule,
        firstName: user.firstName,
        lastName: user.lastName,
        birthDate: user.birthDate,
        birthMonth: user.birthMonth || 1,
        birthDay: user.birthDay || 1,
      })
    })
  })

  describe('getInstance', () => {
    it('devrait retourner une instance singleton', () => {
      const instance1 = BirthdaysRepository.getInstance()
      const instance2 = BirthdaysRepository.getInstance()

      expect(instance1).toBe(instance2)
    })
  })

  describe('getPaginated', () => {
    it('devrait récupérer la liste paginée sans filtres', async () => {
      const today = new Date()
      const todayDayOfYear = BirthdaysService.calculateDayOfYear(today)

      const mockDoc1 = {
        id: 'user1',
        data: () => createMockUser({
          id: 'user1',
          matricule: '1234.MK.567890',
          firstName: 'Jean',
          lastName: 'Dupont',
          birthDate: '1990-01-15',
          birthMonth: 1,
          birthDay: 15,
          birthDayOfYear: todayDayOfYear + 10,
          roles: ['Adherant'],
        }),
      }

      const mockDoc2 = {
        id: 'user2',
        data: () => createMockUser({
          id: 'user2',
          matricule: '5678.MK.123456',
          firstName: 'Marie',
          lastName: 'Martin',
          birthDate: '1992-03-20',
          birthMonth: 3,
          birthDay: 20,
          birthDayOfYear: todayDayOfYear - 5,
          roles: ['Bienfaiteur'],
        }),
      }

      const mockSnapshot1 = {
        docs: [mockDoc1],
        empty: false,
        size: 1,
      }

      const mockSnapshot2 = {
        docs: [mockDoc2],
        empty: false,
        size: 1,
      }

      mockGetDocs
        .mockResolvedValueOnce(mockSnapshot1) // Query 1 (à venir)
        .mockResolvedValueOnce(mockSnapshot2) // Query 2 (passés)

      mockGetCountFromServer.mockResolvedValue({
        data: () => ({ count: 2 }),
      })

      // Mock query chain
      const mockQuery = {}
      vi.mocked(query).mockReturnValue(mockQuery as any)
      vi.mocked(where).mockReturnValue(mockQuery as any)
      vi.mocked(orderBy).mockReturnValue(mockQuery as any)
      vi.mocked(collection).mockReturnValue({} as any)

      const result = await repository.getPaginated({ page: 1, limit: 20 })

      expect(result.data).toHaveLength(2)
      expect(result.pagination.currentPage).toBe(1)
      expect(result.pagination.totalItems).toBe(2)
      expect(mockGetDocs).toHaveBeenCalledTimes(2)
    })

    it('devrait paginer correctement', async () => {
      const today = new Date()
      const todayDayOfYear = BirthdaysService.calculateDayOfYear(today)

      const mockDocs = Array.from({ length: 30 }, (_, i) => ({
        id: `user${i}`,
        data: () => createMockUser({
          id: `user${i}`,
          matricule: `${i}.MK.${i}`,
          firstName: `User${i}`,
          lastName: 'Test',
          birthDate: '1990-01-15',
          birthMonth: 1,
          birthDay: 15,
          birthDayOfYear: todayDayOfYear + i,
          roles: ['Adherant'],
        }),
      }))

      const mockSnapshot1 = {
        docs: mockDocs.slice(0, 20),
        empty: false,
        size: 20,
      }

      const mockSnapshot2 = {
        docs: mockDocs.slice(20),
        empty: false,
        size: 10,
      }

      mockGetDocs
        .mockResolvedValueOnce(mockSnapshot1)
        .mockResolvedValueOnce(mockSnapshot2)

      mockGetCountFromServer.mockResolvedValue({
        data: () => ({ count: 30 }),
      })

      vi.mocked(query).mockReturnValue({} as any)
      vi.mocked(where).mockReturnValue({} as any)
      vi.mocked(orderBy).mockReturnValue({} as any)
      vi.mocked(collection).mockReturnValue({} as any)

      const result = await repository.getPaginated({ page: 2, limit: 10 })

      expect(result.data).toHaveLength(10)
      expect(result.pagination.currentPage).toBe(2)
      expect(result.pagination.hasNextPage).toBe(true)
      expect(result.pagination.hasPrevPage).toBe(true)
    })

    it('devrait gérer les erreurs de transformation', async () => {
      const today = new Date()
      const todayDayOfYear = BirthdaysService.calculateDayOfYear(today)

      const mockDoc1 = {
        id: 'user1',
        data: () =>
          ({
            matricule: '1234.MK.567890',
            firstName: 'Jean',
            lastName: 'Dupont',
            birthDate: 'invalid-date',
            roles: ['Adherant'],
          }) as User,
      }

      const mockSnapshot1 = {
        docs: [mockDoc1],
        empty: false,
        size: 1,
      }

      const mockSnapshot2 = {
        docs: [],
        empty: true,
        size: 0,
      }

      mockGetDocs
        .mockResolvedValueOnce(mockSnapshot1)
        .mockResolvedValueOnce(mockSnapshot2)

      mockGetCountFromServer.mockResolvedValue({
        data: () => ({ count: 1 }),
      })

      // Mock transformToBirthdayMember pour lancer une erreur
      vi.mocked(BirthdaysService.transformToBirthdayMember).mockImplementation(() => {
        throw new Error('Invalid date')
      })

      vi.mocked(query).mockReturnValue({} as any)
      vi.mocked(where).mockReturnValue({} as any)
      vi.mocked(orderBy).mockReturnValue({} as any)
      vi.mocked(collection).mockReturnValue({} as any)

      const result = await repository.getPaginated({ page: 1, limit: 20 })

      // Le membre invalide devrait être ignoré
      expect(result.data).toHaveLength(0)
    })
  })

  describe('getByMonth', () => {
    it('devrait récupérer les anniversaires d\'un mois spécifique', async () => {
      const mockDoc1 = {
        id: 'user1',
        data: () => createMockUser({
          id: 'user1',
          matricule: '1234.MK.567890',
          firstName: 'Jean',
          lastName: 'Dupont',
          birthDate: '1990-01-15',
          birthMonth: 1,
          birthDay: 15,
          roles: ['Adherant'],
        }),
      }

      const mockDoc2 = {
        id: 'user2',
        data: () => createMockUser({
          id: 'user2',
          matricule: '5678.MK.123456',
          firstName: 'Marie',
          lastName: 'Martin',
          birthDate: '1992-01-20',
          birthMonth: 1,
          birthDay: 20,
          roles: ['Bienfaiteur'],
        }),
      }

      const mockSnapshot = {
        docs: [mockDoc1, mockDoc2],
        empty: false,
        size: 2,
      }

      mockGetDocs.mockResolvedValue(mockSnapshot)

      vi.mocked(query).mockReturnValue({} as any)
      vi.mocked(where).mockReturnValue({} as any)
      vi.mocked(orderBy).mockReturnValue({} as any)
      vi.mocked(collection).mockReturnValue({} as any)

      const result = await repository.getByMonth(1, 2026)

      expect(result).toHaveLength(2)
      expect(mockGetDocs).toHaveBeenCalled()
      // Vérifier que where a été appelé (peut être appelé plusieurs fois dans la chaîne)
      expect(vi.mocked(where)).toHaveBeenCalled()
    })

    it('devrait gérer les erreurs de transformation dans getByMonth', async () => {
      const mockDoc1 = {
        id: 'user1',
        data: () => createMockUser({
          id: 'user1',
          matricule: '1234.MK.567890',
          firstName: 'Jean',
          lastName: 'Dupont',
          birthDate: 'invalid-date',
          roles: ['Adherant'],
        }),
      }

      const mockSnapshot = {
        docs: [mockDoc1],
        empty: false,
        size: 1,
      }

      mockGetDocs.mockResolvedValue(mockSnapshot)

      vi.mocked(BirthdaysService.transformToBirthdayMember).mockImplementation(() => {
        throw new Error('Invalid date')
      })

      vi.mocked(query).mockReturnValue({} as any)
      vi.mocked(where).mockReturnValue({} as any)
      vi.mocked(orderBy).mockReturnValue({} as any)
      vi.mocked(collection).mockReturnValue({} as any)

      const result = await repository.getByMonth(1, 2026)

      // Le membre invalide devrait être ignoré
      expect(result).toHaveLength(0)
    })
  })

  describe('getPaginatedByMonths', () => {
    it('devrait récupérer avec filtres de mois (≤ 10 mois)', async () => {
      const mockDoc1 = {
        id: 'user1',
        data: () => createMockUser({
          id: 'user1',
          matricule: '1234.MK.567890',
          firstName: 'Jean',
          lastName: 'Dupont',
          birthDate: '1990-01-15',
          birthMonth: 1,
          birthDay: 15,
          roles: ['Adherant'],
        }),
      }

      const mockSnapshot = {
        docs: [mockDoc1],
        empty: false,
        size: 1,
      }

      mockGetDocs.mockResolvedValue(mockSnapshot)
      mockGetCountFromServer.mockResolvedValue({
        data: () => ({ count: 1 }),
      })

      vi.mocked(query).mockReturnValue({} as any)
      vi.mocked(where).mockReturnValue({} as any)
      vi.mocked(orderBy).mockReturnValue({} as any)
      vi.mocked(collection).mockReturnValue({} as any)

      const result = await repository.getPaginated({ page: 1, limit: 20, months: [1, 2] })

      expect(result.data).toHaveLength(1)
      expect(mockGetDocs).toHaveBeenCalled()
    })

    it('devrait gérer plus de 10 mois en divisant en chunks', async () => {
      const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] // 12 mois

      const mockDoc1 = {
        id: 'user1',
        data: () => createMockUser({
          id: 'user1',
          matricule: '1234.MK.567890',
          firstName: 'Jean',
          lastName: 'Dupont',
          birthDate: '1990-01-15',
          birthMonth: 1,
          birthDay: 15,
          roles: ['Adherant'],
        }),
      }

      const mockSnapshot = {
        docs: [mockDoc1],
        empty: false,
        size: 1,
      }

      mockGetDocs.mockResolvedValue(mockSnapshot)

      vi.mocked(query).mockReturnValue({} as any)
      vi.mocked(where).mockReturnValue({} as any)
      vi.mocked(orderBy).mockReturnValue({} as any)
      vi.mocked(collection).mockReturnValue({} as any)

      const result = await repository.getPaginated({ page: 1, limit: 20, months })

      // Devrait appeler getPaginatedByMonths récursivement pour chaque chunk
      expect(result.data).toBeDefined()
      expect(result.pagination).toBeDefined()
    })

    it('devrait paginer correctement avec filtres de mois', async () => {
      const mockDocs = Array.from({ length: 25 }, (_, i) => ({
        id: `user${i}`,
        data: () => createMockUser({
          id: `user${i}`,
          matricule: `${i}.MK.${i}`,
          firstName: `User${i}`,
          lastName: 'Test',
          birthDate: '1990-01-15',
          birthMonth: 1,
          birthDay: i + 1,
          roles: ['Adherant'],
        }),
      }))

      const mockSnapshot = {
        docs: mockDocs,
        empty: false,
        size: 25,
      }

      // Réinitialiser le mock pour ce test
      vi.mocked(BirthdaysService.transformToBirthdayMember).mockImplementation((user: User) => {
        return createBirthdayFixture({
          id: user.id,
          matricule: user.matricule,
          firstName: user.firstName,
          lastName: user.lastName,
          birthDate: user.birthDate,
          birthMonth: (user as any).birthMonth || 1,
          birthDay: (user as any).birthDay || 1,
        })
      })

      mockGetDocs.mockResolvedValue(mockSnapshot)
      mockGetCountFromServer.mockResolvedValue({
        data: () => ({ count: 25 }),
      })

      vi.mocked(query).mockReturnValue({} as any)
      vi.mocked(where).mockReturnValue({} as any)
      vi.mocked(orderBy).mockReturnValue({} as any)
      vi.mocked(collection).mockReturnValue({} as any)

      const result = await repository.getPaginated({ page: 2, limit: 10, months: [1] })

      expect(result.data).toHaveLength(10)
      expect(result.pagination.currentPage).toBe(2)
      expect(result.pagination.totalPages).toBe(3)
      expect(result.pagination.hasNextPage).toBe(true)
      expect(result.pagination.hasPrevPage).toBe(true)
    })

    it('devrait gérer les erreurs de transformation dans getPaginatedByMonths', async () => {
      const mockDoc1 = {
        id: 'user1',
        data: () => createMockUser({
          id: 'user1',
          matricule: '1234.MK.567890',
          firstName: 'Jean',
          lastName: 'Dupont',
          birthDate: 'invalid-date',
          roles: ['Adherant'],
        }),
      }

      const mockSnapshot = {
        docs: [mockDoc1],
        empty: false,
        size: 1,
      }

      mockGetDocs.mockResolvedValue(mockSnapshot)
      mockGetCountFromServer.mockResolvedValue({
        data: () => ({ count: 1 }),
      })

      vi.mocked(BirthdaysService.transformToBirthdayMember).mockImplementation(() => {
        throw new Error('Invalid date')
      })

      vi.mocked(query).mockReturnValue({} as any)
      vi.mocked(where).mockReturnValue({} as any)
      vi.mocked(orderBy).mockReturnValue({} as any)
      vi.mocked(collection).mockReturnValue({} as any)

      const result = await repository.getPaginated({ page: 1, limit: 20, months: [1] })

      // Le membre invalide devrait être ignoré
      expect(result.data).toHaveLength(0)
    })
  })

  describe('getTotalCount', () => {
    it('devrait compter le total des membres', async () => {
      mockGetCountFromServer.mockResolvedValue({
        data: () => ({ count: 100 }),
      })

      vi.mocked(query).mockReturnValue({} as any)
      vi.mocked(where).mockReturnValue({} as any)
      vi.mocked(collection).mockReturnValue({} as any)

      const today = new Date()
      const todayDayOfYear = BirthdaysService.calculateDayOfYear(today)

      const mockSnapshot1 = { docs: [], empty: true, size: 0 }
      const mockSnapshot2 = { docs: [], empty: true, size: 0 }

      mockGetDocs
        .mockResolvedValueOnce(mockSnapshot1)
        .mockResolvedValueOnce(mockSnapshot2)

      await repository.getPaginated({ page: 1, limit: 20 })

      expect(mockGetCountFromServer).toHaveBeenCalled()
    })
  })
})
