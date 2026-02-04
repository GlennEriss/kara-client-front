/**
 * Tests unitaires pour useReplaceAdhesionPdf
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useReplaceAdhesionPdf } from '../useReplaceAdhesionPdf'

const mockReplaceAdhesionPdf = vi.fn()
vi.mock('../../services/MembershipServiceV2', () => ({
  MembershipServiceV2: {
    getInstance: vi.fn(() => ({
      replaceAdhesionPdf: mockReplaceAdhesionPdf,
    })),
  },
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }
}

describe('useReplaceAdhesionPdf', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('devrait exposer replaceAdhesionPdf, isReplacing, error, isError', () => {
    const { result } = renderHook(() => useReplaceAdhesionPdf(), {
      wrapper: createWrapper(),
    })
    expect(typeof result.current.replaceAdhesionPdf).toBe('function')
    expect(result.current.isReplacing).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.isError).toBe(false)
  })

  it('devrait appeler le service et afficher un toast success', async () => {
    mockReplaceAdhesionPdf.mockResolvedValue(undefined)
    const { toast } = await import('sonner')
    const file = new File(['x'], 'test.pdf', { type: 'application/pdf' })

    const { result } = renderHook(() => useReplaceAdhesionPdf(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      await result.current.replaceAdhesionPdf({
        requestId: 'req-1',
        adminId: 'admin-1',
        file,
      })
    })

    expect(mockReplaceAdhesionPdf).toHaveBeenCalledWith({
      requestId: 'req-1',
      adminId: 'admin-1',
      file,
    })
    expect(toast.success).toHaveBeenCalledWith(
      'PDF remplacé',
      expect.objectContaining({
        description: expect.stringContaining('mis à jour'),
      })
    )
  })

  it('devrait afficher un toast error en cas d\'échec', async () => {
    mockReplaceAdhesionPdf.mockRejectedValue(new Error('Validation failed'))
    const { toast } = await import('sonner')
    const file = new File(['x'], 'test.pdf', { type: 'application/pdf' })

    const { result } = renderHook(() => useReplaceAdhesionPdf(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      try {
        await result.current.replaceAdhesionPdf({
          requestId: 'req-1',
          adminId: 'admin-1',
          file,
        })
      } catch {
        // attendu
      }
    })

    expect(toast.error).toHaveBeenCalledWith(
      'Erreur',
      expect.objectContaining({
        description: expect.stringMatching(/Validation failed|Impossible/),
      })
    )
  })
})
