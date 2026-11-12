import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CreditContract, CreditPayment } from '@/types/types'

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
  ServiceFactory: {
    getNotificationService: vi.fn(() => ({
      createNotification: vi.fn().mockResolvedValue(undefined),
    })),
  },
}))
vi.mock('@/domains/infrastructure/documents/repositories/IDocumentRepository', () => ({}))
import { CreditSpecialeService } from '../CreditSpecialeService'

let contract: CreditContract
let payments: CreditPayment[]
let service: CreditSpecialeService
const update = vi.fn(),
  createPenalty = vi.fn(),
  updatePayment = vi.fn()
beforeEach(() => {
  vi.clearAllMocks()
  contract = {
    id: 'MK_CSP_1234_WEEKLY',
    demandId: 'demand-weekly',
    clientId: 'member',
    clientFirstName: 'Alice',
    clientLastName: 'ONDO',
    clientContacts: [],
    creditType: 'SPECIALE',
    durationUnit: 'WEEKS',
    repaymentModel: 'DEGRESSIVE',
    status: 'ACTIVE',
    duration: 2,
    firstPaymentDate: new Date('2026-01-15'),
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    createdBy: 'admin',
    updatedBy: 'admin',
    amount: 100000,
    interestRate: 10,
    monthlyPaymentAmount: 110000,
    totalAmount: 110000,
    amountRemaining: 110000,
    amountPaid: 0,
    restMonths: [],
    guarantorRemunerationPercentage: 0,
    guarantorIsMember: false,
    guarantorIsParrain: false,
  }
  payments = []
  update.mockImplementation(async (_id: string, data: Partial<CreditContract>) => {
    contract = { ...contract, ...data }
    return contract
  })
  const paymentRepository = {
    getPaymentsByCreditId: vi.fn(async () => [...payments]),
    getPaymentById: vi.fn(async (id: string) => payments.find((p) => p.id === id) ?? null),
    createPayment: vi.fn(async (data: CreditPayment, id: string) => {
      const payment = { ...data, id }
      payments.push(payment)
      return payment
    }),
    updatePayment: updatePayment.mockImplementation(async (id: string, data: Partial<CreditPayment>) => {
      const index = payments.findIndex((p) => p.id === id)
      if (index === -1) return null
      payments[index] = { ...payments[index], ...data }
      return payments[index]
    }),
  }
  service = new CreditSpecialeService(
    {} as never,
    { getContractById: vi.fn(async () => contract), updateContract: update } as never,
    paymentRepository as never,
    { getPenaltiesByCreditId: vi.fn().mockResolvedValue([]) } as never,
    {} as never,
    {} as never,
  )
  // Le score et son écriture en arrière-plan sont indépendants des soldes testés.
  vi.spyOn(service, 'calculateScore').mockRejectedValue(new Error('Score hors périmètre'))
  vi.spyOn(service, 'generatePaymentReceiptPDF').mockResolvedValue('')
})

