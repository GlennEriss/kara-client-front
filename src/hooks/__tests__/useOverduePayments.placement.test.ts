import type { CommissionPaymentPlacement, Placement } from '@/types/types'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const listPlacements = vi.fn()
const listCommissions = vi.fn()

vi.mock('@/factories/ServiceFactory', () => ({
  ServiceFactory: {
    getPlacementService: () => ({
      listPlacements: (...args: unknown[]) => listPlacements(...args),
      listCommissions: (...args: unknown[]) => listCommissions(...args),
    }),
  },
}))

// Dépendances Firestore des autres produits : jamais atteintes ici, mais
// importées par le module.
vi.mock('@/db/caisse/contracts.db', () => ({ getAllContracts: vi.fn() }))
vi.mock('@/db/caisse/payments.db', () => ({ listPayments: vi.fn() }))
vi.mock('@/db/group.db', () => ({ getGroupById: vi.fn() }))
vi.mock('@/db/user.db', () => ({ getUserById: vi.fn().mockResolvedValue(null) }))

import { fetchOverduePlacement } from '@/hooks/useOverduePayments'

const TODAY = new Date('2026-11-15T00:00:00')

const placement = {
  id: 'placement-1',
  benefactorId: 'member-1',
  benefactorName: 'NGUEMA Paul',
  amount: 1_000_000,
  rate: 5,
  periodMonths: 3,
  payoutMode: 'MonthlyCommission_CapitalEnd',
  status: 'Active',
  startDate: new Date('2026-08-06T00:00:00'),
  endDate: new Date('2026-11-06T00:00:00'),
  createdAt: new Date('2026-08-01T00:00:00'),
  updatedAt: new Date('2026-08-01T00:00:00'),
  createdBy: 'admin-1',
} satisfies Placement

const commission = (overrides: Partial<CommissionPaymentPlacement>): CommissionPaymentPlacement =>
  ({
    id: 'commission-1',
    placementId: placement.id,
    dueDate: new Date('2026-09-06T00:00:00'),
    amount: 50_000,
    status: 'Due',
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'admin-1',
    ...overrides,
  }) as CommissionPaymentPlacement

describe('fetchOverduePlacement', () => {
  beforeEach(() => {
    listPlacements.mockReset()
    listCommissions.mockReset()
    listPlacements.mockResolvedValue([placement])
  })

  it('réclame le reste à verser sur une commission partiellement réglée', async () => {
    listCommissions.mockResolvedValue([
      commission({ status: 'Partial', amount: 50_000, paidAmount: 20_000 }),
    ])

    const items = await fetchOverduePlacement(TODAY)
    const partial = items.find((i) => i.typeLabel === 'Commission')

    // 50 000 dus, 20 000 déjà versés : on réclame 30 000, comme le calendrier.
    expect(partial?.amount).toBe(30_000)
  })

  it('réclame le montant entier d’une commission simplement due', async () => {
    listCommissions.mockResolvedValue([commission({ status: 'Due', amount: 50_000 })])

    const items = await fetchOverduePlacement(TODAY)

    expect(items.find((i) => i.typeLabel === 'Commission')?.amount).toBe(50_000)
  })

  it('ajoute la restitution du capital quand le terme est dépassé', async () => {
    listCommissions.mockResolvedValue([])

    const items = await fetchOverduePlacement(TODAY)
    const capital = items.find((i) => i.typeLabel === 'Restitution du capital')

    // Terme au 06/11, on est le 15/11 : le capital est dû même si toutes les
    // commissions sont soldées.
    expect(capital?.amount).toBe(1_000_000)
    expect(capital?.daysOverdue).toBe(9)
  })

  it('n’annonce pas le capital avant le terme du placement', async () => {
    listPlacements.mockResolvedValue([
      { ...placement, endDate: new Date('2027-03-06T00:00:00') },
    ])
    listCommissions.mockResolvedValue([])

    const items = await fetchOverduePlacement(TODAY)

    expect(items).toHaveLength(0)
  })

  it('ignore les commissions payées et annulées', async () => {
    listCommissions.mockResolvedValue([
      commission({ id: 'c-paid', status: 'Paid', paidAmount: 50_000 }),
      commission({ id: 'c-canceled', status: 'Canceled' }),
    ])

    const items = await fetchOverduePlacement(TODAY)

    expect(items.filter((i) => i.typeLabel === 'Commission')).toHaveLength(0)
  })
})
