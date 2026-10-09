import { describe, expect, it } from 'vitest'
import {
  CONTRACT_LOCKED_MESSAGE,
  assertContractUnlocked,
  isCaisseImprevueContractLocked,
  isCaisseSpecialeContractLocked,
  isCreditContractLocked,
  isPlacementLocked,
} from '@/utils/contract-lock'

describe('verrouillage des contrats terminés ou résiliés', () => {
  it('caisse spéciale : clôturé ou résilié', () => {
    expect(isCaisseSpecialeContractLocked('CLOSED')).toBe(true)
    expect(isCaisseSpecialeContractLocked('RESCINDED')).toBe(true)
    expect(isCaisseSpecialeContractLocked('FINAL_REFUND_PENDING')).toBe(false)
    expect(isCaisseSpecialeContractLocked('ACTIVE')).toBe(false)
  })

  it('caisse imprévue : terminé ou annulé', () => {
    expect(isCaisseImprevueContractLocked('FINISHED')).toBe(true)
    expect(isCaisseImprevueContractLocked('CANCELED')).toBe(true)
    expect(isCaisseImprevueContractLocked('ACTIVE')).toBe(false)
  })

  it('crédit : soldé, clos, en perte, transformé ou remplacé', () => {
    for (const status of ['DISCHARGED', 'CLOSED', 'WRITTEN_OFF', 'TRANSFORMED', 'EXTENDED']) {
      expect(isCreditContractLocked(status)).toBe(true)
    }
    expect(isCreditContractLocked('ACTIVE')).toBe(false)
    expect(isCreditContractLocked('PARTIAL')).toBe(false)
    expect(isCreditContractLocked(undefined)).toBe(false)
  })

  it('placement : clôturé, sorti par anticipation ou annulé', () => {
    expect(isPlacementLocked('Closed')).toBe(true)
    expect(isPlacementLocked('EarlyExit')).toBe(true)
    expect(isPlacementLocked('Canceled')).toBe(true)
    expect(isPlacementLocked('Active')).toBe(false)
    expect(isPlacementLocked('Draft')).toBe(false)
  })

  it('lève le message standard', () => {
    expect(() => assertContractUnlocked(true)).toThrow(CONTRACT_LOCKED_MESSAGE)
    expect(() => assertContractUnlocked(false)).not.toThrow()
  })
})
