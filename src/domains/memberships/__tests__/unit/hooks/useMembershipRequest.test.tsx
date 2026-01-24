import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useMembershipRequest } from '../../../hooks/useMembershipRequest'
import { MembershipRepositoryV2 } from '../../../repositories/MembershipRepositoryV2'
import { createMembershipRequestFixture } from '../../fixtures'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

// Mock Repository
const mockGetById = vi.fn()
vi.mock('../../../repositories/MembershipRepositoryV2', () => ({
    MembershipRepositoryV2: {
        getInstance: vi.fn(() => ({
            getById: mockGetById
        }))
    }
}))

// Wrapper for React Query
const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
        },
    })
    return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
}

describe('useMembershipRequest', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('devrait récupérer une demande par son ID', async () => {
        const requestId = 'req-123'
        const mockRequest = createMembershipRequestFixture({ id: requestId })
        mockGetById.mockResolvedValue(mockRequest)

        const { result } = renderHook(() => useMembershipRequest(requestId), {
            wrapper: createWrapper()
        })

        await waitFor(() => expect(result.current.isSuccess).toBe(true))

        expect(mockGetById).toHaveBeenCalledWith(requestId)
        expect(result.current.data).toEqual(mockRequest)
    })

    it('ne devrait pas appeler le repository si l\'ID est vide', async () => {
        const { result } = renderHook(() => useMembershipRequest(''), {
            wrapper: createWrapper()
        })

        // Le hook est désactivé si pas d'ID
        expect(mockGetById).not.toHaveBeenCalled()
        // Status should be pending (but fetchStatus idle)
        expect(result.current.fetchStatus).toBe('idle')
    })
})
