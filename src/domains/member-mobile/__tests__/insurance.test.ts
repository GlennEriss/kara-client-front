// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { insuranceAssetSettingsId } from '@/domains/vehicles/asset-types'
import {
  createMemberProspect,
  declareMemberInsurance,
  memberInsurance,
} from '../server/insurance'
import { memberCaller as caller, memoryDb } from './memory-db'

const geography = {
  'communes/C1': { name: 'Libreville', departmentId: 'D1' },
  'departments/D1': { name: 'Libreville', provinceId: 'PR1' },
  'provinces/PR1': { name: 'Estuaire' },
}

const location = {
  communeId: 'C1',
  city: 'Libreville',
  locationType: 'other',
  locationDetails: 'Atelier',
  plateNumber: 'ABC-123',
}
const policy = {
  ...location,
  vehicleType: 'other',
  vehicleDescription: 'Atelier',
  insuranceCompany: 'Assureur',
  policyNumber: '1234',
  warrantyMonths: 12,
  premiumAmount: 25000,
  startDate: '2026-11-15',
  endDate: '2027-11-15',
}

describe('assurances et prospections membre', () => {
  it('transmet une déclaration au nom de la session et alerte l’administrateur', async () => {
    const { db, records, writes } = memoryDb({
      ...geography,
      'vehicle-insurances/SECRET': { memberId: 'AUTRE', plateNumber: 'SECRET' },
    })
    await expect(
      declareMemberInsurance(db, caller, { ...policy, memberId: 'AUTRE' }),
    ).rejects.toMatchObject({ status: 400 })
    expect(writes).toHaveLength(0)
    const result = await declareMemberInsurance(db, caller, policy)
    expect(records.get(`vehicle-insurances/${result.id}`)).toMatchObject({
      memberId: caller.matricule,
      declarationStatus: 'pending',
      province: 'Estuaire',
      declaredValues: { plateNumber: 'ABC-123' },
    })
    expect(
      [...records.values()].find((row) => row.type === 'vehicle_declared'),
    ).toMatchObject({ entityId: result.id, isRead: false })
    expect(
      (await memberInsurance(db, caller)).insurance.map((row) => row.id),
    ).toEqual([result.id])
  })

  it('refuse un type retiré dans la déclaration et la prospection', async () => {
    const { db, writes } = memoryDb({
      ...geography,
      [`settings/${insuranceAssetSettingsId}`]: {
        values: [],
        inactive: ['car'],
      },
    })
    await expect(
      declareMemberInsurance(db, caller, { ...policy, vehicleType: 'car' }),
    ).rejects.toThrow('plus disponible')
    await expect(
      createMemberProspect(db, caller, {
        ...location,
        vehicleType: 'car',
        ownerName: 'Contact',
        phone: '066000000',
        insuranceCompany: 'Assureur',
        endDate: '2027-11-15',
      }),
    ).rejects.toThrow('plus disponible')
    expect(writes).toHaveLength(0)
    expect(
      (await memberInsurance(db, caller)).types.map((option) => option.value),
    ).not.toContain('car')
  })
})
