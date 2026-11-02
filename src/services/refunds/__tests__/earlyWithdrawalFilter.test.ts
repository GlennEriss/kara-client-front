import { describe, expect, it } from 'vitest'
import { matchesEarlyWithdrawalFilter } from '@/domains/financial/refunds/earlyWithdrawalFilter'

describe('matchesEarlyWithdrawalFilter', () => {
  it.each(['PENDING', 'APPROVED'])('classe %s comme retrait en cours', (status) => {
    expect(matchesEarlyWithdrawalFilter({ type: 'EARLY', status }, 'IN_PROGRESS', 'CS')).toBe(true)
  })

  it('classe PAID comme retrait finalisé', () => {
    expect(matchesEarlyWithdrawalFilter({ type: 'EARLY', status: 'PAID' }, 'FINALIZED', 'CS')).toBe(true)
  })

  it('exclut les remboursements finaux', () => {
    expect(matchesEarlyWithdrawalFilter({ type: 'FINAL', status: 'PAID' }, 'FINALIZED', 'CI')).toBe(false)
  })

  it('reconnaît les anciens retraits CI sans champ type', () => {
    expect(matchesEarlyWithdrawalFilter({ status: 'PAID' }, 'FINALIZED', 'CI')).toBe(true)
  })

  it('ne suppose pas EARLY pour un ancien remboursement CS sans type', () => {
    expect(matchesEarlyWithdrawalFilter({ status: 'PAID' }, 'FINALIZED', 'CS')).toBe(false)
  })
})
