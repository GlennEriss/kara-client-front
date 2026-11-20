import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('@/factories/ServiceFactory', () => ({ ServiceFactory: {} }))
vi.mock('@/factories/RepositoryFactory', () => ({ RepositoryFactory: {} }))
import { CaisseImprevueService } from '../CaisseImprevueService'
function fixture() {
  const contract: any = {
    id: 'CI',
    status: 'ACTIVE',
    memberId: 'MEMBER',
    memberFirstName: 'Marie',
    memberLastName: 'Test',
    firstPaymentDate: '2025-11-20',
    paymentFrequency: 'MONTHLY',
    subscriptionCIDuration: 12,
    totalMonthsPaid: 0,
    subscriptionCIAmountPerMonth: 50000,
  }
  const payments: any[] = [
    {
      id: 'p1',
      status: 'PARTIAL',
      targetAmount: 50000,
      accumulatedAmount: 12500,
      versements: [{ amount: 12500 }],
    },
  ]
  const contracts = {
    getContractById: vi.fn(async () => contract),
    updateContract: vi.fn(async (_id, patch) => ({ ...contract, ...patch })),
  }
  const docs = {
    uploadDocumentFile: vi.fn(async () => ({
      url: 'https://example.test/document',
      path: 'document',
      size: 123,
    })),
    createDocument: vi.fn(async () => ({ id: 'DOC' })),
  }
  const refunds = {
    getEarlyRefundsByContractId: vi.fn(async () => [] as any[]),
    createEarlyRefund: vi.fn(async (_id, data) => ({ ...data, id: 'REFUND' })),
  }
  const service = new CaisseImprevueService(
    {} as never,
    {} as never,
    contracts as never,
    {
      getAdminById: async () => ({ firstName: 'Admin', lastName: 'Test' }),
    } as never,
    docs as never,
    { getPaymentsByContractId: async () => payments } as never,
    {} as never,
    refunds as never,
    {} as never,
    { createNotification: async () => {} } as never,
  )
  const input = {
    reason: 'Terme du contrat',
    withdrawalDate: '2026-11-20',
    withdrawalTime: '12:00',
    withdrawalMode: 'cash' as const,
    withdrawalProof: new File(['proof'], 'proof.jpg', { type: 'image/jpeg' }),
    documentPdf: new File(['pdf'], 'signed.pdf', { type: 'application/pdf' }),
    userId: 'ADMIN',
  }
  return { service, contract, payments, contracts, docs, refunds, input }
}
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-20T12:00:00'))
})
afterEach(() => vi.useRealTimers())
describe('remboursement final CI avec cotisations incomplètes', () => {
  it('remet uniquement le montant réellement cotisé, même sans mois soldé', async () => {
    const f = fixture()
    const result = await f.service.requestFinalRefundCI('CI', f.input)
    expect(result).toMatchObject({
      type: 'FINAL',
      status: 'PAID',
      amountNominal: 12500,
      withdrawalAmount: 12500,
      amountBonus: 0,
      deadlineAt: new Date('2026-11-20T00:00:00'),
    })
    expect(f.contracts.updateContract).toHaveBeenCalledWith(
      'CI',
      expect.objectContaining({
        status: 'FINISHED',
        finalRefundDocumentId: 'DOC',
      }),
    )
  })
  it('refuse avant terme sans téléverser ni écrire', async () => {
    const f = fixture()
    vi.setSystemTime(new Date('2026-11-19T12:00:00'))
    await expect(f.service.requestFinalRefundCI('CI', f.input)).rejects.toThrow(
      'au terme',
    )
    expect(f.docs.uploadDocumentFile).not.toHaveBeenCalled()
    expect(f.refunds.createEarlyRefund).not.toHaveBeenCalled()
  })
  it('refuse un autre remboursement en cours et protège contre une seconde remise', async () => {
    const f = fixture()
    f.refunds.getEarlyRefundsByContractId.mockResolvedValue([
      { type: 'EARLY', status: 'PENDING' },
    ])
    await expect(f.service.requestFinalRefundCI('CI', f.input)).rejects.toThrow(
      'déjà en cours',
    )
    expect(f.docs.uploadDocumentFile).not.toHaveBeenCalled()
    expect(f.contracts.updateContract).not.toHaveBeenCalled()
  })
  it('refuse un contrat sans cotisation ou déjà terminé', async () => {
    const f = fixture()
    f.payments.length = 0
    await expect(f.service.requestFinalRefundCI('CI', f.input)).rejects.toThrow(
      'Aucune cotisation',
    )
    f.contract.status = 'FINISHED'
    await expect(f.service.requestFinalRefundCI('CI', f.input)).rejects.toThrow(
      'actif',
    )
    expect(f.docs.uploadDocumentFile).not.toHaveBeenCalled()
  })
})
