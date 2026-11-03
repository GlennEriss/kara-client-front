import { describe, expect, it, vi } from 'vitest'
import type { PaymentCI, SupportCI } from '@/types/types'
import { CaisseImprevueService } from '../CaisseImprevueService'

vi.mock('@/factories/ServiceFactory', () => ({ ServiceFactory: {} }))
vi.mock('@/factories/RepositoryFactory', () => ({ RepositoryFactory: {} }))

describe('statistiques des versements CI', () => {
  it('charge les versements et les aides en parallèle et conserve les montants réellement versés', async () => {
    let resolvePayments!: (payments: Partial<PaymentCI>[]) => void
    const getPaymentsByContractId = vi.fn(() => new Promise<Partial<PaymentCI>[]>((resolve) => { resolvePayments = resolve }))
    const getSupportHistory = vi.fn().mockResolvedValue([{ id: 'aide-1' }, { id: 'aide-2' }])
    const service: CaisseImprevueService = Object.assign(Object.create(CaisseImprevueService.prototype), {
      paymentCIRepository: { getPaymentsByContractId },
      getSupportHistory,
    })

    const result = service.getContractPaymentStats('contrat-1')
    expect(getPaymentsByContractId).toHaveBeenCalledWith('contrat-1')
    expect(getSupportHistory).toHaveBeenCalledWith('contrat-1')
    resolvePayments([
      { status: 'PAID', accumulatedAmount: 30_000, targetAmount: 30_000 },
      { status: 'PARTIAL', accumulatedAmount: 12_000, targetAmount: 30_000 },
      { status: 'DUE', targetAmount: 30_000 },
    ])

    expect(await result).toEqual({ totalAmountPaid: 42_000, paymentCount: 3, paidMonthsCount: 1, supportCount: 2 })
  })

  it('attend aussi les aides avant de publier les statistiques', async () => {
    let resolveSupports!: (supports: Partial<SupportCI>[]) => void
    const service: CaisseImprevueService = Object.assign(Object.create(CaisseImprevueService.prototype), {
      paymentCIRepository: { getPaymentsByContractId: vi.fn().mockResolvedValue([]) },
      getSupportHistory: vi.fn(() => new Promise<Partial<SupportCI>[]>((resolve) => { resolveSupports = resolve })),
    })

    const result = service.getContractPaymentStats('contrat-2')
    resolveSupports([{ id: 'aide-1' }])
    expect(await result).toEqual({ totalAmountPaid: 0, paymentCount: 0, paidMonthsCount: 0, supportCount: 1 })
  })
})
