/**
 * Service de recherche Algolia pour les membres (collection users)
 * 
 * Détecte automatiquement l'environnement (dev/preprod/prod) et utilise
 * l'index Algolia correspondant (members-dev, members-preprod, members-prod).
 * 
 * Voir documentation/memberships/V2/algolia/README.md pour la configuration.
 */

import { liteClient } from 'algoliasearch/lite'
import { db, collection, getDocs, query, where, limit as fbLimit } from '@/firebase/firestore'
import type { User, MembershipType, UserRole } from '@/types/types'
import { firebaseCollectionNames } from '@/constantes/firebase-collection-names'

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
      if (hostname.includes('git-') || hostname.includes('develop') || !hostname.includes('kara-loan-management.vercel.app')) {
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
      throw new Error('Algolia n\'est pas configuré. Vérifiez NEXT_PUBLIC_ALGOLIA_APP_ID et NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY')
    }
    
    client = liteClient(appId, searchApiKey)
  }
  
  return client
}

/**
 * Retourne le nom de l'index Algolia pour les membres selon l'environnement et le tri
 */
function getMembersIndexName(sortBy?: MembersSortBy): string {
  const env = getEnvironment()
  const baseIndexName = process.env.NEXT_PUBLIC_ALGOLIA_MEMBERS_INDEX_NAME || 'members'
  
  // Si l'index name contient déjà l'environnement, l'utiliser tel quel
  if (baseIndexName.includes('-dev') || baseIndexName.includes('-preprod') || baseIndexName.includes('-prod')) {
    return baseIndexName
  }
  
  const indexWithEnv = `${baseIndexName}-${env}`
  
  // Ajouter le suffixe de tri si nécessaire (replica)
  if (sortBy === 'name_asc') {
    return `${indexWithEnv}_name_asc`
  }
  
  // Par défaut : index principal (trié par createdAt desc)
  return indexWithEnv
}

// ==================== TYPES ====================

export type MembersSortBy = 'created_desc' | 'name_asc'

export interface MembersSearchFilters {
  /** Type de membre (adherant, bienfaiteur, sympathisant) */
  membershipType?: MembershipType
  /** Rôles spécifiques */
  roles?: UserRole[]
  /** Membre actif ou non */
  isActive?: boolean
  /** Genre (M ou F) */
  gender?: 'M' | 'F'
  /** Possède une voiture */
  hasCar?: boolean
  /** Province de résidence */
  province?: string
  /** Ville de résidence */
  city?: string
  /** Arrondissement */
  arrondissement?: string
  /** ID de l'entreprise */
  companyId?: string
  /** Nom de l'entreprise (recherche partielle) */
  companyName?: string
  /** ID de la profession */
  professionId?: string
  /** Nom de la profession (recherche partielle) */
  profession?: string
}

export interface MembersSearchOptions {
  /** Terme de recherche (nom, prénom, matricule, email, téléphone, entreprise, etc.) */
  query?: string
  /** Filtres à appliquer */
  filters?: MembersSearchFilters
  /** Numéro de page (1-based) */
  page?: number
  /** Nombre de résultats par page */
  hitsPerPage?: number
  /** Tri des résultats */
  sortBy?: MembersSortBy
}

export interface MembersSearchPagination {
  page: number
  limit: number
  totalItems: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export interface MembersSearchResult {
  items: User[]
  pagination: MembersSearchPagination
}

// ==================== SERVICE ====================

/**
 * Service de recherche Algolia pour les membres (collection users)
 * 
 * Fonctionnalités:
 * - Recherche full-text avec tolérance aux fautes
 * - Filtrage par type de membre, activité, genre, voiture, localisation, entreprise, profession
 * - Pagination
 * - Tri par nom ou date de création
 * - Récupération des données complètes depuis Firestore
 */
export class MembersAlgoliaSearchService {
  /**
   * Recherche des membres dans Algolia avec filtres et pagination
   * 
   * Note: Algolia stocke searchableText (généré dynamiquement) et les champs de recherche,
   * mais PAS les données complètes. Les données complètes sont récupérées depuis Firestore.
   */
  async search(options: MembersSearchOptions): Promise<MembersSearchResult> {
    const {
      query = '',
      filters = {},
      page = 1,
      hitsPerPage = 20,
      sortBy = 'created_desc',
    } = options

    try {
      const algoliaClient = getClient()
      const indexName = getMembersIndexName(sortBy)

      // Construire les filtres Algolia
      const algoliaFilters = this.buildAlgoliaFilters(filters)

      // Recherche Algolia avec l'API v5
      const searchResponse = await algoliaClient.search({
        requests: [{
          indexName,
          query,
          filters: algoliaFilters,
          page: page - 1, // Algolia utilise 0-based indexing
          hitsPerPage,
          attributesToRetrieve: ['objectID'], // On récupère seulement les IDs
        }],
      })
      
      // Extraire les résultats du premier (et seul) index
      const firstResult = searchResponse.results[0]
      if (!firstResult || !('hits' in firstResult)) {
        return this.emptyResult(page, hitsPerPage)
      }
      
      const resultHits = firstResult.hits || []
      const resultNbHits = firstResult.nbHits || 0
      const resultNbPages = firstResult.nbPages || 0
      const resultCurrentPage = firstResult.page || 0

      // Récupérer les IDs des résultats
      const memberIds = resultHits.map((hit: { objectID: string }) => hit.objectID)

      // Si aucun résultat, retourner une réponse vide
      if (memberIds.length === 0) {
        return {
          items: [],
          pagination: {
            page: resultCurrentPage + 1,
            limit: hitsPerPage,
            totalItems: resultNbHits,
            totalPages: resultNbPages,
            hasNextPage: false,
            hasPrevPage: resultCurrentPage > 0,
          },
        }
      }

      // Récupérer les données complètes depuis Firestore
      const items = await this.fetchMembersFromFirestore(memberIds)

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
      console.error('[MembersAlgoliaSearchService] Erreur lors de la recherche:', error)
      throw error
    }
  }

