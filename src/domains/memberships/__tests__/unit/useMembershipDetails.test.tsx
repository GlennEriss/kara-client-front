import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import type { User, Subscription, UserRole } from '@/types/types'

// Mock des dépendances AVANT les imports
vi.mock('@/db/user.db', () => ({
  getUserById: vi.fn(),
}))
vi.mock('@/db/member.db', () => ({
  getMemberSubscriptions: vi.fn(),
}))
vi.mock('@/db/caisse/contracts.db', () => ({
  listContractsByMember: vi.fn(),
}))
vi.mock('@/hooks/filleuls', () => ({
  useMemberWithFilleuls: vi.fn(),
}))
vi.mock('@/hooks/documents/useDocumentList', () => ({
  useDocumentList: vi.fn(),
}))

import { useMembershipDetails } from '../../hooks/useMembershipDetails'
// Mocked modules - types resolved at runtime by Vitest
// @ts-ignore
import * as userDb from '@/db/user.db'
// @ts-ignore
import * as memberDb from '@/db/member.db'
// @ts-ignore
import * as contractsDb from '@/db/caisse/contracts.db'
// @ts-ignore
import * as filleulsHooks from '@/hooks/filleuls'
// @ts-ignore
import * as documentsHooks from '@/hooks/documents/useDocumentList'
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}))

