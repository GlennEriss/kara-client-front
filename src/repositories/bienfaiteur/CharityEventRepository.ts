import { CharityEvent, CharityEventFilters } from '@/types/types'

const getFirestore = () => import('@/firebase/firestore')

const COLLECTION_NAME = 'charity-events'

export interface PaginatedCharityEvents {
  events: CharityEvent[]
  total: number
  hasMore: boolean
  lastDoc: any
}

export class CharityEventRepository {
  /**
   * Récupère tous les évènements avec pagination
   */
  static async getPaginated(
    filters?: CharityEventFilters,
    page: number = 1,
    pageSize: number = 12
  ): Promise<PaginatedCharityEvents> {
    try {
      const { collection, query, where, orderBy, limit, getDocs, getCountFromServer, startAfter, Timestamp, db } = await getFirestore()
      const collectionRef = collection(db, COLLECTION_NAME)
      const constraints: any[] = []

      // Filtre par statut
      if (filters?.status && filters.status !== 'all') {
        if (filters.status === 'upcoming') {
          // Pour "à venir", filtrer par statut "upcoming" ET date de début dans le futur
          const now = Timestamp.now()
          constraints.push(where('status', '==', 'upcoming'))
          constraints.push(where('startDate', '>=', now))
        } else {
          constraints.push(where('status', '==', filters.status))
        }
      }

      // Filtre par date de début
      if (filters?.dateFrom) {
        constraints.push(where('startDate', '>=', Timestamp.fromDate(filters.dateFrom)))
      }

      // Filtre par date de fin
      if (filters?.dateTo) {
        constraints.push(where('endDate', '<=', Timestamp.fromDate(filters.dateTo)))
      }

      // Tri
      const orderField = filters?.orderByField || 'createdAt'
      const orderDirection = filters?.orderByDirection || 'desc'
      constraints.push(orderBy(orderField, orderDirection))

      // Récupérer le total (sans recherche pour le count)
      const countQuery = query(collectionRef, ...constraints)
      const countSnapshot = await getCountFromServer(countQuery)
      let total = countSnapshot.data().count

      // Pagination
      const limitValue = filters?.limit || pageSize
      constraints.push(limit(limitValue + 1)) // +1 pour vérifier s'il y a une page suivante

      // Si page > 1, ajouter startAfter
      if (page > 1 && filters?.lastDoc) {
        constraints.push(startAfter(filters.lastDoc))
      }

      const q = query(collectionRef, ...constraints)
      const snapshot = await getDocs(q)

      let events = snapshot.docs.slice(0, limitValue).map(d => this.mapDocToEvent(d.id, d.data()))

      // Filtre de recherche côté client (Firestore ne supporte pas bien les recherches textuelles)
      if (filters?.searchQuery && filters.searchQuery.trim().length > 0) {
        const searchQuery = filters.searchQuery.toLowerCase().trim()
        events = events.filter(event => 
          event.title.toLowerCase().includes(searchQuery) ||
          event.description.toLowerCase().includes(searchQuery) ||
          event.location.toLowerCase().includes(searchQuery)
        )
        // Ajuster le total après filtrage
        total = events.length
      }

      const hasMore = snapshot.docs.length > limitValue
      const lastDoc = snapshot.docs[snapshot.docs.length - 2] || snapshot.docs[snapshot.docs.length - 1]

      return {
        events,
        total,
        hasMore,
        lastDoc
      }
    } catch (error) {
      console.error('Error fetching paginated charity events:', error)
      throw error
    }
  }

