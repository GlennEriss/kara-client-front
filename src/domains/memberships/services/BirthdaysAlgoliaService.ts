/**
 * Service de recherche Algolia pour les anniversaires des membres
 * 
 * Recherche des membres par nom, prénom ou matricule et retourne
 * les résultats avec le mois d'anniversaire pour navigation automatique.
 * 
 * Utilise l'index Algolia `members-{env}` existant.
 */

import { liteClient } from 'algoliasearch/lite'
import type { BirthdaySearchResult, BirthdaySearchHit } from '../types/birthdays'

// ==================== DÉTECTION ENVIRONNEMENT ====================

/**
 * Détecte l'environnement courant (dev/preprod/prod)
 */
function getEnvironment(): 'dev' | 'preprod' | 'prod' {
  // 1. Priorité : Variable d'environnement explicite
  if (process.env.NEXT_PUBLIC_ENV) {
    const env = process.env.NEXT_PUBLIC_ENV as 'dev' | 'preprod' | 'prod'
    if (['dev', 'preprod', 'prod'].includes(env)) {
      return env
    }
  }

  // 2. Vérifier VERCEL_ENV (pour les déploiements Vercel)
  if (process.env.VERCEL_ENV) {
    if (process.env.VERCEL_ENV === 'production') return 'prod'
    if (process.env.VERCEL_ENV === 'preview') return 'preprod'
    if (process.env.VERCEL_ENV === 'development') return 'dev'
  }

  // 3. Client-side : détecter depuis l'URL
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname

    if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
      return 'dev'
    }

    if (hostname.includes('vercel.app')) {
      if (
        hostname.includes('git-') ||
        hostname.includes('develop') ||
        !hostname.includes('kara-loan-management.vercel.app')
      ) {
        return 'preprod'
      }
      return 'prod'
    }

    if (hostname.includes('preprod') || hostname.includes('staging')) {
      return 'preprod'
    }

    return 'prod'
  }

  // 4. Server-side : par défaut dev
  return 'dev'
}

// ==================== CLIENT ALGOLIA ====================

let client: ReturnType<typeof liteClient> | null = null

function getClient() {
  if (!client) {
    const appId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID
    const searchApiKey = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY

    if (!appId || !searchApiKey) {
      throw new Error(
        'Algolia n\'est pas configuré. Vérifiez NEXT_PUBLIC_ALGOLIA_APP_ID et NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY',
      )
    }

    client = liteClient(appId, searchApiKey)
  }

  return client
}

/**
 * Retourne le nom de l'index Algolia pour les membres selon l'environnement
 */
function getMembersIndexName(): string {
  const env = getEnvironment()
  const baseIndexName =
    process.env.NEXT_PUBLIC_ALGOLIA_MEMBERS_INDEX_NAME || 'members'

  // Si l'index name contient déjà l'environnement, l'utiliser tel quel
  if (
    baseIndexName.includes('-dev') ||
    baseIndexName.includes('-preprod') ||
    baseIndexName.includes('-prod')
  ) {
    return baseIndexName
  }

  return `${baseIndexName}-${env}`
}

// ==================== SERVICE ====================

export class BirthdaysAlgoliaService {
  /**
   * Recherche un membre par nom/prénom/matricule
   * Retourne les résultats avec le mois d'anniversaire pour navigation automatique
   * 
   * @param query - Terme de recherche (nom, prénom ou matricule)
   * @returns Résultats de recherche avec targetMonth pour navigation
   */
  static async search(query: string): Promise<BirthdaySearchResult> {
    if (!query || query.trim().length === 0) {
      return {
        hits: [],
        targetMonth: null,
      }
    }

    // Vérifier si Algolia est disponible
    if (!this.isAvailable()) {
      console.warn('[BirthdaysAlgoliaService] Algolia n\'est pas configuré')
      return {
        hits: [],
        targetMonth: null,
      }
    }

    try {
      const algoliaClient = getClient()
      const indexName = getMembersIndexName()
      
      console.log('[BirthdaysAlgoliaService] Recherche dans l\'index:', indexName, 'query:', query)

      // Construire les filtres Algolia
      // Seulement les membres actifs avec rôles Adherant, Bienfaiteur ou Sympathisant
      const filters =
        'isActive:true AND (roles:"Adherant" OR roles:"Bienfaiteur" OR roles:"Sympathisant")'

      // Recherche Algolia
      const response = await algoliaClient.search({
        requests: [
          {
            indexName,
            query: query.trim(),
            filters,
            attributesToRetrieve: [
              'objectID',
              'firstName',
              'lastName',
              'birthMonth',
              'birthDay',
              'photoURL',
            ],
            hitsPerPage: 10,
          },
        ],
      })

      // Extraire les résultats du premier (et seul) index
      const firstResult = response.results[0]
      if (!firstResult || !('hits' in firstResult)) {
        return {
          hits: [],
          targetMonth: null,
        }
      }

      const hits = (firstResult.hits || []) as Array<{
        objectID: string
        firstName?: string
        lastName?: string
        birthMonth?: number
        birthDay?: number
        photoURL?: string
      }>

      // Transformer les hits en BirthdaySearchHit
      const transformedHits: BirthdaySearchHit[] = hits
        .filter((hit) => hit.birthMonth !== undefined && hit.birthMonth !== null)
        .map((hit) => ({
          objectID: hit.objectID,
          firstName: hit.firstName || '',
          lastName: hit.lastName || '',
          birthMonth: hit.birthMonth!,
          birthDay: hit.birthDay || 1,
          photoURL: hit.photoURL,
        }))

      // Le targetMonth est le birthMonth du premier résultat
      const targetMonth = transformedHits[0]?.birthMonth || null

      return {
        hits: transformedHits,
        targetMonth,
      }
    } catch (error) {
      console.error('[BirthdaysAlgoliaService] Erreur lors de la recherche:', error)
      throw error
    }
  }

  /**
   * Vérifie si Algolia est configuré et disponible
   */
  static isAvailable(): boolean {
    try {
      const appId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID
      const searchApiKey = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY
      return Boolean(appId && searchApiKey)
    } catch {
      return false
    }
  }

  /**
   * Retourne le nom de l'index utilisé (pour debug)
   */
  static getIndexName(): string {
    return getMembersIndexName()
  }
}
