/**
 * Tests unitaires pour les hooks useProfessions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useProfessionsPaginated, useProfessionMutations, useProfessionSearch, useProfessions, useJobs, useJobMutations } from '../../hooks/useProfessions'
// Mock sera créé directement dans le test

// Mock de ServiceFactory
const mockProfessionService = {
  getPaginated: vi.fn(),
  findByName: vi.fn(),
  getAll: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}

vi.mock('@/factories/ServiceFactory', () => ({
  ServiceFactory: {
    getProfessionService: vi.fn(() => mockProfessionService),
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

describe('useProfessionsPaginated', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockProfessionService.getPaginated.mockResolvedValue({
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

  it('devrait récupérer les professions paginées', async () => {
    const { result } = renderHook(() => useProfessionsPaginated({}, 1, 10), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.data).toBeDefined()
    expect(result.current.data?.pagination).toBeDefined()
  })

  it('devrait filtrer par recherche', async () => {
    const { result } = renderHook(() => useProfessionsPaginated({ search: 'Ingén' }, 1, 10), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockProfessionService.getPaginated).toHaveBeenCalledWith({ search: 'Ingén' }, 1, 10)
  })

  it('devrait gérer les erreurs lors de la récupération paginée', async () => {
    mockProfessionService.getPaginated.mockRejectedValue(new Error('Get paginated failed'))

    const { result } = renderHook(() => useProfessionsPaginated({}, 1, 10), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
  })
})

describe('useProfessionMutations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('devrait créer une profession', async () => {
    const { result } = renderHook(() => useProfessionMutations(), {
      wrapper: createWrapper(),
    })

    mockProfessionService.create.mockResolvedValue({
      id: 'prof-1',
      name: 'New Profession',
      normalizedName: 'new profession',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'admin-1',
    })

    await result.current.create.mutateAsync({
      name: 'New Profession',
      adminId: 'admin-1',
      category: 'Tech',
    })

    expect(mockProfessionService.create).toHaveBeenCalled()
  })

  it('devrait mettre à jour une profession', async () => {
    const { result } = renderHook(() => useProfessionMutations(), {
      wrapper: createWrapper(),
    })

    mockProfessionService.update.mockResolvedValue({
      id: 'prof-1',
      name: 'Updated Profession',
      normalizedName: 'updated profession',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'admin-1',
    })

    await result.current.update.mutateAsync({
      id: 'prof-1',
      updates: { name: 'Updated Profession' },
    })

    expect(mockProfessionService.update).toHaveBeenCalled()
  })

  it('devrait supprimer une profession', async () => {
    const { result } = renderHook(() => useProfessionMutations(), {
      wrapper: createWrapper(),
    })

    mockProfessionService.delete.mockResolvedValue(undefined)

    await result.current.remove.mutateAsync('prof-1')

    expect(mockProfessionService.delete).toHaveBeenCalledWith('prof-1')
  })

  it('devrait gérer les erreurs lors de la création', async () => {
    const { result } = renderHook(() => useProfessionMutations(), {
      wrapper: createWrapper(),
    })

    mockProfessionService.create.mockRejectedValue(new Error('Creation failed'))

    await expect(
      result.current.create.mutateAsync({
        name: 'New Profession',
        adminId: 'admin-1',
      })
    ).rejects.toThrow()
  })

  it('devrait gérer les erreurs lors de la mise à jour', async () => {
    const { result } = renderHook(() => useProfessionMutations(), {
      wrapper: createWrapper(),
    })

    mockProfessionService.update.mockRejectedValue(new Error('Update failed'))

    await expect(
      result.current.update.mutateAsync({
        id: 'prof-1',
        updates: { name: 'Updated' },
      })
    ).rejects.toThrow()
  })

  it('devrait gérer les erreurs lors de la suppression', async () => {
    const { result } = renderHook(() => useProfessionMutations(), {
      wrapper: createWrapper(),
    })

    mockProfessionService.delete.mockRejectedValue(new Error('Delete failed'))

    await expect(result.current.remove.mutateAsync('prof-1')).rejects.toThrow()
  })
})

describe('useProfessionSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockProfessionService.findByName.mockResolvedValue({
      found: true,
      profession: {
        id: 'prof-1',
        name: 'Ingénieur',
        normalizedName: 'ingenieur',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'admin-1',
      },
    })
  })

  it('devrait rechercher une profession par nom', async () => {
    const { result } = renderHook(() => useProfessionSearch('Ingénieur'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockProfessionService.findByName).toHaveBeenCalledWith('Ingénieur')
  })

  it('ne devrait pas rechercher si le nom est trop court', () => {
    const { result } = renderHook(() => useProfessionSearch('I'), {
      wrapper: createWrapper(),
    })

    expect(result.current.isFetching).toBe(false)
  })

  it('ne devrait pas rechercher si le nom est vide', () => {
    const { result } = renderHook(() => useProfessionSearch(''), {
      wrapper: createWrapper(),
    })

    expect(result.current.isFetching).toBe(false)
  })

  it('devrait gérer les erreurs lors de la recherche', async () => {
    mockProfessionService.findByName.mockRejectedValue(new Error('Search failed'))

    const { result } = renderHook(() => useProfessionSearch('Ingénieur'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
  })
})

describe('useProfessions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockProfessionService.getAll.mockResolvedValue([
      {
        id: 'prof-1',
        name: 'Ingénieur',
        normalizedName: 'ingenieur',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'admin-1',
      },
    ])
  })

  it('devrait récupérer toutes les professions', async () => {
    const { result } = renderHook(() => useProfessions(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockProfessionService.getAll).toHaveBeenCalled()
    expect(result.current.data).toBeDefined()
    expect(result.current.data?.length).toBeGreaterThan(0)
  })

  it('devrait récupérer les professions avec filtres', async () => {
    const { result } = renderHook(() => useProfessions({ search: 'Ingén' }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockProfessionService.getAll).toHaveBeenCalledWith({ search: 'Ingén' })
  })

  it('devrait gérer les erreurs lors de la récupération', async () => {
    mockProfessionService.getAll.mockRejectedValue(new Error('Get all failed'))

    const { result } = renderHook(() => useProfessions(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
  })
})

describe('useJobs (compatibilité)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockProfessionService.getPaginated.mockResolvedValue({
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

  it('devrait être un alias de useProfessionsPaginated', async () => {
    const { result } = renderHook(() => useJobs({}, 1, 10), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockProfessionService.getPaginated).toHaveBeenCalled()
  })
})

describe('useJobMutations (compatibilité)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('devrait être un alias de useProfessionMutations', () => {
    const { result } = renderHook(() => useJobMutations(), {
      wrapper: createWrapper(),
    })

    expect(result.current).toHaveProperty('create')
    expect(result.current).toHaveProperty('update')
    expect(result.current).toHaveProperty('remove')
  })
})