  /**
   * Récupère tous les évènements (sans pagination - pour exports)
   */
  static async getAll(filters?: CharityEventFilters): Promise<CharityEvent[]> {
    try {
      const { collection, query, where, orderBy, limit, getDocs, Timestamp, db } = await getFirestore()
      const collectionRef = collection(db, COLLECTION_NAME)
      const constraints: any[] = []

      // Filtre par statut
      if (filters?.status && filters.status !== 'all') {
        if (filters.status === 'upcoming') {
          // Pour "à venir", filtrer par statut "upcoming" ET date de début dans le futur
          const now = Timestamp.now()
          constraints.push(where('status', '==', 'upcoming'))
          constraints.push(where('startDate', '>=', now))
        } else {
          constraints.push(where('status', '==', filters.status))
        }
      }

      // Filtre par date de début
      if (filters?.dateFrom) {
        constraints.push(where('startDate', '>=', Timestamp.fromDate(filters.dateFrom)))
      }

      // Filtre par date de fin
      if (filters?.dateTo) {
        constraints.push(where('endDate', '<=', Timestamp.fromDate(filters.dateTo)))
      }

      // Tri
      const orderField = filters?.orderByField || 'createdAt'
      const orderDirection = filters?.orderByDirection || 'desc'
      constraints.push(orderBy(orderField, orderDirection))

      // Limite
      if (filters?.limit) {
        constraints.push(limit(filters.limit))
      }

      const q = query(collectionRef, ...constraints)
      const snapshot = await getDocs(q)

      let events = snapshot.docs.map(d => this.mapDocToEvent(d.id, d.data()))

      // Filtre de recherche côté client (Firestore ne supporte pas bien les recherches textuelles)
      if (filters?.searchQuery && filters.searchQuery.trim().length > 0) {
        const searchQuery = filters.searchQuery.toLowerCase().trim()
        events = events.filter(event => 
          event.title.toLowerCase().includes(searchQuery) ||
          event.description.toLowerCase().includes(searchQuery) ||
          event.location.toLowerCase().includes(searchQuery)
        )
      }

      return events
    } catch (error) {
      console.error('Error fetching charity events:', error)
      throw error
    }
  }

  /**
   * Récupère un évènement par son ID
   */
  static async getById(id: string): Promise<CharityEvent | null> {
    try {
      const { doc, getDoc, db } = await getFirestore()
      const docRef = doc(db, COLLECTION_NAME, id)
      const docSnap = await getDoc(docRef)

      if (!docSnap.exists()) {
        return null
      }

      return this.mapDocToEvent(docSnap.id, docSnap.data())
    } catch (error) {
      console.error('Error fetching charity event:', error)
      throw error
    }
  }

  /**
   * Crée un nouvel évènement
   */
  static async create(event: Omit<CharityEvent, 'id'>): Promise<string> {
    try {
      const { addDoc, collection, Timestamp, db } = await getFirestore()
      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...event,
        startDate: Timestamp.fromDate(event.startDate),
        endDate: Timestamp.fromDate(event.endDate),
        createdAt: Timestamp.fromDate(event.createdAt),
        updatedAt: Timestamp.fromDate(event.updatedAt)
      })

