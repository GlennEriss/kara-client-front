import { describe, expect, it } from 'vitest'
import { buildMemberIdentificationRows, formatMemberAddress, formatMemberPhones } from '../memberIdentification'

describe('identification du membre, alignée sur la fiche d’adhésion', () => {
  const rows = buildMemberIdentificationRows({
    lastName: 'Mba',
    firstName: 'Awa',
    birthDate: new Date('1990-03-12'),
    birthPlace: 'Libreville',
    identityDocumentNumber: 'CNI-123',
    identityDocumentIssuingDate: new Date('2020-01-15'),
    address: { district: 'Akébé', city: 'Libreville', province: 'Estuaire' },
    contacts: ['074000000'],
    whatsappNumber: '066000000',
    email: 'awa@mail.ga',
    profession: 'Comptable',
    companyName: 'SEEG',
  })

  it('reprend les rubriques et l’ordre de la section 1 de la fiche', () => {
    expect(rows.flat().map((f) => f.label)).toEqual([
      'Nom(s) et Prénom(s) :',
      'Date et Lieu de Naissance :',
      'N° CNI/Passeport :',
      'Délivré(e) le :',
      'Adresse / Quartier :',
      'Téléphone / WhatsApp :',
      'Email :',
      'Profession / Employeur :',
    ])
  })

  it('met en forme comme la fiche', () => {
    const values = Object.fromEntries(rows.flat().map((f) => [f.key, f.value]))
    expect(values['member.fullName']).toBe('MBA Awa')
    expect(values['member.birth']).toBe('12/03/1990 à LIBREVILLE')
    expect(values['member.identityDocumentIssuingDate']).toBe('15/01/2020')
    expect(values['member.address']).toBe('Akébé, Libreville, Estuaire')
    expect(values['member.phones']).toBe('074000000 / 066000000')
    expect(values['member.profession']).toBe('Comptable / SEEG')
  })

  it('n’ajoute pas deux fois le même numéro', () => {
    expect(formatMemberPhones(['074'], '074')).toBe('074')
    expect(formatMemberAddress('Owendo')).toBe('Owendo')
  })
})
