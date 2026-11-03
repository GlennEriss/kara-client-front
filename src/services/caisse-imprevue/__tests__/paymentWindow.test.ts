import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PaymentCIRepository } from '@/repositories/caisse-imprevu/PaymentCIRepository'

const store = vi.hoisted(() => {
  const state = { readDocuments: 0 }
  const docs = Array.from({ length: 12 }, (_, monthIndex) => ({
    id: `historical-payment-${monthIndex}`,
    data: () => ({ monthIndex, status: monthIndex === 10 ? 'PARTIAL' : 'PAID', accumulatedAmount: monthIndex === 10 ? 12_000 : 30_000, targetAmount: 30_000,
      createdAt: { toDate: () => new Date('2026-01-01') }, updatedAt: { toDate: () => new Date('2026-11-01') },
      versements: [{ amount: monthIndex === 10 ? 12_000 : 30_000, createdAt: { toDate: () => new Date('2026-10-10') } }], createdBy: 'admin-1', updatedBy: 'admin-2' }),
  }))
  const getDocs = vi.fn(async (source: { constraints?: Array<{ op: string; value: number }> }) => {
    const selected = docs.filter(d => (source.constraints ?? []).every(c => c.op === '>=' ? d.data().monthIndex >= c.value : d.data().monthIndex <= c.value))
    state.readDocuments += selected.length
    return { docs: selected }
  })
  return { state, getDocs, api: { db: {}, collection: () => ({}), getDocs,
    where: (_field: string, op: string, value: number) => ({ op, value }),
    query: (_source: unknown, ...constraints: unknown[]) => ({ constraints }),
  } }
})
vi.mock('@/firebase/firestore', () => store.api)
beforeEach(() => { store.state.readDocuments = 0; vi.clearAllMocks(); vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-11-03')) })
afterEach(() => vi.useRealTimers())

describe('lecture des paiements CI du mois affiché', () => {
  it('garde les mêmes données et les identifiants historiques en ne lisant que le mois utile', async () => {
    const repository = new PaymentCIRepository()
    const full = await repository.getPaymentsByContractId('ci-1')
    store.state.readDocuments = 0
    const selected = await repository.getPaymentsByContractId('ci-1', [10])
    expect(selected).toEqual(full.filter(p => p.monthIndex === 10))
    expect(selected[0]).toMatchObject({ id: 'historical-payment-10', contractId: 'ci-1', status: 'PARTIAL', accumulatedAmount: 12_000, versements: [{ amount: 12_000, createdAt: new Date('2026-10-10') }] })
    expect(store.state.readDocuments).toBe(1)
  })
  it('lit les deux périodes lorsqu’un mois calendaire contient deux échéances quotidiennes', async () => {
    const selected = await new PaymentCIRepository().getPaymentsByContractId('ci-1', [9, 10])
    expect(selected.map(p => p.monthIndex)).toEqual([9, 10])
    expect(store.state.readDocuments).toBe(2)
  })
  it('ne lit aucun paiement pour une liste de périodes vide', async () => {
    expect(await new PaymentCIRepository().getPaymentsByContractId('ci-1', [])).toEqual([])
    expect(store.getDocs).not.toHaveBeenCalled()
  })
})
