import { CharityContribution } from '@/types/types'

const getFirestore = () => import('@/firebase/firestore')

export class CharityContributionRepository {
  /**
   * Récupère toutes les contributions d'un évènement
   */
  static async getByEventId(eventId: string): Promise<CharityContribution[]> {
    try {
      const { collection, query, orderBy, getDocs, db } = await getFirestore()
      const contributionsRef = collection(db, `charity-events/${eventId}/contributions`)
      const q = query(contributionsRef, orderBy('createdAt', 'desc'))
      const snapshot = await getDocs(q)

      return snapshot.docs.map(d => this.mapDocToContribution(d.id, d.data()))
    } catch (error) {
      console.error('Error fetching contributions:', error)
      throw error
    }
  }

  /**
   * Récupère une contribution par son ID
   */
  static async getById(eventId: string, contributionId: string): Promise<CharityContribution | null> {
    try {
      const { doc, getDoc, db } = await getFirestore()
      const docRef = doc(db, 'charity-events', eventId, 'contributions', contributionId)
      const docSnap = await getDoc(docRef)

      if (!docSnap.exists()) {
        return null
      }

      return this.mapDocToContribution(docSnap.id, docSnap.data())
    } catch (error) {
      console.error('Error fetching contribution:', error)
      throw error
    }
  }

  /**
   * Récupère les contributions d'un participant
   */
  static async getByParticipantId(eventId: string, participantId: string): Promise<CharityContribution[]> {
    try {
      const { collection, query, where, orderBy, getDocs, db } = await getFirestore()
      const contributionsRef = collection(db, `charity-events/${eventId}/contributions`)
      const q = query(
        contributionsRef,
        where('participantId', '==', participantId),
        orderBy('createdAt', 'desc')
      )
      const snapshot = await getDocs(q)

      return snapshot.docs.map(d => this.mapDocToContribution(d.id, d.data()))
    } catch (error) {
      console.error('Error fetching participant contributions:', error)
      throw error
    }
  }

