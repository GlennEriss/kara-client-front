/**
 * Tests unitaires pour formatIntermediaryDisplay
 * 
 * @see documentation/memberships/V2/form-membership/code-entremetteur/tests/README.md
 */

import { describe, it, expect } from 'vitest'
import { formatIntermediaryDisplay, extractIntermediaryCode } from '../../../utils/formatIntermediaryDisplay'
import type { User } from '@/types/types'

describe('formatIntermediaryDisplay', () => {
  it('UNIT-FORMAT-01: devrait formater "Nom Prénom (Code)"', () => {
    const member: User = {
      id: '1234.MK.567890',
      matricule: '1234.MK.567890',
      firstName: 'Jean',
      lastName: 'Dupont',
      birthDate: '1990-01-01',
      contacts: [],
      gender: 'M',
      nationality: 'Gabonais',
      hasCar: false,
      subscriptions: [],
      dossier: 'dossier-1',
      membershipType: 'adherant',
      roles: ['Adherant'],
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
    }
    
    expect(formatIntermediaryDisplay(member)).toBe('Dupont Jean (1234.MK.567890)')
  })

  it('UNIT-FORMAT-02: devrait gérer l\'ordre Nom Prénom', () => {
    const member: User = {
      id: '1234.MK.567890',
      matricule: '1234.MK.567890',
      firstName: 'Jean-Pierre',
      lastName: 'NDONG',
      birthDate: '1990-01-01',
      contacts: [],
      gender: 'M',
      nationality: 'Gabonais',
      hasCar: false,
      subscriptions: [],
      dossier: 'dossier-1',
      membershipType: 'adherant',
      roles: ['Adherant'],
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
    }
    
    expect(formatIntermediaryDisplay(member)).toBe('NDONG Jean-Pierre (1234.MK.567890)')
  })

  it('UNIT-FORMAT-03: devrait gérer le code manquant', () => {
    const member: User = {
      id: '1234.MK.567890',
      matricule: '',
      firstName: 'Jean',
      lastName: 'Dupont',
      birthDate: '1990-01-01',
      contacts: [],
      gender: 'M',
      nationality: 'Gabonais',
      hasCar: false,
      subscriptions: [],
      dossier: 'dossier-1',
      membershipType: 'adherant',
      roles: ['Adherant'],
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
    }
    
    expect(formatIntermediaryDisplay(member)).toBe('Dupont Jean')
  })

  it('UNIT-FORMAT-04: devrait gérer les caractères spéciaux et accents', () => {
    const member: User = {
      id: '1234.MK.567890',
      matricule: '1234.MK.567890',
      firstName: 'José',
      lastName: 'D\'Angelo',
      birthDate: '1990-01-01',
      contacts: [],
      gender: 'M',
      nationality: 'Gabonais',
      hasCar: false,
      subscriptions: [],
      dossier: 'dossier-1',
      membershipType: 'adherant',
      roles: ['Adherant'],
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
    }
    
    expect(formatIntermediaryDisplay(member)).toBe('D\'Angelo José (1234.MK.567890)')
  })

  it('UNIT-FORMAT-05: devrait gérer le prénom manquant', () => {
    const member: User = {
      id: '1234.MK.567890',
      matricule: '1234.MK.567890',
      firstName: '',
      lastName: 'Dupont',
      birthDate: '1990-01-01',
      contacts: [],
      gender: 'M',
      nationality: 'Gabonais',
      hasCar: false,
      subscriptions: [],
      dossier: 'dossier-1',
      membershipType: 'adherant',
      roles: ['Adherant'],
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
    }
    
    expect(formatIntermediaryDisplay(member)).toBe('Dupont (1234.MK.567890)')
  })
})

describe('extractIntermediaryCode', () => {
  it('devrait extraire le matricule', () => {
    const member: User = {
      id: '1234.MK.567890',
      matricule: '1234.MK.567890',
      firstName: 'Jean',
      lastName: 'Dupont',
      birthDate: '1990-01-01',
      contacts: [],
      gender: 'M',
      nationality: 'Gabonais',
      hasCar: false,
      subscriptions: [],
      dossier: 'dossier-1',
      membershipType: 'adherant',
      roles: ['Adherant'],
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
    }
    
    expect(extractIntermediaryCode(member)).toBe('1234.MK.567890')
  })

  it('devrait retourner une chaîne vide si matricule manquant', () => {
    const member: User = {
      id: '1234.MK.567890',
      matricule: '',
      firstName: 'Jean',
      lastName: 'Dupont',
      birthDate: '1990-01-01',
      contacts: [],
      gender: 'M',
      nationality: 'Gabonais',
      hasCar: false,
      subscriptions: [],
      dossier: 'dossier-1',
      membershipType: 'adherant',
      roles: ['Adherant'],
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
    }
    
    expect(extractIntermediaryCode(member)).toBe('')
  })
})
