import { describe, expect, it } from 'vitest'
import { buildCreditTimeline } from '../credit-timeline'
import type { CreditContract, CreditPayment } from '@/types/types'
const contract = {
  id: 'C1',
  creditType: 'FIXE',
  status: 'ACTIVE',
  amount: 50000,
  totalAmount: 50000,
  monthlyPaymentAmount: 3571,
  interestRate: 0,
  duration: 14,
  firstPaymentDate: new Date('2026-05-03T12:00:00Z'),
  createdAt: new Date('2026-05-03T12:00:00Z'),
} as CreditContract
const payment = {
  id: 'M1_test',
  creditId: 'C1',
  amount: 3571,
  paymentDate: new Date('2026-05-04T12:00:00Z'),
} as CreditPayment
describe('historique partagé du crédit fixe', () => {
  it('affiche le premier mois et ne capitalise pas des intérêts récurrents', () => {
    expect(buildCreditTimeline(contract, [])).toHaveLength(1)
    expect(buildCreditTimeline(contract, [])[0]).toMatchObject({
      cycleNumber: 1,
      month: 1,
      capitalStart: 50000,
      interest: 0,
      expectedPayment: 3571,
      status: 'DUE',
    })
  })
  it('déduit les encaissements réels et exclut les paiements de pénalités seules', () => {
    const rows = buildCreditTimeline(contract, [
      payment,
      {
        ...payment,
        id: 'M2_penalty',
        amount: 0,
        comment: 'Paiement de pénalités uniquement',
      },
    ])
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      actualPayment: 3571,
      nextCapitalActual: 46429,
      status: 'PAID',
    })
  })
  it('préserve le traitement aide du site sans créer un historique de crédit renouvelable', () => {
    expect(
      buildCreditTimeline({ ...contract, creditType: 'AIDE' }, [payment]),
    ).toEqual([])
  })
})
