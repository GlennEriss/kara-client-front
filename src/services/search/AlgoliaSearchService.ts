/**
 * Service de recherche Algolia pour les demandes d'adhésion
 * 
 * Détecte automatiquement l'environnement (dev/preprod/prod) et utilise
 * l'index Algolia correspondant.
 * 
 * Voir MULTI_ENVIRONNEMENTS_ALGOLIA.md pour la configuration des environnements.
 */

import { liteClient } from 'algoliasearch/lite'
import { db, collection, getDocs, query, where, limit as fbLimit } from '@/firebase/firestore'
import type { MembershipRequest } from '@/domains/memberships/entities'
import type { MembershipRequestPagination } from '@/domains/memberships/entities'
import { MEMBERSHIP_REQUEST_COLLECTIONS } from '@/constantes/membership-requests'

// Détection de l'environnement
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
    if (process.env.VERCEL_ENV === 'production') {
      return 'prod'
    }
    if (process.env.VERCEL_ENV === 'preview') {
      return 'preprod'
    }
    if (process.env.VERCEL_ENV === 'development') {
      return 'dev'
    }
  }
  
  // 3. Client-side : détecter depuis l'URL
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    
    // Localhost = dev
    if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
      return 'dev'
    }
    
    // Vercel preview URLs (preprod)
    // Pattern: *.vercel.app (sauf production) ou avec "develop" dans le nom
    if (hostname.includes('vercel.app')) {
      // Si c'est un preview Vercel (contient "git-" ou "develop" ou n'est pas le domaine de production)
      if (hostname.includes('git-') || hostname.includes('develop') || !hostname.includes('kara-loan-management.vercel.app')) {
        return 'preprod'
      }
      // Sinon, c'est probablement la production
      return 'prod'
    }
    
    // Patterns explicites preprod/staging
    if (hostname.includes('preprod') || hostname.includes('staging')) {
      return 'preprod'
    }
    
    // Par défaut, considérer comme prod
    return 'prod'
  }
  
  // 4. Server-side : par défaut dev si aucune variable d'environnement
  return 'dev'
}


// Initialisation du client Algolia
let client: ReturnType<typeof liteClient> | null = null

function getClient() {
  if (!client) {
    const appId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID
    const searchApiKey = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY
    
    if (!appId || !searchApiKey) {
      throw new Error('Algolia n\'est pas configuré. Vérifiez NEXT_PUBLIC_ALGOLIA_APP_ID et NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY')
    }
    
    client = liteClient(appId, searchApiKey)
  }
  
  return client
}

function getIndexName(): string {
  const env = getEnvironment()
  const baseIndexName = process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME || 'membership-requests'
  
  // Si l'index name contient déjà l'environnement, l'utiliser tel quel
  if (baseIndexName.includes('-dev') || baseIndexName.includes('-preprod') || baseIndexName.includes('-prod')) {
    return baseIndexName
  }
  
  // Sinon, ajouter le suffixe d'environnement
  return `${baseIndexName}-${env}`
}

export interface SearchOptions {
  query?: string
  filters?: {
    isPaid?: boolean
    status?: string
  }
  page?: number
  hitsPerPage?: number
}

export interface SearchResult {
  items: MembershipRequest[]
  pagination: MembershipRequestPagination
}

/**
 * Service de recherche Algolia pour les demandes d'adhésion
 */
