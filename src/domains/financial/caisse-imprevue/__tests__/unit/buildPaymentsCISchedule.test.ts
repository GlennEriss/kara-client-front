import { describe, expect, it } from 'vitest'
import { buildPaymentsCISchedule } from '@/domains/financial/caisse-imprevue/services/buildPaymentsCISchedule'
import { ContractCI, PaymentCI } from '@/types/types'

const contract = {
  id: 'CI_1',
  subscriptionCIDuration: 12,
  subscriptionCIAmountPerMonth: 5000,
  firstPaymentDate: '2025-01-15',
} as unknown as ContractCI

const paidMonth = (monthIndex: number): PaymentCI =>
  ({
    id: `month-${monthIndex}`,
    contractId: 'CI_1',
    monthIndex,
    status: 'PAID',
    targetAmount: 5000,
    accumulatedAmount: 5000,
    versements: [{ id: `v${monthIndex}`, amount: 5000 }],
    createdAt: new Date('2025-01-20'),
    updatedAt: new Date('2025-01-20'),
    createdBy: 'admin',
    updatedBy: 'admin',
  }) as unknown as PaymentCI

describe('buildPaymentsCISchedule', () => {
  it('comble les mois sans document jusqu’à la durée du contrat', () => {
    const schedule = buildPaymentsCISchedule(contract, [paidMonth(0), paidMonth(1), paidMonth(2)])

    expect(schedule).toHaveLength(12)
    expect(schedule.filter((p) => p.status === 'PAID')).toHaveLength(3)
    expect(schedule.filter((p) => p.status === 'DUE')).toHaveLength(9)
  })

  it('rend les totaux du récapitulatif exacts', () => {
    const schedule = buildPaymentsCISchedule(contract, [paidMonth(0), paidMonth(1), paidMonth(2)])

    const totalCotisation = schedule.reduce((sum, p) => sum + p.targetAmount, 0)
    const totalPaid = schedule.reduce((sum, p) => sum + p.accumulatedAmount, 0)
    const unpaidCount = schedule.filter((p) => p.status !== 'PAID').length

    expect(totalCotisation).toBe(60000)
    expect(totalPaid).toBe(15000)
    expect(Math.max(totalCotisation - totalPaid, 0)).toBe(45000)
    expect(unpaidCount).toBe(9)
  })

  it('préserve les documents réels et marque les seuls mois reconstruits', () => {
    const real = paidMonth(4)
    const schedule = buildPaymentsCISchedule(contract, [real])

    expect(schedule[4]).toBe(real)
    expect(schedule[4].isVirtual).toBeUndefined()
    expect(schedule[0].isVirtual).toBe(true)
    expect(schedule[0].versements).toEqual([])
    expect(schedule[0].accumulatedAmount).toBe(0)
  })

  it('ordonne l’échéancier par mois', () => {
    const schedule = buildPaymentsCISchedule(contract, [paidMonth(5), paidMonth(1)])
    expect(schedule.map((p) => p.monthIndex)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
  })

  it('ne tronque jamais des paiements au-delà de la durée déclarée', () => {
    const shortened = { ...contract, subscriptionCIDuration: 3 } as ContractCI
    const schedule = buildPaymentsCISchedule(shortened, [paidMonth(7)])

    expect(schedule).toHaveLength(8)
    expect(schedule[7].status).toBe('PAID')
  })

  it('retourne les paiements bruts sans contrat', () => {
    const payments = [paidMonth(2), paidMonth(0)]
    const schedule = buildPaymentsCISchedule(null, payments)

    expect(schedule.map((p) => p.monthIndex)).toEqual([0, 2])
  })
})
