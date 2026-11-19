import { describe, expect, it } from 'vitest'
import { presentCreditInstallments } from '../server/credit-schedule-presentation'
import { computeCreditInstallments } from '@/utils/credit-installments'
import type { CreditContract, CreditPayment } from '@/types/types'
const contract = {
  id: 'C1',
  creditType: 'SPECIALE',
  status: 'PARTIAL',
  amount: 250000,
  monthlyPaymentAmount: 100000,
  interestRate: 10,
  totalAmount: 301925,
  duration: 4,
  firstPaymentDate: new Date('2026-05-03T12:00:00Z'),
  createdAt: new Date('2026-05-03T12:00:00Z'),
} as CreditContract
const payment = {
  id: 'M1_test',
  amount: 100000,
  paymentDate: new Date('2026-05-05T12:00:00Z'),
  paymentTime: '12:31',
  mode: 'airtel_money',
  modificationReason: 'Date rectifiée',
} as CreditPayment
describe('cartes d’échéances des crédits natifs', () => {
  it('préserve l’instant enregistré pour ne pas décaler les versements proches de minuit', () => {
    const source = {
        ...payment,
        paymentDate: new Date('2026-05-05T22:30:00Z'),
      },
      civil = { ...source, paymentDate: new Date('2026-05-05T23:30:00Z') }
    const rows = presentCreditInstallments(
      contract,
      [civil],
      computeCreditInstallments(contract, [civil]),
      [source],
    )
    expect(rows[0].recordedPayments[0].date).toEqual(source.paymentDate)
  })
  it('présente capital, global et intérêts comme le site sans inventer de versement futur', () => {
    const rows = presentCreditInstallments(
      contract,
      [payment],
      computeCreditInstallments(contract, [payment]),
    )
    expect(rows[0]).toMatchObject({
      capitalAmount: 250000,
      globalAmount: 275000,
      interestAmount: 25000,
      paidAmount: 100000,
      paymentIds: ['M1_test'],
    })
    expect(rows[0].recordedPayments[0]).toMatchObject({
      time: '12:31',
      mode: 'airtel_money',
      modificationReason: 'Date rectifiée',
    })
    expect(rows[1]).toMatchObject({
      capitalAmount: 175000,
      globalAmount: 192500,
      interestAmount: 17500,
      recordedPayments: [],
    })
  })
  it.each(['FIXE', 'AIDE'] as const)(
    'garde l’intérêt unique du crédit %s et le montant global restant',
    (creditType) => {
      const simple = {
        ...contract,
        creditType,
        amount: 50000,
        totalAmount: 50000,
        monthlyPaymentAmount: 3571,
        duration: 14,
        interestRate: 0,
      }
      const rows = presentCreditInstallments(
        simple,
        [],
        computeCreditInstallments(simple, []),
      )
      expect(rows[0]).toMatchObject({
        capitalAmount: null,
        globalAmount: 50000,
        interestAmount: 0,
        totalAmount: 3571,
      })
      expect(rows[1].globalAmount).toBe(46429)
      expect(rows.at(-1)?.totalAmount).toBe(3577)
    },
  )
  it('exclut les paiements de pénalités des reçus de mensualité', () => {
    const rows = presentCreditInstallments(
      contract,
      [
        {
          ...payment,
          id: 'M1_penalty',
          amount: 0,
          comment: 'Paiement de pénalités uniquement',
        },
      ],
      computeCreditInstallments(contract, []),
    )
    expect(rows[0].recordedPayments).toEqual([])
    expect(rows[0].paymentIds).toEqual([])
  })
})

it.each(['SPECIALE', 'FIXE', 'AIDE'] as const)(
  'transmet date réelle et ponctualité des versements %s sans décaler les instants',
  (creditType) => {
    const c = { ...contract, creditType }
    const civil = { ...payment, paymentDate: new Date('2026-05-06T00:30:00Z') }
    const source = { ...payment, paymentDate: new Date('2026-05-05T23:30:00Z') }
    const rows = presentCreditInstallments(
      c,
      [civil],
      computeCreditInstallments(c, [civil]),
      [source],
    )
    expect(rows[0].recordedPayments[0]).toMatchObject({
      date: source.paymentDate,
      time: '12:31',
      punctuality: { kind: 'GRACE', daysLate: 3, label: 'Retard toléré (3 j)' },
    })
    expect(rows[0].recordedPayments[0].dueDate?.getUTCDate()).toBe(3)
  },
)
