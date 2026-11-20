import { describe, expect, it, vi } from 'vitest'
import {
  membershipCardRows,
  membershipOverview,
  memberRecentForm,
} from '../server/membership-presentation'
import type { AdminServices } from '../server/context'

describe('présentation des trois sections adhésion natives', () => {
  it('conserve les compteurs globaux du site indépendamment des filtres de liste', () => {
    expect(
      membershipOverview('member-requests', [
        { status: 'pending', isPaid: false },
        { status: 'under_review', isPaid: true },
        { status: 'approved', isPaid: true },
        { status: 'rejected', isPaid: false },
      ]),
    ).toEqual({
      total: 4,
      pending: 1,
      underReview: 1,
      toProcess: 2,
      approved: 1,
      rejected: 1,
      paid: 2,
      unpaid: 2,
    })
    expect(
      membershipOverview('members', [
        {
          gender: 'Homme',
          lastSubscription: { id: 'S1' },
          isSubscriptionValid: true,
        },
        {
          gender: 'Femme',
          lastSubscription: { id: 'S2' },
          isSubscriptionValid: false,
        },
        { gender: 'Femme' },
      ]),
    ).toEqual({ total: 3, active: 1, expired: 1, noSub: 1, men: 1, women: 2 })
  })
  it('charge les noms d’approbateurs une seule fois pour les cartes de la page', async () => {
    const get = vi
      .fn()
      .mockResolvedValue({
        data: () => ({ firstName: 'Admin', lastName: 'Test' }),
      })
    const services = {
      db: { collection: () => ({ doc: () => ({ get }) }) },
    } as unknown as AdminServices
    const result = await membershipCardRows(services, 'member-requests', [
      { id: 'A', approvedBy: 'admin-1' },
      { id: 'B', approvedBy: 'admin-1', processedBy: 'admin-1' },
    ])
    expect(result.map((r) => r.approvedByName)).toEqual([
      'Admin Test',
      'Admin Test',
    ])
    expect(get).toHaveBeenCalledTimes(1)
  })
  it('reprend les étoiles du service métier, y compris les membres sans étoile', async () => {
    const getMemberStarsMany = vi
      .fn()
      .mockResolvedValue(new Map([['A', { stars: 4 }]]))
    const services = {
      charityStars: { getMemberStarsMany },
    } as unknown as AdminServices
    expect(
      await membershipCardRows(services, 'members', [{ id: 'A' }, { id: 'B' }]),
    ).toEqual([
      { id: 'A', charityStars: 4 },
      { id: 'B', charityStars: 0 },
    ])
    expect(getMemberStarsMany).toHaveBeenCalledWith(['A', 'B'])
  })
  it('reconstruit l’activité avec les paiements des seuls contrats autorisés', async () => {
    const collection = vi.fn((path: string) => ({
      get: async () => ({
        docs:
          path === 'caisseContracts/CS1/payments'
            ? [
                {
                  id: 'P1',
                  data: () => ({
                    dueMonthIndex: 0,
                    dueAt: new Date('2026-06-01'),
                    paidAt: new Date('2026-06-01'),
                    amount: 25000,
                    status: 'PAID',
                  }),
                },
              ]
            : [],
      }),
    }))
    const result = await memberRecentForm(
      { db: { collection } } as unknown as AdminServices,
      'M1',
      [{ key: 'contracts-cs', items: [{ id: 'CS1', monthlyAmount: 25000 }] }],
    )
    expect(collection).toHaveBeenCalledTimes(1)
    expect(collection).toHaveBeenCalledWith('caisseContracts/CS1/payments')
    expect(result.products.flatMap((p) => p.entries)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          contractId: 'CS1',
          outcome: 'onTime',
          amount: 25000,
        }),
      ]),
    )
  })
})
