/**
 * Tests d'intégration pour les statistiques des membres (V2)
 * 
 * Scénarios testés :
 * - INT-STATS-01 : Affichage des stats depuis useMembershipsListV2 (stats locales)
 * - INT-STATS-02 : Affichage correct de toutes les métriques (Total, Actifs, Expirés, Hommes, Femmes)
 * - INT-STATS-03 : Calcul correct des pourcentages
 * - INT-STATS-04 : Navigation carrousel des stats (précédent/suivant)
 * - INT-STATS-05 : Affichage avec stats vides (total = 0)
 * - INT-STATS-06 : useMembershipStats avec fetchGlobal (stats globales)
 * - INT-STATS-07 : Mise à jour des stats lors du changement de tab
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MembershipsListStats } from '@/domains/memberships/components/list/MembershipsListStats'
import { useMembershipStats } from '@/domains/memberships/hooks/useMembershipStats'
import { MembershipStatsService, type MembershipStatsV2 } from '@/domains/memberships/services/MembershipStatsService'
import type { PaginatedMembers, MemberWithSubscription } from '@/db/member.db'

// Mock Firebase
vi.mock('@/firebase/app', () => ({
  app: {},
}))

vi.mock('@/firebase/firestore', () => ({
  db: {},
  collection: vi.fn(() => ({})),
  query: vi.fn(() => ({})),
  where: vi.fn(() => ({})),
  orderBy: vi.fn(() => ({})),
  limit: vi.fn(() => ({})),
  getDocs: vi.fn(() => Promise.resolve({ docs: [], empty: true, size: 0 })),
  getCountFromServer: vi.fn(() => Promise.resolve({ data: () => ({ count: 0 }) })),
}))

// Mock useMembershipStats
vi.mock('@/domains/memberships/hooks/useMembershipStats')
const mockUseMembershipStats = vi.mocked(useMembershipStats)

// Mock MembersRepositoryV2
const mockGetAll = vi.fn()
vi.mock('@/domains/memberships/repositories/MembersRepositoryV2', () => ({
  MembersRepositoryV2: {
    getInstance: () => ({
      getAll: mockGetAll,
    }),
  },
}))

// Mock Next.js Image
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: any) => <img src={src} alt={alt} {...props} />,
}))

// Mock recharts
vi.mock('recharts', () => ({
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: ({ children }: any) => <div data-testid="pie">{children}</div>,
  Cell: ({ fill }: any) => <div data-testid="cell" style={{ fill }} />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
}))

// Helper pour créer des stats de test
function createMockStats(overrides: Partial<MembershipStatsV2> = {}): MembershipStatsV2 {
  return {
    total: 100,
    active: 70,
    expired: 20,
    noSub: 10,
    activePercentage: 70,
    expiredPercentage: 20,
    noSubPercentage: 10,
    men: 60,
    women: 40,
    menPercentage: 60,
    womenPercentage: 40,
    ...overrides,
  }
}

// Helper pour créer un membre avec abonnement
function createMockMember(overrides: Partial<MemberWithSubscription> = {}): MemberWithSubscription {
  return {
    id: '1',
    firstName: 'Jean',
    lastName: 'Dupont',
    gender: 'Homme',
    isSubscriptionValid: true,
    lastSubscription: {
      id: 'sub1',
      userId: '1',
      dateStart: new Date(),
      dateEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      montant: 1000,
      currency: 'XOF',
      type: 'adherant',
      isValid: true,
    } as any,
    ...overrides,
  } as MemberWithSubscription
}

describe('Membership Stats - Tests d\'intégration', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    })
    vi.clearAllMocks()
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  describe('INT-STATS-01: Affichage des stats depuis useMembershipsListV2', () => {
    it('devrait afficher toutes les métriques de base', async () => {
      const mockStats = createMockStats()

      render(<MembershipsListStats stats={mockStats} />, { wrapper })

      await waitFor(() => {
        expect(screen.getByText(/TOTAL/i)).toBeInTheDocument()
        expect(screen.getByText('100')).toBeInTheDocument()
      })

      expect(screen.getByText(/ACTIFS/i)).toBeInTheDocument()
      expect(screen.getByText('70')).toBeInTheDocument()

      expect(screen.getByText(/EXPIRÉS/i)).toBeInTheDocument()
      expect(screen.getByText('20')).toBeInTheDocument()

      expect(screen.getByText(/HOMMES/i)).toBeInTheDocument()
      expect(screen.getByText('60')).toBeInTheDocument()

      expect(screen.getByText(/FEMMES/i)).toBeInTheDocument()
      expect(screen.getByText('40')).toBeInTheDocument()
    })
  })

  describe('INT-STATS-02: Affichage correct de toutes les métriques', () => {
    it('devrait afficher Total, Actifs, Expirés, Hommes, Femmes avec leurs valeurs', async () => {
      const mockStats = createMockStats({
        total: 250,
        active: 180,
        expired: 50,
        noSub: 20,
        men: 150,
        women: 100,
      })

      render(<MembershipsListStats stats={mockStats} />, { wrapper })

      await waitFor(() => {
        // Vérifier Total
        const totalCard = screen.getByText(/TOTAL/i).closest('.group')
        expect(totalCard).toBeInTheDocument()
        expect(screen.getByText('250')).toBeInTheDocument()

        // Vérifier Actifs
        expect(screen.getByText(/ACTIFS/i)).toBeInTheDocument()
        expect(screen.getByText('180')).toBeInTheDocument()

        // Vérifier Expirés
        expect(screen.getByText(/EXPIRÉS/i)).toBeInTheDocument()
        expect(screen.getByText('50')).toBeInTheDocument()

        // Vérifier Hommes
        expect(screen.getByText(/HOMMES/i)).toBeInTheDocument()
        expect(screen.getByText('150')).toBeInTheDocument()

        // Vérifier Femmes
        expect(screen.getByText(/FEMMES/i)).toBeInTheDocument()
        expect(screen.getByText('100')).toBeInTheDocument()
      })
    })
  })

  describe('INT-STATS-03: Calcul correct des pourcentages', () => {
    it('devrait afficher les pourcentages corrects pour chaque métrique', async () => {
      const mockStats = createMockStats({
        total: 200,
        active: 120,
        expired: 60,
        noSub: 20,
        activePercentage: 60,
        expiredPercentage: 30,
        noSubPercentage: 10,
        men: 100,
        women: 100,
        menPercentage: 50,
        womenPercentage: 50,
      })

      render(<MembershipsListStats stats={mockStats} />, { wrapper })

      await waitFor(() => {
        // Vérifier que les pourcentages sont affichés (format: "60%")
        const percentageElements = screen.getAllByText(/\d+%/)
        expect(percentageElements.length).toBeGreaterThan(0)

        // Vérifier que le pourcentage d'actifs est visible
        expect(screen.getByText('60%')).toBeInTheDocument()
      })
    })

    it('devrait gérer les cas où total = 0', async () => {
      const mockStats = createMockStats({
        total: 0,
        active: 0,
        expired: 0,
        noSub: 0,
        activePercentage: 0,
        expiredPercentage: 0,
        noSubPercentage: 0,
        men: 0,
        women: 0,
        menPercentage: 0,
        womenPercentage: 0,
      })

      render(<MembershipsListStats stats={mockStats} />, { wrapper })

      await waitFor(() => {
        // Vérifier que le composant s'affiche avec des valeurs à 0
        expect(screen.getByText(/TOTAL/i)).toBeInTheDocument()
        // Vérifier qu'il y a au moins une valeur 0 (il y en aura plusieurs)
        const zeroValues = screen.getAllByText('0')
        expect(zeroValues.length).toBeGreaterThanOrEqual(1)
      })
    })
  })

  describe('INT-STATS-04: Navigation carrousel des stats', () => {
    it('devrait permettre de naviguer avec les boutons précédent/suivant', async () => {
      const mockStats = createMockStats()

      render(<MembershipsListStats stats={mockStats} />, { wrapper })

      await waitFor(() => {
        expect(screen.getByText(/TOTAL/i)).toBeInTheDocument()
      })

      // Trouver les boutons de navigation (ils n'ont pas de label accessible)
      const buttons = screen.getAllByRole('button')
      const navigationButtons = buttons.filter((btn) => {
        const svg = btn.querySelector('svg')
        return svg && (svg.getAttribute('class')?.includes('chevron') || svg.innerHTML.includes('chevron'))
      })

      // Il devrait y avoir au moins 2 boutons (précédent et suivant)
      expect(navigationButtons.length).toBeGreaterThanOrEqual(2)

      // Le premier bouton (précédent) devrait être désactivé au début
      const prevButton = navigationButtons[0]
      expect(prevButton).toHaveAttribute('disabled')
    })

    it('devrait permettre le drag/swipe sur mobile', async () => {
      const mockStats = createMockStats()

      const { container } = render(<MembershipsListStats stats={mockStats} />, { wrapper })

      await waitFor(() => {
        expect(screen.getByText(/TOTAL/i)).toBeInTheDocument()
      })

      // Trouver le conteneur du carrousel
      const carouselContainer = container.querySelector('.overflow-hidden')
      expect(carouselContainer).toBeInTheDocument()

      // Simuler un touch start
      if (carouselContainer) {
        fireEvent.touchStart(carouselContainer, {
          touches: [{ clientX: 100 }],
        })

        fireEvent.touchMove(carouselContainer, {
          touches: [{ clientX: 50 }],
        })

        fireEvent.touchEnd(carouselContainer)
      }
    })
  })

  describe('INT-STATS-05: Affichage avec stats vides', () => {
    it('devrait afficher 0 pour toutes les métriques quand total = 0', async () => {
      const mockStats = createMockStats({
        total: 0,
        active: 0,
        expired: 0,
        noSub: 0,
        men: 0,
        women: 0,
        activePercentage: 0,
        expiredPercentage: 0,
        noSubPercentage: 0,
        menPercentage: 0,
        womenPercentage: 0,
      })

      render(<MembershipsListStats stats={mockStats} />, { wrapper })

      await waitFor(() => {
        // Toutes les valeurs devraient être 0
        const zeroValues = screen.getAllByText('0')
        expect(zeroValues.length).toBeGreaterThanOrEqual(5) // Au moins 5 métriques à 0
      })
    })
  })

  describe('INT-STATS-06: useMembershipStats avec fetchGlobal', () => {
    it('devrait récupérer les stats globales depuis Firestore', async () => {
      const mockGlobalStats = createMockStats({
        total: 500,
        active: 350,
        expired: 100,
        noSub: 50,
      })

      // Le hook est mocké, donc on vérifie juste que les stats sont affichées
      mockUseMembershipStats.mockReturnValue({
        stats: mockGlobalStats,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      })

      // Simuler l'utilisation du hook avec fetchGlobal
      const TestComponent = () => {
        const { stats } = useMembershipStats({ fetchGlobal: true })
        if (!stats) return <div>Loading...</div>
        return <MembershipsListStats stats={stats} />
      }

      render(<TestComponent />, { wrapper })

      await waitFor(() => {
        // Vérifier que le hook a été appelé avec fetchGlobal
        expect(mockUseMembershipStats).toHaveBeenCalledWith({ fetchGlobal: true })
        // Vérifier que les stats sont affichées
        expect(screen.getByText('500')).toBeInTheDocument()
        expect(screen.getByText('350')).toBeInTheDocument()
      })
    })

    it('devrait calculer les stats depuis les membres fournis', async () => {
      const mockMembers: MemberWithSubscription[] = [
        createMockMember({ id: '1', gender: 'Homme', isSubscriptionValid: true }),
        createMockMember({ id: '2', gender: 'Femme', isSubscriptionValid: true }),
        createMockMember({ id: '3', gender: 'Homme', isSubscriptionValid: false }),
        createMockMember({ id: '4', gender: 'Femme', lastSubscription: null, isSubscriptionValid: false }),
      ]

      const mockPaginatedMembers: PaginatedMembers = {
        data: mockMembers,
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalItems: 4,
          itemsPerPage: 10,
          hasNextPage: false,
          hasPrevPage: false,
          nextCursor: null,
          prevCursor: null,
        },
      }

      const calculatedStats = MembershipStatsService.calculateStats(mockPaginatedMembers)

      mockUseMembershipStats.mockReturnValue({
        stats: calculatedStats,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      })

      const TestComponent = () => {
        const { stats } = useMembershipStats({ members: mockPaginatedMembers })
        if (!stats) return <div>Loading...</div>
        return <MembershipsListStats stats={stats} />
      }

      render(<TestComponent />, { wrapper })

      await waitFor(() => {
        expect(screen.getByText('4')).toBeInTheDocument() // Total
        expect(calculatedStats).not.toBeNull()
        expect(calculatedStats?.total).toBe(4)
        expect(calculatedStats?.men).toBe(2)
        expect(calculatedStats?.women).toBe(2)
      })
    })
  })

  describe('INT-STATS-07: Mise à jour des stats lors du changement de tab', () => {
    it('devrait mettre à jour les stats quand les données changent', async () => {
      const initialStats = createMockStats({ total: 100, active: 70 })
      const updatedStats = createMockStats({ total: 150, active: 120 })

      const { rerender } = render(<MembershipsListStats stats={initialStats} />, { wrapper })

      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument()
        expect(screen.getByText('70')).toBeInTheDocument()
      })

      // Simuler un changement de tab qui met à jour les stats
      rerender(<MembershipsListStats stats={updatedStats} />)

      await waitFor(() => {
        expect(screen.getByText('150')).toBeInTheDocument()
        expect(screen.getByText('120')).toBeInTheDocument()
      })
    })
  })
})
