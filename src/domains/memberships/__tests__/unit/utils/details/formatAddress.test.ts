import { describe, it, expect } from 'vitest'
import { formatAddress, type AddressFields } from '../../../../utils/details/formatAddress'

describe('formatAddress', () => {
  it('should format complete address with all fields', () => {
    const address: AddressFields = {
      district: 'Quartier A',
      arrondissement: 'Arrondissement B',
      city: 'Ville C',
      province: 'Province D'
    }
    expect(formatAddress(address)).toBe('Quartier A, Arrondissement B, Ville C, Province D')
  })

  it('should format partial address with missing fields', () => {
    const address: AddressFields = {
      district: 'Quartier A',
      city: 'Ville C'
    }
    expect(formatAddress(address)).toBe('Quartier A, Ville C')
  })

  it('should return "Non renseignée" for empty address', () => {
    const address: AddressFields = {}
    expect(formatAddress(address)).toBe('Non renseignée')
  })

  it('should return "Non renseignée" for null', () => {
    expect(formatAddress(null as any)).toBe('Non renseignée')
  })

  it('should ignore additionalInfo in format', () => {
    const address: AddressFields = {
      district: 'Quartier A',
      city: 'Ville C',
      additionalInfo: 'Info complémentaire'
    }
    expect(formatAddress(address)).toBe('Quartier A, Ville C')
  })

  it('should filter out empty strings', () => {
    const address: AddressFields = {
      district: '',
      arrondissement: 'Arrondissement B',
      city: 'Ville C',
      province: ''
    }
    expect(formatAddress(address)).toBe('Arrondissement B, Ville C')
  })
})