  /**
   * Nettoie un objet en supprimant les valeurs undefined
   */
  private static cleanObject(obj: any): any {
    const cleaned: any = {}
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
          // Nettoyer les objets imbriqués
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
   * Crée une nouvelle contribution
   */
  static async create(eventId: string, contribution: Omit<CharityContribution, 'id'>): Promise<string> {
    try {
      const { collection, addDoc, Timestamp, db } = await getFirestore()
      const contributionsRef = collection(db, `charity-events/${eventId}/contributions`)
      
      // Préparer les données avec conversion des dates
      const dataToSave: any = {
        ...contribution,
        eventId,
        participantId: contribution.participantId,
        createdAt: Timestamp.fromDate(contribution.createdAt),
        updatedAt: Timestamp.fromDate(contribution.updatedAt),
      }

      console.log('💾 Repository - contribution.contributionDate:', contribution.contributionDate)

      if (contribution.contributionDate) {
        dataToSave.contributionDate = Timestamp.fromDate(contribution.contributionDate)
        console.log('✅ Repository - contributionDate convertie en Timestamp')
      } else {
        console.log('❌ Repository - Pas de contributionDate trouvée')
      }

      // Gérer le payment si présent
      if (contribution.payment) {
        dataToSave.payment = {
          ...contribution.payment,
          date: Timestamp.fromDate(contribution.payment.date)
        }
      }

      // Nettoyer l'objet pour supprimer les valeurs undefined
      const cleanedData = this.cleanObject(dataToSave)
      
      console.log('🔍 Repository - cleanedData final:', {
        hasContributionDate: !!cleanedData.contributionDate,
        contributionDate: cleanedData.contributionDate
      })

      const docRef = await addDoc(contributionsRef, cleanedData)

      return docRef.id
    } catch (error) {
      console.error('Error creating contribution:', error)
      throw error
    }
  }

  /**
   * Met à jour une contribution
   */
  static async update(eventId: string, contributionId: string, updates: Partial<CharityContribution>): Promise<void> {
    try {
      const { doc, updateDoc, Timestamp, db } = await getFirestore()
      const docRef = doc(db, 'charity-events', eventId, 'contributions', contributionId)
      const updateData: any = { ...updates }

      if (updates.updatedAt) {
        updateData.updatedAt = Timestamp.fromDate(updates.updatedAt)
      }

      if (updates.payment) {
        updateData.payment = {
          ...updates.payment,
          date: Timestamp.fromDate(updates.payment.date)
        }
      }

      // Nettoyer les mises à jour pour supprimer les valeurs undefined
      const cleanedUpdates = this.cleanObject(updateData)

      await updateDoc(docRef, cleanedUpdates)
    } catch (error) {
      console.error('Error updating contribution:', error)
      throw error
    }
  }

  /**
   * Supprime une contribution
   */
  static async delete(eventId: string, contributionId: string): Promise<void> {
    try {
      const { doc, deleteDoc, db } = await getFirestore()
      const docRef = doc(db, 'charity-events', eventId, 'contributions', contributionId)
      await deleteDoc(docRef)
    } catch (error) {
      console.error('Error deleting contribution:', error)
      throw error
    }
  }

  /**
   * Calcule le montant total collecté pour un évènement
   */
  static async getTotalAmount(eventId: string): Promise<number> {
    try {
      const contributions = await this.getByEventId(eventId)
      return contributions.reduce((total, contribution) => {
        if (contribution.contributionType === 'money' && contribution.payment) {
          return total + contribution.payment.amount
        }
        if (contribution.contributionType === 'in_kind' && contribution.estimatedValue) {
          return total + contribution.estimatedValue
        }
        return total
      }, 0)
    } catch (error) {
      console.error('Error calculating total amount:', error)
      throw error
    }
  }

  /**
   * Convertit un timestamp Firestore en Date de manière sécurisée
   * Gère aussi bien les objets Timestamp (avec .toDate)
   * que les objets bruts { seconds, nanoseconds }.
   */
  private static toDateSafe(value: any): Date {
    try {
      if (!value) return new Date()

      // Déjà une Date JS
      if (value instanceof Date) return value

      // Timestamp Firestore classique
      if (value && typeof value.toDate === 'function') {
        const d = value.toDate()
        if (!isNaN(d.getTime())) return d
        return new Date()
      }

      // Objet brut { seconds, nanoseconds }
      if (
        typeof value === 'object' &&
        value !== null &&
        typeof value.seconds === 'number'
      ) {
        const millis =
          value.seconds * 1000 +
          (typeof value.nanoseconds === 'number' ? value.nanoseconds / 1e6 : 0)
        const d = new Date(millis)
        if (!isNaN(d.getTime())) return d
        return new Date()
      }

      // Fallback générique
      const d = new Date(value)
      if (!isNaN(d.getTime())) return d
      return new Date()
    } catch (e) {
      console.warn('toDateSafe: valeur de date invalide, fallback now()', value, e)
      return new Date()
    }
  }

  /**
   * Mappe un document Firestore vers une CharityContribution
   */
  private static mapDocToContribution(id: string, data: any): CharityContribution {
    return {
      id,
      eventId: data.eventId,
      participantId: data.participantId,
      contributionType: data.contributionType,
      payment: data.payment ? {
        ...data.payment,
        date: this.toDateSafe(data.payment.date)
      } : undefined,
      contributionDate: data.contributionDate ? this.toDateSafe(data.contributionDate) : undefined,
      inKindDescription: data.inKindDescription,
      estimatedValue: data.estimatedValue,
      notes: data.notes,
      proofUrl: data.proofUrl,
      proofPath: data.proofPath,
      proofType: data.proofType,
      receiptUrl: data.receiptUrl,
      receiptPath: data.receiptPath,
      status: data.status,
      createdAt: this.toDateSafe(data.createdAt),
      updatedAt: this.toDateSafe(data.updatedAt),
      createdBy: data.createdBy,
      updatedBy: data.updatedBy
    }
  }
}

