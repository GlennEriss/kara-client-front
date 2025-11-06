export type DocumentCategory = 'caisseSpeciale' | 'caisseImprevue' | 'autre'

export interface DocumentTypeInfo {
  label: string
  category: DocumentCategory
  colorClass: string
}

export interface DocumentFilterOption extends DocumentTypeInfo {
  value: string
}

const DOCUMENT_TYPE_TRANSLATIONS: Record<string, DocumentTypeInfo> = {
  ADHESION_CS: { label: 'Adhésion', category: 'caisseSpeciale', colorClass: 'bg-gradient-to-r from-emerald-100 to-emerald-200 text-emerald-800 border-emerald-200' },
  CANCELED_CS: { label: 'Résiliation', category: 'caisseSpeciale', colorClass: 'bg-gradient-to-r from-rose-100 to-rose-200 text-rose-700 border-rose-200' },
  FINISHED_CS: { label: 'Terminé', category: 'caisseSpeciale', colorClass: 'bg-gradient-to-r from-indigo-100 to-indigo-200 text-indigo-700 border-indigo-200' },
  ADHESION_CI: { label: 'Adhésion', category: 'caisseImprevue', colorClass: 'bg-gradient-to-r from-emerald-100 to-emerald-200 text-emerald-800 border-emerald-200' },
  CANCELED_CI: { label: 'Résiliation', category: 'caisseImprevue', colorClass: 'bg-gradient-to-r from-rose-100 to-rose-200 text-rose-700 border-rose-200' },
  FINISHED_CI: { label: 'Terminé', category: 'caisseImprevue', colorClass: 'bg-gradient-to-r from-indigo-100 to-indigo-200 text-indigo-700 border-indigo-200' },
  SUPPORT_CI: { label: 'Aide accordée', category: 'caisseImprevue', colorClass: 'bg-gradient-to-r from-amber-100 to-amber-200 text-amber-800 border-amber-200' },
  EARLY_REFUND_CI: { label: 'Remboursement anticipé', category: 'caisseImprevue', colorClass: 'bg-gradient-to-r from-orange-100 to-orange-200 text-orange-800 border-orange-200' },
  FINAL_REFUND_CI: { label: 'Remboursement final', category: 'caisseImprevue', colorClass: 'bg-gradient-to-r from-sky-100 to-sky-200 text-sky-700 border-sky-200' },
  ADHESION: { label: 'Adhésion', category: 'autre', colorClass: 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 border-gray-200' },
}

export const DOCUMENT_CATEGORY_ORDER: DocumentCategory[] = ['caisseSpeciale', 'caisseImprevue', 'autre']

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  caisseSpeciale: 'Caisse Spéciale',
  caisseImprevue: 'Caisse Imprévue',
  autre: 'Autres documents',
}

export function getDocumentTypeInfo(type: string): DocumentTypeInfo {
  return (
    DOCUMENT_TYPE_TRANSLATIONS[type] ?? {
      label: type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()),
      category: 'autre',
    }
  )
}

export function buildDocumentFilterOptions(types: string[]): DocumentFilterOption[] {
  const uniqueTypes = Array.from(new Set(types))

  return uniqueTypes
    .map((type) => {
      const info = getDocumentTypeInfo(type)
      return { value: type, ...info }
    })
    .sort((a, b) => {
      const categoryDiff = DOCUMENT_CATEGORY_ORDER.indexOf(a.category) - DOCUMENT_CATEGORY_ORDER.indexOf(b.category)
      if (categoryDiff !== 0) return categoryDiff
      return a.label.localeCompare(b.label, 'fr')
    })
}

