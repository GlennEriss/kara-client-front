/**
 * Types et interfaces pour le domaine Documents
 * 
 * Ce fichier contient toutes les définitions de types liées aux documents :
 * - Document (entité principale)
 * - DocumentType (types de documents possibles)
 * - DocumentFormat (formats de documents)
 * - Types de requêtes et filtres
 */

/**
 * Types de documents possibles
 */
export type DocumentType = 
  | 'ADHESION_CS'      // Contrat d'adhésion Caisse Spéciale
  | 'ADHESION_CI'      // Contrat d'adhésion Caisse Imprévue
  | 'ADHESION'         // Contrat d'adhésion général
  | 'CANCELED_CS'      // Contrat d'annulation Caisse Spéciale
  | 'CANCELED_CI'      // Contrat d'annulation Caisse Imprévue
  | 'FINISHED_CS'      // Contrat de fin Caisse Spéciale
  | 'FINISHED_CI'      // Contrat de fin Caisse Imprévue
  | 'SUPPORT_CI'       // Document de demande de support Caisse Imprévue
  | 'EARLY_REFUND_CI'  // Document de retrait anticipé Caisse Imprévue
  | 'FINAL_REFUND_CI'  // Document de remboursement final Caisse Imprévue
  | 'EARLY_REFUND_CS'  // Document de retrait anticipé Caisse Spéciale
  | 'FINAL_REFUND_CS'  // Document de remboursement final Caisse Spéciale
  | 'CHARITY_EVENT_MEDIA'         // Média d'évènement Bienfaiteur
  | 'CHARITY_CONTRIBUTION_RECEIPT' // Reçu de contribution Bienfaiteur
  | 'CHARITY_EVENT_REPORT'         // Rapport d'évènement Bienfaiteur
  | 'PLACEMENT_CONTRACT'           // Contrat de placement
  | 'PLACEMENT_COMMISSION_PROOF'   // Preuve de commission placement
  | 'PLACEMENT_EARLY_EXIT_QUITTANCE' // Quittance de retrait anticipé placement
  | 'PLACEMENT_FINAL_QUITTANCE'      // Quittance finale placement
  | 'PLACEMENT_EARLY_EXIT_ADDENDUM'   // Avenant retrait anticipé placement
  | 'PLACEMENT_EARLY_EXIT_DOCUMENT'   // Document PDF signé de retrait anticipé
  | 'CREDIT_SPECIALE_CONTRACT'     // Contrat crédit spéciale
  | 'CREDIT_SPECIALE_CONTRACT_SIGNED' // Contrat crédit spéciale signé
  | 'CREDIT_SPECIALE_RECEIPT'      // Reçu de paiement crédit spéciale
  | 'CREDIT_SPECIALE_DISCHARGE'    // Décharge crédit spéciale
  | 'CREDIT_SPECIALE_QUITTANCE'    // Quittance remplie (template + infos contrat)
  | 'CREDIT_SPECIALE_QUITTANCE_SIGNED' // Quittance signée par le membre

/**
 * Formats de documents possibles
 */
export type DocumentFormat = 
  | 'pdf'
  | 'word'
  | 'excel'
  | 'image'
  | 'text'

/**
 * Entité Document
 */
export interface Document {
  id?: string
  type: DocumentType
  format: DocumentFormat
  libelle: string
  path: string
  url: string
  size: number
  memberId: string
  contractId?: string
  createdBy: string
  updatedBy: string
  createdAt: Date
  updatedAt: Date
}

/**
 * Champs de tri pour les documents
 */
export type DocumentSortField = 'type' | 'createdAt' | 'updatedAt'

/**
 * Direction de tri
 */
export type DocumentSortDirection = 'asc' | 'desc'

/**
 * Configuration de tri
 */
export interface DocumentSortInput {
  field: DocumentSortField
  direction: DocumentSortDirection
}

/**
 * Paramètres de requête pour la liste de documents
 */
export interface DocumentListQuery {
  memberId: string
  page?: number
  pageSize?: number
  type?: string
  sort?: DocumentSortInput[]
}

/**
 * Résultat d'une requête de liste de documents
 */
export interface DocumentListResult {
  documents: Document[]
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
  availableTypes: string[]
}

/**
 * Filtres pour les documents
 */
export interface DocumentFilters {
  type?: string
  format?: string
  memberId?: string
  searchQuery?: string
  startDate?: Date
  endDate?: Date
  limit?: number
  page?: number
}

/**
 * Documents paginés
 */
export interface PaginatedDocuments {
  documents: Document[]
  total: number
  hasMore: boolean
  currentPage: number
  totalPages: number
}
