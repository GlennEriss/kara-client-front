import { describe, expect, it } from 'vitest'
import { groupGuarantorName, isGroupGuarantor, isIdentifiedGroupMember } from '../group-guarantor'
import { UNKNOWN_USER_ID, buildUnknownUserBase } from '@/domains/financial/caisse-imprevue/import/unknownUser'
import type { User } from '@/types/types'

describe('garant du groupe', () => {
  it('accepte le compte INCONNU existant comme garantie de LE KARA, sans le considérer comme emprunteur', () => {
    const member = buildUnknownUserBase() as Partial<User> & { id: string }
    expect(isGroupGuarantor(member)).toBe(true)
    expect(isIdentifiedGroupMember(member)).toBe(false)
    expect(groupGuarantorName(member)).toBe('INCONNU — LE KARA')
  })
  it('accepte un membre identifié et refuse un compte admin ou un faux compte INCONNU', () => {
    expect(isGroupGuarantor({ id: 'alice', lastName: 'Ondo', roles: ['Adherant'] })).toBe(true)
    expect(isGroupGuarantor({ id: 'admin', lastName: 'Admin', roles: ['Admin'] })).toBe(false)
    expect(isGroupGuarantor({ id: 'copie', matricule: UNKNOWN_USER_ID, lastName: 'INCONNU', roles: ['Adherant'] })).toBe(false)
    expect(isGroupGuarantor({ id: 'invalide' })).toBe(false)
  })
})
