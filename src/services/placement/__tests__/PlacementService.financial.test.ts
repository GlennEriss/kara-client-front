import type { CommissionPaymentPlacement, Placement } from '@/types/types'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const adminRepository = {}

vi.mock('@/factories/RepositoryFactory', () => ({
  RepositoryFactory: {
    getAdminRepository: () => adminRepository,
    getMemberRepository: () => ({}),
    getPlacementDemandRepository: () => ({}),
  },
}))

vi.mock('@/factories/ServiceFactory', () => ({
  ServiceFactory: {
    getNotificationService: () => ({ createNotification: vi.fn() }),
  },
}))

import { PlacementService } from '@/services/placement/PlacementService'

const activePlacement = {
  id: 'placement-1',
  benefactorId: 'member-1',
  amount: 1_000_000,
  rate: 5,
  periodMonths: 3,
  payoutMode: 'MonthlyCommission_CapitalEnd',
  status: 'Active',
  startDate: new Date('2026-01-01T00:00:00'),
  createdAt: new Date('2026-01-01T00:00:00'),
  updatedAt: new Date('2026-01-01T00:00:00'),
  createdBy: 'admin-1',
} satisfies Placement

const dueCommission = {
  id: 'commission-1',
  placementId: activePlacement.id,
  dueDate: new Date('2026-02-01T00:00:00'),
  amount: 50_000,
  status: 'Due',
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: 'admin-1',
} satisfies CommissionPaymentPlacement

