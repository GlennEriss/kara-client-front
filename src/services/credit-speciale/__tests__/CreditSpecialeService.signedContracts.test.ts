import { beforeEach, describe, expect, it, vi } from 'vitest'
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

describe('dépôt du contrat signé après rajout', () => {
  const initialCycle = {
    cycleNumber: 1,
    type: 'INITIAL',
    amount: 100000,
    interestRate: 10,
    monthlyPaymentAmount: 30000,
    totalAmount: 110000,
    duration: 4,
    firstPaymentDate: new Date('2026-01-10'),
    startedAt: new Date('2025-12-10'),
    signedContractUrl: 'https://example.test/initial.pdf',
    signedContractPath: 'initial.pdf',
    signedContractDocumentId: 'initial-doc',
  }
  let contract: CreditContract
  const upload = vi.fn(),
    create = vi.fn(),
    update = vi.fn(),
    remove = vi.fn(),
    notify = vi.fn()
  let service: CreditSpecialeService
  const pdf = () =>
    new File(['%PDF-1.7\nTest fictif'], 'nouveau-contrat.pdf', {
      type: 'application/pdf',
    })
  beforeEach(() => {
    vi.resetAllMocks()
    contract = {
      id: 'credit-test',
      clientId: 'membre-fictif',
      creditType: 'SPECIALE',
      status: 'PARTIAL',
      rajoutEffectue: true,
      amount: 150000,
      amountPaid: 10000,
      amountRemaining: 155000,
      firstPaymentDate: new Date('2026-11-24'),
      nextDueAt: new Date('2026-11-24'),
      activatedAt: new Date('2025-12-10'),
      fundsReleasedAt: new Date('2025-12-10'),
      disbursementDate: new Date('2025-12-10'),
      extendedAt: new Date('2026-10-24'),
      signedContractUrl: 'https://example.test/added.pdf',
      signedContractPath: 'added.pdf',
      signedContractDocumentId: 'added-doc',
      creditCycles: [
        initialCycle,
        {
          ...initialCycle,
          cycleNumber: 2,
          type: 'AUGMENTATION',
          signedContractUrl: 'https://example.test/added.pdf',
          signedContractPath: 'added.pdf',
          signedContractDocumentId: 'added-doc',
        },
      ],
    } as CreditContract
    upload.mockResolvedValue({
      url: 'https://example.test/new.pdf',
      path: 'new.pdf',
    })
    create.mockResolvedValue({ id: 'new-doc' })
    update.mockImplementation(
      async (_id, patch) => (contract = { ...contract, ...patch }),
    )
    service = new CreditSpecialeService(
      {} as never,
      {
        getContractById: async () => contract,
        updateContract: update,
      } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {
        documents: {
          uploadDocumentFile: upload,
          createDocument: create,
          deleteDocument: remove,
        } as never,
        removeStorageFile: remove,
        notifications: { createNotification: notify } as never,
      },
    )
  })
  it('dépose une nouvelle version sur un rajout déjà signé sans supprimer l’ancienne ni réactiver les fonds', async () => {
    const before = { ...contract }
    const result = await service.uploadSignedContract(
      contract.id,
      pdf(),
      'admin-test',
    )
    expect(result.creditCycles?.[0]).toEqual(before.creditCycles![0])
    expect(result.creditCycles?.[1]).toMatchObject({
      signedContractDocumentId: 'new-doc',
      signedContractPath: 'new.pdf',
    })
    expect(result).toMatchObject({
      signedContractUrl: 'https://example.test/new.pdf',
      status: before.status,
      activatedAt: before.activatedAt,
      fundsReleasedAt: before.fundsReleasedAt,
      disbursementDate: before.disbursementDate,
      firstPaymentDate: before.firstPaymentDate,
      nextDueAt: before.nextDueAt,
      amount: before.amount,
      amountPaid: before.amountPaid,
      amountRemaining: before.amountRemaining,
    })
    for (const key of [
      'status',
      'activatedAt',
      'fundsReleasedAt',
      'disbursementDate',
      'amount',
      'firstPaymentDate',
    ])
      expect(update.mock.calls[0][1]).not.toHaveProperty(key)
    expect(remove).not.toHaveBeenCalled()
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        contractId: contract.id,
        type: 'CREDIT_SPECIALE_CONTRACT_SIGNED',
      }),
    )
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Nouveau contrat signé téléversé' }),
    )
  })
  it('active toujours le premier contrat en attente sans rajout', async () => {
    Object.assign(contract, {
      status: 'PENDING',
      rajoutEffectue: false,
      extendedAt: undefined,
      creditCycles: undefined,
      signedContractUrl: undefined,
    })
    const result = await service.uploadSignedContract(
      contract.id,
      pdf(),
      'admin-test',
    )
    expect(result.status).toBe('ACTIVE')
    expect(update.mock.calls[0][1]).toMatchObject({
      activatedAt: expect.any(Date),
      fundsReleasedAt: expect.any(Date),
    })
  })
  it('accepte aussi un ancien rajout sans tableau de cycles', async () => {
    contract.creditCycles = undefined
    await service.uploadSignedContract(contract.id, pdf(), 'admin-test')
    expect(upload).toHaveBeenCalledOnce()
    expect(remove).not.toHaveBeenCalled()
    expect(update.mock.calls[0][1]).not.toHaveProperty('status')
  })
  it.each(['CLOSED', 'DISCHARGED', 'WRITTEN_OFF'] as const)(
    'refuse le dépôt sur un contrat %s avant tout fichier',
    async (status) => {
      contract.status = status
      await expect(
        service.uploadSignedContract(contract.id, pdf(), 'admin-test'),
      ).rejects.toThrow()
      expect(upload).not.toHaveBeenCalled()
      expect(update).not.toHaveBeenCalled()
    },
  )
  it('refuse le double dépôt initial et les fichiers non PDF', async () => {
    Object.assign(contract, {
      rajoutEffectue: false,
      extendedAt: undefined,
      creditCycles: [initialCycle],
    })
    await expect(
      service.uploadSignedContract(contract.id, pdf(), 'admin-test'),
    ).rejects.toThrow('pas disponible')
    contract.rajoutEffectue = true
    await expect(
      service.uploadSignedContract(
        contract.id,
        new File(['image'], 'image.png', { type: 'image/png' }),
        'admin-test',
      ),
    ).rejects.toThrow('PDF')
    expect(upload).not.toHaveBeenCalled()
  })
  it('préserve les documents existants si le nouveau transfert échoue', async () => {
    upload.mockRejectedValue(new Error('Stockage indisponible'))
    await expect(
      service.uploadSignedContract(contract.id, pdf(), 'admin-test'),
    ).rejects.toThrow('Stockage indisponible')
    expect(remove).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
    expect(create).not.toHaveBeenCalled()
  })
})
