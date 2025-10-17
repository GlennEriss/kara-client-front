import { SelectOption } from '@/components/forms/SelectApp'

// Options pour les types de documents d'identité
export const DOCUMENT_TYPE_OPTIONS: SelectOption[] = [
  { value: 'CNI', label: 'Carte d\'Identité Nationale' },
  { value: 'PASSPORT', label: 'Passeport' },
  { value: 'CARTE_ETUDIANT', label: 'Carte d\'Étudiant' },
  { value: 'CARTE_ETRANGER', label: 'Carte d\'Étranger' },
  { value: 'CARTE_CONSULAIRE', label: 'Carte Consulaire' },
]

// Map des labels pour affichage
export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  CNI: 'Carte d\'Identité Nationale',
  PASSPORT: 'Passeport',
  CARTE_ETUDIANT: 'Carte d\'Étudiant',
  CARTE_ETRANGER: 'Carte d\'Étranger',
  CARTE_CONSULAIRE: 'Carte Consulaire',
}

// Fonction helper pour obtenir le label d'un type de document
export const getDocumentTypeLabel = (typeId: string): string => {
  return DOCUMENT_TYPE_LABELS[typeId] || typeId
}

