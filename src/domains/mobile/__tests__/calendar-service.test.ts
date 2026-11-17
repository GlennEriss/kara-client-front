// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getMobileCalendar } from '../server/calendar-service'
const mock = vi.hoisted(() => ({ rows: new Map<string, Record<string, unknown>[]>(), fail: '', compute: vi.fn() }))
vi.mock('@/utils/credit-installments', () => ({ computeCreditInstallments: mock.compute }))
vi.mock('@/firebase/adminFirestore', () => ({ adminFirestore: {
  collection: (path: string) => {
    const filters: Array<[string, string, unknown]> = []
    const query = {
      where: (key: string, operator: string, value: unknown) => { filters.push([key, operator, value]); return query },
      get: async () => {
        if (path === mock.fail) throw new Error('lecture interrompue')
        const selected = (mock.rows.get(path) ?? []).filter(row => filters.every(([key, operator, value]) =>
          operator === '==' ? row[key] === value : operator === 'in' ? (value as unknown[]).includes(row[key]) : operator === '>=' ? Number(row[key]) >= Number(value) : Number(row[key]) <= Number(value)))
        return { docs: selected.map(data => ({ id: String(data.id), data: () => data })) }
      },
    }
    return query
  },
  doc: (path: string) => ({ get: async () => ({ data: () => mock.rows.get(path)?.[0] }) }),
} }))
const now = new Date('2026-11-17T10:00:00Z')
beforeEach(() => { mock.rows.clear(); mock.fail = ''; mock.compute.mockReset() })
describe('lecture des échéances mobiles', () => {
  it('reconstitue une échéance CI sans document paiement et tient compte des versements partiels', async () => {
    mock.rows.set('contractsCI', [{ id: 'ci', status: 'ACTIVE', firstPaymentDate: '2026-10-18', paymentFrequency: 'MONTHLY', subscriptionCIDuration: 3, subscriptionCIAmountPerMonth: 50000, memberFirstName: 'Marie', memberLastName: 'Ondo' }])
    expect(await getMobileCalendar('2026-11', 'caisse-imprevue', now)).toMatchObject([{ date: '2026-11-18', amount: 50000, remainingAmount: 50000, status: 'imminent' }])
    mock.rows.set('contractsCI/ci/payments', [{ id: 'month-1', monthIndex: 1, status: 'PARTIAL', targetAmount: 50000, accumulatedAmount: 15000 }])
    expect(await getMobileCalendar('2026-11', 'caisse-imprevue', now)).toMatchObject([{ paidAmount: 15000, remainingAmount: 35000, status: 'partial' }])
  })
  it('inclut le capital des placements et neutralise les commissions annulées', async () => {
    mock.rows.set('placements', [{ id: 'p', status: 'Active', amount: 1000000, endDate: new Date('2026-11-30T12:00:00Z'), benefactorName: 'Aline' }])
    mock.rows.set('placements/p/commissions', [{ id: 'c', dueDate: new Date('2026-11-20T12:00:00Z'), amount: 50000, status: 'Canceled', paidAmount: 20000 }])
    const events = await getMobileCalendar('2026-11', 'placement', now)
    expect(events).toHaveLength(2)
    expect(events[0]).toMatchObject({ status: 'cancelled', amount: 0, paidAmount: 0, remainingAmount: 0 })
    expect(events[1]).toMatchObject({ label: 'Restitution du capital', amount: 1000000, remainingAmount: 1000000 })
  })
  it('réutilise le calcul crédit de l’admin et exclut les autres produits', async () => {
    mock.rows.set('creditContracts', [{ id: 'special', status: 'ACTIVE', creditType: 'SPECIALE', clientFirstName: 'Jean' }, { id: 'fixe', status: 'ACTIVE', creditType: 'FIXE' }])
    mock.rows.set('creditPayments', [{ id: 'payment', creditId: 'special', amount: 10000 }])
    mock.compute.mockReturnValue([{ id: 'm1', dueDate: new Date('2026-11-20T12:00:00Z'), installmentNumber: 1, totalAmount: 50000, paidAmount: 10000, remainingAmount: 0, status: 'PAID' }])
    const events = await getMobileCalendar('2026-11', 'credit-speciale', now)
    expect(mock.compute).toHaveBeenCalledOnce()
    expect(mock.compute.mock.calls[0][0].id).toBe('special')
    expect(mock.compute.mock.calls[0][1]).toHaveLength(1)
    expect(events[0]).toMatchObject({ paidAmount: 10000, remainingAmount: 0, status: 'paid' })
  })
  it('ne publie jamais un calendrier incomplet si une lecture échoue', async () => {
    mock.rows.set('caisseContracts', [{ id: 'cs', status: 'ACTIVE', contractType: 'INDIVIDUAL', memberId: 'm' }])
    mock.fail = 'caisseContracts/cs/payments'
    await expect(getMobileCalendar('2026-11', 'caisse-speciale', now)).rejects.toThrow('lecture interrompue')
  })
})
