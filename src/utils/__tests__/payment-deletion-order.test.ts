import { describe, expect, it } from 'vitest'
import {
  getCaisseImprevueVersementDeletionBlocker,
  getCaisseSpecialePaymentDeletionBlocker,
  latestCaisseImprevueVersement,
  latestCaisseSpecialePayment,
} from '@/utils/payment-deletion-order'

describe('caisse imprévue : suppression du dernier versement d’abord', () => {
  const payments = [
    { monthIndex: 0, versements: [{ id: 'v1', date: '2026-01-05', time: '10:00' }] },
    {
      monthIndex: 1,
      versements: [
        { id: 'v2', date: '2026-02-03', time: '09:00' },
        { id: 'v3', date: '2026-02-03', time: '15:30' },
      ],
    },
    { monthIndex: 2, versements: [] },
  ]

  it('repère le versement le plus récent du mois le plus avancé', () => {
    expect(latestCaisseImprevueVersement(payments)).toEqual({ monthIndex: 1, versementId: 'v3' })
  })

  it('autorise le dernier, refuse les précédents', () => {
    expect(getCaisseImprevueVersementDeletionBlocker(payments, 1, 'v3')).toBeNull()
    expect(getCaisseImprevueVersementDeletionBlocker(payments, 1, 'v2')).toContain('M2')
    expect(getCaisseImprevueVersementDeletionBlocker(payments, 0, 'v1')).not.toBeNull()
  })
})

describe('caisse spéciale : suppression du dernier versement d’abord', () => {
  it('mensuel : seul le mois payé le plus avancé', () => {
    const payments = [
      { id: 'p0', status: 'PAID', dueMonthIndex: 0, paidAt: new Date('2026-01-05') },
      { id: 'p1', status: 'PAID', dueMonthIndex: 1, paidAt: new Date('2026-02-05') },
      { id: 'p2', status: 'DUE', dueMonthIndex: 2 },
    ]
    expect(latestCaisseSpecialePayment(payments)).toEqual({ paymentId: 'p1' })
    expect(getCaisseSpecialePaymentDeletionBlocker(payments, 'p1')).toBeNull()
    expect(getCaisseSpecialePaymentDeletionBlocker(payments, 'p0')).toContain('M2')
  })

  it('plusieurs contributions : la plus récente seulement', () => {
    const payments = [
      {
        id: 'p0',
        status: 'PAID',
        dueMonthIndex: 0,
        contribs: [
          { id: 'c1', paidAt: new Date('2026-01-02T08:00:00') },
          { id: 'c2', paidAt: new Date('2026-01-03T08:00:00') },
        ],
      },
    ]
    expect(getCaisseSpecialePaymentDeletionBlocker(payments, 'p0', 'c2')).toBeNull()
    expect(getCaisseSpecialePaymentDeletionBlocker(payments, 'p0', 'c1')).toContain('plus récente')
  })
})
