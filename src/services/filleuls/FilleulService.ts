import { IFilleulService } from './IFilleulService'
import { Filleul } from '@/types/types'
import { IMemberRepository } from '@/repositories/members/IMemberRepository'

/**
 * Service pour la gestion des filleuls
 * Contient la logique métier pour les opérations sur les filleuls
 */
export class FilleulService implements IFilleulService {
  readonly name = 'FilleulService'
  
  constructor(private memberRepository: IMemberRepository) {}

  /**
   * Récupère tous les filleuls ayant un code intermédiaire spécifique
   * 
   * @param {string} intermediaryCode - Le code intermédiaire du parrain
   * @returns {Promise<Filleul[]>} - Liste des filleuls trouvés
   */
  async getFilleulsByIntermediaryCode(intermediaryCode: string): Promise<Filleul[]> {
    try {
      // Validation du code intermédiaire
      if (!this.validateIntermediaryCode(intermediaryCode)) {
        console.warn('Code intermédiaire invalide:', intermediaryCode)
        return []
      }

      // Formatage du code
      const formattedCode = this.formatIntermediaryCode(intermediaryCode)
      
      // Récupération des filleuls via le repository
      const filleuls = await this.memberRepository.getFilleulsByIntermediaryCode(formattedCode)
      
      // Logique métier : trier par date de création (plus récents en premier)
      const sortedFilleuls = filleuls.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )      
      return sortedFilleuls
    } catch (error) {
      console.error('Erreur lors de la récupération des filleuls:', error)
      return []
    }
  }

  /**
   * Valide un code intermédiaire
   * Format attendu: [Numéro].MK.[Numéro] (nombres séparés par .MK.)
   * 
   * @param {string} intermediaryCode - Le code à valider
   * @returns {boolean} - True si le code est valide
   */
  validateIntermediaryCode(intermediaryCode: string): boolean {
    if (!intermediaryCode || typeof intermediaryCode !== 'string') {
      return false
    }

    const trimmedCode = intermediaryCode.trim()
    
    // Vérifier la longueur minimale (au moins 5 caractères pour "1.MK.1")
    if (trimmedCode.length < 5) {
      return false
    }

    // Vérifier le format avec regex : nombres séparés par .MK.
    const formatRegex = /^\d+\.MK\.\d+$/
    return formatRegex.test(trimmedCode)
  }

  /**
   * Formate un code intermédiaire (nettoyage, normalisation)
   * 
   * @param {string} intermediaryCode - Le code à formater
   * @returns {string} - Le code formaté
   */
  formatIntermediaryCode(intermediaryCode: string): string {
    if (!intermediaryCode) {
      return ''
    }

    // Nettoyer le code (supprimer espaces, convertir en majuscules)
    let formatted = intermediaryCode.trim().toUpperCase()
    
    // S'assurer que le format est correct
    if (!this.validateIntermediaryCode(formatted)) {
      console.warn('Code intermédiaire au format incorrect:', intermediaryCode)
      return formatted // Retourner tel quel si invalide
    }

    return formatted
  }

  /**
   * Obtient des statistiques sur les filleuls d'un parrain
   * 
   * @param {string} intermediaryCode - Le code intermédiaire du parrain
   * @returns {Promise<{total: number, thisYear: number, thisMonth: number}>} - Statistiques
   */
  async getFilleulsStats(intermediaryCode: string): Promise<{total: number, thisYear: number, thisMonth: number}> {
    try {
      const filleuls = await this.getFilleulsByIntermediaryCode(intermediaryCode)
      
      const now = new Date()
      const currentYear = now.getFullYear()
      const currentMonth = now.getMonth()

      const thisYear = filleuls.filter(f => 
        new Date(f.createdAt).getFullYear() === currentYear
      ).length

      const thisMonth = filleuls.filter(f => {
        const filleulDate = new Date(f.createdAt)
        return filleulDate.getFullYear() === currentYear && 
               filleulDate.getMonth() === currentMonth
      }).length

      return {
        total: filleuls.length,
        thisYear,
        thisMonth
      }
    } catch (error) {
      console.error('Erreur lors du calcul des statistiques:', error)
      return { total: 0, thisYear: 0, thisMonth: 0 }
    }
  }
}
