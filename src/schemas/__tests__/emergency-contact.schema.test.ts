import { describe, expect, it } from 'vitest'
import { emergencyContactSchema } from '@/schemas/emergency-contact.schema'

const complete = {
  lastName: 'Ndong',
  firstName: 'Paul',
  phone1: '+24177898909',
  phone2: '',
  relationship: 'Frère',
  typeId: 'CNI',
  idNumber: '123',
  documentPhotoUrl: 'https://exemple.ga/cni.jpg',
}

describe('contact d’urgence de la caisse spéciale', () => {
  it('accepte un contact complet', () => {
    expect(emergencyContactSchema.safeParse(complete).success).toBe(true)
  })

  it('accepte le membre INCONNU choisi dans la recherche, sans lien ni pièce', () => {
    const result = emergencyContactSchema.safeParse({
      memberId: 'id-du-membre-inconnu',
      lastName: 'INCONNU',
      firstName: '',
      phone1: '',
      relationship: '',
      typeId: '',
      idNumber: '',
      documentPhotoUrl: '',
    })
    expect(result.success).toBe(true)
  })

  it('accepte la fiche INCONNU(E) INCONNU(E) avec son téléphone', () => {
    const result = emergencyContactSchema.safeParse({
      memberId: '2548.MK.290126',
      lastName: 'INCONNU(E)',
      firstName: 'INCONNU(E)',
      phone1: '066000000',
      relationship: '',
      typeId: '',
      idNumber: '',
      documentPhotoUrl: '',
    })
    expect(result.success).toBe(true)
  })

  it('refuse encore les caractères spéciaux pour un contact ordinaire', () => {
    expect(emergencyContactSchema.safeParse({ ...complete, lastName: 'Nd0ng!' }).success).toBe(false)
  })

  it('signale les champs manquants d’un contact ordinaire', () => {
    const result = emergencyContactSchema.safeParse({ ...complete, relationship: '', documentPhotoUrl: '' })
    expect(result.success).toBe(false)
    const fields = result.success ? [] : result.error.issues.map((issue) => issue.path[0])
    expect(fields).toEqual(expect.arrayContaining(['relationship', 'documentPhotoUrl']))
  })
})
