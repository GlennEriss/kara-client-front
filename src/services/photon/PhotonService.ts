import { PhotonResult } from "@/types/types"

interface PhotonSearchOptions {
  limit?: number
  bbox?: string
  lang?: string
}

export class PhotonService {
  private static readonly BASE_URL = 'https://photon.komoot.io/api'
  private static readonly GABON_BBOX = '8.5,0.0,14.5,4.0' // [minLon, minLat, maxLon, maxLat]
  private static readonly DEFAULT_LIMIT = 10
  private static readonly DEFAULT_LANG = 'fr'

  /**
   * Recherche des lieux via l'API Photon
   * @param query Terme de recherche
   * @param options Options de recherche
   * @returns Promise<PhotonResult[]> Liste des résultats
   */
  static async search(query: string, options: PhotonSearchOptions = {}): Promise<PhotonResult[]> {
    if (!query || query.trim().length < 3) {
      return []
    }

    const {
      limit = this.DEFAULT_LIMIT,
      bbox = this.GABON_BBOX,
      lang = this.DEFAULT_LANG
    } = options

    try {
      const url = new URL(this.BASE_URL)
      url.searchParams.set('q', query.trim())
      url.searchParams.set('limit', limit.toString())
      url.searchParams.set('bbox', bbox)
      url.searchParams.set('lang', lang)

      const response = await fetch(url.toString())
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`)
      }

      const data = await response.json()
      return data.features || []
    } catch (error) {
      console.error('Erreur lors de la recherche Photon:', error)
      return []
    }
  }

  /**
   * Recherche des quartiers au Gabon
   * @param query Terme de recherche
   * @returns Promise<PhotonResult[]> Liste des quartiers gabonais
   */
  static async searchDistricts(query: string): Promise<PhotonResult[]> {
    const results = await this.search(query)
    
    // Filtrer pour ne garder que les résultats du Gabon
    return results.filter((feature: PhotonResult) => 
      feature.properties.country === 'Gabon' &&
      (feature.properties.name.toLowerCase().includes(query.toLowerCase()) ||
       feature.properties.city?.toLowerCase().includes(query.toLowerCase()))
    )
  }


  /**
   * Formate l'affichage d'un résultat Photon
   * @param result Résultat Photon
   * @returns string Texte formaté
   */
  static formatResultDisplay(result: PhotonResult): string {
    const parts = []
    if (result.properties.city) parts.push(result.properties.city)
    if (result.properties.state) parts.push(result.properties.state)
    if (result.properties.country) parts.push(result.properties.country)
    return parts.join(', ')
  }

  /**
   * Normalise une requête de recherche
   * @param query Requête à normaliser
   * @returns string Requête normalisée
   */
  static normalizeQuery(query: string): string {
    return query.trim().toLowerCase()
  }

  /**
   * Vérifie si une requête est valide pour la recherche
   * @param query Requête à vérifier
   * @returns boolean True si la requête est valide
   */
  static isValidQuery(query: string): boolean {
    return Boolean(query && query.trim().length >= 3)
  }
}

export type { PhotonResult, PhotonSearchOptions }
