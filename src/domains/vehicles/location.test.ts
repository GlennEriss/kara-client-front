import { describe, expect, it } from 'vitest'
import { resolveVehicleLocation, vehicleLocationStats } from './location'

const geography: Record<string, Record<string, unknown>> = {
  'quarters/q': { name: 'Awendjé', districtId: 'd' },
  'districts/d': { name: '3e arrondissement', communeId: 'c' },
  'communes/c': { name: 'Libreville', departmentId: 'dept' },
  'departments/dept': { name: 'Komo-Mondah', provinceId: 'p' },
  'provinces/p': { name: 'Estuaire' },
}
const read = async (collection: string, id: string) =>
  geography[`${collection}/${id}`] || null
describe('localisation du véhicule rattachée à Géographie', () => {
  it('résout les parents et les noms officiels depuis le quartier sélectionné', async () => {
    expect(
      await resolveVehicleLocation(
        { quarterId: 'q', city: 'Texte libre', quarter: 'Faux nom' },
        read,
      ),
    ).toMatchObject({
      quarterId: 'q',
      quarter: 'Awendjé',
      districtId: 'd',
      communeId: 'c',
      city: 'Libreville',
      provinceId: 'p',
      province: 'Estuaire',
    })
  })
  it('refuse un quartier absent ou une ville incohérente', async () => {
    await expect(
      resolveVehicleLocation({ quarterId: 'absent' }, read),
    ).rejects.toThrow('Quartier introuvable')
    await expect(
      resolveVehicleLocation({ quarterId: 'q', communeId: 'other' }, read),
    ).rejects.toThrow('ne correspond pas')
  })
  it('conserve un dossier ancien non rattaché et retire le quartier lors du choix Autre', async () => {
    expect(
      await resolveVehicleLocation(
        { city: 'Libreville', quarter: 'Ancien nom' },
        read,
      ),
    ).toEqual({ city: 'Libreville', quarter: 'Ancien nom' })
    expect(
      await resolveVehicleLocation(
        {
          locationType: 'other',
          quarterId: 'q',
          quarter: 'Awendjé',
          locationDetails: 'Parking',
        },
        read,
      ),
    ).toMatchObject({ quarterId: '', quarter: '', locationDetails: 'Parking' })
  })
  it('sépare les quartiers homonymes et les dossiers à renseigner dans les statistiques', () => {
    expect(
      vehicleLocationStats([
        {
          quarterId: 'q1',
          quarter: 'Centre',
          communeId: 'c1',
          city: 'Ville 1',
        },
        {
          quarterId: 'q2',
          quarter: 'Centre',
          communeId: 'c2',
          city: 'Ville 2',
        },
        { quarter: 'Centre', city: 'Ancienne ville' },
        { locationType: 'other', locationDetails: 'Parking' },
      ]),
    ).toMatchObject({
      quarters: [
        { id: 'q1', count: 1 },
        { id: 'q2', count: 1 },
      ],
      missing: 1,
      other: 1,
    })
  })
})
