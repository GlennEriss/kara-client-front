export interface VehicleLocation {
  provinceId?: string
  province?: string
  departmentId?: string
  department?: string
  communeId?: string
  city?: string
  districtId?: string
  district?: string
  quarterId?: string
  quarter?: string
  locationType?: 'quarter' | 'other'
  locationDetails?: string
}

type GeographyRecord = Record<string, unknown>
export type GeographyReader = (
  collection: string,
  id: string,
) => Promise<GeographyRecord | null>
export const vehicleLocationKeys = [
  'provinceId',
  'province',
  'departmentId',
  'department',
  'communeId',
  'city',
  'districtId',
  'district',
  'quarterId',
  'quarter',
  'locationType',
  'locationDetails',
] as const
export function pickVehicleLocation(value: VehicleLocation): VehicleLocation {
  return Object.fromEntries(
    vehicleLocationKeys
      .filter((key) => value[key] !== undefined)
      .map((key) => [key, value[key]]),
  )
}

/** Les libellés et les parents sont résolus depuis Géographie, jamais déduits d'un texte libre. */
export async function resolveVehicleLocation(
  input: VehicleLocation,
  read: GeographyReader,
): Promise<VehicleLocation> {
  const result: VehicleLocation = { ...input }
  if (input.locationType === 'other') {
    result.quarterId = ''
    result.quarter = ''
  } else if (input.quarterId) {
    result.locationType = 'quarter'
    result.locationDetails = ''
    const quarter = await read('quarters', input.quarterId)
    if (!quarter || typeof quarter.districtId !== 'string')
      throw Error('Quartier introuvable dans Géographie.')
    result.quarter = String(quarter.name || '')
    result.districtId = quarter.districtId
  }
  if (result.districtId) {
    const district = await read('districts', result.districtId)
    if (!district || typeof district.communeId !== 'string')
      throw Error('Arrondissement introuvable dans Géographie.')
    if (input.communeId && input.communeId !== district.communeId)
      throw Error('Le quartier ne correspond pas à la ville sélectionnée.')
    result.district = String(district.name || '')
    result.communeId = district.communeId
  }
  if (result.communeId) {
    const commune = await read('communes', result.communeId)
    if (!commune || typeof commune.departmentId !== 'string')
      throw Error('Ville introuvable dans Géographie.')
    result.city = String(commune.name || '')
    result.departmentId = commune.departmentId
    const department = await read('departments', commune.departmentId)
    if (!department || typeof department.provinceId !== 'string')
      throw Error('Département introuvable dans Géographie.')
    result.department = String(department.name || '')
    result.provinceId = department.provinceId
    const province = await read('provinces', department.provinceId)
    if (!province) throw Error('Province introuvable dans Géographie.')
    result.province = String(province.name || '')
  }
  return result
}

export function vehicleLocationStats(rows: VehicleLocation[]) {
  const quarters = new Map<
    string,
    { id: string; label: string; city: string; count: number }
  >()
  const cities = new Map<string, { id: string; label: string; count: number }>()
  let missing = 0,
    other = 0
  for (const row of rows) {
    if (row.communeId) {
      const city = cities.get(row.communeId) || {
        id: row.communeId,
        label: row.city || 'Ville',
        count: 0,
      }
      city.count++
      cities.set(row.communeId, city)
    }
    if (row.locationType === 'other') {
      other++
      continue
    }
    if (!row.quarterId) {
      missing++
      continue
    }
    const quarter = quarters.get(row.quarterId) || {
      id: row.quarterId,
      label: row.quarter || 'Quartier',
      city: row.city || '',
      count: 0,
    }
    quarter.count++
    quarters.set(row.quarterId, quarter)
  }
  const sort = <T extends { label: string; count: number }>(items: T[]) =>
    items.sort(
      (a, b) => b.count - a.count || a.label.localeCompare(b.label, 'fr'),
    )
  return {
    quarters: sort([...quarters.values()]),
    cities: sort([...cities.values()]),
    missing,
    other,
  }
}
