import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { pay, payGroup, updatePaymentContribution } from '../mutations'
import { CaisseContractsService } from '@/domains/financial/caisse-speciale/contrats/services/CaisseContractsService'
import { updateContract } from '@/db/caisse/contracts.db'

const state = vi.hoisted(() => ({
  contract: {} as Record<string, any>,
  payments: [] as Array<Record<string, any>>,
  settings: { bonusTable: { M4: 6, M5: 7, M6: 8, M7: 9, M8: 10, M9: 12 }, penaltyRules: { day4To12: { perDay: 0 } } },
}))
vi.mock('@/db/caisse/contracts.db', () => ({
  createContract: vi.fn(), updateContractPdf: vi.fn(),
  getContract: async () => structuredClone(state.contract),
  updateContract: vi.fn(async (_id, updates) => { Object.assign(state.contract, updates); return true }),
}))
vi.mock('@/db/caisse/payments.db', () => ({
  addPayment: vi.fn(),
  listPayments: async () => structuredClone(state.payments),
  updatePayment: async (_contractId: string, paymentId: string, updates: object) => {
    Object.assign(state.payments.find((payment) => payment.id === paymentId)!, updates)
  },
}))
vi.mock('@/db/caisse/settings.db', () => ({ getActiveSettings: async () => state.settings }))
vi.mock('@/db/caisse/refunds.db', () => ({
  addRefund: vi.fn(), listRefunds: vi.fn(), updateRefund: vi.fn(), deleteRefund: vi.fn(),
}))
vi.mock('@/db/upload-image.db', () => ({ createFile: vi.fn(), deleteFile: vi.fn() }))
vi.mock('@/db/member.db', () => ({ addCaisseContractToUser: vi.fn(), removeCaisseContractFromEntity: vi.fn() }))
vi.mock('@/db/admin.db', () => ({ getAdminById: vi.fn() }))
vi.mock('@/db/group.db', () => ({ getGroupById: vi.fn() }))
vi.mock('@/firebase/storage', () => ({ getStorageInstance: vi.fn(), ref: vi.fn(), deleteObject: vi.fn() }))
vi.mock('@/firebase/auth', () => ({ auth: { currentUser: { uid: 'admin-test', displayName: 'Admin Test' } } }))
vi.mock('firebase/firestore', () => ({ Timestamp: { fromDate: (date: Date) => date } }))
vi.mock('@/hooks/useIsSuperAdmin', () => ({ resolveIsSuperAdmin: async () => true }))
vi.mock('@/services/audit/auditLog', () => ({ logAdminAction: async () => {} }))
vi.mock('@/services/refunds/finalizeRefundHandover', () => ({ finalizeRefundHandover: vi.fn() }))
vi.mock('@/services/caisse/readers', () => ({ recomputeNow: async () => {} }))
vi.mock('@/factories/RepositoryFactory', () => ({ RepositoryFactory: {} }))
vi.mock('@/utils/payment-deletion-order', () => ({ getCaisseSpecialePaymentDeletionBlocker: () => null }))
vi.mock('@/domains/financial/caisse-speciale/contrats/repositories/CaisseContractsRepository', () => ({
  CaisseContractsRepository: { getInstance: () => ({
    getContractById: async () => structuredClone(state.contract),
    getContractPayments: async () => structuredClone(state.payments),
    deletePayment: async (_contractId: string, paymentId: string) => {
      state.payments = state.payments.filter((payment) => payment.id !== paymentId)
    },
  }) },
}))

