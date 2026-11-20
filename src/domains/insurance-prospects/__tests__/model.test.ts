import { describe, expect, it } from 'vitest'
import {
  prospectSchema,
  daysToExpiry,
  reminderStage,
  prospectPhase,
} from '../model'
import { prospectReminderStage } from '../../../../functions/src/scheduled/insuranceProspects'

export const validInput = {
  ownerName: 'Contact fictif',
  phone: '077000000',
  plateNumber: 'ab-123-cd',
  vehicleType: 'car' as const,
  city: 'Libreville',
  locationType: 'quarter' as const,
  quarter: 'Awendjé',
  insuranceCompany: 'Assureur externe',
  endDate: '2026-12-20',
}
describe('prospection assurance', () => {
  it('valide une prospection sans demander une police ou une prime inconnue', () => {
    expect(prospectSchema.parse(validInput)).toMatchObject({
      plateNumber: 'AB-123-CD',
      notes: '',
    })
  })
  it('exige une localisation précise et une description pour un véhicule Autre', () => {
    expect(
      prospectSchema.safeParse({ ...validInput, quarter: '' }).success,
    ).toBe(false)
    expect(
      prospectSchema.safeParse({ ...validInput, locationType: 'other' })
        .success,
    ).toBe(false)
    expect(
      prospectSchema.safeParse({
        ...validInput,
        locationType: 'other',
        locationDetails: 'Parking du marché',
      }).success,
    ).toBe(true)
    expect(
      prospectSchema.safeParse({ ...validInput, vehicleType: 'other' }).success,
    ).toBe(false)
    expect(
      prospectSchema.safeParse({
        ...validInput,
        vehicleType: 'other',
        vehicleDescription: 'Engin de chantier',
      }).success,
    ).toBe(true)
  })
  it('refuse une date impossible et les champs administratifs injectés', () => {
    expect(
      prospectSchema.safeParse({ ...validInput, endDate: '2026-02-30' })
        .success,
    ).toBe(false)
    expect(
      prospectSchema.safeParse({ ...validInput, status: 'converted' }).success,
    ).toBe(false)
  })
  it.each([
    [31, null],
    [30, 30],
    [20, 30],
    [15, 15],
    [10, 15],
    [7, 7],
    [1, 7],
    [0, 0],
    [-3, 0],
  ] as const)(
    'applique le palier de rappel à J%d avec rattrapage',
    (days, stage) => {
      const now = new Date('2026-11-20T12:00:00Z'),
        end = new Date(now.getTime() + days * 86400000)
          .toISOString()
          .slice(0, 10)
      expect(daysToExpiry(end, now)).toBe(days)
      expect(reminderStage(end, now)).toBe(stage)
      expect(prospectReminderStage(end, now)).toBe(stage)
    },
  )
  it('respecte le jour civil du Gabon à minuit et conserve les suivis clôturés', () => {
    const now = new Date('2026-11-19T23:30:00Z')
    expect(daysToExpiry('2026-11-20', now)).toBe(0)
    expect(
      prospectPhase({ status: 'tracking', endDate: '2026-11-20' }, now),
    ).toBe('Expire aujourd’hui')
    expect(
      prospectPhase({ status: 'tracking', endDate: '2026-11-19' }, now),
    ).toContain('dépassée')
    expect(
      prospectPhase({ status: 'converted', endDate: '2026-11-19' }, now),
    ).toBe('Assuré chez LE KARA')
  })
})
