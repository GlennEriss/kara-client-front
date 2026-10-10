/**
 * Tests unitaires pour CreditSpecialeService - Suppressions (paiement client, versement au garant)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ICreditDemandRepository } from '@/repositories/credit-speciale/ICreditDemandRepository'
import type { ICreditContractRepository } from '@/repositories/credit-speciale/ICreditContractRepository'
import type { ICreditPaymentRepository } from '@/repositories/credit-speciale/ICreditPaymentRepository'
import type { ICreditPenaltyRepository } from '@/repositories/credit-speciale/ICreditPenaltyRepository'
import type { IGuarantorRemunerationRepository } from '@/repositories/credit-speciale/IGuarantorRemunerationRepository'
import type { IGuarantorPaymentRepository } from '@/repositories/credit-speciale/IGuarantorPaymentRepository'

const deleteFileMock = vi.hoisted(() => vi.fn())

vi.mock('@/db/upload-image.db', () => ({
  createFile: vi.fn(),
  deleteFile: deleteFileMock,
}))

vi.mock('@/factories/RepositoryFactory', () => ({
  RepositoryFactory: {
    getContractCIRepository: vi.fn(() => ({})),
    getPaymentCIRepository: vi.fn(() => ({})),
    getMemberRepository: vi.fn(() => ({})),
    getCreditInstallmentRepository: vi.fn(() => ({})),
    getDocumentRepository: vi.fn(() => ({})),
  },
}))

vi.mock('@/factories/ServiceFactory', () => ({
  ServiceFactory: {
    getNotificationService: vi.fn(() => ({ createNotification: vi.fn() })),
  },
}))

vi.mock('@/domains/infrastructure/documents/repositories/IDocumentRepository', () => ({}))

import { CreditSpecialeService } from '../CreditSpecialeService'

describe('CreditSpecialeService - deleteGuarantorPayment', () => {
  let service: CreditSpecialeService
  let guarantorPaymentRepository: Partial<IGuarantorPaymentRepository>
  let contractRepository: { getContractById: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    vi.clearAllMocks()
    guarantorPaymentRepository = {
      getPaymentById: vi.fn(),
      deletePayment: vi.fn(),
    }
    contractRepository = { getContractById: vi.fn().mockResolvedValue({ id: 'c-1', status: 'ACTIVE' }) }
    service = new CreditSpecialeService(
      {} as ICreditDemandRepository,
      contractRepository as unknown as ICreditContractRepository,
      {} as ICreditPaymentRepository,
      {} as ICreditPenaltyRepository,
      {} as IGuarantorRemunerationRepository,
      guarantorPaymentRepository as IGuarantorPaymentRepository
    )
  })

  it('supprime le versement puis son justificatif', async () => {
    vi.mocked(guarantorPaymentRepository.getPaymentById!).mockResolvedValue({
      id: 'gp-1',
      proofPath: 'credit/c-1/guarantor-payments/proof.pdf',
    } as any)

    await service.deleteGuarantorPayment('gp-1')

    expect(guarantorPaymentRepository.deletePayment).toHaveBeenCalledWith('gp-1')
    expect(deleteFileMock).toHaveBeenCalledWith('credit/c-1/guarantor-payments/proof.pdf')
  })

  it("n'échoue pas si le justificatif ne peut pas être supprimé", async () => {
    vi.mocked(guarantorPaymentRepository.getPaymentById!).mockResolvedValue({
      id: 'gp-1',
      proofPath: 'credit/c-1/guarantor-payments/proof.pdf',
    } as any)
    deleteFileMock.mockRejectedValueOnce(new Error('storage'))

    await expect(service.deleteGuarantorPayment('gp-1')).resolves.toBeUndefined()
    expect(guarantorPaymentRepository.deletePayment).toHaveBeenCalledWith('gp-1')
  })

  it('refuse sur un contrat terminé', async () => {
    vi.mocked(guarantorPaymentRepository.getPaymentById!).mockResolvedValue({ id: 'gp-1', creditId: 'c-1' } as any)
    contractRepository.getContractById.mockResolvedValue({ id: 'c-1', status: 'CLOSED' })

    await expect(service.deleteGuarantorPayment('gp-1')).rejects.toThrow('terminé ou résilié')
    expect(guarantorPaymentRepository.deletePayment).not.toHaveBeenCalled()
  })

  it('refuse un versement introuvable', async () => {
    vi.mocked(guarantorPaymentRepository.getPaymentById!).mockResolvedValue(null)

    await expect(service.deleteGuarantorPayment('absent')).rejects.toThrow('Versement au garant introuvable')
    expect(guarantorPaymentRepository.deletePayment).not.toHaveBeenCalled()
  })
})

describe('CreditSpecialeService - deletePayment', () => {
  const contract = {
    id: 'credit-1',
    creditType: 'SPECIALE',
    status: 'PARTIAL',
    amount: 500_000,
    interestRate: 5,
    monthlyPaymentAmount: 100_000,
    totalAmount: 525_000,
    duration: 7,
    firstPaymentDate: new Date('2026-01-01'),
    createdAt: new Date('2026-01-01'),
    restMonths: [],
    guarantorRemunerationPercentage: 2,
  }
  const m1 = { id: 'M1_credit-1', creditId: 'credit-1', amount: 100_000, paymentDate: new Date('2026-01-01') }
  const m2 = { id: 'M2_credit-1', creditId: 'credit-1', amount: 100_000, paymentDate: new Date('2026-02-10') }

  let service: CreditSpecialeService
  let contractRepository: Partial<ICreditContractRepository>
  let paymentRepository: Partial<ICreditPaymentRepository>
  let penaltyRepository: Partial<ICreditPenaltyRepository>
  let remunerationRepository: Partial<IGuarantorRemunerationRepository>

  beforeEach(() => {
    vi.clearAllMocks()
    contractRepository = {
      getContractById: vi.fn().mockResolvedValue(contract),
      updateContract: vi.fn(),
    }
    paymentRepository = {
      getPaymentById: vi.fn(async (id: string) => [m1, m2].find((p) => p.id === id) ?? null) as any,
      getPaymentsByCreditId: vi.fn().mockResolvedValue([m1, m2]),
      deletePayment: vi.fn(),
    }
    penaltyRepository = {
      getPenaltiesByCreditId: vi.fn().mockResolvedValue([
        { id: 'pen-paid-by-m2', paid: true, paymentId: 'M2_credit-1', installmentId: 'C1_M1' },
        { id: 'pen-late-m2', paid: false, installmentId: 'C1_M2' },
        { id: 'pen-other', paid: false, installmentId: 'C1_M1' },
      ]),
      markPenaltyUnpaid: vi.fn(),
      deletePenalty: vi.fn(),
    }
    remunerationRepository = {
      getRemunerationsByCreditId: vi.fn().mockResolvedValue([
        { id: 'rem-m1', month: 1, paymentId: 'M1_credit-1', cycleNumber: 1, createdAt: new Date() },
        { id: 'rem-m2', month: 2, paymentId: 'M2_credit-1', cycleNumber: 1, createdAt: new Date() },
      ]),
      deleteRemuneration: vi.fn(),
    }
    service = new CreditSpecialeService(
      {} as ICreditDemandRepository,
      contractRepository as ICreditContractRepository,
      paymentRepository as ICreditPaymentRepository,
      penaltyRepository as ICreditPenaltyRepository,
      remunerationRepository as IGuarantorRemunerationRepository,
      {} as IGuarantorPaymentRepository
    )
  })

  it('refuse de supprimer un versement sur un contrat soldé ou clos', async () => {
    for (const status of ['DISCHARGED', 'CLOSED', 'WRITTEN_OFF']) {
      vi.mocked(contractRepository.getContractById!).mockResolvedValueOnce({ ...contract, status } as any)
      await expect(service.deletePayment('M2_credit-1', 'admin-1')).rejects.toThrow('terminé ou résilié')
    }
    expect(paymentRepository.deletePayment).not.toHaveBeenCalled()
  })

  it('supprime le dernier paiement et défait ses effets', async () => {
    await service.deletePayment('M2_credit-1', 'admin-1')

    expect(paymentRepository.deletePayment).toHaveBeenCalledWith('M2_credit-1')
    expect(penaltyRepository.markPenaltyUnpaid).toHaveBeenCalledWith('pen-paid-by-m2', 'admin-1')
    expect(penaltyRepository.deletePenalty).toHaveBeenCalledWith('pen-late-m2')
    expect(penaltyRepository.deletePenalty).not.toHaveBeenCalledWith('pen-other')
    expect(remunerationRepository.deleteRemuneration).toHaveBeenCalledWith('rem-m2')
    expect(remunerationRepository.deleteRemuneration).not.toHaveBeenCalledWith('rem-m1')

    // Après M1 (100 000 payés sur 525 000), M2 est dû : capital 425 000 + 5 % d'intérêts.
    expect(contractRepository.updateContract).toHaveBeenCalledWith(
      'credit-1',
      expect.objectContaining({
        amountPaid: 100_000,
        amountRemaining: 446_250,
        status: 'PARTIAL',
        updatedBy: 'admin-1',
      })
    )
  })

  it('refuse de supprimer un paiement qui n’est pas le dernier, sans rien modifier', async () => {
    await expect(service.deletePayment('M1_credit-1', 'admin-1')).rejects.toThrow(/dernier mois enregistré/)
    expect(paymentRepository.deletePayment).not.toHaveBeenCalled()
    expect(contractRepository.updateContract).not.toHaveBeenCalled()
  })
})

describe('CreditSpecialeService - deletePayment (crédit en semaines)', () => {
  const contract = {
    id: 'credit-w',
    creditType: 'SPECIALE',
    durationUnit: 'WEEKS',
    status: 'PARTIAL',
    amount: 100_000,
    interestRate: 10,
    monthlyPaymentAmount: 110_000,
    totalAmount: 110_000,
    duration: 2,
    firstPaymentDate: new Date('2026-05-15'),
    createdAt: new Date('2026-05-01'),
    restMonths: [],
    guarantorRemunerationPercentage: 2,
  }
  const first = { id: 'M1_credit-w', creditId: 'credit-w', amount: 60_000, paymentDate: new Date('2026-05-20') }
  const complement = { id: 'M1_credit-w_P2', creditId: 'credit-w', amount: 20_000, paymentDate: new Date('2026-05-25') }

  it('supprimer un complément garde la commission du garant et la pénalité de retard', async () => {
    const contractRepository = { getContractById: vi.fn().mockResolvedValue(contract), updateContract: vi.fn() }
    const paymentRepository = {
      getPaymentById: vi.fn().mockResolvedValue(complement),
      getPaymentsByCreditId: vi.fn().mockResolvedValue([first, complement]),
      deletePayment: vi.fn(),
    }
    const penaltyRepository = {
      getPenaltiesByCreditId: vi.fn().mockResolvedValue([{ id: 'pen-late', paid: false, installmentId: 'C1_M1' }]),
      markPenaltyUnpaid: vi.fn(),
      deletePenalty: vi.fn(),
    }
    const remunerationRepository = {
      getRemunerationsByCreditId: vi.fn().mockResolvedValue([
        { id: 'rem-1', month: 1, paymentId: 'M1_credit-w', cycleNumber: 1, createdAt: new Date() },
      ]),
      deleteRemuneration: vi.fn(),
    }
    const service = new CreditSpecialeService(
      {} as ICreditDemandRepository,
      contractRepository as unknown as ICreditContractRepository,
      paymentRepository as unknown as ICreditPaymentRepository,
      penaltyRepository as unknown as ICreditPenaltyRepository,
      remunerationRepository as unknown as IGuarantorRemunerationRepository,
      {} as IGuarantorPaymentRepository
    )

    await service.deletePayment('M1_credit-w_P2', 'admin-1')

    expect(paymentRepository.deletePayment).toHaveBeenCalledWith('M1_credit-w_P2')
    expect(penaltyRepository.deletePenalty).not.toHaveBeenCalled()
    expect(remunerationRepository.deleteRemuneration).not.toHaveBeenCalled()
    // Reste dû : 110 000 − 60 000, sans intérêts supplémentaires.
    expect(contractRepository.updateContract).toHaveBeenCalledWith(
      'credit-w',
      expect.objectContaining({ amountPaid: 60_000, amountRemaining: 50_000 })
    )
  })
})
