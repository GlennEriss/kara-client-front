import { describe, it, expect } from 'vitest'
import type { CreditContract, CreditPayment } from '@/types/types'
import { creditPaymentTimingMap } from '../credit-payment-timing'
import {
  getInstallmentPunctuality,
  getPaymentPunctuality,
} from '../credit-payment-punctuality'
import { buildCreditTimeline } from '../credit-timeline'
const contract = {
  id: 'C',
  creditType: 'FIXE',
  amount: 30000,
  totalAmount: 30000,
  monthlyPaymentAmount: 10000,
  interestRate: 0,
  duration: 3,
  firstPaymentDate: new Date('2026-09-10T12:00:00'),
  createdAt: new Date('2026-08-10T12:00:00'),
} as CreditContract
const pay = (id: string, date: string, amount = 10000, extra = {}) =>
  ({
    id,
    creditId: 'C',
    paymentDate: new Date(date),
    paymentTime: '10:32',
    amount,
    ...extra,
  }) as CreditPayment

describe('ponctualité commune aux trois crédits', () => {
  it.each(['SPECIALE', 'FIXE', 'AIDE'] as const)(
    'compare chaque versement %s à sa propre échéance',
    (creditType) => {
      const payments = [
        pay('M1_early', '2026-09-08T10:32:00'),
        pay('M2_grace', '2026-10-12T10:32:00'),
        pay('M3_late', '2026-11-16T10:32:00'),
      ]
      const rows = creditPaymentTimingMap({ ...contract, creditType }, payments)
      expect(rows.get('M1_early')?.punctuality).toMatchObject({
        kind: 'ON_TIME',
        label: 'À temps',
      })
      expect(rows.get('M2_grace')?.punctuality).toMatchObject({
        kind: 'GRACE',
        daysLate: 2,
        label: 'Retard toléré (2 j)',
      })
      expect(rows.get('M3_late')?.punctuality).toMatchObject({
        kind: 'LATE',
        daysLate: 6,
        label: 'En retard (6 j)',
      })
      expect(rows.get('M3_late')?.dueDate?.getDate()).toBe(10)
    },
  )
  it('conserve séparément deux versements du même mois et leurs dates dans l’historique fixe', () => {
    const early = pay('M1_a', '2026-09-09T10:32:00', 4000),
      late = pay('M1_b', '2026-09-16T14:22:00', 6000, { paymentTime: '14:22' })
    const rows = creditPaymentTimingMap(contract, [late, early])
    expect(rows.get(early.id)?.punctuality?.kind).toBe('ON_TIME')
    expect(rows.get(late.id)?.punctuality?.kind).toBe('LATE')
    expect(buildCreditTimeline(contract, [late, early])[0]).toMatchObject({
      actualPayment: 10000,
      paymentDate: early.paymentDate,
      paymentTime: '10:32',
    })
  })
  it('distingue la déclaration à zéro des pénalités seules', () => {
    const zero = pay('M1_zero', '2026-09-16', 0),
      penalty = pay('M2_penalty', '2026-10-16', 0, {
        comment: 'Paiement de pénalités uniquement',
      })
    const rows = creditPaymentTimingMap(contract, [zero, penalty])
    expect(rows.get(zero.id)?.punctuality?.kind).toBe('NO_PAYMENT')
    expect(rows.get(penalty.id)?.punctuality).toBeNull()
    expect(rows.get(penalty.id)?.dueDate).toBeNull()
  })
  it('ne déclare pas à temps une date absente ou invalide', () => {
    expect(getPaymentPunctuality('2026-09-10', 'invalide').kind).toBe('UNKNOWN')
    expect(
      getInstallmentPunctuality({
        date: '2026-09-10',
        status: 'PAID',
        actualPayment: 10000,
      }).kind,
    ).toBe('UNKNOWN')
    const rows = creditPaymentTimingMap(
      { ...contract, firstPaymentDate: new Date('invalide') },
      [pay('M1_old', '2026-09-11')],
      [],
    )
    expect(rows.get('M1_old')).toMatchObject({
      dueDate: null,
      punctuality: { kind: 'UNKNOWN' },
    })
  })
  it('repart sur le bon cycle après augmentation', () => {
    const cycles = [
      {
        cycleNumber: 1,
        type: 'INITIAL',
        ...contract,
        firstPaymentDate: new Date('2026-09-10'),
      },
      {
        cycleNumber: 2,
        type: 'AUGMENTATION',
        ...contract,
        firstPaymentDate: new Date('2026-12-05'),
        startedAt: new Date('2026-11-05'),
      },
    ]
    const row = creditPaymentTimingMap(
      { ...contract, creditCycles: cycles } as unknown as CreditContract,
      [pay('C2_M1_pay', '2026-12-09')],
    ).get('C2_M1_pay')
    expect(row?.dueDate?.getMonth()).toBe(11)
    expect(row?.punctuality).toMatchObject({ kind: 'LATE', daysLate: 4 })
  })
  it('utilise le rythme hebdomadaire existant pour une échéance en semaines', () => {
    const row = creditPaymentTimingMap({ ...contract, durationUnit: 'WEEKS' }, [
      pay('M2_week', '2026-09-20'),
    ]).get('M2_week')
    expect(row?.dueDate?.getDate()).toBe(17)
    expect(row?.punctuality).toMatchObject({ kind: 'GRACE', daysLate: 3 })
  })
})
