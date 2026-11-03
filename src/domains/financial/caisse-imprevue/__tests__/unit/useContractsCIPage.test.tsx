import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ContractCI } from '@/types/types'
import { useContractsCIPage } from '../../hooks/useContractsCIPage'
import { getContractsCIForExport } from '../../services/getContractsCIForExport'

const mock = vi.hoisted(() => ({ getContracts: vi.fn(), readPage: vi.fn() }))
vi.mock('../../services/CaisseImprevueContractsService', () => ({ CaisseImprevueContractsService: { getInstance: () => ({ getContractsWithFilters: mock.getContracts }) } }))
vi.mock('../../repositories/readContractsCIPage', () => ({ readContractsCIPage: mock.readPage }))

const contracts = Array.from({ length: 45 }, (_, index) => ({ id: `ci-${index}`, status: index % 3 === 0 ? 'CANCELED' : 'ACTIVE' })) as ContractCI[]
const wrapper = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })
  return function TestQueryProvider({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}
beforeEach(() => vi.clearAllMocks())

describe('pagination CI et exports complets', () => {
  it('réutilise l’ensemble filtré entre pages et actualise réellement les filtres calculés sur demande', async () => {
    mock.getContracts.mockResolvedValue(contracts)
    const { result, rerender } = renderHook(({ page }) => useContractsCIPage({ search: 'ci-' }, 'open', page, 14), { wrapper: wrapper(), initialProps: { page: 1 } })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const expected = contracts.filter(c => c.status === 'ACTIVE')
    expect(result.current.data).toMatchObject({ items: expected.slice(0, 14), total: expected.length })
    rerender({ page: 2 })
    await waitFor(() => expect(result.current.data?.items).toEqual(expected.slice(14, 28)))
    expect(mock.getContracts).toHaveBeenCalledTimes(1)
    await act(async () => { await result.current.refetch() })
    expect(mock.getContracts).toHaveBeenCalledTimes(2)
    expect(mock.readPage).not.toHaveBeenCalled()
  })

  it('ne montre pas le résultat d’un ancien filtre pendant le chargement du nouveau', async () => {
    let finishOld!: (value: unknown) => void
    mock.readPage.mockImplementation((filters) => filters.status === 'ACTIVE'
      ? new Promise(resolve => { finishOld = resolve })
      : Promise.resolve({ items: [{ id: 'closed-person' }], total: 1, nextCursor: null }))
    const { result, rerender } = renderHook(({ status }) => useContractsCIPage({ status }, 'all', 1, 14), { wrapper: wrapper(), initialProps: { status: 'ACTIVE' as 'ACTIVE' | 'CANCELED' } })
    rerender({ status: 'CANCELED' })
    expect(result.current.data).toBeUndefined()
    await waitFor(() => expect(result.current.data?.items[0].id).toBe('closed-person'))
    await act(async () => { finishOld({ items: [{ id: 'old-person' }], total: 1, nextCursor: null }) })
    expect(result.current.data?.items[0].id).toBe('closed-person')
  })

  it('exporte tous les résultats filtrés, y compris ceux hors de la page courante', async () => {
    mock.getContracts.mockResolvedValue(contracts)
    expect(await getContractsCIForExport({ search: 'ci-' }, 'all')).toEqual(contracts)
    expect(await getContractsCIForExport({ search: 'ci-' }, 'closed')).toEqual(contracts.filter(c => c.status === 'CANCELED'))
    expect(mock.getContracts).toHaveBeenCalledWith({ search: 'ci-' }, { throwOnError: true })
  })

  it('signale une erreur d’export au lieu de produire un document partiel ou vide', async () => {
    mock.getContracts.mockRejectedValue(new Error('Lecture refusée'))
    await expect(getContractsCIForExport({}, 'all')).rejects.toThrow('Lecture refusée')
  })
})
