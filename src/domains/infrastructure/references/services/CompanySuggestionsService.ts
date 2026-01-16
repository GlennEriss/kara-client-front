import { ICompanySuggestionsService, CompanySuggestion } from '@/services/interfaces/IService'
import { ICompanyRepository } from '../repositories/ICompanyRepository'
import { CompanyAddress } from '../entities/company.types'

/**
 * Service pour la gestion des suggestions d'entreprises
 */
export class CompanySuggestionsService implements ICompanySuggestionsService {
  readonly name = 'CompanySuggestionsService'

  constructor(private readonly companyRepository: ICompanyRepository) {}

  /**
   * Recherche des suggestions d'entreprises
   */
  async searchCompanies(query: string): Promise<CompanySuggestion[]> {
    if (!query || query.trim().length < 2) {
      return []
    }

    try {
      const result = await this.companyRepository.findByName(query)
      const suggestions: CompanySuggestion[] = []
      
      // Ajouter l'entreprise trouvée si elle existe
      if (result.found && result.company) {
        suggestions.push({
          name: result.company.name,
          isNew: false,
          hasAddress: Boolean(result.company.address?.province || result.company.address?.city || result.company.address?.district),
          id: result.company.id,
          industry: result.company.industry
        })
      }
      
      // Ajouter les suggestions si disponibles
      if (result.suggestions) {
        result.suggestions.forEach((suggestion: string) => {
          suggestions.push({
            name: suggestion,
            isNew: false,
            hasAddress: false
          })
        })
      }
      
      // Ajouter l'option "Créer nouvelle entreprise"
      suggestions.push({
        name: `Créer "${query}"`,
        isNew: true,
        hasAddress: false
      })
      
      return suggestions
    } catch (error) {
      console.error('Erreur lors de la recherche d\'entreprises:', error)
      return []
    }
  }

  /**
   * Charge l'adresse d'une entreprise existante
   */
  async loadCompanyAddress(companyName: string): Promise<CompanyAddress | null> {
    try {
      const result = await this.companyRepository.findByName(companyName)
      if (result.found && result.company && result.company.address) {
        const address = result.company.address
        
        return {
          province: address.province,
          city: address.city,
          district: address.district
        }
      }
      return null
    } catch (error) {
      console.error('Erreur lors du chargement de l\'adresse:', error)
      return null
    }
  }
}
