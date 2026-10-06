import type { VehicleDeclarationCorrection, VehicleInsurance } from '@/types/types'

/**
 * Corrections apportées par l'admin à la déclaration d'un membre, après
 * comparaison avec les informations de l'assureur partenaire.
 */

const VEHICLE_TYPE_LABELS: Record<string, string> = {
  car: 'Voiture',
  motorcycle: 'Moto',
  truck: 'Camion',
  bus: 'Bus',
  maison: 'Habitation',
  other: 'Autre',
}

/** Champs saisis par le membre que l'admin peut corriger. */
const COMPARED_FIELDS: Array<{ field: keyof VehicleInsurance; label: string; kind?: 'date' | 'amount' | 'vehicleType' }> = [
  { field: 'plateNumber', label: 'Plaque' },
  { field: 'vehicleType', label: 'Type de véhicule', kind: 'vehicleType' },
  { field: 'vehicleBrand', label: 'Marque' },
  { field: 'vehicleModel', label: 'Modèle' },
  { field: 'vehicleYear', label: 'Année' },
  { field: 'energySource', label: 'Énergie' },
  { field: 'insuranceCompany', label: "Compagnie d'assurance" },
  { field: 'policyNumber', label: 'N° de police' },
  { field: 'premiumAmount', label: 'Prime', kind: 'amount' },
  { field: 'startDate', label: 'Date de début', kind: 'date' },
  { field: 'endDate', label: 'Date de fin', kind: 'date' },
]

const isEmpty = (value: unknown) => value === undefined || value === null || value === ''

function display(value: unknown, kind?: 'date' | 'amount' | 'vehicleType'): string {
  if (isEmpty(value)) return '—'
  if (kind === 'date') return new Date(value as string | Date).toLocaleDateString('fr-FR')
  if (kind === 'amount') return `${Number(value).toLocaleString('fr-FR')} FCFA`
  if (kind === 'vehicleType') return VEHICLE_TYPE_LABELS[String(value)] ?? String(value)
  return String(value).trim()
}

function normalize(value: unknown, kind?: 'date' | 'amount' | 'vehicleType'): string {
  if (isEmpty(value)) return ''
  if (kind === 'date') return new Date(value as string | Date).toISOString().slice(0, 10)
  if (kind === 'amount') return String(Number(value))
  return String(value).trim().toUpperCase()
}

/** Champs dont la valeur retenue diffère de celle saisie par le membre. */
export function diffVehicleDeclaration(
  declared: Partial<VehicleInsurance>,
  retained: Partial<Record<keyof VehicleInsurance, unknown>>,
): VehicleDeclarationCorrection[] {
  return COMPARED_FIELDS.flatMap(({ field, label, kind }) => {
    if (!(field in retained)) return []
    const before = declared[field]
    const after = retained[field]
    if (normalize(before, kind) === normalize(after, kind)) return []
    return [{ field, label, declared: display(before, kind), retained: display(after, kind) }]
  })
}

/** Résumé pour la notification au membre. */
export function summarizeCorrections(corrections: VehicleDeclarationCorrection[]): string {
  return corrections.map((c) => `${c.label} : ${c.declared} → ${c.retained}`).join(' ; ')
}
