import { describe, it, expect, vi } from 'vitest'
import { MemberOverviewAggregationService } from '../services/MemberOverviewAggregationService'
import { createMemberOverviewRepository } from '../repositories/MemberOverviewRepository'
import type { IMemberOverviewRepository } from '../repositories/IMemberOverviewRepository'
import { memberOverviewDetailRoute } from '../entities/member-overview-navigation'

export function overviewRepository(): IMemberOverviewRepository {
  return {
    getMemberById: vi.fn(async () => ({
      id: 'MEM1',
      matricule: '0001.MK.TEST',
    })),
    getCaisseSpecialeDemands: vi.fn(async () => []),
    getCaisseSpecialeContracts: vi.fn(async () => []),
    getCaisseImprevueDemands: vi.fn(async () => []),
    getCaisseImprevueContracts: vi.fn(async () => []),
    getCreditDemands: vi.fn(async () => []),
    getCreditContracts: vi.fn(async () => []),
    getPlacementDemands: vi.fn(async () => []),
    getPlacements: vi.fn(async () => []),
    getCharityDeclarations: vi.fn(async () => []),
    getCharityContributions: vi.fn(async () => []),
    countClosedContracts: vi.fn(async () => 99),
  }
}
describe('vue consolidée : compteurs et contrats consultables', () => {
  it('classe tous les statuts clôturés avec leurs identifiants et conserve les règles en suivi', async () => {
    const repository = overviewRepository()
    vi.mocked(repository.getCaisseSpecialeContracts).mockResolvedValue([
      { id: 'CS-1', status: 'ACTIVE' },
      { id: 'CS-2', status: 'CLOSED' },
    ])
    vi.mocked(repository.getCaisseImprevueContracts).mockResolvedValue([
      { id: 'CI-1', status: 'ACTIVE' },
      { id: 'CI-2', status: 'FINISHED' },
      { id: 'CI-3', status: 'CANCELED' },
    ])
    vi.mocked(repository.getCreditContracts).mockImplementation(
      async (_id, type) =>
        ['ACTIVE', 'CLOSED', 'DISCHARGED', 'WRITTEN_OFF'].map((status) => ({
          id: `${type}-${status}`,
          status,
        })),
    )
    vi.mocked(repository.getPlacements).mockResolvedValue(
      ['Active', 'Closed', 'EarlyExit'].map((status) => ({
        id: `P-${status}`,
        status,
      })),
    )
    const result =
      await MemberOverviewAggregationService.withRepository(
        repository,
      ).getMemberOverview('MEM1')
    expect(
      result.modules.caisseSpeciale.closedContracts?.map((item) => item.id),
    ).toEqual(['CS-2'])
    expect(
      result.modules.caisseImprevue.closedContracts?.map((item) => item.id),
    ).toEqual(['CI-2'])
    expect(
      result.modules.caisseImprevue.contrats.map((item) => item.id),
    ).toEqual(['CI-1'])
    for (const key of ['creditSpeciale', 'creditFixe', 'creditAide'] as const) {
      expect(result.modules[key].closedContrats).toBe(3)
      expect(result.modules[key].closedContracts).toHaveLength(3)
      expect(result.modules[key].contrats).toHaveLength(1)
    }
    expect(result.modules.placement.closedContrats).toBe(2)
    expect(repository.countClosedContracts).not.toHaveBeenCalled()
  })
  it('ne compte pas deux fois une demande déjà transformée et expose une erreur partielle sans faux zéro', async () => {
    const repository = overviewRepository()
    vi.mocked(repository.getCreditDemands).mockResolvedValue([
      { id: 'D1', status: 'APPROVED', contractId: 'C1' },
      { id: 'D2', status: 'PENDING' },
    ])
    vi.mocked(repository.getCaisseImprevueContracts).mockRejectedValue(
      Error('unavailable'),
    )
    const result =
      await MemberOverviewAggregationService.withRepository(
        repository,
      ).getMemberOverview('MEM1')
    expect(result.modules.creditFixe.demandes.map((item) => item.id)).toEqual([
      'D2',
    ])
    expect(result.modules.caisseImprevue).toMatchObject({
      hasError: true,
      closedContrats: null,
    })
  })
  it('lit tous les contrats du membre avant filtrage, même sans createdAt, sans limite à 8', async () => {
    const getDocs = vi.fn(async () => ({
      docs: Array.from({ length: 25 }, (_, i) => ({
        id: `CS-${i}`,
        data: () => ({
          id: 'stale-id',
          status: i < 22 ? 'CLOSED' : 'ACTIVE',
          createdAt: i === 24 ? undefined : '2026-01-01',
        }),
      })),
    }))
    const query = vi.fn((_base, ...constraints) => constraints)
    const repository = createMemberOverviewRepository({
      db: {} as never,
      collection: vi.fn(() => 'caisseContracts') as never,
      where: vi.fn((...args) => args) as never,
      query: query as never,
      getDocs: getDocs as never,
    }).MemberOverviewRepository.getInstance()
    const rows = await repository.getCaisseSpecialeContracts('MEM1', 8)
    expect(rows).toHaveLength(25)
    expect(rows.some((row) => row.id === 'CS-24')).toBe(true)
    expect(query.mock.calls[0].slice(1)).toEqual([['memberId', '==', 'MEM1']])
  })
  it.each([
    ['caisseSpeciale', 'contrat', '/caisse-speciale/contrats/'],
    ['caisseImprevue', 'contrat', '/caisse-imprevue/contrats/'],
    ['creditFixe', 'contrat', '/credit-fixe/contrats/'],
    ['creditAide', 'demande', '/credit-aide/demandes/'],
    ['creditSpeciale', 'contrat', '/credit-speciale/contrats/'],
    ['placement', 'contrat', '/placements/'],
  ] as const)('route %s/%s vers son détail', (module, kind, prefix) => {
    expect(
      memberOverviewDetailRoute({
        id: 'REF 1',
        module,
        kind,
        status: 'CLOSED',
      }),
    ).toBe(prefix + 'REF%201')
  })
})
