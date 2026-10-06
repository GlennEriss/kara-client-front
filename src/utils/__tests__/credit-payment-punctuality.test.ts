import { describe, expect, it } from 'vitest'
import { getInstallmentPunctuality, getPaymentPunctuality, punctualityLabel } from '../credit-payment-punctuality'

const due = new Date('2026-09-10T00:00:00')

describe('ponctualité des versements', () => {
  it('vert si versé le jour de l’échéance ou avant', () => {
    expect(getPaymentPunctuality(due, new Date('2026-09-10T18:30:00'))).toEqual({ kind: 'ON_TIME', daysLate: 0 })
    expect(getPaymentPunctuality(due, new Date('2026-09-02T09:00:00')).kind).toBe('ON_TIME')
  })

  it('jaune dans les 3 jours de tolérance, orange au-delà', () => {
    expect(getPaymentPunctuality(due, new Date('2026-09-13T10:00:00'))).toEqual({ kind: 'GRACE', daysLate: 3 })
    expect(getPaymentPunctuality(due, new Date('2026-09-14T10:00:00'))).toEqual({ kind: 'LATE', daysLate: 4 })
  })

  it('rouge si l’échéance est passée sans être payée, gris si elle est à venir', () => {
    const today = new Date('2026-09-20T12:00:00')
    expect(getInstallmentPunctuality({ date: due, status: 'DUE' }, today)).toEqual({ kind: 'OVERDUE', daysLate: 10 })
    expect(getInstallmentPunctuality({ date: new Date('2026-10-10'), status: 'FUTURE' }, today).kind).toBe('UPCOMING')
    expect(getInstallmentPunctuality({ date: new Date('2026-09-20'), status: 'DUE' }, today).kind).toBe('UPCOMING')
  })

  it('juge une échéance payée sur la date du versement qui l’a soldée', () => {
    expect(getInstallmentPunctuality({ date: due, status: 'PAID', paymentDate: new Date('2026-09-12') }).kind).toBe('GRACE')
    expect(getInstallmentPunctuality({ date: due, status: 'REST', isRest: true }).kind).toBe('REST')
  })

  it('affiche les jours de retard dans le libellé', () => {
    expect(punctualityLabel('LATE', 6)).toBe('En retard (6 j)')
    expect(punctualityLabel('ON_TIME', 0)).toBe('À temps')
  })
})