describe('useMembershipDetails', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })
    vi.clearAllMocks()
  })

  const createWrapper = () => {
    // eslint-disable-next-line react/display-name
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    return Wrapper
  }

  const mockUser = {
    id: 'member-1',
    matricule: '0001.MK.110126',
    firstName: 'Jean',
    lastName: 'Dupont',
    birthDate: '1990-01-01',
    gender: 'Homme',
    nationality: 'CM',
    email: 'jean.dupont@example.com',
    contacts: ['+237 6 12 34 56 78'],
    profession: 'Ingénieur',
    companyName: 'Tech Corp',
    hasCar: true,
    photoURL: 'https://example.com/photo.jpg',
    address: {
      province: 'Centre',
      city: 'Yaoundé',
      district: 'Bastos',
      arrondissement: 'Yaoundé 2',
    },
    subscriptions: [],
    dossier: 'dossier-123',
    membershipType: 'adherant' as const,
    roles: ['Adherant'] as UserRole[],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    isActive: true,
  } as User

  const mockSubscriptions = [
    {
      id: 'sub-1',
      userId: 'member-1',
      dateStart: new Date('2024-01-01'),
      dateEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 an dans le futur
      montant: 50000,
      currency: 'XAF',
      type: 'adherant' as const,
      isValid: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      createdBy: 'admin-1',
    } as Subscription,
  ]

  const mockContracts = [
    {
      id: 'contract-1',
      memberId: 'member-1',
      status: 'ACTIVE',
      caisseType: 'STANDARD',
      monthlyAmount: 100000,
      contractStartAt: new Date('2024-01-01'),
      contractEndAt: new Date('2025-01-01'),
      createdAt: new Date('2024-01-01'),
    },
  ]

  const mockFilleuls = [
    {
      id: 'filleul-1',
      matricule: '0002.MK.110127',
      firstName: 'Marie',
      lastName: 'Martin',
      createdAt: new Date('2024-01-01'),
    },
  ]

  const mockDocuments = [
    {
      id: 'doc-1',
      type: 'ADHESION',
      name: 'Fiche d\'adhésion',
      url: 'https://example.com/doc.pdf',
      createdAt: new Date('2024-01-01'),
    },
  ]

  describe('Cas heureux : toutes les données chargées', () => {
    it('devrait charger toutes les données avec succès', async () => {
      vi.mocked(userDb.getUserById).mockResolvedValue(mockUser)
      vi.mocked(memberDb.getMemberSubscriptions).mockResolvedValue(mockSubscriptions)
      vi.mocked(contractsDb.listContractsByMember).mockResolvedValue(mockContracts)
      vi.mocked(filleulsHooks.useMemberWithFilleuls).mockReturnValue({
        member: {
          data: mockUser,
          isLoading: false,
          isError: false,
          error: null,
        } as any,
        filleuls: {
          data: mockFilleuls,
          isLoading: false,
          isError: false,
          error: null,
          refetch: vi.fn(),
        } as any,
        isLoading: false,
        isError: false,
        error: null,
      })
      vi.mocked(documentsHooks.useDocumentList).mockReturnValue({
        documents: mockDocuments,
        filterOptions: [],
        isLoading: false,
        isError: false,
        member: null,
        isMemberLoading: false,
        pagination: {
          page: 1,
          totalPages: 1,
          pageSize: 10,
          totalItems: 1,
        },
        selectedType: '',
        setSelectedType: vi.fn(),
        setPage: vi.fn(),
      } as any)

      const { result } = renderHook(
        () => useMembershipDetails({ memberId: 'member-1' }),
        { wrapper: createWrapper() },
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.member).toBeTruthy()
      expect(result.current.member?.fullName).toBe('Jean Dupont')
      expect(result.current.member?.nationalityName).toBeTruthy()
      expect(result.current.subscriptions).toHaveLength(1)
      expect(result.current.lastSubscription).toBeTruthy()
      expect(result.current.isSubscriptionValid).toBe(true)
      expect(result.current.contracts.totalCount).toBe(1)
      expect(result.current.contracts.caisseSpecialeCount).toBe(1)
      expect(result.current.filleuls).toHaveLength(1)
      expect(result.current.documents).toHaveLength(1)
      expect(result.current.isError).toBe(false)
    })
  })

  describe('Cas erreur : DB en erreur', () => {
    it('devrait gérer les erreurs de chargement', async () => {
      const dbError = new Error('Erreur de base de données')
      vi.mocked(userDb.getUserById).mockRejectedValue(dbError)

      const { result } = renderHook(
        () => useMembershipDetails({ memberId: 'member-1' }),
        { wrapper: createWrapper() },
      )

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBeTruthy()
      expect(result.current.member).toBeNull()
    })
  })

  describe('Cas membre sans abonnements / sans contrats / sans filleuls', () => {
    it('devrait gérer un membre sans abonnements', async () => {
      vi.mocked(userDb.getUserById).mockResolvedValue(mockUser)
      vi.mocked(memberDb.getMemberSubscriptions).mockResolvedValue([])
      vi.mocked(contractsDb.listContractsByMember).mockResolvedValue([])
      vi.mocked(filleulsHooks.useMemberWithFilleuls).mockReturnValue({
        member: {
          data: mockUser,
          isLoading: false,
          isError: false,
          error: null,
        } as any,
        filleuls: {
          data: [],
          isLoading: false,
          isError: false,
          error: null,
          refetch: vi.fn(),
        } as any,
        isLoading: false,
        isError: false,
        error: null,
      })
      vi.mocked(documentsHooks.useDocumentList).mockReturnValue({
        documents: [],
        filterOptions: [],
        isLoading: false,
        isError: false,
        member: null,
        isMemberLoading: false,
        pagination: {
          page: 1,
          totalPages: 0,
          pageSize: 10,
          totalItems: 0,
        },
        selectedType: '',
        setSelectedType: vi.fn(),
        setPage: vi.fn(),
      } as any)

      const { result } = renderHook(
        () => useMembershipDetails({ memberId: 'member-1' }),
        { wrapper: createWrapper() },
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.subscriptions).toHaveLength(0)
      expect(result.current.lastSubscription).toBeNull()
      expect(result.current.isSubscriptionValid).toBe(false)
      expect(result.current.contracts.totalCount).toBe(0)
      expect(result.current.filleulsCount).toBe(0)
      expect(result.current.documentsCount).toBe(0)
    })
  })

  describe('Handlers de navigation', () => {
    it('devrait exposer les handlers de navigation', async () => {
      vi.mocked(userDb.getUserById).mockResolvedValue(mockUser)
      vi.mocked(memberDb.getMemberSubscriptions).mockResolvedValue([])
      vi.mocked(contractsDb.listContractsByMember).mockResolvedValue([])
      vi.mocked(filleulsHooks.useMemberWithFilleuls).mockReturnValue({
        member: {
          data: mockUser,
          isLoading: false,
          isError: false,
          error: null,
        } as any,
        filleuls: {
          data: [],
          isLoading: false,
          isError: false,
          error: null,
          refetch: vi.fn(),
        } as any,
        isLoading: false,
        isError: false,
        error: null,
      })
      vi.mocked(documentsHooks.useDocumentList).mockReturnValue({
        documents: [],
        filterOptions: [],
        isLoading: false,
        isError: false,
        member: null,
        isMemberLoading: false,
        pagination: {
          page: 1,
          totalPages: 0,
          pageSize: 10,
          totalItems: 0,
        },
        selectedType: '',
        setSelectedType: vi.fn(),
        setPage: vi.fn(),
      } as any)

      const { result } = renderHook(
        () => useMembershipDetails({ memberId: 'member-1' }),
        { wrapper: createWrapper() },
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.onOpenMembershipRequest).toBeDefined()
      expect(result.current.onOpenSubscriptionHistory).toBeDefined()
      expect(result.current.onOpenFilleuls).toBeDefined()
      expect(result.current.onOpenContracts).toBeDefined()
      expect(result.current.onOpenDocuments).toBeDefined()
      expect(result.current.onOpenVehicles).toBeDefined()
      expect(result.current.refetch).toBeDefined()
    })
  })
})
