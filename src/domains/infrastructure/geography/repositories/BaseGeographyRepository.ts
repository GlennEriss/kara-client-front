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
   * Normalise le texte pour la recherche (lowercase, sans accents)
   */
  private normalizeSearchQuery(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
  }

  /**
   * Vérifie si un item matche la recherche (sur name et champs additionnels)
   */
  protected matchesSearch(item: T, searchLower: string): boolean {
    const nameNorm = this.normalizeSearchQuery(item.name)
    if (nameNorm.includes(searchLower)) return true
    const code = (item as any).code
    if (code && this.normalizeSearchQuery(code).includes(searchLower)) return true
    return false
  }

  /**
   * Fallback : charge sans filtre searchableText et filtre côté client
   * Utilisé quand index en cours de build ou searchableText manquant
   */
  private async getPaginatedWithClientFilter(options: QueryOptions): Promise<PaginatedResult<T>> {
    const { pageSize = 20, search, parentId, orderBy = 'name', orderDirection = 'asc' } = options
    const searchLower = search ? this.normalizeSearchQuery(search) : ''

    const {
      collection,
      query,
      where,
      orderBy: firestoreOrderBy,
      limit,
      getDocs,
      db,
    } = await getFirestore()

    const collectionRef = collection(db, this.collectionName)
    const constraints: any[] = []

    if (parentId) {
      constraints.push(where(this.getParentIdField(), '==', parentId))
    }
    constraints.push(firestoreOrderBy(orderBy, orderDirection))
    constraints.push(limit(500)) // Charger plus pour filtrer (géographie = petit volume)

    const q = query(collectionRef, ...constraints)
    const snapshot = await getDocs(q)

    const allItems: T[] = []
    snapshot.forEach((doc) => {
      allItems.push(this.mapDocToEntity(doc.id, doc.data()))
    })

    const filtered = searchLower
      ? allItems.filter((item) => this.matchesSearch(item, searchLower))
      : allItems

    const pageSizeNum = typeof pageSize === 'number' ? pageSize : 20
    const page = filtered.slice(0, pageSizeNum)
    const hasNextPage = filtered.length > pageSizeNum

    return {
      data: page,
      pagination: {
        nextCursor: hasNextPage ? page[page.length - 1]?.id : null,
        prevCursor: null,
        hasNextPage,
        hasPrevPage: false,
        pageSize: pageSizeNum,
      },
    }
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

    const runServerSearch = async (): Promise<PaginatedResult<T>> => {
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

      if (parentId) {
        constraints.push(where(this.getParentIdField(), '==', parentId))
      }

      if (search && search.trim()) {
        const searchLower = this.normalizeSearchQuery(search)
        constraints.push(where('searchableText', '>=', searchLower))
        constraints.push(where('searchableText', '<=', searchLower + '\uf8ff'))
      }

      constraints.push(firestoreOrderBy(orderBy, orderDirection))

      if (cursor) {
        const cursorDoc = await getDoc(doc(db, this.collectionName, cursor))
        if (cursorDoc.exists()) {
          constraints.push(startAfter(cursorDoc))
        }
      }

      constraints.push(limit(pageSize + 1))

      const q = query(collectionRef, ...constraints)
      const snapshot = await getDocs(q)

      const items: T[] = []
      snapshot.forEach((doc) => {
        items.push(this.mapDocToEntity(doc.id, doc.data()))
      })

      const hasNextPage = items.length > pageSize
      if (hasNextPage) {
        items.pop()
      }

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
    }

    try {
      const result = await runServerSearch()

      // Fallback : si recherche avec 0 résultats, peut-être searchableText manquant
      if (search && search.trim() && result.data.length === 0) {
        console.warn(
          `[${this.name}] Recherche sur searchableText retourne 0 résultats, fallback recherche côté client (name/code)`
        )
        return this.getPaginatedWithClientFilter(options)
      }

      return result
    } catch (error: any) {
      const msg = error?.message || ''
      const isIndexBuilding =
        msg.includes('index is currently building') ||
        msg.includes('requires an index') ||
        msg.includes('The query requires an index')

      if (isIndexBuilding && search && search.trim()) {
        console.warn(
          `[${this.name}] Index Firestore en cours de build, fallback recherche côté client`
        )
        return this.getPaginatedWithClientFilter(options)
      }
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
