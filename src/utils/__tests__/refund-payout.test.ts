import { describe, expect, it } from 'vitest'
import {
  canFinalizeEarlyRefundAt,
  earlyRefundPayoutDueAt,
  refundDate,
} from '@/utils/refund-payout'

describe('earlyRefundPayoutDueAt', () => {
  it('fixe la remise à 30 jours après l’approbation', () => {
    const dueAt = earlyRefundPayoutDueAt({ approvedAt: new Date('2026-11-02T10:00:00.000Z') })

    expect(dueAt?.toISOString()).toBe('2026-12-02T10:00:00.000Z')
  })

  it('préfère la date limite enregistrée pour figer l’historique', () => {
    const dueAt = earlyRefundPayoutDueAt({
      approvedAt: new Date('2026-11-02T10:00:00'),
      payoutDueAt: new Date('2026-11-20T12:00:00.000Z'),
    })

    expect(dueAt?.toISOString()).toBe('2026-11-20T12:00:00.000Z')
  })

  it('lit les timestamps Firestore', () => {
    const date = refundDate({ toDate: () => new Date('2026-12-02T10:00:00') })
    expect(date?.getFullYear()).toBe(2026)
  })
})

describe('canFinalizeEarlyRefundAt', () => {
  const refund = { approvedAt: new Date('2026-11-02T10:00:45.000Z') }

  it('bloque un admin avant la fin des 30 jours', () => {
    expect(canFinalizeEarlyRefundAt(refund, false, new Date('2026-12-01T10:00:00.000Z'))).toBe(false)
  })

  it('autorise un admin à partir de la minute d’échéance', () => {
    expect(canFinalizeEarlyRefundAt(refund, false, new Date('2026-12-02T10:00:00.000Z'))).toBe(true)
  })

  it('autorise le superadmin à finaliser avant l’échéance', () => {
    expect(canFinalizeEarlyRefundAt(refund, true, new Date('2026-11-03T10:00:00.000Z'))).toBe(true)
  })

  it('exige le superadmin lorsque la date d’approbation est absente', () => {
    expect(canFinalizeEarlyRefundAt({}, false, new Date('2026-12-02T10:00:00.000Z'))).toBe(false)
    expect(canFinalizeEarlyRefundAt({}, true, new Date('2026-12-02T10:00:00.000Z'))).toBe(true)
  })
})
