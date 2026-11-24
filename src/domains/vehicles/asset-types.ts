export const insuranceAssetSettingsId = 'insuranceAssetTypes'

export const insuranceAssetLabels: Record<string, string> = {
  car: 'Voiture',
  motorcycle: 'Moto ou scooter',
  truck: 'Camion',
  bus: 'Bus ou minibus',
  van: 'Utilitaire',
  trailer: 'Remorque',
  maison: 'Maison ou villa',
  apartment: 'Appartement',
  premises: 'Local commercial ou bureaux',
  warehouse: 'Entrepôt',
  equipment: 'Matériel ou équipement professionnel',
  electronics: 'Matériel informatique',
  machinery: 'Engin de chantier',
  boat: 'Bateau de plaisance',
  other: 'Autre',
}

const customPrefix = 'custom:'
export const isCustomAssetType = (value: string) => value.startsWith(customPrefix)
export const isInsuranceAssetType = (value: string) =>
  Object.hasOwn(insuranceAssetLabels, value) || /^custom:[^\x00-\x1f]{2,60}$/u.test(value)
export const isRoadAssetType = (value: string) =>
  ['car', 'motorcycle', 'truck', 'bus', 'van', 'trailer'].includes(value)

export function assetTypeLabel(value: string, description?: string | null) {
  if (value === 'other' && description?.trim()) return description.trim()
  if (isCustomAssetType(value)) return value.slice(customPrefix.length)
  return Object.hasOwn(insuranceAssetLabels, value) ? insuranceAssetLabels[value] : value
}

function extraAssetTypes(values: unknown): string[] {
  return Array.isArray(values)
    ? Array.from(new Set(values.filter((value): value is string =>
        typeof value === 'string' && isCustomAssetType(value) && isInsuranceAssetType(value),
      )))
    : []
}

export type InsuranceAssetCatalog = { values: string[]; inactive: string[] }

export function parseInsuranceAssetCatalog(data?: { values?: unknown; inactive?: unknown }): InsuranceAssetCatalog {
  const values = extraAssetTypes(data?.values)
  const inactive: unknown[] = Array.isArray(data?.inactive) ? data.inactive : []
  return { values, inactive: [...Object.keys(insuranceAssetLabels), ...values].filter((value) =>
    value !== 'other' && inactive.includes(value),
  ) }
}

export function isAvailableInsuranceAssetType(value: string, catalog?: InsuranceAssetCatalog, previous?: string) {
  return isInsuranceAssetType(value) && (value === previous || (
    !catalog?.inactive.includes(value) && (!isCustomAssetType(value) || catalog?.values.includes(value) === true)
  ))
}

export function insuranceAssetOptions(
  catalog?: InsuranceAssetCatalog,
  { selected, includeInactive = false }: { selected?: string; includeInactive?: boolean } = {},
) {
  const extra = [...(catalog?.values ?? [])]
  if (selected && isCustomAssetType(selected) && isInsuranceAssetType(selected) && !extra.includes(selected)) extra.push(selected)
  return [
    ...Object.keys(insuranceAssetLabels).filter((value) => value !== 'other'),
    ...extra.sort((a, b) => assetTypeLabel(a).localeCompare(assetTypeLabel(b), 'fr')),
    'other',
  ].filter((value) => includeInactive || value === selected || !catalog?.inactive.includes(value))
    .map((value) => ({ value, label: assetTypeLabel(value) }))
}

export function newInsuranceAssetType(label: string, values: string[]) {
  const clean = label.trim().replace(/\s+/g, ' ')
  const value = customPrefix + clean
  if (!isInsuranceAssetType(value)) throw new Error('Saisissez un nom de 2 à 60 caractères.')
  const normalize = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
  if (insuranceAssetOptions({ values, inactive: [] }).some((entry) => normalize(entry.label) === normalize(clean))) {
    throw new Error('Ce type de bien existe déjà.')
  }
  if (values.length >= 100) throw new Error('La liste contient déjà 100 types personnalisés.')
  return value
}
