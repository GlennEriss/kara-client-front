import type { ContractPayment } from '@/domains/financial/caisse-speciale/contrats/entities/contract.types'
import type { CaisseContract, ContractCI, CreditContract, CreditPayment, PaymentCI } from '@/types/types'
import {
  buildCaisseImprevueEntries,
  buildCaisseSpecialeEntries,
  buildCompleteMemberFormSummary,
  buildCreditEntries,
} from '@/domains/community/member-form/services/member-form.builders'
import { describe, expect, it } from 'vitest'

const NOW = new Date('2026-08-12T10:00:00')

describe('member form builders', () => {
  it('classe les échéances Caisse Spéciale payées et impayées', () => {
    const contract = {
      id: 'cs-1',
      monthlyAmount: 25_000,
    } as CaisseContract & { id: string }
    const payments = [
      {
        id: 'p-1',
        dueMonthIndex: 0,
        dueAt: new Date('2026-06-01'),
        paidAt: new Date('2026-06-01'),
        amount: 25_000,
        status: 'PAID',
      },
      {
        id: 'p-2',
        dueMonthIndex: 1,
        dueAt: new Date('2026-07-01'),
        amount: 25_000,
        status: 'DUE',
      },
    ] as ContractPayment[]

    const entries = buildCaisseSpecialeEntries([{ contract, payments }], NOW)

    expect(entries.map((entry) => entry.outcome)).toEqual(['onTime', 'missed'])
    expect(entries[1].daysLate).toBe(42)
  })

  it('reconstruit une échéance CI absente de la sous-collection payments', () => {
    const contract = {
      id: 'ci-1',
      paymentFrequency: 'MONTHLY',
      firstPaymentDate: '2026-06-01',
      subscriptionCIDuration: 3,
      subscriptionCIAmountPerMonth: 10_000,
    } as ContractCI
    const paidMonth = {
      id: 'month-0',
      monthIndex: 0,
      status: 'PAID',
      targetAmount: 10_000,
      accumulatedAmount: 10_000,
      versements: [{ date: '2026-06-03', createdAt: new Date('2026-06-03') }],
    } as PaymentCI

    const entries = buildCaisseImprevueEntries([{ contract, payments: [paidMonth] }], NOW)

    expect(entries).toHaveLength(3)
    expect(entries[0]).toMatchObject({ outcome: 'late', daysLate: 2 })
    expect(entries[1]).toMatchObject({ outcome: 'missed', amount: 10_000 })
  })

  it('calcule les échéances d’un Crédit Fixe et neutralise un mois de repos', () => {
    const contract = {
      id: 'credit-1',
      clientId: 'member-1',
      creditType: 'FIXE',
      amount: 30_000,
      totalAmount: 30_000,
      monthlyPaymentAmount: 10_000,
      duration: 3,
      interestRate: 0,
      firstPaymentDate: new Date('2026-05-01'),
      createdAt: new Date('2026-04-01'),
      restMonths: [{ monthNumber: 2, reason: 'Repos', recordedBy: 'a', recordedByName: 'A', recordedAt: NOW }],
    } as CreditContract
    const payments = [{
      id: 'M1_credit-1',
      creditId: 'credit-1',
      amount: 10_000,
      paymentDate: new Date('2026-05-02'),
      comment: '',
    }] as CreditPayment[]

    const entries = buildCreditEntries([{ contract, payments }], NOW)

    expect(entries.map((entry) => entry.outcome)).toEqual(['late', 'excused', 'missed'])
    expect(entries[0].contractHref).toBe('/credit-fixe/contrats/credit-1')
  })

  it('fusionne les produits et ne garde que les dix résultats les plus récents', () => {
    const contract = { id: 'cs-many', monthlyAmount: 5_000 } as CaisseContract & { id: string }
    const payments = Array.from({ length: 12 }, (_, index) => ({
      id: `p-${index}`,
      dueMonthIndex: index,
      dueAt: new Date(2025, index, 1),
      paidAt: new Date(2025, index, 1),
      amount: 5_000,
      status: 'PAID',
    })) as ContractPayment[]

    const summary = buildCompleteMemberFormSummary({
      memberId: 'member-1',
      caisseSpeciale: [{ contract, payments }],
      caisseImprevue: [],
      credits: [],
      now: NOW,
    })

    expect(summary.entries).toHaveLength(10)
    expect(summary.onTimeCount).toBe(10)
    expect(summary.punctualityRate).toBe(1)
  })
})
