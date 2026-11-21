import { describe, it, expect } from 'vitest'
import {
  projectVehicleCalendar,
  vehicleCalendarDays,
  vehicleWebDestination,
  vehicleWhatsAppNumber,
} from './calendar-model'
const now = new Date('2026-11-20T23:30:00Z') // déjà le 21 au Gabon
const insurance = {
  id: 'A',
  endDate: '2026-11-21',
  declarationStatus: 'validated',
  plateNumber: 'AB-123',
  memberFirstName: 'Marie',
  memberContacts: ['077466973'],
  quarter: 'Akanda',
  quarterId: 'Q',
  privateNotes: 'secret',
}
const prospect = {
  id: 'P',
  endDate: '2026-11-25',
  status: 'tracking',
  ownerName: 'Paul',
  phone: '066466973',
  locationType: 'other',
  locationDetails: 'Parking du marché',
}
describe('calendrier véhicules', () => {
  it('reprend les dates effectives, le contact et Géographie sans inventer de données financières', () => {
    const r = projectVehicleCalendar([insurance], [prospect], '2026-11', now)
    expect(r).toHaveLength(2)
    expect(r[0]).toMatchObject({
      source: 'insurance',
      recordId: 'A',
      phase: 'today',
      daysRemaining: 0,
      quarterId: 'Q',
      phone: '077466973',
    })
    expect(r[1]).toMatchObject({
      source: 'prospects',
      phase: 'soon',
      locationDetails: 'Parking du marché',
    })
    expect(JSON.stringify(r)).not.toMatch(/secret|amount|paid/)
  })
  it('exclut les assurances non validées, les prospects terminés, les dates invalides et les autres mois', () => {
    expect(
      projectVehicleCalendar(
        [
          { ...insurance, declarationStatus: 'pending' },
          { ...insurance, id: 'bad', endDate: '2026-02-31' },
          { ...insurance, id: 'othermonth', endDate: '2026-12-01' },
          { ...insurance, id: 'missing', endDate: null },
        ],
        [
          { ...prospect, status: 'converted' },
          { ...prospect, status: 'lost' },
        ],
        '2026-11',
        now,
      ),
    ).toEqual([])
  })
  it('accepte les anciennes assurances et les Timestamp Firestore, avec état calculé à la lecture', () => {
    const r = projectVehicleCalendar(
      [
        {
          ...insurance,
          declarationStatus: undefined,
          endDate: { toDate: () => new Date('2026-11-19T23:00:00Z') },
        },
      ],
      [],
      '2026-11',
      now,
    )
    expect(r[0]).toMatchObject({
      date: '2026-11-20',
      phase: 'expired',
      daysRemaining: -1,
    })
  })
  it('suit la dernière date après renouvellement et conserve les destinations existantes', () => {
    const r = projectVehicleCalendar(
      [{ ...insurance, endDate: '2026-12-21' }],
      [prospect],
      '2026-11',
      now,
    )
    expect(r).toHaveLength(1)
    expect(vehicleWebDestination(r[0])).toBe('/vehicules/prospection?focus=P')
    expect(
      vehicleWebDestination({ ...r[0], source: 'insurance', recordId: 'A B' }),
    ).toBe('/vehicules/A%20B')
  })
  it('construit une grille lundi-dimanche et normalise le contact WhatsApp local', () => {
    const days = vehicleCalendarDays('2026-11')
    expect(days.length % 7).toBe(0)
    expect(days.filter(Boolean)).toHaveLength(30)
    expect(days[6]).toBe('2026-11-01')
    expect(vehicleWhatsAppNumber('077 46 69 73')).toBe('24177466973')
    expect(vehicleWhatsAppNumber('+241 066 46 69 73')).toBe('24166466973')
  })
})
