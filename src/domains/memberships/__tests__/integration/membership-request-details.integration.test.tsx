/**
 * Tests d'intégration pour la vue détails d'une demande d'adhésion
 * 
 * Scénarios testés :
 * - Chargement réussi (toutes sections visibles)
 * - Erreur 404 (message + retour)
 * - Erreur réseau (retry)
 * - PDF adhésion (URL directe + fallback Firestore + manquant)
 * - Paiement (payé/non payé)
 * - Statut "under_review" (corrections)
 * - Navigation (retour liste)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import MembershipRequestDetails from '@/components/memberships/MembershipRequestDetails'
import { useMembershipRequestDetails } from '../../hooks/useMembershipRequestDetails'
import { resolveAdhesionPdfUrl } from '../../utils/details'
import { toast } from 'sonner'

// Mock Next.js Image component
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: any) => {
    return <img src={src} alt={alt} {...props} />
  },
}))

// Mocks
vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'req-1' }),
  useRouter: vi.fn(),
}))

vi.mock('../../hooks/useMembershipRequestDetails')
vi.mock('../../utils/details', () => ({
  resolveAdhesionPdfUrl: vi.fn(),
  formatDateDetailed: vi.fn((date: any) => {
    if (!date) return 'Non définie'
    if (date instanceof Date) {
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    }
    return String(date)
  }),
  isDateExpired: vi.fn(() => false),
  formatAddress: vi.fn((address: any) => {
    const parts = [address.province, address.city, address.district, address.arrondissement].filter(Boolean)
    return parts.length > 0 ? parts.join(', ') : 'Non renseignée'
  }),
}))

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: { uid: 'test-admin-uid', email: 'admin@test.com' },
    loading: false,
    authenticated: true,
  })),
}))

// Fixtures
const createRequestFixture = (overrides: any = {}) => ({
  id: 'req-1',
  matricule: '1234.MK.567890',
  status: 'approved' as const,
  isPaid: true,
  adhesionPdfURL: 'https://storage.example.com/pdf/test.pdf',
  processedBy: 'admin-1',
  processedAt: new Date('2024-01-15'),
  createdAt: new Date('2024-01-10'),
  updatedAt: new Date('2024-01-15'),
  identity: {
    firstName: 'Jean',
    lastName: 'Dupont',
    email: 'jean.dupont@example.com',
    civility: 'M.',
    gender: 'M',
    birthDate: new Date('1990-05-15'),
    birthPlace: 'Paris',
    nationality: 'FR',
    maritalStatus: 'Célibataire',
    prayerPlace: 'Mosquée Centrale',
    intermediaryCode: 'inter-1',
    hasCar: true,
    contacts: ['+33612345678', '+33687654321'],
    photoURL: 'https://storage.example.com/photos/photo.jpg',
  },
  address: {
    province: 'Île-de-France',
    city: 'Paris',
    district: 'Quartier Latin',
    arrondissement: '5ème',
    additionalInfo: 'Appartement 3B',
  },
  company: {
    isEmployed: true,
    companyName: 'Tech Corp',
    profession: 'Ingénieur',
    seniority: '5 ans',
    companyAddress: {
      province: 'Île-de-France',
      city: 'Paris',
      district: 'La Défense',
    },
  },
  documents: {
    identityDocument: 'Passeport',
    identityDocumentNumber: '12AB34567',
    issuingDate: new Date('2020-01-01'),
    expirationDate: new Date('2030-01-01'),
    issuingPlace: 'Paris',
    documentPhotoFrontURL: 'https://storage.example.com/docs/front.jpg',
    documentPhotoBackURL: 'https://storage.example.com/docs/back.jpg',
  },
  payments: [
    {
      amount: 5000,
      date: new Date('2024-01-12'),
      mode: 'Espèces',
    },
  ],
  memberNumber: 'MEM-12345',
  adminComments: 'Demande validée',
  ...overrides,
})

const createAdminFixture = () => ({
  id: 'admin-1',
  firstName: 'Alice',
  lastName: 'Admin',
})

const createIntermediaryFixture = () => ({
  firstName: 'Inter',
  lastName: 'Media',
  type: 'admin' as const,
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

describe('Integration: MembershipRequestDetails', () => {
  const mockRouter = {
    back: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useRouter).mockReturnValue(mockRouter as any)
    vi.mocked(resolveAdhesionPdfUrl).mockResolvedValue(null)
  })

  describe('INT-DETAILS-01: Chargement réussi', () => {
    it('should display all sections when request loads successfully', async () => {
      const request = createRequestFixture()
      const admin = createAdminFixture()
      const intermediary = createIntermediaryFixture()

      vi.mocked(useMembershipRequestDetails).mockReturnValue({
        request,
        admin,
        intermediary,
        adhesionPdfUrlResolved: 'https://storage.example.com/pdf/test.pdf',
        isLoading: false,
        isError: false,
        error: null,
      } as any)

      render(
        <TestWrapper>
          <MembershipRequestDetails />
        </TestWrapper>
      )

      // Vérifier que toutes les sections principales sont visibles
      await waitFor(() => {
        expect(screen.getByTestId('details-header')).toBeInTheDocument()
        expect(screen.getByTestId('details-identity-card')).toBeInTheDocument()
        expect(screen.getByTestId('details-contact-card')).toBeInTheDocument()
        expect(screen.getByTestId('details-address-card')).toBeInTheDocument()
        expect(screen.getByTestId('details-employment-card')).toBeInTheDocument()
        expect(screen.getByTestId('details-payment-card')).toBeInTheDocument()
        expect(screen.getByTestId('details-documents-card')).toBeInTheDocument()
        expect(screen.getByTestId('details-meta-card')).toBeInTheDocument()
      })

      // Vérifier le contenu spécifique
      await waitFor(() => {
        expect(screen.getByText(/Jean Dupont/i)).toBeInTheDocument()
        expect(screen.getByText(/jean.dupont@example.com/i)).toBeInTheDocument()
        expect(screen.getByText(/Tech Corp/i)).toBeInTheDocument()
      })
    })
  })

  describe('INT-DETAILS-02: Erreur 404', () => {
    it('should display error state when request is not found', async () => {
      vi.mocked(useMembershipRequestDetails).mockReturnValue({
        request: null,
        admin: null,
        intermediary: null,
        adhesionPdfUrlResolved: null,
        isLoading: false,
        isError: true,
        error: new Error('Demande introuvable'),
      } as any)

      render(
        <TestWrapper>
          <MembershipRequestDetails />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Demande introuvable/i })).toBeInTheDocument()
        expect(screen.getByTestId('details-error-back-button')).toBeInTheDocument()
      })

      // Vérifier que le bouton retour fonctionne
      const backButton = screen.getByTestId('details-error-back-button')
      backButton.click()
      expect(mockRouter.back).toHaveBeenCalled()
    })
  })

  describe('INT-DETAILS-03: Erreur réseau', () => {
    it('should display error state with retry button on network error', async () => {
      // Mock window.location.reload pour jsdom
      const mockReload = vi.fn()
      Object.defineProperty(window, 'location', {
        value: { reload: mockReload },
        writable: true,
      })

      vi.mocked(useMembershipRequestDetails).mockReturnValue({
        request: null,
        admin: null,
        intermediary: null,
        adhesionPdfUrlResolved: null,
        isLoading: false,
        isError: true,
        error: new Error('Network error'),
      } as any)

      render(
        <TestWrapper>
          <MembershipRequestDetails />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Demande introuvable/i })).toBeInTheDocument()
        expect(screen.getByTestId('details-error-retry-button')).toBeInTheDocument()
      })

      // Vérifier que le bouton retry fonctionne
      const retryButton = screen.getByTestId('details-error-retry-button')
      retryButton.click()
      // Le retry devrait appeler window.location.reload
      expect(mockReload).toHaveBeenCalled()
    })
  })

  describe('INT-DETAILS-04: PDF adhésion - URL directe', () => {
    it('should open PDF directly when adhesionPdfURL is present', async () => {
      const request = createRequestFixture({
        status: 'approved',
        adhesionPdfURL: 'https://storage.example.com/pdf/direct.pdf',
      })

      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

      vi.mocked(useMembershipRequestDetails).mockReturnValue({
        request,
        admin: null,
        intermediary: null,
        adhesionPdfUrlResolved: 'https://storage.example.com/pdf/direct.pdf',
        isLoading: false,
        isError: false,
        error: null,
      } as any)

      render(
        <TestWrapper>
          <MembershipRequestDetails />
        </TestWrapper>
      )

      await waitFor(() => {
        const pdfButton = screen.getByTestId('details-adhesion-pdf-button')
        expect(pdfButton).toBeInTheDocument()
      })

      const pdfButton = screen.getByTestId('details-adhesion-pdf-button')
      pdfButton.click()

      await waitFor(() => {
        expect(openSpy).toHaveBeenCalledWith(
          'https://storage.example.com/pdf/direct.pdf',
          '_blank',
          'noopener,noreferrer'
        )
      })

      openSpy.mockRestore()
    })
  })

  describe('INT-DETAILS-05: PDF adhésion - Fallback Firestore', () => {
    it('should resolve PDF from Firestore when adhesionPdfURL is missing', async () => {
      const request = createRequestFixture({
        status: 'approved',
        adhesionPdfURL: null,
      })

      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

      vi.mocked(useMembershipRequestDetails).mockReturnValue({
        request,
        admin: null,
        intermediary: null,
        adhesionPdfUrlResolved: null, // Pas résolu par le hook
        isLoading: false,
        isError: false,
        error: null,
      } as any)

      vi.mocked(resolveAdhesionPdfUrl).mockResolvedValue('https://storage.example.com/pdf/from-firestore.pdf')

      render(
        <TestWrapper>
          <MembershipRequestDetails />
        </TestWrapper>
      )

      // Attendre que le composant soit rendu
      await waitFor(() => {
        expect(screen.getByTestId('details-documents-card')).toBeInTheDocument()
      })

      // Le bouton PDF doit être visible pour les demandes approuvées
      await waitFor(() => {
        const pdfButton = screen.getByTestId('details-adhesion-pdf-button')
        expect(pdfButton).toBeInTheDocument()
      })

      const pdfButton = screen.getByTestId('details-adhesion-pdf-button')
      pdfButton.click()

      await waitFor(() => {
        expect(resolveAdhesionPdfUrl).toHaveBeenCalledWith({
          id: request.id,
          matricule: request.matricule,
          adhesionPdfURL: null,
          status: 'approved',
        })
        expect(openSpy).toHaveBeenCalledWith(
          'https://storage.example.com/pdf/from-firestore.pdf',
          '_blank',
          'noopener,noreferrer'
        )
      })

      openSpy.mockRestore()
    })
  })

  describe('INT-DETAILS-06: PDF adhésion - Manquant', () => {
    it('should show error toast when PDF is not available', async () => {
      const request = createRequestFixture({
        status: 'approved',
        adhesionPdfURL: null,
      })

      vi.mocked(useMembershipRequestDetails).mockReturnValue({
        request,
        admin: null,
        intermediary: null,
        adhesionPdfUrlResolved: null,
        isLoading: false,
        isError: false,
        error: null,
      } as any)

      vi.mocked(resolveAdhesionPdfUrl).mockResolvedValue(null)

      render(
        <TestWrapper>
          <MembershipRequestDetails />
        </TestWrapper>
      )

      await waitFor(() => {
        const pdfButton = screen.getByTestId('details-adhesion-pdf-button')
        expect(pdfButton).toBeInTheDocument()
      })

      const pdfButton = screen.getByTestId('details-adhesion-pdf-button')
      pdfButton.click()

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('PDF non disponible', {
          description: "Aucun PDF d'adhésion validé n'a été trouvé pour cette demande",
        })
      })
    })
  })

  describe('INT-DETAILS-07: Paiement payé', () => {
    it('should display payment details when request is paid', async () => {
      const request = createRequestFixture({
        isPaid: true,
        payments: [
          {
            amount: 5000,
            date: new Date('2024-01-12'),
            mode: 'Espèces',
          },
        ],
      })

      vi.mocked(useMembershipRequestDetails).mockReturnValue({
        request,
        admin: null,
        intermediary: null,
        adhesionPdfUrlResolved: null,
        isLoading: false,
        isError: false,
        error: null,
      } as any)

      render(
        <TestWrapper>
          <MembershipRequestDetails />
        </TestWrapper>
      )

      await waitFor(() => {
        const paymentStatus = screen.getByTestId('details-payment-status')
        expect(paymentStatus).toBeInTheDocument()
        expect(paymentStatus).toHaveTextContent(/Payé/i)
      })

      // Vérifier que les détails de paiement sont affichés
      expect(screen.getByTestId('details-payment-amount')).toBeInTheDocument()
      expect(screen.getByTestId('details-payment-date')).toBeInTheDocument()
      expect(screen.getByTestId('details-payment-mode')).toBeInTheDocument()
    })
  })

  describe('INT-DETAILS-08: Paiement non payé', () => {
    it('should display "Non payé" badge and hide payment details', async () => {
      const request = createRequestFixture({
        isPaid: false,
        payments: [],
      })

      vi.mocked(useMembershipRequestDetails).mockReturnValue({
        request,
        admin: null,
        intermediary: null,
        adhesionPdfUrlResolved: null,
        isLoading: false,
        isError: false,
        error: null,
      } as any)

      render(
        <TestWrapper>
          <MembershipRequestDetails />
        </TestWrapper>
      )

      await waitFor(() => {
        const paymentStatus = screen.getByTestId('details-payment-status')
        expect(paymentStatus).toBeInTheDocument()
        expect(paymentStatus).toHaveTextContent(/Non payé/i)
      })

      // Les détails de paiement ne doivent pas être affichés
      expect(screen.queryByTestId('details-payment-amount')).not.toBeInTheDocument()
    })
  })

  describe('INT-DETAILS-09: Statut "under_review"', () => {
    it('should display corrections block when status is under_review', async () => {
      const request = createRequestFixture({
        status: 'under_review',
        reviewNote: 'Veuillez corriger les informations suivantes...',
      })

      vi.mocked(useMembershipRequestDetails).mockReturnValue({
        request,
        admin: null,
        intermediary: null,
        adhesionPdfUrlResolved: null,
        isLoading: false,
        isError: false,
        error: null,
      } as any)

      render(
        <TestWrapper>
          <MembershipRequestDetails />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('details-review-note')).toBeInTheDocument()
        expect(screen.getByText(/Veuillez corriger/i)).toBeInTheDocument()
      })

      // Vérifier que le badge "under_review" est affiché
      expect(screen.getByTestId('details-status-badge')).toBeInTheDocument()
    })
  })

  describe('INT-DETAILS-10: Navigation retour', () => {
    it('should navigate back when back button is clicked', async () => {
      const request = createRequestFixture()

      vi.mocked(useMembershipRequestDetails).mockReturnValue({
        request,
        admin: null,
        intermediary: null,
        adhesionPdfUrlResolved: null,
        isLoading: false,
        isError: false,
        error: null,
      } as any)

      render(
        <TestWrapper>
          <MembershipRequestDetails />
        </TestWrapper>
      )

      await waitFor(() => {
        const backButton = screen.getByTestId('details-back-button')
        expect(backButton).toBeInTheDocument()
      })

      const backButton = screen.getByTestId('details-back-button')
      backButton.click()

      expect(mockRouter.back).toHaveBeenCalled()
    })
  })

  describe('INT-DETAILS-11: États de chargement', () => {
    it('should display skeleton while loading', async () => {
      vi.mocked(useMembershipRequestDetails).mockReturnValue({
        request: null,
        admin: null,
        intermediary: null,
        adhesionPdfUrlResolved: null,
        isLoading: true,
        isError: false,
        error: null,
      } as any)

      render(
        <TestWrapper>
          <MembershipRequestDetails />
        </TestWrapper>
      )

      // Vérifier que le skeleton est affiché (pas de sections de contenu)
      expect(screen.queryByTestId('details-identity-card')).not.toBeInTheDocument()
      expect(screen.queryByTestId('details-header')).not.toBeInTheDocument()
    })
  })

  describe('INT-DETAILS-12: Admin traiteur', () => {
    it('should display admin name when processedBy is available', async () => {
      const request = createRequestFixture({
        processedBy: 'admin-1',
      })
      const admin = createAdminFixture()

      vi.mocked(useMembershipRequestDetails).mockReturnValue({
        request,
        admin,
        intermediary: null,
        adhesionPdfUrlResolved: null,
        isLoading: false,
        isError: false,
        error: null,
      } as any)

      render(
        <TestWrapper>
          <MembershipRequestDetails />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('details-processed-by')).toBeInTheDocument()
        expect(screen.getByText(/Alice Admin/i)).toBeInTheDocument()
      })
    })
  })

  describe('INT-DETAILS-13: Intermédiaire', () => {
    it('should display intermediary info when intermediaryCode is present', async () => {
      const request = createRequestFixture({
        identity: {
          ...createRequestFixture().identity,
          intermediaryCode: 'inter-1',
        },
      })
      const intermediary = createIntermediaryFixture()

      vi.mocked(useMembershipRequestDetails).mockReturnValue({
        request,
        admin: null,
        intermediary,
        adhesionPdfUrlResolved: null,
        isLoading: false,
        isError: false,
        error: null,
      } as any)

      render(
        <TestWrapper>
          <MembershipRequestDetails />
        </TestWrapper>
      )

      await waitFor(() => {
        // Le texte "Inter Media" peut apparaître plusieurs fois (dans DetailsIdentityCard et DetailsEmploymentCard)
        const elements = screen.getAllByText(/Inter Media/i)
        expect(elements.length).toBeGreaterThan(0)
        expect(elements[0]).toBeInTheDocument()
      })
    })
  })
})
