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

  it('compte un versement partiel de Crédit Spécial comme payé, selon sa date', () => {
    const contract = {
      id: 'credit-s',
      clientId: 'member-1',
      creditType: 'SPECIALE',
      durationUnit: 'MONTHS',
      amount: 100_000,
      totalAmount: 130_000,
      monthlyPaymentAmount: 40_000,
      duration: 3,
      interestRate: 10,
      firstPaymentDate: new Date('2026-06-01'),
      createdAt: new Date('2026-05-15'),
      restMonths: [],
    } as unknown as CreditContract
    const payments = [
      { id: 'M1_credit-s', creditId: 'credit-s', amount: 15_000, paymentDate: new Date('2026-06-01'), comment: '' },
      { id: 'M2_credit-s', creditId: 'credit-s', amount: 10_000, paymentDate: new Date('2026-07-05'), comment: '' },
    ] as CreditPayment[]

    const entries = buildCreditEntries([{ contract, payments }], NOW)

    expect(entries[0]).toMatchObject({ outcome: 'onTime', amount: 15_000 })
    expect(entries[1]).toMatchObject({ outcome: 'late', daysLate: 4, amount: 10_000 })
    expect(entries[2]).toMatchObject({ outcome: 'missed' })
  })

  it('ignore les échéances de l’ancien cycle remplacées par une augmentation saisie après coup', () => {
    const now = new Date('2026-10-12T10:00:00')
    const contract = {
      id: 'credit-aug',
      clientId: 'member-1',
      creditType: 'SPECIALE',
      durationUnit: 'MONTHS',
      amount: 1_603_500,
      interestRate: 10,
      monthlyPaymentAmount: 450_000,
      duration: 5,
      createdAt: new Date('2026-03-01'),
      creditCycles: [
        {
          cycleNumber: 1, type: 'INITIAL', amount: 1_000_000, interestRate: 10, monthlyPaymentAmount: 300_000,
          totalAmount: 1_300_000, duration: 5, firstPaymentDate: new Date('2026-04-10'), startedAt: new Date('2026-03-01'),
          restMonths: [],
        },
        {
          cycleNumber: 2, type: 'AUGMENTATION', amount: 1_603_500, interestRate: 10, monthlyPaymentAmount: 450_000,
          totalAmount: 2_085_158, duration: 5, firstPaymentDate: new Date('2026-07-10'), startedAt: now,
          restMonths: [{ monthNumber: 1, reason: 'Repos' }],
        },
      ],
    } as unknown as CreditContract
    const payments = [1, 2, 3].map((month) => ({
      id: `C1_M${month}_credit-aug`, creditId: 'credit-aug', amount: 300_000,
      paymentDate: new Date(2026, 2 + month, 10), comment: '',
    })) as CreditPayment[]

    const entries = buildCreditEntries([{ contract, payments }], now)
    const cycleOne = entries.filter((entry) => !entry.label?.startsWith('Cycle 2'))

    expect(cycleOne.map((entry) => entry.label)).toEqual(['Échéance 1', 'Échéance 2', 'Échéance 3'])
    expect(cycleOne.every((entry) => entry.outcome === 'onTime')).toBe(true)
  })

  it('n’affiche pas les mois d’un ancien cycle après son dernier versement, même datés avant le nouveau cycle', () => {
    const now = new Date('2026-10-12T10:00:00')
    const contract = {
      id: 'credit-aug2',
      clientId: 'member-1',
      creditType: 'SPECIALE',
      durationUnit: 'MONTHS',
      amount: 4_000_000,
      interestRate: 10,
      monthlyPaymentAmount: 1_000_000,
      duration: 7,
      createdAt: new Date('2025-12-01'),
      creditCycles: [
        {
          cycleNumber: 1, type: 'INITIAL', amount: 3_000_000, interestRate: 10, monthlyPaymentAmount: 750_000,
          totalAmount: 4_000_000, duration: 7, firstPaymentDate: new Date('2025-12-20'), startedAt: new Date('2025-12-01'),
          restMonths: [],
        },
        {
          cycleNumber: 2, type: 'AUGMENTATION', amount: 4_000_000, interestRate: 10, monthlyPaymentAmount: 1_000_000,
          totalAmount: 5_000_000, duration: 7, firstPaymentDate: new Date('2026-05-25'), startedAt: now,
          restMonths: [],
        },
      ],
    } as unknown as CreditContract
    const payments = [1, 2, 3, 4, 5].map((month) => ({
      id: `C1_M${month}_credit-aug2`, creditId: 'credit-aug2', amount: 750_000,
      paymentDate: new Date(2025, 10 + month, 20), comment: '',
    })) as CreditPayment[]

    const entries = buildCreditEntries([{ contract, payments }], now)
    const cycleOne = entries.filter((entry) => !entry.label?.startsWith('Cycle 2'))

    expect(cycleOne.map((entry) => entry.label)).toEqual([1, 2, 3, 4, 5].map((month) => `Échéance ${month}`))
  })

  it('garde les dix dernières échéances de chaque produit séparément', () => {
    const csContract = { id: 'cs-many', monthlyAmount: 5_000 } as CaisseContract & { id: string }
    const csPayments = Array.from({ length: 12 }, (_, index) => ({
      id: `p-${index}`,
      dueMonthIndex: index,
      dueAt: new Date(2025, index, 1),
      paidAt: new Date(2025, index, 1),
      amount: 5_000,
      status: 'PAID',
    })) as ContractPayment[]
    const ciContract = {
      id: 'ci-old',
      paymentFrequency: 'MONTHLY',
      firstPaymentDate: '2024-01-01',
      subscriptionCIDuration: 2,
      subscriptionCIAmountPerMonth: 10_000,
    } as ContractCI

    const summary = buildCompleteMemberFormSummary({
      memberId: 'member-1',
      caisseSpeciale: [{ contract: csContract, payments: csPayments }],
      caisseImprevue: [{ contract: ciContract, payments: [] }],
      credits: [],
      now: NOW,
    })

    // Plus anciennes que les douze échéances CS, les échéances CI auraient
    // été évincées par une bande fusionnée.
    expect(summary.products.map((product) => product.product)).toEqual([
      'Caisse Spéciale',
      'Caisse Imprévue',
    ])
    const [cs, ci] = summary.products
    expect(cs.entries).toHaveLength(10)
    expect(cs.onTimeCount).toBe(10)
    expect(cs.punctualityRate).toBe(1)
    expect(ci.entries).toHaveLength(2)
    expect(ci.missedCount).toBe(2)
    expect(ci.punctualityRate).toBe(0)
  })
})
