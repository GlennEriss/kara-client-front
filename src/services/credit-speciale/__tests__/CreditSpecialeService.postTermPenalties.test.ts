import { describe, expect, it, vi } from 'vitest'
import type { CreditContract, CreditPayment } from '@/types/types'

vi.mock('@/db/upload-image.db', () => ({
  createFile: vi.fn(),
  deleteFile: vi.fn(),
}))
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

function fixture(creditType: CreditContract['creditType'] = 'FIXE') {
  let contract = {
    id: 'POST-TERM',
    creditType,
    status: 'PARTIAL',
    amount: 90000,
    totalAmount: 100000,
    amountPaid: 40000,
    amountRemaining: 60000,
    duration: 2,
    interestRate: 10,
    monthlyPaymentAmount: 50000,
    firstPaymentDate: new Date('2026-01-10'),
    createdAt: new Date('2025-12-10'),
  } as CreditContract
  const payments = [
    {
      id: 'M3_POST-TERM',
      creditId: contract.id,
      amount: 40000,
      paymentDate: new Date('2026-03-15'),
    },
  ] as CreditPayment[]
  const update = vi.fn(async (_id: string, patch: Partial<CreditContract>) => {
    contract = { ...contract, ...patch }
    return contract
  })
  const service = new CreditSpecialeService(
    {} as never,
    { getContractById: async () => contract,
      getContractsWithFilters: async () => [contract], updateContract: update } as never,
    { getPaymentsByCreditId: async () => payments } as never,
    { getUnpaidPenaltiesByCreditId: async () => [] } as never,
    {} as never,
    {} as never,
  )
  return { service, update, current: () => contract }
}

describe('encaissement séparé des pénalités après terme', () => {
  it.each(['FIXE', 'AIDE'] as const)(
    'permet de régler les pénalités sur un %s encore en cours, sans réduire le prêt',
    async (type) => {
      const { service, current } = fixture(type)
      await service.recordMissedEarningsPayment('POST-TERM', {
        amount: 5000,
        date: new Date('2026-04-11'),
        mode: 'cash',
        adminId: 'admin',
      })
      expect(current()).toMatchObject({
        status: 'PARTIAL',
        amountPaid: 40000,
        amountRemaining: 60000,
        missedEarningsPayments: [expect.objectContaining({ amount: 5000 })],
      })
    },
  )
  it('refuse un dépassement du solde généré à la date de paiement', async () => {
    const { service, update } = fixture()
    // Au 11 mars, seule la pénalité de 10 000 du 10 mars est due.
    await expect(
      service.recordMissedEarningsPayment('POST-TERM', {
        amount: 10001,
        date: new Date('2026-03-11'),
        mode: 'cash',
        adminId: 'admin',
      }),
    ).rejects.toThrow('pénalités après terme restantes')
    expect(update).not.toHaveBeenCalled()
  })
  it('ne facture rien avant la première échéance mensuelle après terme', async () => {
    const { service, update } = fixture()
    await expect(
      service.recordMissedEarningsPayment('POST-TERM', {
        amount: 1,
        date: new Date('2026-03-09'),
        mode: 'cash',
        adminId: 'admin',
      }),
    ).rejects.toThrow('restantes')
    expect(update).not.toHaveBeenCalled()
  })
  it('conserve le verrouillage du manque à gagner du crédit spécial en cours', async () => {
    const { service, update } = fixture('SPECIALE')
    await expect(
      service.recordMissedEarningsPayment('POST-TERM', {
        amount: 1000,
        date: new Date('2026-04-11'),
        mode: 'cash',
        adminId: 'admin',
      }),
    ).rejects.toThrow('contrat terminé')
    expect(update).not.toHaveBeenCalled()
  })
  it.each(['FIXE', 'AIDE'] as const)('%s : les pénalités après terme d’un contrat clôturé bloquent la nouvelle demande', async type => {
    const { service, update } = fixture(type)
    await update('POST-TERM', { status: 'CLOSED', closedAt: new Date('2026-04-11') })
    const result = await service.checkEligibility('CLIENT')
    expect(result.eligible).toBe(false)
    expect(result.reason).toMatch(/pénalités impayées.*16.*000/)
  })

})
