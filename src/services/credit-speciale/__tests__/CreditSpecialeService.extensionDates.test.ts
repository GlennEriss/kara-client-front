import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CreditContract } from '@/types/types'

vi.mock('@/factories/RepositoryFactory', () => ({
  RepositoryFactory: {
    getContractCIRepository: () => ({}),
    getPaymentCIRepository: () => ({}),
    getMemberRepository: () => ({}),
    getCreditInstallmentRepository: () => ({}),
    getDocumentRepository: () => ({}),
  },
}))
vi.mock('@/factories/ServiceFactory', () => ({
  ServiceFactory: {
    getNotificationService: () => ({ createNotification: vi.fn() }),
  },
}))
import { CreditSpecialeService } from '../CreditSpecialeService'

describe('enregistrement de la date du rajout', () => {
  const initial = {
    id: 'credit-extension-date',
    creditType: 'SPECIALE',
    status: 'ACTIVE',
    amount: 2_500_000,
    interestRate: 10,
    monthlyPaymentAmount: 250_000,
    totalAmount: 2_750_000,
    duration: 7,
    firstPaymentDate: new Date('2025-12-20T12:00:00'),
    disbursementDate: new Date('2025-11-20T12:00:00'),
    createdAt: new Date('2026-10-12T09:34:00'),
  } as CreditContract
  const now = new Date('2026-11-10T12:00:00')
  const update = vi.fn()
  let service: CreditSpecialeService
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(now)
    update.mockImplementation(async (_id, patch) => ({ ...initial, ...patch }))
    service = new CreditSpecialeService(
      {} as never,
      { updateContract: update } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    )
    vi.spyOn(service, 'checkExtensionEligibility').mockResolvedValue({
      eligible: true,
      currentContract: initial,
      paymentsCount: 5,
      unpaidPenaltiesCount: 0,
    })
    vi.spyOn(service, 'calculateExtensionAmounts').mockResolvedValue({
      originalAmount: 2_500_000,
      interestRate: 10,
      totalPaid: 1_250_000,
      remainingCapital: 2_500_000,
      remainingDue: 2_750_000,
    })
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    update.mockReset()
  })

  it('enregistre avril comme départ, conserve novembre comme saisie et ne redéfinit pas les dates du cycle initial', async () => {
    const firstPaymentDate = new Date('2026-05-25T12:00:00')
    const { updatedContract } = await service.extendContract(
      initial.id,
      1_500_000,
      'Besoin supplémentaire',
      {
        interestRate: 10,
        monthlyPaymentAmount: 1_000_000,
        duration: 6,
        firstPaymentDate,
        totalAmount: 4_400_000,
      },
      'admin',
      undefined,
      '2026-10-12',
    )
    const [first, added] = updatedContract.creditCycles!
    expect(first.startedAt).toEqual(initial.disbursementDate)
    expect(updatedContract.initialStartAt).toEqual(initial.disbursementDate)
    expect(added.startedAt).toEqual(new Date('2026-04-25T12:00:00'))
    expect(added.recordedAt).toEqual(now)
    expect(added).toMatchObject({
      amount: 4_000_000,
      carriedCapital: 2_500_000,
      additionalAmount: 1_500_000,
      firstPaymentDate,
    })
    expect(updatedContract).toMatchObject({
      extendedAt: now,
      createdAt: initial.createdAt,
      disbursementDate: initial.disbursementDate,
      firstPaymentDate,
      nextDueAt: firstPaymentDate,
    })
    expect(update.mock.calls[0][1]).not.toHaveProperty('createdAt')
    expect(update.mock.calls[0][1]).not.toHaveProperty('disbursementDate')
  })

  it('refuse une première échéance invalide avant toute écriture', async () => {
    await expect(
      service.extendContract(
        initial.id,
        1_500_000,
        'Besoin supplémentaire',
        {
          interestRate: 10,
          monthlyPaymentAmount: 1_000_000,
          duration: 6,
          firstPaymentDate: new Date('invalide'),
          totalAmount: 4_400_000,
        },
        'admin',
      ),
    ).rejects.toThrow('première échéance')
    expect(update).not.toHaveBeenCalled()
  })
})
