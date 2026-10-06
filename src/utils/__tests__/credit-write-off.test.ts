import { describe, expect, it } from 'vitest'
import {
  buildWriteOffAmounts,
  canWriteOffContract,
  computeWriteOffLoss,
  isCreditContractEnded,
} from '../credit-write-off'
import type { CreditRecovery, CreditWriteOff } from '@/types/types'

const writeOff: CreditWriteOff = {
  writtenOffAt: new Date('2026-10-01'),
  writtenOffBy: 'admin',
  motif: 'Membre injoignable depuis 4 mois',
  amountRemaining: 300000,
  unpaidPenalties: 15000,
  guarantorCommissionCancelled: 6000,
}
const recovery = (amount: number): CreditRecovery => ({
  id: `R${amount}`,
  amount,
  date: new Date('2026-10-05'),
  mode: 'cash',
  recordedBy: 'admin',
  recordedAt: new Date('2026-10-05'),
})

describe('credit-write-off', () => {
  it('considère un contrat clôturé en perte comme terminé', () => {
    expect(isCreditContractEnded('WRITTEN_OFF')).toBe(true)
    expect(isCreditContractEnded('DISCHARGED')).toBe(true)
    expect(isCreditContractEnded('OVERDUE')).toBe(false)
  })

  it('ne clôture en perte qu’un contrat en cours avec un reste à payer', () => {
    expect(canWriteOffContract({ status: 'OVERDUE', amountRemaining: 1000 })).toBe(true)
    expect(canWriteOffContract({ status: 'BLOCKED', amountRemaining: 1000 })).toBe(true)
    expect(canWriteOffContract({ status: 'ACTIVE', amountRemaining: 0 })).toBe(false)
    expect(canWriteOffContract({ status: 'DISCHARGED', amountRemaining: 1000 })).toBe(false)
    expect(canWriteOffContract({ status: 'WRITTEN_OFF', amountRemaining: 1000 })).toBe(false)
  })

  it('arrondit les montants et ne garde jamais de négatif', () => {
    expect(buildWriteOffAmounts({ amountRemaining: 1000.4, unpaidPenalties: -5, guarantorCommissionDue: 99.6 })).toEqual({
      amountRemaining: 1000,
      unpaidPenalties: 0,
      guarantorCommissionCancelled: 100,
    })
  })

  it('calcule la perte nette après récupérations', () => {
    expect(computeWriteOffLoss({ writeOff })).toEqual({ gross: 315000, recovered: 0, net: 315000 })
    expect(computeWriteOffLoss({ writeOff, writeOffRecoveries: [recovery(50000), recovery(15000)] })).toEqual({
      gross: 315000,
      recovered: 65000,
      net: 250000,
    })
    expect(computeWriteOffLoss({ writeOff, writeOffRecoveries: [recovery(400000)] }).net).toBe(0)
  })
})
