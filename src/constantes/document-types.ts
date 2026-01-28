import { SelectOption } from '@/components/forms/SelectApp'

// Options pour les types de documents d'identité
export const DOCUMENT_TYPE_OPTIONS: SelectOption[] = [
  { value: 'Passeport', label: 'Passeport' },
  { value: 'Carte de séjour', label: 'Carte de séjour' },
  { value: 'Carte scolaire', label: 'Carte scolaire' },
  { value: 'Carte consulaire', label: 'Carte consulaire' },
  { value: 'NIP', label: 'NIP' },
  { value: 'CNI', label: 'CNI' },
  { value: 'Autre', label: 'Autre' }
]

// Map des labels pour affichage
export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  'Passeport': 'Passeport',
  'Carte de séjour': 'Carte de séjour',
  'Carte scolaire': 'Carte scolaire',
  'Carte consulaire': 'Carte consulaire',
  'NIP': 'NIP',
  'CNI': 'CNI',
  'Autre': 'Autre'
}

// Fonction helper pour obtenir le label d'un type de document
export const getDocumentTypeLabel = (typeId: string): string => {
  return DOCUMENT_TYPE_LABELS[typeId] || typeId
}

