import { IService } from '../interfaces/IService'
import { Filleul } from '@/types/types'

/**
 * Interface pour le service de gestion des filleuls
 */
export interface IFilleulService extends IService {
  /**
   * Récupère tous les filleuls ayant un code intermédiaire spécifique
   * 
   * @param {string} intermediaryCode - Le code intermédiaire du parrain
   * @returns {Promise<Filleul[]>} - Liste des filleuls trouvés
   */
  getFilleulsByIntermediaryCode(intermediaryCode: string): Promise<Filleul[]>

  /**
   * Valide un code intermédiaire
   * 
   * @param {string} intermediaryCode - Le code à valider
   * @returns {boolean} - True si le code est valide
   */
  validateIntermediaryCode(intermediaryCode: string): boolean

  /**
   * Formate un code intermédiaire (nettoyage, normalisation)
   * 
   * @param {string} intermediaryCode - Le code à formater
   * @returns {string} - Le code formaté
   */
  formatIntermediaryCode(intermediaryCode: string): string

  /**
   * Obtient des statistiques sur les filleuls d'un parrain
   * 
   * @param {string} intermediaryCode - Le code intermédiaire du parrain
   * @returns {Promise<{total: number, thisYear: number, thisMonth: number}>} - Statistiques
   */
  getFilleulsStats(intermediaryCode: string): Promise<{total: number, thisYear: number, thisMonth: number}>
}