describe('PlacementService - noyau financier', () => {
  let placementRepository: {
    getById: ReturnType<typeof vi.fn>
    listCommissions: ReturnType<typeof vi.fn>
    updateCommission: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    saveEarlyExit: ReturnType<typeof vi.fn>
    getAll: ReturnType<typeof vi.fn>
    createCommissions: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
  }
  let documentRepository: {
    uploadDocumentFile: ReturnType<typeof vi.fn>
    createDocument: ReturnType<typeof vi.fn>
  }
  let memberRepository: {
    getMemberById: ReturnType<typeof vi.fn>
    updateMemberRoles: ReturnType<typeof vi.fn>
  }
  let notificationService: {
    createNotification: ReturnType<typeof vi.fn>
  }
  let service: PlacementService

  beforeEach(() => {
    placementRepository = {
      getById: vi.fn(),
      listCommissions: vi.fn(),
      updateCommission: vi.fn(),
      update: vi.fn(),
      saveEarlyExit: vi.fn(),
      getAll: vi.fn(),
      createCommissions: vi.fn(),
      create: vi.fn(),
    }
    documentRepository = {
      uploadDocumentFile: vi.fn(),
      createDocument: vi.fn(),
    }
    memberRepository = {
      getMemberById: vi.fn(),
      updateMemberRoles: vi.fn(),
    }
    notificationService = {
      createNotification: vi.fn(),
    }

    service = new PlacementService(
      placementRepository as any,
      {} as any,
      documentRepository as any,
      memberRepository as any,
      notificationService as any,
      {} as any
    )
  })

  it('applique les invariants financiers avant toute création', async () => {
    await expect(service.createPlacement({
      benefactorId: activePlacement.benefactorId,
      amount: 999,
      rate: activePlacement.rate,
      periodMonths: activePlacement.periodMonths,
      payoutMode: activePlacement.payoutMode,
      startDate: activePlacement.startDate,
      createdBy: 'admin-1',
    }, 'admin-1')).rejects.toThrow('capital')

    expect(memberRepository.getMemberById).not.toHaveBeenCalled()
    expect(placementRepository.create).not.toHaveBeenCalled()
  })

  it.each([
    [{ amount: 999 }, 'capital'],
    [{ amount: 1_000.5 }, 'capital'],
    [{ amount: 100_000_001 }, 'capital'],
    [{ amount: Number.NaN }, 'capital'],
    [{ rate: -0.01 }, 'taux mensuel'],
    [{ rate: 10.01 }, 'taux mensuel'],
    [{ rate: Number.POSITIVE_INFINITY }, 'taux mensuel'],
    [{ periodMonths: 0 }, 'durée'],
    [{ periodMonths: 8 }, 'durée'],
    [{ periodMonths: 1.5 }, 'durée'],
  ])('refuse les paramètres financiers hors invariants lors d’une mise à jour', async (data, message) => {
    await expect(service.updatePlacement(activePlacement.id, data, 'admin-1'))
      .rejects.toThrow(message)
    expect(placementRepository.update).not.toHaveBeenCalled()
  })

  it('accepte les bornes des invariants financiers lors d’une mise à jour', async () => {
    placementRepository.getById.mockResolvedValue(activePlacement)
    placementRepository.update.mockResolvedValue({
      ...activePlacement,
      amount: 100_000_000,
      rate: 10,
      periodMonths: 7,
    })

    await service.updatePlacement(activePlacement.id, {
      amount: 100_000_000,
      rate: 10,
      periodMonths: 7,
    }, 'admin-1')

    expect(placementRepository.update).toHaveBeenCalledWith(
      activePlacement.id,
      expect.objectContaining({ amount: 100_000_000, rate: 10, periodMonths: 7 })
    )
  })

  it('refuse un paiement dont le montant soumis diffère du montant dû avant tout upload', async () => {
    placementRepository.getById.mockResolvedValue(activePlacement)
    placementRepository.listCommissions.mockResolvedValue([dueCommission])

    await expect(
      service.payCommissionWithProof(
        activePlacement.id,
        dueCommission.id,
        new File(['proof'], 'proof.png', { type: 'image/png' }),
        activePlacement.benefactorId,
        new Date(),
        'admin-1',
        { paidAmount: 49_999, paymentMode: 'cash' }
      )
    ).rejects.toThrow('exactement de 50000 FCFA')

    expect(documentRepository.uploadDocumentFile).not.toHaveBeenCalled()
    expect(placementRepository.updateCommission).not.toHaveBeenCalled()
  })

  it('enregistre le montant contrôlé sans clôturer automatiquement le placement', async () => {
    const paidCommission = { ...dueCommission, status: 'Paid' as const, paidAmount: 50_000 }
    placementRepository.getById.mockResolvedValue(activePlacement)
    placementRepository.listCommissions
      .mockResolvedValueOnce([dueCommission])
      .mockResolvedValueOnce([paidCommission])
    documentRepository.uploadDocumentFile.mockResolvedValue({ url: 'url', path: 'path', size: 5 })
    documentRepository.createDocument.mockResolvedValue({ id: 'proof-1' })
    placementRepository.updateCommission
      .mockResolvedValueOnce({ ...dueCommission, proofDocumentId: 'proof-1' })
      .mockResolvedValueOnce(paidCommission)
    placementRepository.update.mockResolvedValue(activePlacement)

    const result = await service.payCommissionWithProof(
      activePlacement.id,
      dueCommission.id,
      new File(['proof'], 'proof.png', { type: 'image/png' }),
      activePlacement.benefactorId,
      new Date('2026-02-01T10:00:00'),
      'admin-1',
      { paidAmount: 50_000, paymentMode: 'cash' }
    )

    expect(result.commission.paidAmount).toBe(50_000)
    expect(placementRepository.updateCommission).toHaveBeenLastCalledWith(
      activePlacement.id,
      dueCommission.id,
      expect.objectContaining({ amount: 50_000, paidAmount: 50_000, status: 'Paid' })
    )
    expect(placementRepository.update).not.toHaveBeenCalledWith(
      activePlacement.id,
      expect.objectContaining({ status: 'Closed' })
    )
  })

  it('refuse la clôture tant qu’une commission n’est pas payée', async () => {
    placementRepository.getById.mockResolvedValue(activePlacement)
    placementRepository.listCommissions.mockResolvedValue([dueCommission])

    await expect(
      service.closePlacement(
        activePlacement.id,
        new File(['pdf'], 'quittance.pdf', { type: 'application/pdf' }),
        'Remboursement intégral du capital',
        'admin-1'
      )
    ).rejects.toThrow('Toutes les commissions doivent être payées')

    expect(documentRepository.uploadDocumentFile).not.toHaveBeenCalled()
  })

  it('enregistre le capital restitué lors de la clôture explicite', async () => {
    const paidCommission = { ...dueCommission, status: 'Paid' as const, paidAmount: 50_000 }
    const closedPlacement = { ...activePlacement, status: 'Closed' as const, capitalRepaidAmount: 1_000_000 }
    placementRepository.getById.mockResolvedValue(activePlacement)
    placementRepository.listCommissions.mockResolvedValue([paidCommission])
    documentRepository.uploadDocumentFile.mockResolvedValue({ url: 'url', path: 'path', size: 5 })
    documentRepository.createDocument.mockResolvedValue({ id: 'final-1' })
    placementRepository.update
      .mockResolvedValueOnce({ ...activePlacement, finalQuittanceDocumentId: 'final-1' })
      .mockResolvedValueOnce(closedPlacement)

    await service.closePlacement(
      activePlacement.id,
      new File(['pdf'], 'quittance.pdf', { type: 'application/pdf' }),
      'Remboursement intégral du capital',
      'admin-1'
    )

    expect(placementRepository.update).toHaveBeenLastCalledWith(
      activePlacement.id,
      expect.objectContaining({
        status: 'Closed',
        capitalRepaidAmount: 1_000_000,
        capitalRepaidAt: expect.any(Date),
      })
    )
    expect(notificationService.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining(
          'Capital restitué : 1\u202f000\u202f000 FCFA. Commissions versées : 50\u202f000 FCFA. Total cumulé versé : 1\u202f050\u202f000 FCFA.'
        ),
        metadata: expect.objectContaining({
          capitalRepaidAmount: 1_000_000,
          paidCommissionsAmount: 50_000,
          totalPaidAmount: 1_050_000,
        }),
      })
    )
  })

  it('ignore les montants soumis et persiste ceux recalculés à la date effective', async () => {
    // Le client calcule sur le jour courant, le service sur la date de retrait
    // saisie : l'écart ne doit pas bloquer l'enregistrement, seule la valeur
    // recalculée fait foi (ni commission dictée, ni restitution partielle).
    placementRepository.getById.mockResolvedValue(activePlacement)
    placementRepository.listCommissions.mockResolvedValue([])
    placementRepository.update.mockResolvedValue({ ...activePlacement, status: 'EarlyExit' })
    placementRepository.saveEarlyExit.mockResolvedValue({
      id: 'current',
      placementId: activePlacement.id,
      commissionDue: 50_000,
      payoutAmount: 1_050_000,
      requestedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'admin-1',
    })
    ;(service as any).notifyEarlyExitRequest = vi.fn().mockResolvedValue(undefined)
    ;(service as any).generateEarlyExitAddendum = vi.fn().mockResolvedValue({ documentId: 'addendum-1' })

    await service.requestEarlyExit(
      activePlacement.id,
      {
        commissionDue: 0,
        payoutAmount: 900_000,
        withdrawalAmount: 900_000,
        withdrawalDate: '2026-02-01',
        withdrawalTime: '10:00',
      },
      activePlacement.benefactorId,
      'admin-1'
    )

    expect(placementRepository.saveEarlyExit).toHaveBeenCalledWith(
      activePlacement.id,
      expect.objectContaining({
        commissionDue: 50_000,
        payoutAmount: 1_050_000,
        withdrawalAmount: 1_050_000,
      })
    )
  })

  it('refuse une date de retrait antérieure au début du placement', async () => {
    placementRepository.getById.mockResolvedValue(activePlacement)

    await expect(
      service.requestEarlyExit(
        activePlacement.id,
        {
          commissionDue: 0,
          payoutAmount: 1_000_000,
          withdrawalAmount: 1_000_000,
          withdrawalDate: '2025-12-15',
          withdrawalTime: '10:00',
        },
        activePlacement.benefactorId,
        'admin-1'
      )
    ).rejects.toThrow('ne peut pas précéder le début du placement')

    expect(placementRepository.saveEarlyExit).not.toHaveBeenCalled()
  })

  it('annule les commissions dues puis recalcule les échéances après une sortie anticipée', async () => {
    const dueCommission2 = { ...dueCommission, id: 'commission-2', dueDate: new Date('2026-03-01') }
    const canceledCommissions = [dueCommission, dueCommission2].map(commission => ({
      ...commission,
      status: 'Canceled' as const,
    }))
    const earlyExit = {
      id: 'current',
      placementId: activePlacement.id,
      commissionDue: 50_000,
      payoutAmount: 1_050_000,
      requestedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'admin-1',
    }

    placementRepository.getById.mockResolvedValue(activePlacement)
    placementRepository.saveEarlyExit.mockResolvedValue(earlyExit)
    placementRepository.update.mockResolvedValue({ ...activePlacement, status: 'EarlyExit' })
    placementRepository.listCommissions
      .mockResolvedValueOnce([dueCommission, dueCommission2])
      .mockResolvedValueOnce(canceledCommissions)
    placementRepository.updateCommission.mockImplementation(
      async (_placementId: string, commissionId: string) =>
        canceledCommissions.find(commission => commission.id === commissionId)
    )
    ;(service as any).notifyEarlyExitRequest = vi.fn().mockResolvedValue(undefined)
    ;(service as any).generateEarlyExitAddendum = vi.fn().mockResolvedValue({ documentId: 'addendum-1' })

    const result = await service.requestEarlyExit(
      activePlacement.id,
      {
        commissionDue: 50_000,
        payoutAmount: 1_050_000,
        withdrawalAmount: 1_050_000,
        withdrawalDate: '2026-02-01',
        withdrawalTime: '10:00',
      },
      activePlacement.benefactorId,
      'admin-1'
    )

    expect(result.payoutAmount).toBe(1_050_000)
    expect(placementRepository.updateCommission).toHaveBeenCalledTimes(2)
    expect(placementRepository.updateCommission).toHaveBeenCalledWith(
      activePlacement.id,
      dueCommission.id,
      expect.objectContaining({ status: 'Canceled' })
    )
    expect(placementRepository.update).toHaveBeenLastCalledWith(
      activePlacement.id,
      expect.objectContaining({ nextCommissionDate: null, hasOverdueCommission: false })
    )
  })

  it('exclut les commissions annulées des agrégats financiers', async () => {
    placementRepository.getAll.mockResolvedValue([activePlacement])
    placementRepository.listCommissions.mockResolvedValue([
      { ...dueCommission, status: 'Paid', paidAmount: 50_000 },
      { ...dueCommission, id: 'commission-2', status: 'Due', amount: 50_000 },
      { ...dueCommission, id: 'commission-3', status: 'Canceled', amount: 50_000 },
    ])

    const stats = await service.getPlacementStats()

    expect(stats.totalAmount).toBe(1_000_000)
    expect(stats.totalCommissionsAmount).toBe(100_000)
    expect(stats.paidCommissionsAmount).toBe(50_000)
  })
})
