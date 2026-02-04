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
  // Caisse Speciale
  ADHESION_CS: { label: 'Adhésion CS', category: 'caisseSpeciale', colorClass: 'bg-gradient-to-r from-emerald-100 to-emerald-200 text-emerald-800 border-emerald-200' },
  CANCELED_CS: { label: 'Résiliation CS', category: 'caisseSpeciale', colorClass: 'bg-gradient-to-r from-rose-100 to-rose-200 text-rose-700 border-rose-200' },
  FINISHED_CS: { label: 'Terminé CS', category: 'caisseSpeciale', colorClass: 'bg-gradient-to-r from-indigo-100 to-indigo-200 text-indigo-700 border-indigo-200' },
  EARLY_REFUND_CS: { label: 'Retrait anticipé CS', category: 'caisseSpeciale', colorClass: 'bg-gradient-to-r from-amber-100 to-amber-200 text-amber-800 border-amber-200' },
  FINAL_REFUND_CS: { label: 'Remboursement final CS', category: 'caisseSpeciale', colorClass: 'bg-gradient-to-r from-cyan-100 to-cyan-200 text-cyan-800 border-cyan-200' },

  // Caisse Imprevue
  ADHESION_CI: { label: 'Adhésion CI', category: 'caisseImprevue', colorClass: 'bg-gradient-to-r from-teal-100 to-teal-200 text-teal-800 border-teal-200' },
  CANCELED_CI: { label: 'Résiliation CI', category: 'caisseImprevue', colorClass: 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border-red-200' },
  FINISHED_CI: { label: 'Terminé CI', category: 'caisseImprevue', colorClass: 'bg-gradient-to-r from-violet-100 to-violet-200 text-violet-800 border-violet-200' },
  SUPPORT_CI: { label: 'Aide accordée CI', category: 'caisseImprevue', colorClass: 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border-yellow-200' },
  EARLY_REFUND_CI: { label: 'Remboursement anticipé CI', category: 'caisseImprevue', colorClass: 'bg-gradient-to-r from-orange-100 to-orange-200 text-orange-800 border-orange-200' },
  FINAL_REFUND_CI: { label: 'Remboursement final CI', category: 'caisseImprevue', colorClass: 'bg-gradient-to-r from-sky-100 to-sky-200 text-sky-800 border-sky-200' },

  // Adhesion (generale)
  ADHESION: { label: 'Adhésion', category: 'autre', colorClass: 'bg-gradient-to-r from-slate-100 to-slate-200 text-slate-700 border-slate-200' },

  // Bienfaiteur / Charity
  CHARITY_EVENT_MEDIA: { label: 'Média évènement', category: 'autre', colorClass: 'bg-gradient-to-r from-fuchsia-100 to-fuchsia-200 text-fuchsia-800 border-fuchsia-200' },
  CHARITY_CONTRIBUTION_RECEIPT: { label: 'Reçu contribution', category: 'autre', colorClass: 'bg-gradient-to-r from-pink-100 to-pink-200 text-pink-800 border-pink-200' },
  CHARITY_EVENT_REPORT: { label: 'Rapport d\'évènement', category: 'autre', colorClass: 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 border-purple-200' },

  // Placement
  PLACEMENT_CONTRACT: { label: 'Contrat placement', category: 'autre', colorClass: 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border-blue-200' },
  PLACEMENT_COMMISSION_PROOF: { label: 'Preuve commission', category: 'autre', colorClass: 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border-green-200' },
  PLACEMENT_EARLY_EXIT_QUITTANCE: { label: 'Quittance retrait anticipé', category: 'autre', colorClass: 'bg-gradient-to-r from-lime-100 to-lime-200 text-lime-800 border-lime-200' },
  PLACEMENT_FINAL_QUITTANCE: { label: 'Quittance finale', category: 'autre', colorClass: 'bg-gradient-to-r from-stone-100 to-stone-200 text-stone-700 border-stone-200' },
  PLACEMENT_EARLY_EXIT_ADDENDUM: { label: 'Avenant retrait anticipé', category: 'autre', colorClass: 'bg-gradient-to-r from-neutral-100 to-neutral-200 text-neutral-700 border-neutral-200' },
  PLACEMENT_EARLY_EXIT_DOCUMENT: { label: 'Document retrait anticipé', category: 'autre', colorClass: 'bg-gradient-to-r from-zinc-100 to-zinc-200 text-zinc-700 border-zinc-200' },

  // Credit Speciale
  CREDIT_SPECIALE_CONTRACT: { label: 'Contrat crédit spéciale', category: 'autre', colorClass: 'bg-gradient-to-r from-amber-50 to-orange-100 text-orange-900 border-orange-100' },
  CREDIT_SPECIALE_CONTRACT_SIGNED: { label: 'Contrat crédit spéciale signé', category: 'autre', colorClass: 'bg-gradient-to-r from-emerald-50 to-teal-100 text-teal-900 border-teal-100' },
  CREDIT_SPECIALE_RECEIPT: { label: 'Reçu paiement crédit spéciale', category: 'autre', colorClass: 'bg-gradient-to-r from-rose-50 to-pink-100 text-pink-900 border-pink-100' },
  CREDIT_SPECIALE_DISCHARGE: { label: 'Décharge crédit spéciale', category: 'autre', colorClass: 'bg-gradient-to-r from-violet-50 to-purple-100 text-purple-900 border-purple-100' },
  CREDIT_SPECIALE_QUITTANCE: { label: 'Quittance crédit spéciale', category: 'autre', colorClass: 'bg-gradient-to-r from-sky-50 to-blue-100 text-blue-900 border-blue-100' },
  CREDIT_SPECIALE_QUITTANCE_SIGNED: { label: 'Quittance crédit spéciale signée', category: 'autre', colorClass: 'bg-gradient-to-r from-slate-50 to-gray-100 text-gray-900 border-gray-100' },
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
      colorClass: 'bg-slate-100 text-slate-700 border-slate-200',
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
