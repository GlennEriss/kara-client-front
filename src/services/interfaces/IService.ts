import { CompanyAddress } from "@/types/types"

/**
 * Interface de base pour tous les services
 */
export interface IService {
  readonly name: string
}

/**
 * Interface pour le service de suggestions d'entreprises
 */
export interface ICompanySuggestionsService extends IService {
  searchCompanies(query: string): Promise<CompanySuggestion[]>
  loadCompanyAddress(companyName: string): Promise<CompanyAddress | null>
}

/**
 * Interface pour le service de suggestions de professions
 */
export interface IProfessionSuggestionsService extends IService {
  searchProfessions(query: string): Promise<ProfessionSuggestion[]>
}

export interface CompanySuggestion {
  name: string
  isNew: boolean
  hasAddress?: boolean
  id?: string
  industry?: string
}

export interface ProfessionSuggestion {
  name: string
  isNew: boolean
  description?: string
}
