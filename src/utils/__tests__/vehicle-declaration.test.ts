import { describe, expect, it } from 'vitest'
import type { VehicleInsurance } from '@/types/types'
import { diffVehicleDeclaration, summarizeCorrections } from '../vehicle-declaration'

const declared = {
  plateNumber: 'ab-123-cd',
  vehicleType: 'car',
  insuranceCompany: 'Assur Plus',
  policyNumber: 'POL-001',
  premiumAmount: 150000,
  startDate: new Date('2026-10-01T00:00:00Z'),
  endDate: new Date('2027-10-01T00:00:00Z'),
} as Partial<VehicleInsurance>

describe('diffVehicleDeclaration', () => {
  it('ne signale rien quand seules la casse ou les espaces changent', () => {
    expect(diffVehicleDeclaration(declared, { plateNumber: ' AB-123-CD ', premiumAmount: 150000 })).toEqual([])
  })

  it('liste les champs corrigés avec la valeur déclarée et la valeur retenue', () => {
    const corrections = diffVehicleDeclaration(declared, {
      policyNumber: 'POL-009',
      premiumAmount: 175000,
      endDate: new Date('2027-09-30T00:00:00Z'),
      vehicleType: 'truck',
    })
    expect(corrections.map((c) => c.label)).toEqual(['Type de véhicule', 'N° de police', 'Prime', 'Date de fin'])
    expect(corrections[0]).toMatchObject({ declared: 'Voiture', retained: 'Camion' })
    expect(corrections[2].retained).toContain('175')
  })

  it('ignore les champs absents du formulaire retenu', () => {
    expect(diffVehicleDeclaration(declared, {})).toEqual([])
  })

  it('résume les corrections pour le membre', () => {
    expect(summarizeCorrections([{ field: 'policyNumber', label: 'N° de police', declared: 'POL-001', retained: 'POL-009' }])).toBe(
      'N° de police : POL-001 → POL-009',
    )
  })
})
