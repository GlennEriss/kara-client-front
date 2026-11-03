import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useCaisseImprevueContractRealtimeSync } from '../caisse-imprevue/useCaisseImprevueContractRealtimeSync'

const listeners = vi.hoisted(() => new Map<string, { callback: () => void; unsubscribe: ReturnType<typeof vi.fn> }>())
vi.mock('@/firebase/firestore', () => ({
  db: {}, doc: (_db: unknown, ...parts: string[]) => parts.join('/'), collection: (_db: unknown, ...parts: string[]) => parts.join('/'),
  onSnapshot: (path: string, callback: () => void) => {
    const unsubscribe = vi.fn()
    listeners.set(path, { callback, unsubscribe })
    return unsubscribe
  },
}))

beforeEach(() => { vi.useFakeTimers(); listeners.clear() })
afterEach(() => vi.useRealTimers())

function setup() {
  const client = new QueryClient()
  const invalidate = vi.spyOn(client, 'invalidateQueries').mockResolvedValue()
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  const hook = renderHook(({ id, enabled }) => useCaisseImprevueContractRealtimeSync(id, enabled), { wrapper, initialProps: { id: 'ci-1', enabled: true } })
  const event = (suffix = '', id = 'ci-1') => listeners.get(`contractsCI/${id}${suffix}`)!.callback()
  const initialize = (id = 'ci-1') => { event('', id); event('/payments', id); event('/supports', id) }
  const flush = async () => { await act(async () => { await vi.advanceTimersByTimeAsync(251) }) }
  const keys = () => invalidate.mock.calls.map(([options]) => options?.queryKey)
  return { ...hook, invalidate, event, initialize, flush, keys }
}

describe('synchronisation CI ciblée', () => {
  it('ne relit pas les premières notifications et déduplique une rafale paiements/aides', async () => {
    const h = setup()
    h.initialize()
    await h.flush()
    expect(h.invalidate).not.toHaveBeenCalled()
    h.event('/payments'); h.event('/payments'); h.event('/supports')
    await h.flush()
    expect(h.keys()).toEqual(expect.arrayContaining([
      ['paymentsCI', 'ci-1'], ['contract-payment-stats', 'ci-1'], ['support-ci-active', 'ci-1'], ['support-ci-history', 'ci-1'],
      ['support-ci-eligibility', 'ci-1'], ['contractCI', 'ci-1'], ['contractsCI'], ['contractsCIStats'],
    ]))
    expect(h.invalidate).toHaveBeenCalledTimes(8)
  })

  it('rafraîchit le contrat et l’éligibilité sans recharger un historique inchangé', async () => {
    const h = setup()
    h.initialize(); h.event()
    await h.flush()
    expect(h.keys()).toEqual([['contractCI', 'ci-1'], ['contractsCI'], ['contractsCIStats'], ['support-ci-eligibility', 'ci-1']])
  })

  it('ne perd pas une vraie modification survenant avant les premières réponses des autres abonnements', async () => {
    const h = setup()
    h.event(); h.event(); h.event('/payments'); h.event('/supports')
    await h.flush()
    expect(h.keys()).toContainEqual(['contractCI', 'ci-1'])
  })

  it('annule les rafraîchissements de l’ancien contrat après navigation', async () => {
    const h = setup()
    h.initialize(); h.event('/payments')
    const old = [...listeners.values()]
    h.rerender({ id: 'ci-2', enabled: true })
    old.forEach(listener => { expect(listener.unsubscribe).toHaveBeenCalledOnce(); listener.callback() })
    h.initialize('ci-2')
    await h.flush()
    expect(h.invalidate).not.toHaveBeenCalled()
    h.event('/payments', 'ci-2')
    await h.flush()
    expect(h.keys()).toContainEqual(['paymentsCI', 'ci-2'])
    expect(h.keys()).not.toContainEqual(['paymentsCI', 'ci-1'])
  })

  it('ferme les abonnements et annule la minuterie au démontage', async () => {
    const h = setup()
    h.initialize(); h.event('/supports'); h.unmount()
    await h.flush()
    expect(h.invalidate).not.toHaveBeenCalled()
    for (const listener of listeners.values()) expect(listener.unsubscribe).toHaveBeenCalledOnce()
  })
})
