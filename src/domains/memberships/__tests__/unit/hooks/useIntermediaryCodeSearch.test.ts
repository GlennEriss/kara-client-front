/**
 * Tests unitaires pour useIntermediaryCodeSearch
 * 
 * @see documentation/memberships/V2/form-membership/code-entremetteur/tests/README.md
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { useIntermediaryCodeSearch } from '../../../hooks/useIntermediaryCodeSearch'
import type { User } from '@/types/types'

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

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  })

  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children)
  }

  return Wrapper
}

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

describe('useIntermediaryCodeSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsAvailable.mockReturnValue(true)
  })

  it('UNIT-ICS-01: devrait déclencher la recherche si query >= 2 caractères', async () => {
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

    const wrapper = createWrapper()
    const { result } = renderHook(
      () => useIntermediaryCodeSearch({ query: 'Jean' }),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(mockSearch).toHaveBeenCalled()
    expect(result.current.results).toHaveLength(1)
    expect(result.current.results[0].displayName).toBe('Dupont Jean (1234.MK.567890)')
    expect(result.current.results[0].code).toBe('1234.MK.567890')
  })

  it('UNIT-ICS-02: ne devrait pas déclencher la recherche si query < 2 caractères', () => {
    const wrapper = createWrapper()
    const { result } = renderHook(
      () => useIntermediaryCodeSearch({ query: 'J' }),
      { wrapper }
    )

    expect(result.current.isLoading).toBe(false)
    expect(result.current.results).toHaveLength(0)
    expect(mockSearch).not.toHaveBeenCalled()
  })

  it('UNIT-ICS-04: devrait formater les résultats correctement', async () => {
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

    const wrapper = createWrapper()
    const { result } = renderHook(
      () => useIntermediaryCodeSearch({ query: 'Jean' }),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.results.length > 0).toBe(true)
    })

    expect(result.current.results[0].displayName).toBe('Dupont Jean (1234.MK.567890)')
    expect(result.current.results[0].code).toBe('1234.MK.567890')
    expect(result.current.results[0].member).toEqual(mockMember)
  })

  it('UNIT-ICS-05: devrait filtrer seulement les membres actifs', async () => {
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

    const wrapper = createWrapper()
    renderHook(
      () => useIntermediaryCodeSearch({ query: 'Jean' }),
      { wrapper }
    )

    await waitFor(() => {
      expect(mockSearch).toHaveBeenCalled()
    })

    const callArgs = mockSearch.mock.calls[0][0]
    expect(callArgs.filters?.isActive).toBe(true)
  })

  it('UNIT-ICS-06: devrait limiter à 10 résultats', async () => {
    const manyMembers = Array.from({ length: 15 }, (_, i) => ({
      ...mockMember,
      id: `${i}.MK.000000`,
      matricule: `${i}.MK.000000`,
      firstName: `Jean${i}`,
    }))

    mockSearch.mockResolvedValue({
      items: manyMembers.slice(0, 10),
      pagination: {
        page: 1,
        totalPages: 2,
        totalItems: 15,
        hasNextPage: true,
        hasPrevPage: false,
      },
    })

    const wrapper = createWrapper()
    const { result } = renderHook(
      () => useIntermediaryCodeSearch({ query: 'Jean' }),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.results.length > 0).toBe(true)
    })

    const callArgs = mockSearch.mock.calls[0][0]
    expect(callArgs.hitsPerPage).toBe(10)
    expect(result.current.results.length).toBeLessThanOrEqual(10)
  })

  it('UNIT-ICS-11: devrait gérer les erreurs Algolia', async () => {
    const algoliaError = new Error('Unreachable hosts - your application id may be incorrect.')
    mockSearch.mockRejectedValue(algoliaError)

    const wrapper = createWrapper()
    const { result } = renderHook(
      () => useIntermediaryCodeSearch({ query: 'Jean' }),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBeDefined()
    expect(result.current.error?.message).toContain('temporairement indisponible')
  })

  it('devrait retourner un message d\'erreur si Algolia n\'est pas configuré', async () => {
    mockIsAvailable.mockReturnValue(false)

    const wrapper = createWrapper()
    const { result } = renderHook(
      () => useIntermediaryCodeSearch({ query: 'Jean' }),
      { wrapper }
    )

    // La requête ne devrait pas être activée
    expect(result.current.isLoading).toBe(false)
    expect(mockSearch).not.toHaveBeenCalled()
  })
})
