import { IRepository } from '@/repositories/IRepository'
import type { PaginatedResult, QueryOptions, CountCache } from '../types/pagination.types'

const getFirestore = () => import('@/firebase/firestore')

/**
 * Repository de base avec pagination et recherche côté serveur
 * Firestore n'a pas de recherche full-text native, on utilise :
 * - Un champ `searchableText` (lowercase) pour la recherche par préfixe
 * - `startAfter()` + `limit()` pour la pagination efficace
 */
export abstract class BaseGeographyRepository<T extends { id: string; name: string }> implements IRepository {
  abstract readonly name: string
  protected abstract readonly collectionName: string
  
  /** Cache de comptage avec TTL */
  private countCache: Map<string, CountCache> = new Map()
  private readonly COUNT_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  /**
   * Convertit un document Firestore en entité
   */
  protected abstract mapDocToEntity(id: string, data: any): T

  /**
   * Génère le texte de recherche (lowercase, sans accents)
   */
  protected generateSearchableText(name: string, ...additionalFields: (string | undefined)[]): string {
    const fields = [name, ...additionalFields].filter(Boolean)
    return fields
      .join(' ')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
  }

  /**
   * Récupère les données paginées avec recherche côté serveur
   */
  async getPaginated(options: QueryOptions = {}): Promise<PaginatedResult<T>> {
    const {
      pageSize = 20,
      cursor,
      search,
      parentId,
      orderBy = 'name',
      orderDirection = 'asc',
    } = options

    try {
      const {
        collection,
        query,
        where,
        orderBy: firestoreOrderBy,
        limit,
        startAfter,
        getDocs,
        doc,
        getDoc,
        db,
      } = await getFirestore()

      const collectionRef = collection(db, this.collectionName)
      const constraints: any[] = []

      // Filtre par parent si spécifié
      if (parentId) {
        constraints.push(where(this.getParentIdField(), '==', parentId))
      }

      // Recherche par préfixe sur searchableText
      if (search && search.trim()) {
        const searchLower = search.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        constraints.push(where('searchableText', '>=', searchLower))
        constraints.push(where('searchableText', '<=', searchLower + '\uf8ff'))
      }

      // Tri
      constraints.push(firestoreOrderBy(orderBy, orderDirection))

      // Pagination avec cursor
      if (cursor) {
        const cursorDoc = await getDoc(doc(db, this.collectionName, cursor))
        if (cursorDoc.exists()) {
          constraints.push(startAfter(cursorDoc))
        }
      }

      // Limiter à pageSize + 1 pour savoir s'il y a une page suivante
      constraints.push(limit(pageSize + 1))

      const q = query(collectionRef, ...constraints)
      const snapshot = await getDocs(q)

      const items: T[] = []
      snapshot.forEach((doc) => {
        items.push(this.mapDocToEntity(doc.id, doc.data()))
      })

      // Vérifier s'il y a une page suivante
      const hasNextPage = items.length > pageSize
      if (hasNextPage) {
        items.pop() // Retirer l'élément en trop
      }

      // Curseurs
      const lastItem = items[items.length - 1]
      const firstItem = items[0]

      return {
        data: items,
        pagination: {
          nextCursor: hasNextPage && lastItem ? lastItem.id : null,
          prevCursor: cursor ? firstItem?.id || null : null,
          hasNextPage,
          hasPrevPage: !!cursor,
          pageSize,
        },
      }
    } catch (error) {
      console.error(`Erreur lors de la récupération paginée de ${this.name}:`, error)
      throw error
    }
  }

  /**
   * Compte le nombre total d'éléments (avec cache)
   */
  async getCount(parentId?: string): Promise<number> {
    const cacheKey = parentId || '__all__'
    const cached = this.countCache.get(cacheKey)
    
    // Vérifier le cache
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.count
    }

