import { describe, expect, it } from 'vitest'
import type { CreditContract } from '@/types/types'
import { buildCreditSpecialFacturePage1Data } from '../creditSpecialeFactureHelpers'

const contract = { id: 'credit-test', clientId: 'membre-test', clientLastName: 'NOM', clientFirstName: 'PRENOM' } as CreditContract

describe('quartier de la fiche membre dans les PDF de crédit', () => {
  it('affiche le véritable quartier et ignore les informations complémentaires d’import', () => {
    const data = buildCreditSpecialFacturePage1Data(contract, { address: {
      district: '  Akébé  ', city: 'Libreville',
      additionalInfo: 'Département: LIBREVILLE • Entremetteur: PHIL • Solidaire: 5000',
    } })
    expect(data.memberQuarter).toBe('Akébé')
  })

  it('ne présente pas la ville ou les notes comme un quartier manquant', () => {
    expect(buildCreditSpecialFacturePage1Data(contract, { address: {
      district: '', city: 'Libreville', additionalInfo: 'Entremetteur: PHIL',
    } }).memberQuarter).toBe('Non renseigné')
  })

  it('considère un quartier composé d’espaces comme non renseigné', () => {
    expect(buildCreditSpecialFacturePage1Data(contract, { address: { district: '  ' } }).memberQuarter).toBe('Non renseigné')
  })

  it('garde les informations du contrat quand la fiche membre est absente', () => {
    const data = buildCreditSpecialFacturePage1Data(contract, null)
    expect(data.memberQuarter).toBe('Non renseigné')
    expect(data.memberLastName).toBe('NOM')
    expect(data.memberFirstName).toBe('PRENOM')
    expect(data.memberMatricule).toBe('membre-test')
  })
})
