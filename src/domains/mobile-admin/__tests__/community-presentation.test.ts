import { describe, expect, it, vi } from 'vitest'
import {
  communityMatches,
  communityMetrics,
  communityRows,
  eventMatchesTab,
  shopMatchesTab,
} from '../server/community-presentation'
import { filterRows } from '../server/read-model'
import { listSchema } from '../server/gateway'
import type { AdminServices } from '../server/context'
describe('boutiques, événements et filtres des groupes', () => {
  it('garde les fiches historiques publiées et les modifications proposées dans la bonne file', () => {
    const legacy = { isActive: true },
      changed = {
        status: 'approved',
        isActive: true,
        pendingChanges: { name: 'Nouveau nom' },
      },
      rejected = { status: 'rejected', isActive: false }
    expect(shopMatchesTab(legacy, 'published')).toBe(true)
    expect(shopMatchesTab(changed, 'pending')).toBe(true)
    expect(shopMatchesTab(changed, 'published')).toBe(true)
    expect(shopMatchesTab(rejected, 'hidden')).toBe(true)
    expect(
      communityMetrics('shops', 'shops', [legacy, changed, rejected])?.find(
        (m) => m.label === 'Publiées',
      )?.value,
    ).toBe(2)
  })
  it('enrichit les boutiques avec les articles et le même moteur d’achats à crédit que le site', async () => {
    const services = {
      shops: {
        listShopArticles: vi.fn().mockResolvedValue([
          { shopId: 'S', status: 'approved' },
          { shopId: 'S', status: 'pending' },
        ]),
        listShopCreditPartners: vi
          .fn()
          .mockResolvedValue([
            { shopId: 'S', enabled: true, discountPercent: 5 },
          ]),
      },
      creditSpeciale: {
        getContractsWithFilters: vi
          .fn()
          .mockResolvedValue([
            {
              id: 'C',
              status: 'ACTIVE',
              amount: 100000,
              totalAmount: 110000,
              amountPaid: 10000,
              shopPurchase: {
                shopId: 'S',
                shopName: 'Boutique',
                price: 100000,
                vendorAmount: 95000,
                vendorStatus: 'PENDING',
              },
            },
          ]),
      },
    } as unknown as AdminServices
    const [row] = await communityRows(services, 'shops', 'shops', [
      { id: 'S', name: 'Boutique' },
    ])
    expect(row.shopView).toMatchObject({
      articleCount: 2,
      publishedArticles: 1,
      pendingArticles: 1,
      partner: { discountPercent: 5 },
      credit: {
        financed: 100000,
        dueToVendors: 95000,
        discountEarned: 0,
        interest: 10000,
      },
    })
  })
  it('filtre les événements avec leur type réel et les dates du site', () => {
    const event = {
      status: 'published',
      type: 'charity',
      startDate: '2026-12-01T12:00:00Z',
    }
    expect(eventMatchesTab(event, 'upcoming', new Date('2026-11-18'))).toBe(
      true,
    )
    expect(eventMatchesTab(event, 'past', new Date('2026-11-18'))).toBe(false)
    expect(communityMatches(event, { type: 'training' }, 'events')).toBe(false)
    expect(communityMatches(event, { type: 'charity' }, 'events')).toBe(true)
    expect(
      eventMatchesTab(
        { ...event, status: 'cancelled' },
        'upcoming',
        new Date('2026-11-18'),
      ),
    ).toBe(false)
  })
  it('combine la catégorie et le statut sur un même projet du groupe', () => {
    const rows = [
      {
        id: 'wrong',
        projects: [
          { kind: 'TONTINE', status: 'COMPLETED' },
          { kind: 'PURCHASE', status: 'ACTIVE' },
        ],
      },
      { id: 'right', projects: [{ kind: 'TONTINE', status: 'ACTIVE' }] },
    ]
    expect(
      listSchema.safeParse({ projectKind: 'TONTINE', projectStatus: 'ACTIVE' })
        .success,
    ).toBe(true)
    expect(
      filterRows(
        rows,
        { projectKind: 'TONTINE', projectStatus: 'ACTIVE' },
        'groups',
      ).map((r) => r.id),
    ).toEqual(['right'])
  })
})
