import { describe, expect, it, vi } from 'vitest'
import {
  activityMatches,
  placementSummary,
} from '../server/activity-presentation'
import { readRows } from '../server/read-model'
import { getAdminModule } from '../catalog'
import { sectionMetrics } from '../server/filters'
import type { AdminServices } from '../server/context'
import type { MobileCaller } from '@/domains/mobile/server/access'
describe('présentation du lot natif placements et assurances', () => {
  it('calcule les commissions avec le montant payé et les statuts du site', () => {
    const row = placementSummary(
      { id: 'P' },
      [
        { id: 'C1', amount: 10000, status: 'Paid' },
        {
          id: 'C2',
          amount: 10000,
          status: 'Partial',
          paidAmount: 4000,
          dueDate: '2026-01-01',
        },
        { id: 'C3', amount: 10000, status: 'Due', dueDate: '2026-01-02' },
        { id: 'C4', amount: 9000, status: 'Canceled' },
      ],
      new Date('2026-11-18'),
    )
    expect(row.placementView).toMatchObject({
      paidCount: 1,
      totalCount: 3,
      paidAmount: 10000,
      remainingCommission: 16000,
      overdueCount: 2,
      nextId: 'C3',
    })
  })
  it('enrichit réellement la lecture de liste avec les commissions avant les compteurs', async () => {
    const row = { id: 'P', benefactorId: 'M', status: 'Active', amount: 50000 }
    const services = {
      db: {
        collection: () => ({
          limit: () => ({
            get: async () => ({
              size: 1,
              docs: [{ id: 'P', data: () => row }],
            }),
          }),
        }),
      },
      members: {
        getMemberById: async () => ({
          firstName: 'Alice',
          lastName: 'Test',
          contacts: ['066789045'],
        }),
      },
      placementService: {
        listCommissions: vi
          .fn()
          .mockResolvedValue([{ id: 'C', amount: 5000, status: 'Paid' }]),
      },
    } as unknown as AdminServices
    const module = getAdminModule('placements')!
    const data = await readRows(
      services,
      module,
      module.datasets[0],
      {} as MobileCaller,
    )
    expect(data[0]).toMatchObject({
      benefactorName: 'Alice Test',
      placementView: { paidCount: 1, paidAmount: 5000, totalCount: 1 },
    })
    expect(
      sectionMetrics(module, module.datasets[0], data, data).find(
        (m) => m.label === 'Commissions payées',
      )?.value,
    ).toBe(1)
  })
  it('filtre les contrats signés, les montants et les déclarations sans mélanger les vues', () => {
    expect(
      activityMatches(
        { amount: 50000, contractDocumentId: 'DOC' },
        { minAmount: 40000, maxAmount: 60000, contractState: 'present' },
        'placements',
      ),
    ).toBe(true)
    expect(
      activityMatches(
        { amount: 50000 },
        { contractState: 'present' },
        'placements',
      ),
    ).toBe(false)
    expect(
      activityMatches(
        { declarationStatus: 'pending' },
        { declarationView: 'approved' },
        'vehicles',
      ),
    ).toBe(false)
    expect(
      activityMatches(
        { declarationStatus: 'validated' },
        { declarationView: 'approved' },
        'vehicles',
      ),
    ).toBe(true)
  })
  it('ne compte pas une déclaration en attente parmi les assurances validées', () => {
    const module = getAdminModule('vehicles')!,
      rows = [
        {
          status: 'active',
          holderType: 'member',
          declarationStatus: 'validated',
        },
        {
          status: 'active',
          holderType: 'member',
          declarationStatus: 'pending',
        },
      ]
    expect(
      sectionMetrics(module, module.datasets[0], rows, rows).find(
        (m) => m.label === 'Assurés',
      )?.value,
    ).toBe(1)
  })
  it('réserve les commissions du mois et en retard aux placements actifs', () => {
    const row = {
      status: 'Active',
      placementView: { nextDate: '2026-11-01', overdueCount: 1 },
    }
    for (const filter of [
      { commissionMonth: '2026-11' },
      { overdue: 'true' },
    ]) {
      expect(activityMatches(row, filter, 'placements')).toBe(true)
      expect(
        activityMatches({ ...row, status: 'Closed' }, filter, 'placements'),
      ).toBe(false)
    }
    expect(
      activityMatches(row, { commissionMonth: '2026-12' }, 'placements'),
    ).toBe(false)
  })
})