describe('recalcul global du bonus après modification des versements', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-03T12:00:00'))
    vi.clearAllMocks()
    state.contract = {
      id: 'contract-test', memberId: 'member-test', contractType: 'INDIVIDUAL',
      status: 'LATE_WITH_PENALTY', caisseType: 'STANDARD_CHARITABLE', monthlyAmount: 100_000,
      nominalPaid: 900_000, bonusAccrued: 46_000, penaltiesTotal: 0, currentMonthIndex: 9,
      contractStartAt: new Date('2025-12-22T00:00:00'), monthsPlanned: 12,
    }
    state.payments = Array.from({ length: 12 }, (_, index) => ({
      id: `payment-${index}`, dueMonthIndex: index, dueAt: new Date(2025, 11 + index, 22),
      amount: 100_000, accumulatedAmount: index < 9 ? 100_000 : 0,
      status: index < 9 ? 'PAID' : 'DUE', paidAt: index < 9 ? new Date(2025, 11 + index, 22) : undefined,
      bonusApplied: [0, 0, 0, 6_000, 6_000, 7_000, 8_000, 9_000, 10_000, 0, 0, 0][index],
    }))
  })
  afterEach(() => vi.useRealTimers())

  function prepareNinthPayment() {
    Object.assign(state.contract, { nominalPaid: 800_000, bonusAccrued: 36_000, currentMonthIndex: 8 })
    Object.assign(state.payments[8], { status: 'DUE', accumulatedAmount: 0, paidAt: undefined, bonusApplied: undefined })
  }

  it('enregistre 108 000 de bonus global au 9e versement au lieu d’ajouter un bonus mensuel', async () => {
    prepareNinthPayment()
    const result = await pay({ contractId: 'contract-test', dueMonthIndex: 8, memberId: 'member-test', amount: 100_000,
      paidAt: new Date('2026-07-07T12:00:00'), time: '12:00', mode: 'cash' })
    expect(state.contract).toMatchObject({ nominalPaid: 900_000, bonusAccrued: 108_000 })
    expect(result.bonus).toBe(108_000)
    expect(state.payments[8].bonusApplied).toBeUndefined()
  })

  it('recalcule aussi le bonus après une contribution de groupe', async () => {
    prepareNinthPayment()
    Object.assign(state.contract, { contractType: 'GROUP', groupeId: 'group-test' })
    await payGroup({ contractId: 'contract-test', dueMonthIndex: 8, memberId: 'member-test', memberName: 'Membre Test',
      memberMatricule: 'matricule-test', amount: 100_000, paidAt: new Date('2026-07-07T12:00:00'), time: '12:00', mode: 'cash' })
    expect(state.contract).toMatchObject({ nominalPaid: 900_000, bonusAccrued: 108_000 })
  })

  it('préserve le nominal antérieur d’un ancien mois libre sans détail de contributions', async () => {
    state.contract.caisseType = 'LIBRE_CHARITABLE'
    await pay({ contractId: 'contract-test', dueMonthIndex: 8, memberId: 'member-test', amount: 25_000,
      paidAt: new Date('2026-07-07T12:00:00'), time: '12:00', mode: 'cash' })
    expect(state.contract).toMatchObject({ nominalPaid: 925_000, bonusAccrued: 111_000 })
  })

  it('réévalue le gel du bonus après correction de la date d’un paiement', async () => {
    await updatePaymentContribution({ contractId: 'contract-test', paymentId: 'payment-1', contributionId: '__single__',
      updates: { paidAt: new Date('2026-03-10T12:00:00') } })
    expect(state.contract).toMatchObject({ nominalPaid: 900_000, bonusAccrued: 0 })
  })

  it('garde les acomptes libres dans l’assiette après correction d’un montant', async () => {
    state.contract.caisseType = 'LIBRE_CHARITABLE'
    Object.assign(state.payments[9], { accumulatedAmount: 50_000, contribs: [{ id: 'partial', amount: 50_000 }] })
    await updatePaymentContribution({ contractId: 'contract-test', paymentId: 'payment-8', contributionId: '__single__', updates: { amount: 150_000 } })
    expect(state.contract).toMatchObject({ nominalPaid: 1_000_000, bonusAccrued: 120_000 })
  })

  it('revient à M8 et 80 000 de bonus après suppression du 9e versement', async () => {
    await CaisseContractsService.getInstance().deleteContractPayment('contract-test', 'payment-8', 'admin-test')
    expect(updateContract).toHaveBeenLastCalledWith('contract-test', expect.objectContaining({
      nominalPaid: 800_000, bonusAccrued: 80_000, currentMonthIndex: 8,
    }))
  })
})
