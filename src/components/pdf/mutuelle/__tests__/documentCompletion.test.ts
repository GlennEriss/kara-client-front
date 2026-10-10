import { describe, expect, it } from 'vitest'

import { listCaisseSpecialeContractFields } from '@/components/caisse-speciale/CaisseSpecialePDFV3'
import { listCaisseSpecialeLiquidationFields } from '@/components/contract/QuittanceCaisseSpecialePDF'
import {
  EMPTY,
  documentPlace,
  field,
  fullNameFrom,
  missingDocumentFields,
  readField,
} from '../MutuelleDocumentKit'

describe('complétion des documents', () => {
  it('le lieu saisi remplace Owendo, lieu par défaut', () => {
    expect(documentPlace(null)).toBe('Owendo')
    expect(documentPlace({ place: '  ', values: {} })).toBe('Owendo')
    expect(documentPlace({ place: 'Libreville', values: {} })).toBe('Libreville')
  })

  it('la saisie l’emporte sur la donnée, et les dates saisies sont mises en forme', () => {
    const email = field('member.email', 'Email :', '')
    const birthDate = field('member.birthDate', 'Date de naissance :', '', 'date')
    const completion = { place: '', values: { 'member.email': 'a@b.ga', 'member.birthDate': '1990-05-04' } }

    expect(readField(email, null)).toBe('')
    expect(readField(email, completion)).toBe('a@b.ga')
    expect(readField(birthDate, completion)).toBe('04/05/1990')
    expect(readField(field('member.firstName', 'Prénom(s) :', 'Alicia'), completion)).toBe('Alicia')
  })

  it('ne propose que les champs absents, une seule fois chacun', () => {
    const fields = [field('a', 'A', 'x'), field('b', 'B', ''), field('b', 'B', ''), field('c', 'C', '  ')]
    expect(missingDocumentFields(fields).map((item) => item.key)).toEqual(['b', 'c'])
  })

  it('compose le nom sans reprendre les pointillés d’un champ vide', () => {
    expect(fullNameFrom('mengue', 'Alicia')).toBe('MENGUE Alicia')
    expect(fullNameFrom(EMPTY, 'Alicia')).toBe('Alicia')
  })

  it('liste les informations manquantes du contrat Caisse Spéciale', () => {
    const missing = missingDocumentFields(
      listCaisseSpecialeContractFields({
        id: 'MK_CSP_1',
        caisseType: 'STANDARD',
        monthlyAmount: 150_000,
        monthsPlanned: 12,
        contractStartAt: '2026-04-22',
        createdAt: '2026-04-20',
        member: { lastName: 'Mengue', firstName: 'Alicia', matricule: '7425', contacts: ['066'] },
      }),
    ).map((item) => item.key)

    expect(missing).toEqual(
      expect.arrayContaining(['member.email', 'member.birth', 'member.identityDocumentIssuingDate', 'emergency.lastName']),
    )
    expect(missing).not.toContain('member.fullName')
    expect(missing).not.toContain('signedAt')
  })

  it('demande le mode et la date du règlement quand le remboursement ne les porte pas', () => {
    const missing = missingDocumentFields(
      listCaisseSpecialeLiquidationFields({
        contract: { id: 'MK_CSP_1', member: { lastName: 'Mengue', firstName: 'Alicia' } },
        refund: { type: 'FINAL', status: 'PAID', amountNominal: 100_000 },
      }),
    ).map((item) => item.key)

    expect(missing).toEqual(expect.arrayContaining(['refund.paymentMode', 'refund.paidDate']))
  })
})
