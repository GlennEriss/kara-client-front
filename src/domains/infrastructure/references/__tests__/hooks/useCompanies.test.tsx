/**
 * Tests unitaires pour les hooks useCompanies
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useCompaniesPaginated, useCompanyMutations, useCompanySearch, useCompanies } from '../../hooks/useCompanies'
// Mock sera créé directement dans le test

// Mock de ServiceFactory
const mockCompanyService = {
  getPaginated: vi.fn(),
  findByName: vi.fn(),
  getAll: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}

vi.mock('@/factories/ServiceFactory', () => ({
  ServiceFactory: {
    getCompanyService: vi.fn(() => mockCompanyService),
  },
}))

// Mock de useAuth
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { uid: 'test-user-id' },
  }),
}))

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  Wrapper.displayName = 'TestWrapper'
  return Wrapper
}

describe('useCompaniesPaginated', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCompanyService.getPaginated.mockResolvedValue({
      data: [],
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        itemsPerPage: 10,
        hasNextPage: false,
        hasPrevPage: false,
      },
    })
  })

  it('devrait récupérer les entreprises paginées', async () => {
    const { result } = renderHook(() => useCompaniesPaginated({}, 1, 10), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.data).toBeDefined()
    expect(result.current.data?.pagination).toBeDefined()
  })

  it('devrait filtrer par recherche', async () => {
    const { result } = renderHook(() => useCompaniesPaginated({ search: 'Total' }, 1, 10), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockCompanyService.getPaginated).toHaveBeenCalledWith({ search: 'Total' }, 1, 10)
  })

  it('devrait gérer les erreurs lors de la récupération paginée', async () => {
    mockCompanyService.getPaginated.mockRejectedValue(new Error('Get paginated failed'))

    const { result } = renderHook(() => useCompaniesPaginated({}, 1, 10), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
  })
})

describe('useCompanyMutations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('devrait créer une entreprise', async () => {
    const { result } = renderHook(() => useCompanyMutations(), {
      wrapper: createWrapper(),
    })

    mockCompanyService.create.mockResolvedValue({
      id: 'comp-1',
      name: 'New Company',
      normalizedName: 'new company',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'admin-1',
    })

    await result.current.create.mutateAsync({
      name: 'New Company',
      adminId: 'admin-1',
      industry: 'Tech',
    })

    expect(mockCompanyService.create).toHaveBeenCalled()
  })

  it('devrait mettre à jour une entreprise', async () => {
    const { result } = renderHook(() => useCompanyMutations(), {
      wrapper: createWrapper(),
    })

    mockCompanyService.update.mockResolvedValue({
      id: 'comp-1',
      name: 'Updated Company',
      normalizedName: 'updated company',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'admin-1',
    })

    await result.current.update.mutateAsync({
      id: 'comp-1',
      updates: { name: 'Updated Company' },
    })

    expect(mockCompanyService.update).toHaveBeenCalled()
  })

  it('devrait supprimer une entreprise', async () => {
    const { result } = renderHook(() => useCompanyMutations(), {
      wrapper: createWrapper(),
    })

    mockCompanyService.delete.mockResolvedValue(undefined)

    await result.current.remove.mutateAsync('comp-1')

    expect(mockCompanyService.delete).toHaveBeenCalledWith('comp-1')
  })

  it('devrait gérer les erreurs lors de la création', async () => {
    const { result } = renderHook(() => useCompanyMutations(), {
      wrapper: createWrapper(),
    })

    mockCompanyService.create.mockRejectedValue(new Error('Creation failed'))

    await expect(
      result.current.create.mutateAsync({
        name: 'New Company',
        adminId: 'admin-1',
      })
    ).rejects.toThrow()
  })

  it('devrait gérer les erreurs lors de la mise à jour', async () => {
    const { result } = renderHook(() => useCompanyMutations(), {
      wrapper: createWrapper(),
    })

    mockCompanyService.update.mockRejectedValue(new Error('Update failed'))

    await expect(
      result.current.update.mutateAsync({
        id: 'comp-1',
        updates: { name: 'Updated' },
      })
    ).rejects.toThrow()
  })

  it('devrait gérer les erreurs lors de la suppression', async () => {
    const { result } = renderHook(() => useCompanyMutations(), {
      wrapper: createWrapper(),
    })

    mockCompanyService.delete.mockRejectedValue(new Error('Delete failed'))

    await expect(result.current.remove.mutateAsync('comp-1')).rejects.toThrow()
  })
})

describe('useCompanySearch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCompanyService.findByName.mockResolvedValue({
      found: true,
      company: {
        id: 'comp-1',
        name: 'Total Gabon',
        normalizedName: 'total gabon',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'admin-1',
      },
    })
  })

  it('devrait rechercher une entreprise par nom', async () => {
    const { result } = renderHook(() => useCompanySearch('Total Gabon'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockCompanyService.findByName).toHaveBeenCalledWith('Total Gabon')
  })

  it('ne devrait pas rechercher si le nom est trop court', () => {
    const { result } = renderHook(() => useCompanySearch('T'), {
      wrapper: createWrapper(),
    })

    expect(result.current.isFetching).toBe(false)
  })

  it('ne devrait pas rechercher si le nom est vide', () => {
    const { result } = renderHook(() => useCompanySearch(''), {
      wrapper: createWrapper(),
    })

    expect(result.current.isFetching).toBe(false)
  })

  it('devrait gérer les erreurs lors de la recherche', async () => {
    mockCompanyService.findByName.mockRejectedValue(new Error('Search failed'))

    const { result } = renderHook(() => useCompanySearch('Total Gabon'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
  })
})

describe('useCompanies', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCompanyService.getAll.mockResolvedValue([
      {
        id: 'comp-1',
        name: 'Total Gabon',
        normalizedName: 'total gabon',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'admin-1',
      },
    ])
  })

  it('devrait récupérer toutes les entreprises', async () => {
    const { result } = renderHook(() => useCompanies(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockCompanyService.getAll).toHaveBeenCalled()
    expect(result.current.data).toBeDefined()
    expect(result.current.data?.length).toBeGreaterThan(0)
  })

  it('devrait récupérer les entreprises avec filtres', async () => {
    const { result } = renderHook(() => useCompanies({ search: 'Total' }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockCompanyService.getAll).toHaveBeenCalledWith({ search: 'Total' })
  })

  it('devrait gérer les erreurs lors de la récupération', async () => {
    mockCompanyService.getAll.mockRejectedValue(new Error('Get all failed'))

    const { result } = renderHook(() => useCompanies(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
  })
})