describe('modification des versements hebdomadaires', () => {
  const edit = (index: number, data: Partial<CreditPayment>, reason = 'Correction de saisie') =>
    service.updatePayment(payments[index].id, data, undefined, reason, 'admin-correcteur')

  it('corrige le montant, les parts capital/intérêts et le solde enregistré pour le suivi membre', async () => {
    await pay(60000, '2026-01-15', 1)
    const updated = await edit(0, { amount: 70000 })
    expect(updated).toMatchObject({
      amount: 70000, interestAmount: 10000, principalAmount: 60000,
      modificationReason: 'Correction de saisie', updatedBy: 'admin-correcteur', receiptUrl: '',
    })
    expect(contract).toMatchObject({ amountPaid: 70000, amountRemaining: 44000, nextDueAt: new Date('2026-01-22') })
  })

  it('propage une correction ancienne sur les échéances suivantes sans modifier leurs encaissements', async () => {
    await pay(60000, '2026-01-15', 1)
    await pay(30000, '2026-01-22', 2)
    await edit(0, { amount: 70000 })
    expect(payments[1]).toMatchObject({ amount: 30000, interestAmount: 4000, principalAmount: 26000 })
    expect(contract).toMatchObject({ amountPaid: 100000, amountRemaining: 15400, nextDueAt: new Date('2026-01-29') })
  })

  it('répartit une seule fois les intérêts lorsqu’un complément est corrigé', async () => {
    await pay(5000, '2026-01-15', 1)
    await pay(5000, '2026-01-16', 1)
    await edit(1, { amount: 8000 })
    expect(payments[0]).toMatchObject({ interestAmount: 5000, principalAmount: 0 })
    expect(payments[1]).toMatchObject({ interestAmount: 5000, principalAmount: 3000 })
    expect(contract).toMatchObject({ amountPaid: 13000, amountRemaining: 106700 })
  })

  it('conserve une déclaration à zéro et réactive le contrat si plus rien n’a été versé', async () => {
    await pay(60000, '2026-01-15', 1)
    await edit(0, { amount: 0, comment: 'Erreur de saisie' })
    expect(payments[0]).toMatchObject({ amount: 0, interestAmount: 0, principalAmount: 0, comment: 'Paiement de 0 FCFA - Erreur de saisie' })
    expect(contract).toMatchObject({ status: 'ACTIVE', amountPaid: 0, amountRemaining: 121000, nextDueAt: new Date('2026-01-22') })
  })

  it('solde le contrat si le montant corrigé rembourse toute la dette', async () => {
    await pay(60000, '2026-01-15', 1)
    await edit(0, { amount: 110000 })
    expect(contract).toMatchObject({ status: 'DISCHARGED', amountPaid: 110000, amountRemaining: 0, nextDueAt: undefined, dischargedBy: 'admin-correcteur' })
  })

  it('ne recrée pas d’intérêts pour une correction après le passage en partie fixe', async () => {
    await pay(10000, '2026-01-15', 1)
    await pay(10000, '2026-01-22', 2)
    await pay(10000, '2026-01-29', 3)
    await pay(50000, '2026-02-05', 4)
    await edit(3, { amount: 40000 })
    expect(payments[3]).toMatchObject({ interestAmount: 0, principalAmount: 40000 })
    expect(contract).toMatchObject({ amountPaid: 70000, amountRemaining: 60000, nextDueAt: new Date('2026-02-12') })
  })

  it('réattribue les intérêts entre les compléments si leur ordre de date est corrigé', async () => {
    await pay(6000, '2026-01-15', 1)
    await pay(7000, '2026-01-16', 1)
    await edit(0, { paymentDate: new Date('2026-01-17') })
    expect(payments[0]).toMatchObject({ interestAmount: 3000, principalAmount: 3000 })
    expect(payments[1]).toMatchObject({ interestAmount: 7000, principalAmount: 0 })
    expect(contract).toMatchObject({ amountPaid: 13000, amountRemaining: 106700 })
  })

  it('permet de corriger les informations du même formulaire que le mensuel', async () => {
    await pay(60000, '2026-01-15', 1)
    const updated = await edit(0, { paymentDate: new Date('2026-01-16'), paymentTime: '14:30', mode: 'airtel_money', withFees: true, comment: 'CONFORME' })
    expect(updated).toMatchObject({ paymentDate: new Date('2026-01-16'), paymentTime: '14:30', mode: 'airtel_money', withFees: true, comment: 'CONFORME' })
    expect(contract).toMatchObject({ amountPaid: 60000, amountRemaining: 55000 })
  })

  it('refuse un trop-perçu résultant de la correction avant toute écriture', async () => {
    await pay(60000, '2026-01-15', 1)
    await pay(30000, '2026-01-22', 2)
    updatePayment.mockClear()
    update.mockClear()
    await expect(edit(0, { amount: 90000 })).rejects.toThrow(/versement suivant trop élevé/)
    expect(updatePayment).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
    expect(payments[0].amount).toBe(60000)
  })

  it('refuse les montants invalides, les dates invalides, un motif vide et les contrats terminés', async () => {
    await pay(60000, '2026-01-15', 1)
    updatePayment.mockClear()
    await expect(edit(0, { amount: -1 })).rejects.toThrow(/positif ou nul/)
    await expect(edit(0, { amount: Number.NaN })).rejects.toThrow(/positif ou nul/)
    await expect(edit(0, { paymentDate: new Date('invalid') })).rejects.toThrow(/date.*invalide/)
    await expect(edit(0, { amount: 70000 }, '  ')).rejects.toThrow(/motif/)
    contract.status = 'CLOSED'
    await expect(edit(0, { amount: 70000 })).rejects.toThrow(/terminé/)
    expect(updatePayment).not.toHaveBeenCalled()
  })
})
const pay = (amount: number, date: string, period: number) =>
  service.createPayment(
    {
      creditId: contract.id,
      amount,
      paymentDate: new Date(date),
      createdBy: 'admin',
      mode: 'CASH',
    } as never,
    undefined,
    undefined,
    period,
  )

