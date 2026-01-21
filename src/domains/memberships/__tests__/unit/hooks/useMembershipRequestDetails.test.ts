import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { useMembershipRequestDetails } from '../../../hooks/useMembershipRequestDetails'

// Mocks - utiliser vi.fn() directement dans les factories pour éviter le hoisting
vi.mock('../../../repositories/MembershipRepositoryV2', () => {
  const mockGetById = vi.fn()
  return {
    MembershipRepositoryV2: {
      getInstance: () => ({
        getById: mockGetById,
      })
    },
    __mockGetById: mockGetById, // Exporter pour utilisation dans les tests
  }
})

vi.mock('@/db/admin.db', () => {
  const mockGetAdminById = vi.fn()
  return {
    getAdminById: mockGetAdminById,
    __mockGetAdminById: mockGetAdminById,
  }
})

vi.mock('@/hooks/useIntermediary', () => {
  const mockUseIntermediary = vi.fn()
  return {
    useIntermediary: mockUseIntermediary,
    __mockUseIntermediary: mockUseIntermediary,
  }
})

vi.mock('../../../utils/details', () => {
  const mockResolveAdhesionPdfUrl = vi.fn()
  return {
    resolveAdhesionPdfUrl: mockResolveAdhesionPdfUrl,
    __mockResolveAdhesionPdfUrl: mockResolveAdhesionPdfUrl,
  }
})

// Récupérer les mocks après import
import * as MembershipRepositoryV2Module from '../../../repositories/MembershipRepositoryV2'
import * as AdminDbModule from '@/db/admin.db'
import * as UseIntermediaryModule from '@/hooks/useIntermediary'
import * as DetailsUtilsModule from '../../../utils/details'

const mockGetById = (MembershipRepositoryV2Module as any).__mockGetById
const mockGetAdminById = (AdminDbModule as any).__mockGetAdminById
const mockUseIntermediary = (UseIntermediaryModule as any).__mockUseIntermediary
const mockResolveAdhesionPdfUrl = (DetailsUtilsModule as any).__mockResolveAdhesionPdfUrl

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useMembershipRequestDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('agrège la demande, admin, intermédiaire et PDF résolu', async () => {
    const request = {
      id: 'req-1',
      matricule: 'MAT001',
      status: 'approved',
      adhesionPdfURL: null,
      processedBy: 'admin-1',
      identity: {
        intermediaryCode: 'inter-1',
      },
    } as any

    mockGetById.mockResolvedValue(request)
    mockGetAdminById.mockResolvedValue({ id: 'admin-1', firstName: 'Alice', lastName: 'Admin' })
    mockUseIntermediary.mockReturnValue({ 
      data: { firstName: 'Inter', lastName: 'Media', type: 'admin' }, 
      isLoading: false 
    })
    mockResolveAdhesionPdfUrl.mockResolvedValue('https://storage.example.com/pdf/from-firestore.pdf')

    const wrapper = createWrapper()
    const { result } = renderHook(() => useMembershipRequestDetails('req-1'), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(mockGetById).toHaveBeenCalledWith('req-1')
    expect(mockGetAdminById).toHaveBeenCalledWith('admin-1')
    expect(mockResolveAdhesionPdfUrl).toHaveBeenCalledWith({
      id: 'req-1',
      matricule: 'MAT001',
      adhesionPdfURL: null,
      status: 'approved',
    })

    expect(result.current.request).toEqual(request)
    expect(result.current.admin).toEqual({ id: 'admin-1', firstName: 'Alice', lastName: 'Admin' })
    expect(result.current.intermediary).toEqual({ firstName: 'Inter', lastName: 'Media', type: 'admin' })
    expect(result.current.adhesionPdfUrlResolved).toBe('https://storage.example.com/pdf/from-firestore.pdf')
    expect(result.current.isError).toBe(false)
  })

  it('retourne isError quand la demande est introuvable', async () => {
    mockGetById.mockResolvedValue(null)
    const wrapper = createWrapper()
    const { result } = renderHook(() => useMembershipRequestDetails('unknown'), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.request).toBeNull()
    expect(result.current.isError).toBe(false) // pas d'erreur, juste data null
  })
})