      return docRef.id
    } catch (error) {
      console.error('Error creating charity event:', error)
      throw error
    }
  }

  /**
   * Met à jour un évènement existant
   */
  static async update(id: string, updates: Partial<CharityEvent>): Promise<void> {
    try {
      const { doc, updateDoc, Timestamp, db } = await getFirestore()
      const docRef = doc(db, COLLECTION_NAME, id)
      const updateData: any = { ...updates }

      // Convertir les dates en Timestamp
      if (updates.startDate) {
        updateData.startDate = Timestamp.fromDate(updates.startDate)
      }
      if (updates.endDate) {
        updateData.endDate = Timestamp.fromDate(updates.endDate)
      }
      if (updates.updatedAt) {
        updateData.updatedAt = Timestamp.fromDate(updates.updatedAt)
      }

      await updateDoc(docRef, updateData)
    } catch (error) {
      console.error('Error updating charity event:', error)
      throw error
    }
  }

  /**
   * Supprime un évènement
   */
  static async delete(id: string): Promise<void> {
    try {
      const { doc, deleteDoc, db } = await getFirestore()
      const docRef = doc(db, COLLECTION_NAME, id)
      await deleteDoc(docRef)
    } catch (error) {
      console.error('Error deleting charity event:', error)
      throw error
    }
  }

  /**
   * Récupère les évènements d'une année donnée
   */
  static async getByYear(year: number): Promise<CharityEvent[]> {
    try {
      const { collection, query, where, orderBy, getDocs, Timestamp, db } = await getFirestore()
      const startDate = new Date(year, 0, 1)
      const endDate = new Date(year + 1, 0, 1)

      const collectionRef = collection(db, COLLECTION_NAME)
      const q = query(
        collectionRef,
        where('startDate', '>=', Timestamp.fromDate(startDate)),
        where('startDate', '<', Timestamp.fromDate(endDate)),
        orderBy('startDate', 'desc')
      )

      const snapshot = await getDocs(q)
      return snapshot.docs.map(d => this.mapDocToEvent(d.id, d.data()))
    } catch (error) {
      console.error('Error fetching charity events by year:', error)
      throw error
    }
  }

  /**
   * Recherche d'évènements par titre ou description
   */
  static async search(searchQuery: string): Promise<CharityEvent[]> {
    try {
      const { collection, getDocs, db } = await getFirestore()
      const collectionRef = collection(db, COLLECTION_NAME)
      const snapshot = await getDocs(collectionRef)
      
      const events = snapshot.docs.map(d => this.mapDocToEvent(d.id, d.data()))
      
      // Filtre côté client (Firestore ne supporte pas bien les recherches textuelles)
      const query = searchQuery.toLowerCase()
      return events.filter(event => 
        event.title.toLowerCase().includes(query) ||
        event.description.toLowerCase().includes(query) ||
        event.location.toLowerCase().includes(query)
      )
    } catch (error) {
      console.error('Error searching charity events:', error)
      throw error
    }
  }

  /**
   * Convertit un timestamp Firestore en Date de manière sécurisée
   */
  private static toDateSafe(value: any): Date {
    if (!value) return new Date()
    if (value instanceof Date) {
      // Vérifier que la date est valide
      if (isNaN(value.getTime())) {
        console.warn('Invalid Date object detected, using current date')
        return new Date()
      }
      return value
    }
    if (value && typeof value.toDate === 'function') {
      try {
        const date = value.toDate()
        if (isNaN(date.getTime())) {
          console.warn('Invalid timestamp conversion, using current date')
          return new Date()
        }
        return date
      } catch (error) {
        console.error('Error converting timestamp:', error)
        return new Date()
      }
    }
    // Essayer de créer une Date depuis la valeur
    try {
      const date = new Date(value)
      if (isNaN(date.getTime())) {
        console.warn('Invalid date value:', value, 'using current date')
        return new Date()
      }
      return date
    } catch (error) {
      console.error('Error creating date from value:', value, error)
      return new Date()
    }
  }

  /**
   * Mappe un document Firestore vers un CharityEvent
   */
  private static mapDocToEvent(id: string, data: any): CharityEvent {
    return {
      id,
      title: data.title,
      slug: data.slug,
      description: data.description,
      location: data.location,
      startDate: this.toDateSafe(data.startDate),
      endDate: this.toDateSafe(data.endDate),
      minContributionAmount: data.minContributionAmount,
      targetAmount: data.targetAmount,
      currency: data.currency || 'FCFA',
      coverPhotoUrl: data.coverPhotoUrl,
      coverPhotoPath: data.coverPhotoPath,
      status: data.status,
      isPublic: data.isPublic ?? true,
      totalCollectedAmount: data.totalCollectedAmount || 0,
      totalContributionsCount: data.totalContributionsCount || 0,
      totalParticipantsCount: data.totalParticipantsCount || 0,
      totalGroupsCount: data.totalGroupsCount || 0,
      createdAt: this.toDateSafe(data.createdAt),
      updatedAt: this.toDateSafe(data.updatedAt),
      createdBy: data.createdBy,
      updatedBy: data.updatedBy
    }
  }
}