describe('enregistrement hebdomadaire des versements', () => {
  it('reporte le solde avec les intérêts de la semaine suivante et clôture sans en créer une autre', async () => {
    await pay(60000, '2026-01-15', 1)
    expect(contract).toMatchObject({
      status: 'PARTIAL',
      amountPaid: 60000,
      amountRemaining: 55000,
      nextDueAt: new Date('2026-01-22'),
      repaymentModel: 'DEGRESSIVE',
    })
    expect(payments[0]).toMatchObject({ interestAmount: 10000, principalAmount: 50000 })
    await pay(55000, '2026-01-22', 2)
    expect(contract).toMatchObject({
      status: 'DISCHARGED',
      amountPaid: 115000,
      amountRemaining: 0,
      nextDueAt: undefined,
    })
    expect(payments[1]).toMatchObject({ interestAmount: 5000, principalAmount: 50000 })
  })
  it('ne reprend pas les intérêts en partie fixe après un mois', async () => {
    await pay(10000, '2026-01-15', 1)
    await pay(10000, '2026-01-22', 2)
    await pay(10000, '2026-01-29', 3)
    expect(contract).toMatchObject({ amountRemaining: 100000, nextDueAt: new Date('2026-02-05') })
    await pay(50000, '2026-02-05', 4)
    expect(payments[3]).toMatchObject({ interestAmount: 0, principalAmount: 50000 })
    expect(contract).toMatchObject({ amountRemaining: 50000, nextDueAt: new Date('2026-02-12') })
  })
  it('n’écrase pas un ancien complément et ne facture pas deux fois les intérêts de la même échéance', async () => {
    await pay(60000, '2026-01-15', 1)
    await pay(50000, '2026-01-16', 1)
    expect(new Set(payments.map((p) => p.id)).size).toBe(2)
    expect(payments[1]).toMatchObject({ interestAmount: 0, principalAmount: 50000 })
    expect(contract).toMatchObject({ status: 'DISCHARGED', amountRemaining: 0, amountPaid: 110000 })
  })
  it('refuse un trop-perçu sur une échéance sans enregistrer le versement', async () => {
    await pay(60000, '2026-01-15', 1)
    await expect(pay(50001, '2026-01-16', 1)).rejects.toThrow(/dépasse le solde/)
    expect(payments).toHaveLength(1)
    expect(contract.amountRemaining).toBe(55000)
  })
  it('refuse de contourner la nouvelle semaine en ajoutant un complément tardif à l’ancienne échéance', async () => {
    await pay(60000, '2026-01-15', 1)
    await expect(pay(50000, '2026-01-22', 1)).rejects.toThrow(/nouvelle échéance hebdomadaire/)
    expect(payments).toHaveLength(1)
  })
  it('rattache les pénalités à la bonne date hebdomadaire, avec trois jours de tolérance', async () => {
    const first = {
      id: `M1_${contract.id}`,
      creditId: contract.id,
      amount: 60000,
      interestAmount: 10000,
      paymentDate: new Date('2026-01-15'),
    } as CreditPayment
    payments.push(first)
    const penalty = vi
      .spyOn(service, 'createPenalty')
      .mockImplementation(createPenalty.mockResolvedValue({ id: 'penalty' }))
    await service.checkAndCreatePenalties(contract.id, {
      ...first,
      id: `M2_${contract.id}`,
      paymentDate: new Date('2026-01-25'),
    })
    expect(penalty).not.toHaveBeenCalled()
    await service.checkAndCreatePenalties(contract.id, {
      ...first,
      id: `M2_${contract.id}`,
      paymentDate: new Date('2026-01-26'),
    })
    expect(penalty).toHaveBeenCalledWith(
      expect.objectContaining({
        installmentId: 'C1_M2',
        daysLate: 4,
        amount: 667,
        dueDate: new Date(2026, 0, 22),
      }),
    )
  })
})
