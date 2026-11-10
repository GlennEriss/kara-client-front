import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UNKNOWN_USER_ID } from '@/domains/financial/caisse-imprevue/import/unknownUser'
import type { CreditContract, CreditDemand } from '@/types/types'

const mocks = vi.hoisted(() => ({
  contract: vi.fn(), demand: vi.fn(), createContract: vi.fn(), updateDemand: vi.fn(),
  createPayment: vi.fn(), upload: vi.fn(),
}))
vi.mock('@/db/upload-image.db', () => ({ createFile: mocks.upload, deleteFile: vi.fn() }))
vi.mock('@/factories/RepositoryFactory', () => ({
  RepositoryFactory: {
    getContractCIRepository: () => ({}), getPaymentCIRepository: () => ({}),
    getMemberRepository: () => ({
      getMemberById: vi.fn().mockResolvedValue({ id: 'client', matricule: '0001.MK.010126' }),
      getFilleulsByIntermediaryCode: vi.fn().mockResolvedValue([]),
    }),
    getCreditInstallmentRepository: () => ({}), getDocumentRepository: () => ({}),
  },
}))
vi.mock('@/factories/ServiceFactory', () => ({
  ServiceFactory: { getNotificationService: () => ({ createNotification: vi.fn() }) },
}))
import { CreditSpecialeService } from '../CreditSpecialeService'

const service = () => new CreditSpecialeService(
  { getDemandById: mocks.demand, updateDemand: mocks.updateDemand } as never,
  { getContractById: mocks.contract, createContract: mocks.createContract } as never,
  {} as never, {} as never, {} as never,
  { createPayment: mocks.createPayment } as never,
)
const payment = { paymentDate: new Date('2026-11-10'), paymentTime: '12:00', amount: 1000, mode: 'cash' as const }

beforeEach(() => {
  vi.clearAllMocks()
  mocks.createContract.mockImplementation(async data => ({ ...data, id: 'credit' }))
})

describe('commissions exclues lorsque LE KARA assure la garantie', () => {
  it('bloque un paiement sur un ancien contrat INCONNU avant tout téléversement ou écriture', async () => {
    mocks.contract.mockResolvedValue({
      id: 'credit', creditType: 'SPECIALE', status: 'CLOSED',
      guarantorId: UNKNOWN_USER_ID, guarantorRemunerationPercentage: 2,
    } as CreditContract)
    await expect(service().recordGuarantorPayment('credit', payment, new File(['preuve'], 'preuve.pdf'), 'admin'))
      .rejects.toThrow('LE KARA assure la garantie')
    expect(mocks.upload).not.toHaveBeenCalled()
    expect(mocks.createPayment).not.toHaveBeenCalled()
  })

  it('autorise toujours un versement à un vrai garant', async () => {
    mocks.contract.mockResolvedValue({ id: 'credit', creditType: 'SPECIALE', status: 'ACTIVE', guarantorId: 'garant-reel' })
    await service().recordGuarantorPayment('credit', payment, undefined, 'admin')
    expect(mocks.createPayment).toHaveBeenCalledWith(expect.objectContaining({ creditId: 'credit', guarantorId: 'garant-reel', amount: 1000 }))
  })

  it.each([
    { guarantorId: UNKNOWN_USER_ID, expected: 0 },
    { guarantorId: 'garant-reel', expected: 5 },
  ])('enregistre le taux approprié malgré un taux explicite de 5 % : $guarantorId', async ({ guarantorId, expected }) => {
    mocks.demand.mockResolvedValue({
      id: 'demand', status: 'APPROVED', creditType: 'SPECIALE', clientId: 'client',
      clientFirstName: 'Alice', clientLastName: 'Ondo', clientContacts: [], guarantorId, guarantorIsMember: true,
    } satisfies Partial<CreditDemand>)
    const contract = await service().createContractFromDemand('demand', 'admin', {
      amount: 100_000, interestRate: 10, monthlyPaymentAmount: 30_000, duration: 4,
      firstPaymentDate: new Date('2026-12-01'), totalAmount: 110_000, guarantorRemunerationPercentage: 5,
    })
    expect(contract.guarantorRemunerationPercentage).toBe(expected)
  })
})
