import { describe, expect, it } from 'vitest'
import {
  caisseSpecialeFinalRefundEligibility as cs,
  caisseImprevueFinalRefundEligibility as ci,
  contractTermReached,
  sumCINominalPaid,
} from '../final-refund-policy'
const now = new Date('2026-11-20T12:00:00Z')
const partial = [{ status: 'PARTIAL', accumulatedAmount: 12500 }]
const csContract = {
  status: 'ACTIVE',
  monthsPlanned: 12,
  firstPaymentDate: '2025-11-20',
  caisseType: 'STANDARD',
}
const ciContract = {
  status: 'ACTIVE',
  subscriptionCIDuration: 12,
  firstPaymentDate: '2025-11-20',
  paymentFrequency: 'MONTHLY',
}
describe('remboursement final de caisses au terme', () => {
  it('autorise un contrat CS arrivé à terme avec uniquement un acompte', () => {
    expect(cs(csContract, partial, now)).toMatchObject({
      eligible: true,
      reachedTerm: true,
      fullyPaid: false,
      totalPaid: 12500,
    })
    expect(
      cs(csContract, partial, new Date('2026-11-19T12:00:00Z')).eligible,
    ).toBe(false)
  })
  it('autorise un contrat CI arrivé à terme avec zéro mois soldé', () => {
    expect(ci(ciContract, partial, now)).toMatchObject({
      eligible: true,
      fullyPaid: false,
      totalPaid: 12500,
    })
    expect(
      ci(ciContract, partial, new Date('2026-11-19T12:00:00Z')).eligible,
    ).toBe(false)
  })
  it('utilise le dernier jour du cycle de 30 jours pour les deux caisses journalières', () => {
    const start = '2026-10-22'
    expect(
      cs(
        {
          ...csContract,
          firstPaymentDate: start,
          monthsPlanned: 1,
          caisseType: 'JOURNALIERE',
        },
        partial,
        now,
      ).eligible,
    ).toBe(true)
    expect(
      ci(
        {
          ...ciContract,
          firstPaymentDate: start,
          subscriptionCIDuration: 1,
          paymentFrequency: 'DAILY',
        },
        partial,
        now,
      ).eligible,
    ).toBe(true)
  })
  it('préserve le remboursement d’un échéancier entièrement soldé avant terme', () => {
    const paid = Array.from({ length: 12 }, () => ({
      status: 'PAID',
      amount: 50000,
      targetAmount: 50000,
    }))
    expect(cs(csContract, paid, new Date('2026-10-01')).eligible).toBe(true)
    expect(ci(ciContract, paid, new Date('2026-10-01')).eligible).toBe(true)
  })
  it('ne confond pas un échéancier tronqué avec un contrat intégralement payé', () => {
    const paid = [{ status: 'PAID', amount: 50000, targetAmount: 50000 }]
    expect(cs(csContract, paid, new Date('2026-10-01')).eligible).toBe(false)
    expect(ci(ciContract, paid, new Date('2026-10-01')).eligible).toBe(false)
  })
  it('conserve les verrous de clôture, résiliation et remboursements en cours', () => {
    for (const status of [
      'CLOSED',
      'RESCINDED',
      'FINAL_REFUND_PENDING',
      'EARLY_REFUND_PENDING',
    ])
      expect(cs({ ...csContract, status }, partial, now).eligible).toBe(false)
    for (const status of ['FINISHED', 'CANCELED'])
      expect(ci({ ...ciContract, status }, partial, now).eligible).toBe(false)
    expect(cs(csContract, [], now).eligible).toBe(false)
    expect(ci(ciContract, [], now).eligible).toBe(false)
  })
  it('reconstitue le nominal CI sans doubler le détail et sans ajouter les mensualités non réglées', () => {
    expect(
      sumCINominalPaid([
        {
          status: 'PARTIAL',
          accumulatedAmount: 12500,
          versements: [{ amount: 12500 }],
        },
        { status: 'DUE', targetAmount: 50000 },
        { status: 'PAID', targetAmount: 10000 },
      ]),
    ).toBe(22500)
  })
  it('ouvre le droit dès le jour du terme au Gabon, y compris avant minuit UTC', () => {
    expect(
      contractTermReached(
        new Date('2026-11-19T23:00:00Z'),
        new Date('2026-11-19T23:05:00Z'),
      ),
    ).toBe(true)
    expect(
      contractTermReached(
        new Date('2026-11-19T23:00:00Z'),
        new Date('2026-11-19T22:59:59Z'),
      ),
    ).toBe(false)
  })
  it('conserve un nominal historique connu et utilise le détail dès qu’il est disponible', () => {
    expect(cs({ ...csContract, nominalPaid: 40000 }, [], now)).toMatchObject({
      eligible: true,
      totalPaid: 40000,
    })
    expect(
      cs({ ...csContract, nominalPaid: 40000 }, partial, now),
    ).toMatchObject({ eligible: true, totalPaid: 12500 })
  })

  it('reconstitue aussi les anciennes lignes CI dont le cumul manque ou vaut zéro', () => {
    expect(
      sumCINominalPaid([
        {
          status: 'PARTIAL',
          accumulatedAmount: 0,
          versements: [{ amount: 12500 }],
        },
        { status: 'PAID', accumulatedAmount: 0, targetAmount: 50000 },
        { status: 'DUE', accumulatedAmount: 0, targetAmount: 50000 },
      ]),
    ).toBe(62500)
  })
})
