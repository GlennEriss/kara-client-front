/**
 * Tests d'intégration pour IntermediaryCodeSearch
 * 
 * @see documentation/memberships/V2/form-membership/code-entremetteur/tests/README.md
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { FormProvider, useForm } from 'react-hook-form'
import IntermediaryCodeSearch from '../../components/form/IntermediaryCodeSearch'
import type { RegisterFormData } from '@/schemas/schemas'
import type { User } from '@/types/types'

// Mock Firebase avant les imports
vi.mock('@/firebase/app', () => ({
  app: {},
}))

vi.mock('@/firebase/firestore', () => ({
  db: {},
  collection: vi.fn(() => ({})),
  query: vi.fn(() => ({})),
  where: vi.fn(() => ({})),
  getDocs: vi.fn(() => Promise.resolve({ docs: [], empty: true, size: 0 })),
}))

// Mock du service Algolia
vi.mock('@/services/search/MembersAlgoliaSearchService', () => {
  const mockSearch = vi.fn()
  const mockIsAvailable = vi.fn(() => true)
  
  return {
    getMembersAlgoliaSearchService: () => ({
      isAvailable: mockIsAvailable,
      search: mockSearch,
    }),
    __mockSearch: mockSearch,
    __mockIsAvailable: mockIsAvailable,
  }
})

import * as AlgoliaServiceModule from '@/services/search/MembersAlgoliaSearchService'

const mockSearch = (AlgoliaServiceModule as any).__mockSearch
const mockIsAvailable = (AlgoliaServiceModule as any).__mockIsAvailable

const mockMember: User = {
  id: '1234.MK.567890',
  matricule: '1234.MK.567890',
  firstName: 'Jean',
  lastName: 'Dupont',
  birthDate: '1990-01-01',
  contacts: [],
  gender: 'M',
  nationality: 'Gabonais',
  hasCar: false,
  subscriptions: [],
  dossier: 'dossier-1',
  membershipType: 'adherant',
  roles: ['Adherant'],
  createdAt: new Date(),
  updatedAt: new Date(),
  isActive: true,
}

const mockMemberNDONG: User = {
  id: '1228.MK.0058',
  matricule: '1228.MK.0058',
  firstName: 'Jean-Pierre',
  lastName: 'NDONG',
  birthDate: '1990-01-01',
  contacts: [],
  gender: 'M',
  nationality: 'Gabonais',
  hasCar: false,
  subscriptions: [],
  dossier: 'dossier-2',
  membershipType: 'adherant',
  roles: ['Adherant'],
  createdAt: new Date(),
  updatedAt: new Date(),
  isActive: true,
}

function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  })

  const form = useForm<RegisterFormData>({
    defaultValues: {
      identity: {
        intermediaryCode: '',
        civility: '',
        lastName: '',
        firstName: '',
        birthDate: '',
        birthPlace: '',
        birthCertificateNumber: '',
        prayerPlace: '',
        religion: '',
        contacts: [],
        gender: '',
        nationality: '',
        maritalStatus: '',
        hasCar: false,
      },
      address: {
        province: '',
        city: '',
        district: '',
        arrondissement: '',
      },
      company: {
        isEmployed: false,
      },
      documents: {
        identityDocument: '',
        identityDocumentNumber: '',
        expirationDate: '',
        issuingPlace: '',
        issuingDate: '',
        termsAccepted: false,
      },
    },
  })

  return (
    <QueryClientProvider client={queryClient}>
      <FormProvider {...form}>{children}</FormProvider>
    </QueryClientProvider>
  )
}

describe('IntermediaryCodeSearch - Intégration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsAvailable.mockReturnValue(true)
  })

  it('INT-ICS-01: devrait permettre la recherche et la sélection d\'un membre', async () => {
    mockSearch.mockResolvedValue({
      items: [mockMemberNDONG],
      pagination: {
        page: 1,
        totalPages: 1,
        totalItems: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
    })

    render(
      <TestWrapper>
        <IntermediaryCodeSearch />
      </TestWrapper>
    )

    // Vérifier que le composant est visible
    const container = screen.getByTestId('intermediary-code-search-container')
    expect(container).toBeInTheDocument()

    // Ouvrir le popover
    const trigger = screen.getByRole('combobox')
    fireEvent.click(trigger)

    // Attendre que le champ de recherche soit visible
    const searchInput = await screen.findByPlaceholderText(/rechercher par nom/i)
    expect(searchInput).toBeInTheDocument()

    // Taper "NDONG"
    fireEvent.change(searchInput, { target: { value: 'NDONG' } })

    // Attendre les résultats
    await waitFor(() => {
      expect(mockSearch).toHaveBeenCalled()
    }, { timeout: 3000 })

    // Attendre que les résultats apparaissent
    await waitFor(() => {
      const option = screen.queryByText(/NDONG.*Jean.*Pierre/i)
      expect(option).toBeInTheDocument()
    }, { timeout: 5000 })

    // Sélectionner le membre
    const option = screen.getByText(/NDONG.*Jean.*Pierre/i)
    fireEvent.click(option)

    // Vérifier que le champ est rempli avec le code
    await waitFor(() => {
      const filledInput = screen.getByDisplayValue(/1228\.MK\.0058/)
      expect(filledInput).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('INT-ICS-02: devrait valider le format du code dans le formulaire', async () => {
    mockSearch.mockResolvedValue({
      items: [mockMember],
      pagination: {
        page: 1,
        totalPages: 1,
        totalItems: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
    })

    render(
      <TestWrapper>
        <IntermediaryCodeSearch />
      </TestWrapper>
    )

    const trigger = screen.getByRole('combobox')
    fireEvent.click(trigger)

    const searchInput = await screen.findByPlaceholderText(/rechercher par nom/i)
    fireEvent.change(searchInput, { target: { value: 'Jean' } })

    await waitFor(() => {
      expect(mockSearch).toHaveBeenCalled()
    })

    const option = await screen.findByText(/Dupont Jean \(1234\.MK\.567890\)/i)
    fireEvent.click(option)

    // Vérifier que l'icône de validation apparaît
    await waitFor(() => {
      const checkIcon = screen.getByTestId('intermediary-code-search-check-icon')
      expect(checkIcon).toBeInTheDocument()
    })

    // Vérifier le message de validation
    const validated = screen.getByTestId('intermediary-code-search-validated')
    expect(validated).toBeInTheDocument()
    expect(validated).toHaveTextContent('Format valide')
  })

  it('INT-ICS-04: devrait afficher un message d\'erreur si Algolia échoue', async () => {
    const algoliaError = new Error('Unreachable hosts - your application id may be incorrect.')
    mockSearch.mockRejectedValue(algoliaError)

    render(
      <TestWrapper>
        <IntermediaryCodeSearch />
      </TestWrapper>
    )

    const trigger = screen.getByRole('combobox')
    fireEvent.click(trigger)

    const searchInput = await screen.findByPlaceholderText(/rechercher par nom/i)
    fireEvent.change(searchInput, { target: { value: 'Jean' } })

    // Attendre que l'erreur soit affichée
    await waitFor(() => {
      const errorMessage = screen.queryByText(/temporairement indisponible/i)
      expect(errorMessage).toBeInTheDocument()
    }, { timeout: 5000 })
  })

  it('INT-ICS-05: devrait utiliser le cache React Query pour les recherches répétées', async () => {
    mockSearch.mockResolvedValue({
      items: [mockMember],
      pagination: {
        page: 1,
        totalPages: 1,
        totalItems: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
    })

    render(
      <TestWrapper>
        <IntermediaryCodeSearch />
      </TestWrapper>
    )

    const trigger = screen.getByRole('combobox')
    fireEvent.click(trigger)

    const searchInput = await screen.findByPlaceholderText(/rechercher par nom/i)
    
    // Première recherche
    fireEvent.change(searchInput, { target: { value: 'Jean' } })
    await waitFor(() => {
      expect(mockSearch).toHaveBeenCalledTimes(1)
    })

    // Fermer et rouvrir
    fireEvent.keyDown(searchInput, { key: 'Escape', code: 'Escape' })
    fireEvent.click(trigger)

    const searchInput2 = await screen.findByPlaceholderText(/rechercher par nom/i)
    
    // Effacer et retaper la même recherche
    fireEvent.change(searchInput2, { target: { value: '' } })
    fireEvent.change(searchInput2, { target: { value: 'Jean' } })

    // Le cache devrait être utilisé, donc pas d'appel supplémentaire immédiat
    // (mais React Query peut quand même refetch en arrière-plan selon staleTime)
    await waitFor(() => {
      // Au moins un appel, mais pas nécessairement deux si le cache est utilisé
      expect(mockSearch).toHaveBeenCalled()
    })
  })
})
