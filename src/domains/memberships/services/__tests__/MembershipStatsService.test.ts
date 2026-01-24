/**
 * Tests unitaires pour MembershipStatsService
 */

import { describe, it, expect } from 'vitest'
import { MembershipStatsService } from '../MembershipStatsService'
import type { MemberWithSubscription, PaginatedMembers } from '@/db/member.db'
import type { User } from '@/types/types'

// Helper pour créer un User mock
function createMockUser(
  overrides: Partial<User & { birthMonth?: number; birthDay?: number; birthDayOfYear?: number }> = {},
): User & { birthMonth?: number; birthDay?: number; birthDayOfYear?: number } {
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

// Helper pour créer un MemberWithSubscription
function createMemberWithSubscription(
  overrides: Partial<MemberWithSubscription> = {},
): MemberWithSubscription {
  const baseUser = createMockUser(overrides)
  // Si lastSubscription est explicitement fourni (même si null), l'utiliser
  // Sinon, utiliser null par défaut
  const lastSubscription =
    'lastSubscription' in overrides ? overrides.lastSubscription : null

  return {
    ...baseUser,
    isSubscriptionValid: overrides.isSubscriptionValid ?? false,
    lastSubscription,
    subscriptions: overrides.subscriptions ?? [],
  }
}

describe('MembershipStatsService', () => {
  describe('calculateStats', () => {
    it('devrait retourner null si paginated est null', () => {
      const result = MembershipStatsService.calculateStats(null)
      expect(result).toBeNull()
    })

    it('devrait retourner des stats vides si totalItems est 0', () => {
      const paginated: PaginatedMembers = {
        data: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalItems: 0,
          itemsPerPage: 10,
          hasNextPage: false,
          hasPrevPage: false,
          nextCursor: null,
          prevCursor: null,
        },
      }

      const result = MembershipStatsService.calculateStats(paginated)

      expect(result).not.toBeNull()
      expect(result?.total).toBe(0)
      expect(result?.active).toBe(0)
      expect(result?.expired).toBe(0)
      expect(result?.noSub).toBe(0)
    })

    it('devrait calculer correctement les stats basées sur les abonnements', () => {
      const members: MemberWithSubscription[] = [
        createMemberWithSubscription({
          id: '1',
          isSubscriptionValid: true,
          lastSubscription: {
            id: 'sub1',
            userId: '1',
            dateStart: new Date(),
            dateEnd: new Date(),
            montant: 1000,
            currency: 'XOF',
            type: 'adherant',
            isValid: false,
          } as any,
        }),
        createMemberWithSubscription({
          id: '2',
          isSubscriptionValid: false,
          lastSubscription: {
            id: 'sub2',
            userId: '2',
            dateStart: new Date(),
            dateEnd: new Date(),
            montant: 1000,
            currency: 'XOF',
            type: 'adherant',
            isValid: false,
          } as any,
        }),
        createMemberWithSubscription({
          id: '3',
          isSubscriptionValid: false,
          lastSubscription: null,
        }),
      ]

      const paginated: PaginatedMembers = {
        data: members,
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalItems: 3,
          itemsPerPage: 10,
          hasNextPage: false,
          hasPrevPage: false,
          nextCursor: null,
          prevCursor: null,
        },
      }

      const result = MembershipStatsService.calculateStats(paginated)

      expect(result).not.toBeNull()
      expect(result?.total).toBe(3)
      expect(result?.active).toBe(1)
      expect(result?.expired).toBe(1)
      expect(result?.noSub).toBe(1)
      expect(result?.activePercentage).toBeCloseTo(33.33, 1)
      expect(result?.expiredPercentage).toBeCloseTo(33.33, 1)
      expect(result?.noSubPercentage).toBeCloseTo(33.33, 1)
    })

    it('devrait calculer correctement les stats démographiques', () => {
      const members: MemberWithSubscription[] = [
        createMemberWithSubscription({ id: '1', gender: 'Homme' }),
        createMemberWithSubscription({ id: '2', gender: 'Homme' }),
        createMemberWithSubscription({ id: '3', gender: 'Femme' }),
      ]

      const paginated: PaginatedMembers = {
        data: members,
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalItems: 3,
          itemsPerPage: 10,
          hasNextPage: false,
          hasPrevPage: false,
          nextCursor: null,
          prevCursor: null,
        },
      }

      const result = MembershipStatsService.calculateStats(paginated)

      expect(result).not.toBeNull()
      expect(result?.men).toBe(2)
      expect(result?.women).toBe(1)
      expect(result?.menPercentage).toBeCloseTo(66.67, 1)
      expect(result?.womenPercentage).toBeCloseTo(33.33, 1)
    })

    it('devrait calculer les stats supplémentaires (véhicules, nouveaux membres)', () => {
      const now = new Date()
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 15)
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15)

      const members: MemberWithSubscription[] = [
        createMemberWithSubscription({
          id: '1',
          hasCar: true,
          createdAt: thisMonth,
          membershipType: 'adherant',
        }),
        createMemberWithSubscription({
          id: '2',
          hasCar: false,
          createdAt: lastMonth,
          membershipType: 'bienfaiteur',
        }),
        createMemberWithSubscription({
          id: '3',
          hasCar: true,
          createdAt: thisMonth,
          membershipType: 'sympathisant',
        }),
      ]

      const paginated: PaginatedMembers = {
        data: members,
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalItems: 3,
          itemsPerPage: 10,
          hasNextPage: false,
          hasPrevPage: false,
          nextCursor: null,
          prevCursor: null,
        },
      }

      const result = MembershipStatsService.calculateStats(paginated)

      expect(result).not.toBeNull()
      expect(result?.withCar).toBe(2)
      expect(result?.withoutCar).toBe(1)
      expect(result?.newThisMonth).toBe(2)
      expect(result?.byMembershipType?.adherant).toBe(1)
      expect(result?.byMembershipType?.bienfaiteur).toBe(1)
      expect(result?.byMembershipType?.sympathisant).toBe(1)
    })
  })

  describe('calculateStatsFromMembers', () => {
    it('devrait retourner des stats vides si la liste est vide', () => {
      const result = MembershipStatsService.calculateStatsFromMembers([])

      expect(result.total).toBe(0)
      expect(result.active).toBe(0)
      expect(result.expired).toBe(0)
      expect(result.noSub).toBe(0)
    })

    it('devrait calculer correctement les stats depuis une liste de membres', () => {
      const members: MemberWithSubscription[] = [
        createMemberWithSubscription({
          id: '1',
          isSubscriptionValid: true,
          gender: 'Homme',
          hasCar: true,
          lastSubscription: {
            id: 'sub1',
            userId: '1',
            dateStart: new Date(),
            dateEnd: new Date(),
            montant: 1000,
            currency: 'XOF',
            type: 'adherant',
            isValid: false,
          } as any,
        }),
        createMemberWithSubscription({
          id: '2',
          isSubscriptionValid: false,
          gender: 'Femme',
          hasCar: false,
          lastSubscription: {
            id: 'sub2',
            userId: '2',
            dateStart: new Date(),
            dateEnd: new Date(),
            montant: 1000,
            currency: 'XOF',
            type: 'adherant',
            isValid: false,
          } as any,
        }),
      ]

      const result = MembershipStatsService.calculateStatsFromMembers(members)

      expect(result.total).toBe(2)
      expect(result.active).toBe(1)
      // Le deuxième membre a lastSubscription mais isSubscriptionValid=false, donc expired
      expect(result.expired).toBe(1)
      // Aucun membre sans lastSubscription (les deux ont lastSubscription)
      expect(result.noSub).toBe(0)
      expect(result.men).toBe(1)
      expect(result.women).toBe(1)
      expect(result.withCar).toBe(1)
      expect(result.withoutCar).toBe(1)
    })

    it('devrait gérer les membres sans données complètes', () => {
      const members: MemberWithSubscription[] = [
        createMemberWithSubscription({
          id: '1',
          gender: undefined,
          hasCar: undefined,
          isSubscriptionValid: undefined,
        }),
      ]

      const result = MembershipStatsService.calculateStatsFromMembers(members)

      expect(result.total).toBe(1)
      expect(result.men).toBe(0)
      expect(result.women).toBe(0)
      expect(result.active).toBe(0)
    })
  })
})
