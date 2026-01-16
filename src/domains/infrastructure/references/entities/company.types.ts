/**
 * Types et interfaces pour le domaine Companies (Entreprises)
 * 
 * Ce fichier contient toutes les définitions de types liées aux entreprises :
 * - Company (entité principale)
 * - CompanyAddress (adresse d'entreprise)
 * - CompanySearchResult (résultat de recherche)
 */

/**
 * Adresse d'une entreprise
 */
export interface CompanyAddress {
  province?: string
  city?: string
  district?: string
}

/**
 * Entité Company (Entreprise)
 */
export interface Company {
  id: string
  name: string
  normalizedName: string // Nom normalisé pour la recherche
  address?: CompanyAddress & {
    arrondissement?: string
    additionalInfo?: string
  }
  industry?: string
  employeeCount?: number
  createdAt: Date
  updatedAt: Date
  createdBy: string // ID de l'administrateur qui a créé
}

/**
 * Résultat de recherche d'entreprise
 */
export interface CompanySearchResult {
  found: boolean
  company?: Company
  suggestions?: string[] // Suggestions si pas trouvé
}
