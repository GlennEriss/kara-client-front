/**
 * Tests d'intégration pour la vue détails d'un membre (V2)
 * 
 * Scénarios testés :
 * - INT-MEMBER-DETAILS-01 : Affichage complet pour un membre avec abonnements, contrats, filleuls
 * - INT-MEMBER-DETAILS-02 : Membre sans abonnements ni contrats (sections adaptées)
 * - INT-MEMBER-DETAILS-03 : Erreur de chargement (message + bouton retour)
 * - INT-MEMBER-DETAILS-04 : Navigation vers dossier d'adhésion
 * - INT-MEMBER-DETAILS-05 : Navigation vers historique abonnements
 * - INT-MEMBER-DETAILS-06 : Navigation vers modules externes (caisse, véhicules, contrats)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { MemberDetailsPage } from '../../components/details/MemberDetailsPage'
import { useMembershipDetails } from '../../hooks/useMembershipDetails'
import type { User, Subscription, UserRole } from '@/types/types'

// Mock Next.js Image component
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: any) => {
    return <img src={src} alt={alt} {...props} />
  },
}))

// Mock Next.js navigation
const mockPush = vi.fn()
const mockBack = vi.fn()

vi.mock('next/navigation', () => ({
  useParams: vi.fn(),
  useRouter: vi.fn(() => ({
    push: mockPush,
    back: mockBack,
  })),
}))

// Mock le hook useMembershipDetails
vi.mock('../../hooks/useMembershipDetails')

// Fixtures
const createUserFixture = (overrides: any = {}): User => ({
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
  subscriptions: ['sub-1'],
  dossier: 'dossier-123',
  membershipType: 'adherant',
  roles: ['Adherant'] as UserRole[],
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  isActive: true,
  ...overrides,
})

const createSubscriptionFixture = (overrides: any = {}): Subscription => ({
  id: 'sub-1',
  userId: 'member-1',
  dateStart: new Date('2024-01-01'),
  dateEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 an dans le futur
  montant: 50000,
  currency: 'XAF',
  type: 'adherant',
  isValid: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  createdBy: 'admin-1',
  ...overrides,
})

const createContractFixture = (overrides: any = {}) => ({
  id: 'contract-1',
  memberId: 'member-1',
  status: 'ACTIVE',
  caisseType: 'STANDARD',
  monthlyAmount: 100000,
  contractStartAt: new Date('2024-01-01'),
  contractEndAt: new Date('2025-01-01'),
  createdAt: new Date('2024-01-01'),
  ...overrides,
})

const createFilleulFixture = (overrides: any = {}) => ({
  id: 'filleul-1',
  matricule: '0002.MK.110127',
  firstName: 'Marie',
  lastName: 'Martin',
  createdAt: new Date('2024-01-01'),
  ...overrides,
})

const createDocumentFixture = (overrides: any = {}) => ({
  id: 'doc-1',
  type: 'ADHESION',
  name: 'Fiche d\'adhésion',
  url: 'https://example.com/doc.pdf',
  createdAt: new Date('2024-01-01'),
  ...overrides,
})

// Helper pour créer un QueryClient
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  })
}

// Wrapper pour les tests
function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = createTestQueryClient()
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('Integration: MemberDetailsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useParams).mockReturnValue({ id: 'member-1' } as any)
  })

  describe('INT-MEMBER-DETAILS-01: Affichage complet', () => {
    it('should display all sections when member has subscriptions, contracts, and filleuls', async () => {
      const user = createUserFixture()
      const subscription = createSubscriptionFixture()
      const contract = createContractFixture()
      const filleul = createFilleulFixture()
      const document = createDocumentFixture()

      vi.mocked(useMembershipDetails).mockReturnValue({
        member: {
          ...user,
          fullName: 'Jean Dupont',
          displayName: 'Jean Dupont',
          nationalityName: 'Cameroun',
        },
        subscriptions: [subscription],
        lastSubscription: subscription,
        isSubscriptionValid: true,
        contracts: {
          caisseSpeciale: [contract],
          caisseSpecialeCount: 1,
          hasActiveCaisseSpeciale: true,
          caisseImprevue: [],
          caisseImprevueCount: 0,
          hasActiveCaisseImprevue: false,
          placements: [],
          placementsCount: 0,
          totalCount: 1,
        },
        filleuls: [filleul],
        filleulsCount: 1,
        documents: [document],
        documentsCount: 1,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
        onOpenMembershipRequest: vi.fn(),
        onOpenSubscriptionHistory: vi.fn(),
        onOpenFilleuls: vi.fn(),
        onOpenContracts: vi.fn(),
        onOpenDocuments: vi.fn(),
        onOpenVehicles: vi.fn(),
      } as any)

      render(
        <TestWrapper>
          <MemberDetailsPage />
        </TestWrapper>
      )

      // Vérifier que toutes les sections principales sont visibles
      await waitFor(() => {
        expect(screen.getByTestId('member-details-title')).toBeInTheDocument()
        expect(screen.getByTestId('member-contact-card')).toBeInTheDocument()
        expect(screen.getByTestId('member-address-card')).toBeInTheDocument()
        expect(screen.getByTestId('member-profession-card')).toBeInTheDocument()
        expect(screen.getByTestId('member-subscription-card')).toBeInTheDocument()
        expect(screen.getByTestId('member-documents-card')).toBeInTheDocument()
        expect(screen.getByTestId('member-filleuls-card')).toBeInTheDocument()
        expect(screen.getByTestId('member-contracts-card')).toBeInTheDocument()
      })

      // Vérifier le contenu spécifique
      await waitFor(() => {
        expect(screen.getByText(/Jean Dupont/i)).toBeInTheDocument()
        expect(screen.getByText(/jean.dupont@example.com/i)).toBeInTheDocument()
        expect(screen.getByText(/Tech Corp/i)).toBeInTheDocument()
        expect(screen.getByText(/Ingénieur/i)).toBeInTheDocument()
      })
    })
  })

  describe('INT-MEMBER-DETAILS-02: Membre sans données secondaires', () => {
    it('should display sections with empty states when member has no subscriptions, contracts, or filleuls', async () => {
      const user = createUserFixture({ subscriptions: [] })

      vi.mocked(useMembershipDetails).mockReturnValue({
        member: {
          ...user,
          fullName: 'Jean Dupont',
          displayName: 'Jean Dupont',
          nationalityName: 'Cameroun',
        },
        subscriptions: [],
        lastSubscription: null,
        isSubscriptionValid: false,
        contracts: {
          caisseSpeciale: [],
          caisseSpecialeCount: 0,
          hasActiveCaisseSpeciale: false,
          caisseImprevue: [],
          caisseImprevueCount: 0,
          hasActiveCaisseImprevue: false,
          placements: [],
          placementsCount: 0,
          totalCount: 0,
        },
        filleuls: [],
        filleulsCount: 0,
        documents: [],
        documentsCount: 0,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
        onOpenMembershipRequest: vi.fn(),
        onOpenSubscriptionHistory: vi.fn(),
        onOpenFilleuls: vi.fn(),
        onOpenContracts: vi.fn(),
        onOpenDocuments: vi.fn(),
        onOpenVehicles: vi.fn(),
      } as any)

      render(
        <TestWrapper>
          <MemberDetailsPage />
        </TestWrapper>
      )

      // Vérifier que les sections sont affichées
      await waitFor(() => {
        expect(screen.getByTestId('member-details-title')).toBeInTheDocument()
        expect(screen.getByTestId('member-subscription-card')).toBeInTheDocument()
        expect(screen.getByTestId('member-contracts-card')).toBeInTheDocument()
        expect(screen.getByTestId('member-filleuls-card')).toBeInTheDocument()
      })

      // Vérifier les messages d'absence de données
      await waitFor(() => {
        expect(screen.getByText(/Aucun contrat enregistré/i)).toBeInTheDocument()
      })
    })
  })

  describe('INT-MEMBER-DETAILS-03: Erreur de chargement', () => {
    it('should display error state with retry and back buttons on loading error', async () => {
      vi.mocked(useMembershipDetails).mockReturnValue({
        member: null,
        subscriptions: [],
        lastSubscription: null,
        isSubscriptionValid: false,
        contracts: {
          caisseSpeciale: [],
          caisseSpecialeCount: 0,
          hasActiveCaisseSpeciale: false,
          caisseImprevue: [],
          caisseImprevueCount: 0,
          hasActiveCaisseImprevue: false,
          placements: [],
          placementsCount: 0,
          totalCount: 0,
        },
        filleuls: [],
        filleulsCount: 0,
        documents: [],
        documentsCount: 0,
        isLoading: false,
        isError: true,
        error: new Error('Erreur lors du chargement du membre'),
        refetch: vi.fn(),
        onOpenMembershipRequest: vi.fn(),
        onOpenSubscriptionHistory: vi.fn(),
        onOpenFilleuls: vi.fn(),
        onOpenContracts: vi.fn(),
        onOpenDocuments: vi.fn(),
        onOpenVehicles: vi.fn(),
      } as any)

      render(
        <TestWrapper>
          <MemberDetailsPage />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('member-details-error')).toBeInTheDocument()
        expect(screen.getByTestId('member-details-error-message')).toBeInTheDocument()
        expect(screen.getByTestId('member-details-error-retry-button')).toBeInTheDocument()
        expect(screen.getByTestId('member-details-error-back-button')).toBeInTheDocument()
      })

      // Vérifier que le bouton retour fonctionne
      const backButton = screen.getByTestId('member-details-error-back-button')
      fireEvent.click(backButton)
      expect(mockBack).toHaveBeenCalled()
    })
  })

  describe('INT-MEMBER-DETAILS-04: Navigation vers dossier d\'adhésion', () => {
    it('should navigate to membership request details when clicking "Voir le dossier"', async () => {
      const user = createUserFixture()
      const mockOnOpenMembershipRequest = vi.fn()

      vi.mocked(useMembershipDetails).mockReturnValue({
        member: {
          ...user,
          fullName: 'Jean Dupont',
          displayName: 'Jean Dupont',
          nationalityName: 'Cameroun',
        },
        subscriptions: [],
        lastSubscription: null,
        isSubscriptionValid: false,
        contracts: {
          caisseSpeciale: [],
          caisseSpecialeCount: 0,
          hasActiveCaisseSpeciale: false,
          caisseImprevue: [],
          caisseImprevueCount: 0,
          hasActiveCaisseImprevue: false,
          placements: [],
          placementsCount: 0,
          totalCount: 0,
        },
        filleuls: [],
        filleulsCount: 0,
        documents: [],
        documentsCount: 0,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
        onOpenMembershipRequest: mockOnOpenMembershipRequest,
        onOpenSubscriptionHistory: vi.fn(),
        onOpenFilleuls: vi.fn(),
        onOpenContracts: vi.fn(),
        onOpenDocuments: vi.fn(),
        onOpenVehicles: vi.fn(),
      } as any)

      render(
        <TestWrapper>
          <MemberDetailsPage />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('member-details-view-dossier-button')).toBeInTheDocument()
      })

      const dossierButton = screen.getByTestId('member-details-view-dossier-button')
      fireEvent.click(dossierButton)

      expect(mockOnOpenMembershipRequest).toHaveBeenCalled()
    })
  })

  describe('INT-MEMBER-DETAILS-05: Navigation vers historique abonnements', () => {
    it('should navigate to subscription history when clicking "Voir l\'historique"', async () => {
      const user = createUserFixture()
      const subscription = createSubscriptionFixture()
      const mockOnOpenSubscriptionHistory = vi.fn()

      vi.mocked(useMembershipDetails).mockReturnValue({
        member: {
          ...user,
          fullName: 'Jean Dupont',
          displayName: 'Jean Dupont',
          nationalityName: 'Cameroun',
        },
        subscriptions: [subscription],
        lastSubscription: subscription,
        isSubscriptionValid: true,
        contracts: {
          caisseSpeciale: [],
          caisseSpecialeCount: 0,
          hasActiveCaisseSpeciale: false,
          caisseImprevue: [],
          caisseImprevueCount: 0,
          hasActiveCaisseImprevue: false,
          placements: [],
          placementsCount: 0,
          totalCount: 0,
        },
        filleuls: [],
        filleulsCount: 0,
        documents: [],
        documentsCount: 0,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
        onOpenMembershipRequest: vi.fn(),
        onOpenSubscriptionHistory: mockOnOpenSubscriptionHistory,
        onOpenFilleuls: vi.fn(),
        onOpenContracts: vi.fn(),
        onOpenDocuments: vi.fn(),
        onOpenVehicles: vi.fn(),
      } as any)

      render(
        <TestWrapper>
          <MemberDetailsPage />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('member-subscription-history-button')).toBeInTheDocument()
      })

      const historyButton = screen.getByTestId('member-subscription-history-button')
      fireEvent.click(historyButton)

      expect(mockOnOpenSubscriptionHistory).toHaveBeenCalled()
    })
  })

  describe('INT-MEMBER-DETAILS-06: Navigation vers modules externes', () => {
    it('should navigate to external modules when clicking contract links', async () => {
      const user = createUserFixture()
      const contract = createContractFixture()
      const mockOnOpenContracts = vi.fn()

      vi.mocked(useMembershipDetails).mockReturnValue({
        member: {
          ...user,
          fullName: 'Jean Dupont',
          displayName: 'Jean Dupont',
          nationalityName: 'Cameroun',
        },
        subscriptions: [],
        lastSubscription: null,
        isSubscriptionValid: false,
        contracts: {
          caisseSpeciale: [contract],
          caisseSpecialeCount: 1,
          hasActiveCaisseSpeciale: true,
          caisseImprevue: [],
          caisseImprevueCount: 0,
          hasActiveCaisseImprevue: false,
          placements: [],
          placementsCount: 0,
          totalCount: 1,
        },
        filleuls: [],
        filleulsCount: 0,
        documents: [],
        documentsCount: 0,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
        onOpenMembershipRequest: vi.fn(),
        onOpenSubscriptionHistory: vi.fn(),
        onOpenFilleuls: vi.fn(),
        onOpenContracts: mockOnOpenContracts,
        onOpenDocuments: vi.fn(),
        onOpenVehicles: vi.fn(),
      } as any)

      render(
        <TestWrapper>
          <MemberDetailsPage />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('member-contracts-caisse-speciale-button')).toBeInTheDocument()
      })

      // Test navigation vers caisse spéciale
      const caisseSpecialeButton = screen.getByTestId('member-contracts-caisse-speciale-button')
      fireEvent.click(caisseSpecialeButton)
      expect(mockOnOpenContracts).toHaveBeenCalledWith('caisse-speciale')
    })

    it('should navigate to vehicles module when clicking vehicles link', async () => {
      const user = createUserFixture()
      const mockOnOpenVehicles = vi.fn()

      vi.mocked(useMembershipDetails).mockReturnValue({
        member: {
          ...user,
          fullName: 'Jean Dupont',
          displayName: 'Jean Dupont',
          nationalityName: 'Cameroun',
        },
        subscriptions: [],
        lastSubscription: null,
        isSubscriptionValid: false,
        contracts: {
          caisseSpeciale: [],
          caisseSpecialeCount: 0,
          hasActiveCaisseSpeciale: false,
          caisseImprevue: [],
          caisseImprevueCount: 0,
          hasActiveCaisseImprevue: false,
          placements: [],
          placementsCount: 0,
          totalCount: 0,
        },
        filleuls: [],
        filleulsCount: 0,
        documents: [],
        documentsCount: 0,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
        onOpenMembershipRequest: vi.fn(),
        onOpenSubscriptionHistory: vi.fn(),
        onOpenFilleuls: vi.fn(),
        onOpenContracts: vi.fn(),
        onOpenDocuments: vi.fn(),
        onOpenVehicles: mockOnOpenVehicles,
      } as any)

      render(
        <TestWrapper>
          <MemberDetailsPage />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('member-relations-vehicles-button')).toBeInTheDocument()
      })

      const vehiclesButton = screen.getByTestId('member-relations-vehicles-button')
      fireEvent.click(vehiclesButton)

      expect(mockOnOpenVehicles).toHaveBeenCalled()
    })
  })
})
