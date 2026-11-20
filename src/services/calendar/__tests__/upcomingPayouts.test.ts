import { describe, expect, it, vi } from 'vitest'
import {
  createUpcomingPayoutsReader,
  type UpcomingPayoutPorts,
} from '../upcomingPayouts'
const now = new Date('2026-11-20T12:00:00')
function setup() {
  const cs: any[] = [
    {
      id: 'CS',
      status: 'DEFAULTED_AFTER_J12',
      memberId: 'M',
      caisseType: 'JOURNALIERE',
      monthsPlanned: 1,
      contractStartAt: new Date('2026-10-22'),
      currentMonthIndex: 0,
      nominalPaid: 0,
    },
  ]
  const ci: any[] = [
    {
      id: 'CI',
      status: 'ACTIVE',
      memberId: 'M',
      memberFirstName: 'Marie',
      memberLastName: 'Test',
      firstPaymentDate: '2025-11-20',
      paymentFrequency: 'MONTHLY',
      subscriptionCIDuration: 12,
      totalMonthsPaid: 0,
      subscriptionCIAmountPerMonth: 50000,
    },
  ]
  const ports: UpcomingPayoutPorts = {
    getAllContracts: vi.fn(async () => cs),
    listPayments: vi.fn(
      async () =>
        [
          {
            id: 'p',
            status: 'DUE',
            accumulatedAmount: 12500,
            contribs: [{ amount: 12500 }],
          },
        ] as any,
    ),
    getActiveSettings: vi.fn(
      async () => ({ bonusTable: {}, isActive: true }) as any,
    ),
    listRefunds: vi.fn(async () => []),
    listRefundsCI: vi.fn(async () => []),
    getUserById: vi.fn(async () => ({ firstName: 'Marie', lastName: 'Test' })),
    getGroupById: vi.fn(async () => null),
    getCaisseImprevueService: () => ({
      getContractsCIPaginated: async (filters) =>
        filters.status === 'ACTIVE' ? ci : [],
      getPaymentsByContractId: async () =>
        [{ status: 'PARTIAL', accumulatedAmount: 7500 }] as any,
    }),
    getPlacementService: () => ({
      listPlacements: async () => [],
      getEarlyExit: async () => null,
      listCommissions: async () => [],
    }),
  }
  return { ports, read: createUpcomingPayoutsReader(ports) }
}
describe('remises à venir avec cotisations incomplètes', () => {
  it('inclut les acomptes CS et CI même quand les compteurs de mois sont à zéro', async () => {
    const { read } = setup()
    const items = await read(3, now)
    expect(items).toHaveLength(2)
    expect(items.find((row) => row.contractId === 'CS')).toMatchObject({
      amount: 12500,
      kind: 'FINAL',
      isProjected: false,
      daysUntil: 0,
    })
    expect(items.find((row) => row.contractId === 'CI')).toMatchObject({
      amount: 7500,
      kind: 'FINAL',
      isProjected: false,
      daysUntil: 0,
    })
  })
  it('garde une remise échue dans la liste et la retire quand elle est payée', async () => {
    const { ports, read } = setup()
    expect(
      (await read(3, new Date('2026-12-20'))).every(
        (row) => row.daysUntil < 0 && !row.isProjected,
      ),
    ).toBe(true)
    vi.mocked(ports.listRefunds).mockResolvedValue([
      { type: 'FINAL', status: 'PAID' },
    ])
    vi.mocked(ports.listRefundsCI).mockResolvedValue([
      { type: 'FINAL', status: 'PAID' },
    ])
    expect(await read(3, now)).toEqual([])
  })
  it('affiche une prévision avant le terme avec le montant réellement versé', async () => {
    const { read } = setup()
    expect(
      (await read(3, new Date('2026-11-01'))).map((row) => [
        row.amount,
        row.isProjected,
      ]),
    ).toEqual([
      [12500, true],
      [7500, true],
    ])
  })
  it('réutilise le montant arrêté d’une demande finale et ne lit pas les autres produits', async () => {
    const { ports, read } = setup()
    vi.mocked(ports.listRefunds).mockResolvedValue([
      {
        type: 'FINAL',
        status: 'APPROVED',
        amountNominal: 12500,
        amountBonus: 500,
      },
    ])
    expect(await read(3, now, 'Caisse Spéciale')).toEqual([
      expect.objectContaining({ amount: 13000, isProjected: false }),
    ])
    expect(ports.listRefundsCI).not.toHaveBeenCalled()
  })
  it('signale une lecture CI manquante au lieu de faire disparaître la remise', async () => {
    const { ports, read } = setup()
    vi.mocked(ports.listRefundsCI).mockRejectedValue(
      new Error('Lecture impossible'),
    )
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      await expect(read(3, now, 'Caisse Imprévue')).rejects.toThrow(
        'Lecture impossible',
      )
    } finally {
      log.mockRestore()
    }
  })
  it('ignore un contrat sans argent à rendre même si son barème est absent', async () => {
    const { ports, read } = setup()
    vi.mocked(ports.listPayments).mockResolvedValue([])
    vi.mocked(ports.getActiveSettings).mockRejectedValue(
      new Error('Aucun barème'),
    )
    expect(await read(3, now, 'Caisse Spéciale')).toEqual([])
    expect(ports.getActiveSettings).not.toHaveBeenCalled()
  })
})