    try {
      const { collection, query, where, getCountFromServer, db } = await getFirestore()
      const collectionRef = collection(db, this.collectionName)

      let q
      if (parentId) {
        q = query(collectionRef, where(this.getParentIdField(), '==', parentId))
      } else {
        q = query(collectionRef)
      }

      const countSnapshot = await getCountFromServer(q)
      const count = countSnapshot.data().count

      // Mettre en cache
      this.countCache.set(cacheKey, {
        count,
        timestamp: Date.now(),
        ttl: this.COUNT_CACHE_TTL,
      })

      return count
    } catch (error) {
      console.error(`Erreur lors du comptage de ${this.name}:`, error)
      // En cas d'erreur, retourner le cache même expiré ou 0
      return cached?.count ?? 0
    }
  }

  /**
   * Invalide le cache de comptage
   */
  invalidateCountCache(parentId?: string): void {
    if (parentId) {
      this.countCache.delete(parentId)
    } else {
      this.countCache.clear()
    }
  }

  /**
   * Retourne le nom du champ parentId pour ce repository
   */
  protected getParentIdField(): string {
    return 'parentId' // À surcharger dans les sous-classes
  }

  /**
   * Crée un élément avec le champ searchableText
   */
  async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {
    try {
      const { collection, addDoc, db, serverTimestamp } = await getFirestore()
      const collectionRef = collection(db, this.collectionName)

      const docData: any = {
        ...data,
        searchableText: this.generateSearchableText((data as any).name, (data as any).code),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }

      // Nettoyer les valeurs undefined
      Object.keys(docData).forEach((key) => {
        if (docData[key] === undefined) {
          delete docData[key]
        }
      })

      const docRef = await addDoc(collectionRef, docData)
      const createdDoc = await this.getById(docRef.id)

      if (!createdDoc) {
        throw new Error(`Erreur lors de la récupération de l'élément créé`)
      }

      // Invalider le cache de comptage
      this.invalidateCountCache()

      return createdDoc
    } catch (error) {
      console.error(`Erreur lors de la création dans ${this.name}:`, error)
      throw error
    }
  }

  /**
   * Met à jour un élément avec le champ searchableText
   */
  async update(id: string, data: Partial<Omit<T, 'id' | 'createdAt'>>): Promise<T> {
    try {
      const { doc, updateDoc, db, serverTimestamp } = await getFirestore()
      const docRef = doc(db, this.collectionName, id)

      const updateData: any = {
        ...data,
        updatedAt: serverTimestamp(),
      }

      // Mettre à jour searchableText si le nom ou le code change
      if ((data as any).name || (data as any).code) {
        const existing = await this.getById(id)
        if (existing) {
          updateData.searchableText = this.generateSearchableText(
            (data as any).name || existing.name,
            (data as any).code || (existing as any).code
          )
        }
      }

      // Nettoyer les valeurs undefined
      Object.keys(updateData).forEach((key) => {
        if (updateData[key] === undefined) {
          delete updateData[key]
        }
      })

      await updateDoc(docRef, updateData)
      const updatedDoc = await this.getById(id)

      if (!updatedDoc) {
        throw new Error(`Erreur lors de la récupération de l'élément mis à jour`)
      }

      return updatedDoc
    } catch (error) {
      console.error(`Erreur lors de la mise à jour dans ${this.name}:`, error)
      throw error
    }
  }

  /**
   * Supprime un élément
   */
  async delete(id: string): Promise<void> {
    try {
      const { doc, deleteDoc, db } = await getFirestore()
      const docRef = doc(db, this.collectionName, id)
      await deleteDoc(docRef)

      // Invalider le cache de comptage
      this.invalidateCountCache()
    } catch (error) {
      console.error(`Erreur lors de la suppression dans ${this.name}:`, error)
      throw error
    }
  }

  /**
   * Récupère un élément par ID
   */
  async getById(id: string): Promise<T | null> {
    try {
      const { doc, getDoc, db } = await getFirestore()
      const docRef = doc(db, this.collectionName, id)
      const snapshot = await getDoc(docRef)

      if (!snapshot.exists()) {
        return null
      }

      return this.mapDocToEntity(snapshot.id, snapshot.data())
    } catch (error) {
      console.error(`Erreur lors de la récupération par ID dans ${this.name}:`, error)
      throw error
    }
  }

  /**
   * DEPRECATED: Utiliser getPaginated() à la place
   * Garde pour rétro-compatibilité temporaire
   */
  async getAll(): Promise<T[]> {
    console.warn(`${this.name}.getAll() is deprecated. Use getPaginated() instead.`)
    const result = await this.getPaginated({ pageSize: 1000 })
    return result.data
  }

  /**
   * DEPRECATED: Utiliser getPaginated() avec search à la place
   */
  async searchByName(searchTerm: string, parentId?: string): Promise<T[]> {
    console.warn(`${this.name}.searchByName() is deprecated. Use getPaginated({ search }) instead.`)
    const result = await this.getPaginated({
      search: searchTerm,
      parentId,
      pageSize: 100,
    })
    return result.data
  }
}
