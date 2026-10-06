/**
 * Clôture d'un crédit en perte (défaut de paiement) et récupérations.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ICreditDemandRepository } from '@/repositories/credit-speciale/ICreditDemandRepository'
import type { ICreditContractRepository } from '@/repositories/credit-speciale/ICreditContractRepository'
import type { ICreditPaymentRepository } from '@/repositories/credit-speciale/ICreditPaymentRepository'
import type { ICreditPenaltyRepository } from '@/repositories/credit-speciale/ICreditPenaltyRepository'
import type { IGuarantorRemunerationRepository } from '@/repositories/credit-speciale/IGuarantorRemunerationRepository'
import type { IGuarantorPaymentRepository } from '@/repositories/credit-speciale/IGuarantorPaymentRepository'
import type { CreditContract } from '@/types/types'

vi.mock('@/db/upload-image.db', () => ({ createFile: vi.fn(), deleteFile: vi.fn() }))
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
  ServiceFactory: { getNotificationService: vi.fn(() => ({ createNotification: vi.fn() })) },
}))
vi.mock('@/domains/infrastructure/documents/repositories/IDocumentRepository', () => ({}))

import { CreditSpecialeService } from '../CreditSpecialeService'

const baseContract = {
  id: 'MK_CSP_1234_TEST',
  status: 'OVERDUE',
  creditType: 'SPECIALE',
  amountRemaining: 300000,
  guarantorId: 'G1',
} as unknown as CreditContract

describe('CreditSpecialeService - clôture en perte', () => {
  let contract: CreditContract
  let contractRepository: Partial<ICreditContractRepository>
  let penaltyRepository: Partial<ICreditPenaltyRepository>
  let service: CreditSpecialeService

  beforeEach(() => {
    contract = { ...baseContract }
    contractRepository = {
      getContractById: vi.fn(async () => contract),
      updateContract: vi.fn(async (_id, data) => {
        contract = { ...contract, ...data } as CreditContract
        return contract
      }),
    }
    penaltyRepository = {
      getUnpaidPenaltiesByCreditId: vi.fn(async () => [{ amount: 10000 }, { amount: 5000 }] as never),
    }
    service = new CreditSpecialeService(
      {} as ICreditDemandRepository,
      contractRepository as ICreditContractRepository,
      {} as ICreditPaymentRepository,
      penaltyRepository as ICreditPenaltyRepository,
      {} as IGuarantorRemunerationRepository,
      {} as IGuarantorPaymentRepository
    )
  })

  it('enregistre la perte, les pénalités impayées et la commission annulée', async () => {
    const updated = await service.writeOffContract(contract.id, {
      motif: 'Membre injoignable depuis 4 mois',
      guarantorCommissionDue: 6000,
      adminId: 'SA1',
      adminName: 'Super Admin',
    })
    expect(updated.status).toBe('WRITTEN_OFF')
    expect(updated.writeOff).toMatchObject({
      amountRemaining: 300000,
      unpaidPenalties: 15000,
      guarantorCommissionCancelled: 6000,
      writtenOffBy: 'SA1',
      motif: 'Membre injoignable depuis 4 mois',
    })
  })

  it('refuse un motif trop court ou un contrat déjà terminé', async () => {
    await expect(
      service.writeOffContract(contract.id, { motif: 'court', guarantorCommissionDue: 0, adminId: 'SA1' })
    ).rejects.toThrow('motif')
    contract = { ...contract, status: 'DISCHARGED' }
    await expect(
      service.writeOffContract(contract.id, { motif: 'Membre injoignable depuis 4 mois', guarantorCommissionDue: 0, adminId: 'SA1' })
    ).rejects.toThrow('en cours')
  })

  it('enregistre des récupérations sans dépasser la perte restante', async () => {
    await service.writeOffContract(contract.id, { motif: 'Membre injoignable depuis 4 mois', guarantorCommissionDue: 0, adminId: 'SA1' })
    const updated = await service.recordWriteOffRecovery(contract.id, {
      amount: 50000,
      date: new Date('2026-10-05'),
      mode: 'cash',
      adminId: 'A1',
    })
    expect(updated.writeOffRecoveries).toHaveLength(1)
    await expect(
      service.recordWriteOffRecovery(contract.id, { amount: 300000, date: new Date(), mode: 'cash', adminId: 'A1' })
    ).rejects.toThrow('dépasse')
  })

  it('refuse les paiements ordinaires et au garant sur un contrat clôturé en perte', async () => {
    contract = { ...contract, status: 'WRITTEN_OFF' }
    await expect(service.createPayment({ creditId: contract.id, paymentDate: new Date() } as never)).rejects.toThrow('récupération')
    await expect(
      service.recordGuarantorPayment(contract.id, { paymentDate: new Date(), paymentTime: '10:00', amount: 1000, mode: 'cash' }, undefined, 'A1')
    ).rejects.toThrow('annulée')
  })
})