export class AlgoliaSearchService {
  /**
   * Recherche dans Algolia avec filtres et pagination
   * 
   * Note: Algolia stocke les champs de recherche (searchableText généré dynamiquement, matricule, firstName, etc.)
   * mais PAS les données complètes. Pour récupérer les données complètes, on fait un fetch Firestore après la recherche Algolia.
   * 
   * IMPORTANT: searchableText n'existe PAS dans Firestore, il est généré uniquement pour Algolia lors de la synchronisation.
   */
  async search(options: SearchOptions): Promise<SearchResult> {
    const {
      query = '',
      filters = {},
      page = 1,
      hitsPerPage = 20,
    } = options

    try {
      const algoliaClient = getClient()
      const indexName = getIndexName()

      // Construire les filtres Algolia
      const filterStrings: string[] = []
      
      if (filters.isPaid !== undefined) {
        filterStrings.push(`isPaid:${filters.isPaid}`)
      }
      
      if (filters.status && filters.status !== 'all') {
        filterStrings.push(`status:"${filters.status}"`)
      }

      const algoliaFilters = filterStrings.length > 0 ? filterStrings.join(' AND ') : undefined

      // Recherche Algolia avec l'API v5
      const searchResponse = await algoliaClient.search({
        requests: [{
          indexName,
          query,
          filters: algoliaFilters,
          page: page - 1, // Algolia utilise 0-based indexing
          hitsPerPage,
          attributesToRetrieve: ['objectID'], // On récupère seulement les IDs pour ensuite fetch Firestore
        }],
      })
      
      // Extraire les résultats du premier (et seul) index
      const firstResult = searchResponse.results[0]
      if (!firstResult || !('hits' in firstResult)) {
        return {
          items: [],
          pagination: {
            page: 1,
            limit: hitsPerPage,
            totalItems: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPrevPage: false,
          },
        }
      }
      
      // Type guard: vérifier que c'est bien un SearchResult (pas SearchForFacetValuesResponse)
      const resultHits = firstResult.hits || []
      const resultNbHits = firstResult.nbHits || 0
      const resultNbPages = firstResult.nbPages || 0
      const resultCurrentPage = firstResult.page || 0

      // Récupérer les IDs des résultats
      const requestIds = resultHits.map((hit: { objectID: string }) => hit.objectID)

      // Si aucun résultat, retourner une réponse vide
      if (requestIds.length === 0) {
        return {
          items: [],
          pagination: {
            page: resultCurrentPage + 1,
            limit: hitsPerPage,
            totalItems: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPrevPage: false,
          },
        }
      }

      // Récupérer les données complètes depuis Firestore
      const items = await this.fetchFullDataFromFirestore(requestIds)

      return {
        items,
        pagination: {
          page: resultCurrentPage + 1, // Convertir en 1-based
          limit: hitsPerPage,
          totalItems: resultNbHits,
          totalPages: resultNbPages,
          hasNextPage: resultCurrentPage + 1 < resultNbPages,
          hasPrevPage: resultCurrentPage > 0,
        },
      }
    } catch (error) {
      console.error('Erreur lors de la recherche Algolia:', error)
      throw error
    }
  }

  /**
   * Récupère les données complètes depuis Firestore pour les IDs donnés
   */
  private async fetchFullDataFromFirestore(requestIds: string[]): Promise<MembershipRequest[]> {
    const collectionRef = collection(db, MEMBERSHIP_REQUEST_COLLECTIONS.REQUESTS)
    
    // Firestore limite les requêtes "in" à 10 éléments, donc on doit faire des batches
    const batchSize = 10
    const batches: string[][] = []
    
    for (let i = 0; i < requestIds.length; i += batchSize) {
      batches.push(requestIds.slice(i, i + batchSize))
    }

    // Récupérer tous les documents en parallèle
    const allDocs = await Promise.all(
      batches.map(batch => {
        const batchQuery = query(
          collectionRef,
          where('__name__', 'in', batch),
          fbLimit(batch.length)
        )
        return getDocs(batchQuery)
      })
    )

    // Transformer les documents en MembershipRequest
    const items: MembershipRequest[] = []
    
    allDocs.forEach(snapshot => {
      snapshot.forEach(docSnap => {
        const data = docSnap.data()
        items.push(this.transformFirestoreDocument(docSnap.id, data))
      })
    })

    // Préserver l'ordre des IDs retournés par Algolia
    const itemsMap = new Map(items.map(item => [item.id, item]))
    return requestIds
      .map(id => itemsMap.get(id))
      .filter((item): item is MembershipRequest => item !== undefined)
  }

  /**
   * Transforme un document Firestore en MembershipRequest
   */
  private transformFirestoreDocument(id: string, data: any): MembershipRequest {
    return {
      id,
      ...data,
      // Normaliser isPaid : si undefined/null, considérer comme false
      isPaid: data.isPaid === true ? true : false,
      createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt || Date.now()),
      updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt || Date.now()),
      processedAt: data.processedAt?.toDate?.() || (data.processedAt ? new Date(data.processedAt) : undefined),
      securityCodeExpiry: data.securityCodeExpiry?.toDate?.() || (data.securityCodeExpiry ? new Date(data.securityCodeExpiry) : undefined),
    } as MembershipRequest
  }

}

// Instance singleton
let instance: AlgoliaSearchService | null = null

/**
 * Obtient l'instance singleton du service Algolia
 */
export function getAlgoliaSearchService(): AlgoliaSearchService {
  if (!instance) {
    instance = new AlgoliaSearchService()
  }
  return instance
}
