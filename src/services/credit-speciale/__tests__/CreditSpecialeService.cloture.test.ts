/**
 * Tests unitaires pour CreditSpecialeService - Clôture de contrat
 * validateDischarge, uploadSignedQuittance, closeContract
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ICreditDemandRepository } from '@/repositories/credit-speciale/ICreditDemandRepository'
import type { ICreditContractRepository } from '@/repositories/credit-speciale/ICreditContractRepository'
import type { ICreditPaymentRepository } from '@/repositories/credit-speciale/ICreditPaymentRepository'
import type { ICreditPenaltyRepository } from '@/repositories/credit-speciale/ICreditPenaltyRepository'
import type { IGuarantorRemunerationRepository } from '@/repositories/credit-speciale/IGuarantorRemunerationRepository'

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

const mockContractDischarged = {
  id: 'contract-1',
  clientId: 'client-1',
  status: 'DISCHARGED' as const,
  amountRemaining: 0,
  signedQuittanceUrl: 'https://example.com/quittance.pdf',
  signedQuittanceDocumentId: 'doc-1',
  dischargeMotif: 'Remboursement intégral',
  dischargedAt: new Date(),
  dischargedBy: 'admin-1',
  clientFirstName: 'Jean',
  clientLastName: 'Dupont',
  creditType: 'SPECIALE',
  amount: 100000,
  createdBy: 'admin-1',
  updatedBy: 'admin-1',
}

const mockContractActive = {
  ...mockContractDischarged,
  status: 'ACTIVE' as const,
  amountRemaining: 50000,
  amount: 100000,
  interestRate: 10,
  signedQuittanceUrl: undefined,
  signedQuittanceDocumentId: undefined,
  dischargeMotif: undefined,
  dischargedAt: undefined,
  dischargedBy: undefined,
}

const mockContractDischargedNoQuittance = {
  ...mockContractDischarged,
  signedQuittanceUrl: undefined,
  signedQuittanceDocumentId: undefined,
}

describe('CreditSpecialeService - Clôture de contrat', () => {
  let service: CreditSpecialeService
  let mockCreditContractRepository: Partial<ICreditContractRepository>
  let mockCreditDemandRepository: Partial<ICreditDemandRepository>
  let mockCreditPaymentRepository: Partial<ICreditPaymentRepository>
  let mockCreditPenaltyRepository: Partial<ICreditPenaltyRepository>
  let mockGuarantorRemunerationRepository: Partial<IGuarantorRemunerationRepository>

  beforeEach(() => {
    vi.clearAllMocks()

    mockCreditContractRepository = {
      getContractById: vi.fn(),
      updateContract: vi.fn(),
    }

    mockCreditDemandRepository = {}
    mockCreditPaymentRepository = {
      getPaymentsByCreditId: vi.fn(),
    }
    mockCreditPenaltyRepository = {}
    mockGuarantorRemunerationRepository = {}

    service = new CreditSpecialeService(
      mockCreditDemandRepository as ICreditDemandRepository,
      mockCreditContractRepository as ICreditContractRepository,
      mockCreditPaymentRepository as ICreditPaymentRepository,
      mockCreditPenaltyRepository as ICreditPenaltyRepository,
      mockGuarantorRemunerationRepository as IGuarantorRemunerationRepository
    )
  })

  describe('validateDischarge', () => {
    it('devrait valider la décharge quand montant restant = 0', async () => {
      const contract = { ...mockContractActive, amountRemaining: 0 }
      vi.mocked(mockCreditContractRepository.getContractById!).mockResolvedValue(contract as any)
      vi.mocked(mockCreditContractRepository.updateContract!).mockResolvedValue({
        ...contract,
        status: 'DISCHARGED',
        dischargeMotif: 'Validé',
        dischargedAt: new Date(),
        dischargedBy: 'admin-1',
      } as any)
      // Montant total à rembourser = 100000 + 10% = 110000
      vi.mocked(mockCreditPaymentRepository.getPaymentsByCreditId!).mockResolvedValue([
        { id: 'p1', amount: 110000 } as any,
      ])

      const result = await service.validateDischarge('contract-1', 'Remboursement intégral validé', 'admin-1')

      expect(mockCreditContractRepository.getContractById).toHaveBeenCalledWith('contract-1')
      expect(mockCreditContractRepository.updateContract).toHaveBeenCalledWith(
        'contract-1',
        expect.objectContaining({
          status: 'DISCHARGED',
          dischargeMotif: 'Remboursement intégral validé',
          dischargedBy: 'admin-1',
        })
      )
      expect(result.status).toBe('DISCHARGED')
    })

    it('devrait lever une erreur si montant restant > 0', async () => {
      const contract = { ...mockContractActive, amountRemaining: 1000 }
      vi.mocked(mockCreditContractRepository.getContractById!).mockResolvedValue(contract as any)
      // Paiements insuffisants : 100000 payé sur 110000 à rembourser
      vi.mocked(mockCreditPaymentRepository.getPaymentsByCreditId!).mockResolvedValue([
        { id: 'p1', amount: 100000 } as any,
      ])

      await expect(
        service.validateDischarge('contract-1', 'Motif valide avec assez de caractères', 'admin-1')
      ).rejects.toThrow('Le montant restant doit être 0')

      expect(mockCreditContractRepository.updateContract).not.toHaveBeenCalled()
    })

    it('devrait lever une erreur si motif trop court', async () => {
      const contract = { ...mockContractActive, amountRemaining: 0 }
      vi.mocked(mockCreditContractRepository.getContractById!).mockResolvedValue(contract as any)
      // Montant total remboursé pour passer la validation du montant
      vi.mocked(mockCreditPaymentRepository.getPaymentsByCreditId!).mockResolvedValue([
        { id: 'p1', amount: 110000 } as any,
      ])

      await expect(service.validateDischarge('contract-1', 'Court', 'admin-1')).rejects.toThrow(
        'Le motif doit contenir entre 10 et 500 caractères'
      )
    })
  })

  describe('closeContract', () => {
    it('devrait clôturer le contrat quand DISCHARGED et quittance signée', async () => {
      vi.mocked(mockCreditContractRepository.getContractById!).mockResolvedValue(mockContractDischarged as any)
      vi.mocked(mockCreditContractRepository.updateContract!).mockResolvedValue({
        ...mockContractDischarged,
        status: 'CLOSED',
        closedAt: new Date(),
        closedBy: 'admin-1',
        motifCloture: 'Quittance signée reçue et archivée',
      } as any)

      const result = await service.closeContract('contract-1', {
        closedAt: new Date(),
        closedBy: 'admin-1',
        motifCloture: 'Quittance signée reçue et archivée',
      })

      expect(mockCreditContractRepository.updateContract).toHaveBeenCalledWith(
        'contract-1',
        expect.objectContaining({
          status: 'CLOSED',
          closedBy: 'admin-1',
          motifCloture: 'Quittance signée reçue et archivée',
        })
      )
      expect(result.status).toBe('CLOSED')
    })

    it('devrait lever une erreur si contrat non déchargé', async () => {
      vi.mocked(mockCreditContractRepository.getContractById!).mockResolvedValue(mockContractActive as any)

      await expect(
        service.closeContract('contract-1', {
          closedAt: new Date(),
          closedBy: 'admin-1',
          motifCloture: 'Motif de clôture valide avec assez de caractères',
        })
      ).rejects.toThrow('Le contrat doit être déchargé avant la clôture')
    })

    it('devrait lever une erreur si quittance signée manquante', async () => {
      vi.mocked(mockCreditContractRepository.getContractById!).mockResolvedValue(
        mockContractDischargedNoQuittance as any
      )

      await expect(
        service.closeContract('contract-1', {
          closedAt: new Date(),
          closedBy: 'admin-1',
          motifCloture: 'Motif de clôture valide avec assez de caractères',
        })
      ).rejects.toThrow('La quittance signée doit être téléversée avant la clôture')
    })
  })
})
