import { CharityMedia } from '@/types/types'

const getFirestore = () => import('@/firebase/firestore')

export class CharityMediaRepository {
  /**
   * Récupère tous les médias d'un évènement
   */
  static async getByEventId(eventId: string): Promise<CharityMedia[]> {
    try {
      const { collection, query, orderBy, getDocs, db } = await getFirestore()
      const mediaRef = collection(db, `charity-events/${eventId}/media`)
      const q = query(mediaRef, orderBy('createdAt', 'desc'))
      const snapshot = await getDocs(q)

      return snapshot.docs.map(d => this.mapDocToMedia(d.id, d.data()))
    } catch (error) {
      console.error('Error fetching media:', error)
      throw error
    }
  }

  /**
   * Récupère un média par son ID
   */
  static async getById(eventId: string, mediaId: string): Promise<CharityMedia | null> {
    try {
      const { doc, getDoc, db } = await getFirestore()
      const docRef = doc(db, 'charity-events', eventId, 'media', mediaId)
      const docSnap = await getDoc(docRef)

      if (!docSnap.exists()) {
        return null
      }

      return this.mapDocToMedia(docSnap.id, docSnap.data())
    } catch (error) {
      console.error('Error fetching media:', error)
      throw error
    }
  }

  /**
   * Nettoie un objet en supprimant les valeurs undefined
   */
  private static cleanObject(obj: any): any {
    const cleaned: any = {}
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined && value !== null) {
        if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
          const cleanedNested = this.cleanObject(value)
          if (Object.keys(cleanedNested).length > 0) {
            cleaned[key] = cleanedNested
          }
        } else {
          cleaned[key] = value
        }
      }
    }
    return cleaned
  }

  /**
   * Crée un nouveau média
   */
  static async create(eventId: string, media: Omit<CharityMedia, 'id'>): Promise<string> {
    try {
      const { collection, addDoc, Timestamp, db } = await getFirestore()
      const mediaRef = collection(db, `charity-events/${eventId}/media`)
      
      const dataToSave: any = {
        ...media,
        eventId,
        createdAt: Timestamp.fromDate(media.createdAt),
      }

      if (media.takenAt) {
        dataToSave.takenAt = Timestamp.fromDate(media.takenAt)
      }

      // Nettoyer l'objet pour supprimer les valeurs undefined
      const cleanedData = this.cleanObject(dataToSave)

      const docRef = await addDoc(mediaRef, cleanedData)

      return docRef.id
    } catch (error) {
      console.error('Error creating media:', error)
      throw error
    }
  }

  /**
   * Met à jour un média
   */
  static async update(eventId: string, mediaId: string, updates: Partial<CharityMedia>): Promise<void> {
    try {
      const { doc, updateDoc, Timestamp, db } = await getFirestore()
      const docRef = doc(db, 'charity-events', eventId, 'media', mediaId)
      const updateData: any = { ...updates }

      if (updates.takenAt) {
        updateData.takenAt = Timestamp.fromDate(updates.takenAt)
      }

      // Nettoyer l'objet pour supprimer les valeurs undefined
      const cleanedUpdates = this.cleanObject(updateData)

      await updateDoc(docRef, cleanedUpdates)
    } catch (error) {
      console.error('Error updating media:', error)
      throw error
    }
  }

  /**
   * Supprime un média
   */
  static async delete(eventId: string, mediaId: string): Promise<void> {
    try {
      const { doc, deleteDoc, db } = await getFirestore()
      const docRef = doc(db, 'charity-events', eventId, 'media', mediaId)
      await deleteDoc(docRef)
    } catch (error) {
      console.error('Error deleting media:', error)
      throw error
    }
  }

  /**
   * Convertit un timestamp Firestore en Date de manière sécurisée
   */
  private static toDateSafe(value: any): Date {
    if (!value) return new Date()
    if (value instanceof Date) return value
    if (value && typeof value.toDate === 'function') {
      return value.toDate()
    }
    return new Date(value)
  }

  /**
   * Mappe un document Firestore vers un CharityMedia
   */
  private static mapDocToMedia(id: string, data: any): CharityMedia {
    return {
      id,
      eventId: data.eventId,
      type: data.type,
      url: data.url,
      path: data.path,
      thumbnailUrl: data.thumbnailUrl,
      thumbnailPath: data.thumbnailPath,
      title: data.title,
      description: data.description,
      takenAt: data.takenAt ? this.toDateSafe(data.takenAt) : undefined,
      createdAt: this.toDateSafe(data.createdAt),
      createdBy: data.createdBy
    }
  }
}

