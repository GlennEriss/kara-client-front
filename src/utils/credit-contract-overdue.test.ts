import { describe, expect, it } from 'vitest'
import { isCreditContractOverdue } from './credit-contract-overdue'

describe('isCreditContractOverdue', () => {
  const today = new Date(2026, 10, 22, 12)
  const yesterday = new Date(2026, 10, 21, 20)

  it('compte les échéances dépassées pour les contrats actifs et partiels', () => {
    expect(isCreditContractOverdue({ status: 'ACTIVE', nextDueAt: yesterday }, today)).toBe(true)
    expect(isCreditContractOverdue({ status: 'PARTIAL', nextDueAt: yesterday }, today)).toBe(true)
    expect(yesterday.getHours()).toBe(20)
  })

  it('respecte le jour courant, les clôtures et le statut explicite', () => {
    expect(isCreditContractOverdue({ status: 'ACTIVE', nextDueAt: today }, today)).toBe(false)
    expect(isCreditContractOverdue({ status: 'CLOSED', nextDueAt: yesterday }, today)).toBe(false)
    expect(isCreditContractOverdue({ status: 'OVERDUE' }, today)).toBe(true)
  })
})