  /**
   * Construit la chaîne de filtres Algolia à partir des filtres métier
   */
  private buildAlgoliaFilters(filters: MembersSearchFilters): string | undefined {
    const filterStrings: string[] = []
    
    // Filtre par type de membre
    if (filters.membershipType) {
      filterStrings.push(`membershipType:"${filters.membershipType}"`)
    }
    
    // Filtre par rôles (OR entre les rôles)
    if (filters.roles && filters.roles.length > 0) {
      const rolesFilter = filters.roles.map(role => `roles:"${role}"`).join(' OR ')
      filterStrings.push(`(${rolesFilter})`)
    }
    
    // Filtre par statut actif
    if (filters.isActive !== undefined) {
      filterStrings.push(`isActive:${filters.isActive}`)
    }
    
    // Filtre par genre
    if (filters.gender) {
      filterStrings.push(`gender:"${filters.gender}"`)
    }
    
    // Filtre par possession de voiture
    if (filters.hasCar !== undefined) {
      filterStrings.push(`hasCar:${filters.hasCar}`)
    }
    
    // Filtres géographiques
    if (filters.province) {
      filterStrings.push(`province:"${filters.province}"`)
    }
    
    if (filters.city) {
      filterStrings.push(`city:"${filters.city}"`)
    }
    
    if (filters.arrondissement) {
      filterStrings.push(`arrondissement:"${filters.arrondissement}"`)
    }
    
    // Filtres professionnels
    if (filters.companyId) {
      filterStrings.push(`companyId:"${filters.companyId}"`)
    }
    
    if (filters.professionId) {
      filterStrings.push(`professionId:"${filters.professionId}"`)
    }

    return filterStrings.length > 0 ? filterStrings.join(' AND ') : undefined
  }

  /**
   * Récupère les données complètes des membres depuis Firestore
   */
  private async fetchMembersFromFirestore(memberIds: string[]): Promise<User[]> {
    const collectionRef = collection(db, firebaseCollectionNames.users)
    
    // Firestore limite les requêtes "in" à 10 éléments, on fait des batches
    const batchSize = 10
    const batches: string[][] = []
    
    for (let i = 0; i < memberIds.length; i += batchSize) {
      batches.push(memberIds.slice(i, i + batchSize))
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

    // Transformer les documents en User
    const items: User[] = []
    
    allDocs.forEach(snapshot => {
      snapshot.forEach(docSnap => {
        const data = docSnap.data()
        items.push(this.transformFirestoreDocument(docSnap.id, data))
      })
    })

    // Préserver l'ordre des IDs retournés par Algolia (important pour le ranking)
    const itemsMap = new Map(items.map(item => [item.id, item]))
    return memberIds
      .map(id => itemsMap.get(id))
      .filter((item): item is User => item !== undefined)
  }

  /**
   * Transforme un document Firestore en User
   */
  private transformFirestoreDocument(id: string, data: any): User {
    return {
      id,
      matricule: data.matricule || id,
      lastName: data.lastName || '',
      firstName: data.firstName || '',
      birthDate: data.birthDate || '',
      birthPlace: data.birthPlace,
      contacts: data.contacts || [],
      gender: data.gender || 'M',
      email: data.email,
      nationality: data.nationality || '',
      hasCar: data.hasCar || false,
      address: data.address,
      companyName: data.companyName,
      profession: data.profession,
      photoURL: data.photoURL,
      photoPath: data.photoPath,
      identityDocument: data.identityDocument,
      identityDocumentNumber: data.identityDocumentNumber,
      subscriptions: data.subscriptions || [],
      dossier: data.dossier || '',
      membershipType: data.membershipType || 'adherant',
      roles: data.roles || ['Adherant'],
      createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt || Date.now()),
      updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt || Date.now()),
      isActive: data.isActive !== false, // Par défaut actif
      companyId: data.companyId,
      professionId: data.professionId,
    } as User
  }

  /**
   * Retourne un résultat vide avec la pagination appropriée
   */
  private emptyResult(page: number, limit: number): MembersSearchResult {
    return {
      items: [],
      pagination: {
        page,
        limit,
        totalItems: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: page > 1,
      },
    }
  }

  /**
   * Vérifie si Algolia est configuré et disponible
   */
  isAvailable(): boolean {
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
  getIndexName(sortBy?: MembersSortBy): string {
    return getMembersIndexName(sortBy)
  }
}

// ==================== SINGLETON ====================

let instance: MembersAlgoliaSearchService | null = null

/**
 * Obtient l'instance singleton du service Algolia pour les membres
 */
export function getMembersAlgoliaSearchService(): MembersAlgoliaSearchService {
  if (!instance) {
    instance = new MembersAlgoliaSearchService()
  }
  return instance
}

/**
 * Réinitialise l'instance singleton (utile pour les tests)
 */
export function resetMembersAlgoliaSearchService(): void {
  instance = null
}
