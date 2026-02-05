import { CharityParticipant } from '@/types/types'

const getFirestore = () => import('@/firebase/firestore')

export class CharityParticipantRepository {
  /**
   * Nettoie un objet en supprimant les valeurs undefined
   */
  private static cleanObject(obj: any): any {
    const cleaned: any = {}
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
          const nested = this.cleanObject(value)
          if (Object.keys(nested).length > 0) {
            cleaned[key] = nested
          }
        } else {
          cleaned[key] = value
        }
      }
    }
    return cleaned
  }

  /**
   * Récupère tous les participants d'un évènement
   */
  static async getByEventId(eventId: string): Promise<CharityParticipant[]> {
    try {
      const { collection, query, orderBy, getDocs, db } = await getFirestore()
      const participantsRef = collection(db, `charity-events/${eventId}/participants`)
      const q = query(participantsRef, orderBy('createdAt', 'desc'))
      const snapshot = await getDocs(q)

      return snapshot.docs.map(d => this.mapDocToParticipant(d.id, d.data()))
    } catch (error) {
      console.error('Error fetching participants:', error)
      throw error
    }
  }

  /**
   * Récupère un participant par son ID
   */
  static async getById(eventId: string, participantId: string): Promise<CharityParticipant | null> {
    try {
      if (!participantId) {
        console.warn('getById called without participantId')
        return null
      }
      const { doc, getDoc, collection, db } = await getFirestore()
      const participantsRef = collection(db, 'charity-events', eventId, 'participants')
      const docRef = doc(participantsRef, participantId)
      const docSnap = await getDoc(docRef)

      if (!docSnap.exists()) {
        return null
      }

      return this.mapDocToParticipant(docSnap.id, docSnap.data())
    } catch (error) {
      console.error('Error fetching participant:', error)
      throw error
    }
  }

  /**
   * Récupère un participant par memberId ou groupId
   */
  static async getByMemberOrGroup(eventId: string, memberId?: string, groupId?: string): Promise<CharityParticipant | null> {
    try {
      const { collection, query, where, getDocs, db } = await getFirestore()
      const participantsRef = collection(db, `charity-events/${eventId}/participants`)
      let q

      if (memberId) {
        q = query(participantsRef, where('memberId', '==', memberId))
      } else if (groupId) {
        q = query(participantsRef, where('groupId', '==', groupId))
      } else {
        return null
      }

      const snapshot = await getDocs(q)
      
      if (snapshot.empty) {
        return null
      }

      const d = snapshot.docs[0]
      return this.mapDocToParticipant(d.id, d.data())
    } catch (error) {
      console.error('Error fetching participant by member/group:', error)
      throw error
    }
  }

  /**
   * Récupère les participants par type
   */
  static async getByType(eventId: string, type: 'member' | 'group'): Promise<CharityParticipant[]> {
    try {
      const { collection, query, where, orderBy, getDocs, db } = await getFirestore()
      const participantsRef = collection(db, `charity-events/${eventId}/participants`)
      const q = query(
        participantsRef,
        where('participantType', '==', type),
        orderBy('totalAmount', 'desc')
      )
      const snapshot = await getDocs(q)

      return snapshot.docs.map(d => this.mapDocToParticipant(d.id, d.data()))
    } catch (error) {
      console.error('Error fetching participants by type:', error)
      throw error
    }
  }

  /**
   * Crée un nouveau participant.
   * L'ID du document est le matricule du membre (memberId) pour les membres,
   * ou le groupId pour les groupes.
   */
  static async create(eventId: string, participant: Omit<CharityParticipant, 'id'>): Promise<string> {
    try {
      const { doc, setDoc, Timestamp, db } = await getFirestore()
      
      // ID du participant = memberId (matricule) pour les membres, groupId pour les groupes
      const participantId = participant.participantType === 'member' && participant.memberId
        ? participant.memberId
        : participant.groupId || `PARTICIPANT_${Date.now()}`
      
      const docRef = doc(db, 'charity-events', eventId, 'participants', participantId)
      const dataToSave: any = {
        ...participant,
        createdAt: Timestamp.fromDate(participant.createdAt),
        updatedAt: Timestamp.fromDate(participant.updatedAt),
        lastContributionAt: participant.lastContributionAt 
          ? Timestamp.fromDate(participant.lastContributionAt)
          : null
      }

      const cleanedData = this.cleanObject(dataToSave)
      await setDoc(docRef, cleanedData)

      return participantId
    } catch (error) {
      console.error('Error creating participant:', error)
      throw error
    }
  }

  /**
   * Met à jour un participant
   */
  static async update(eventId: string, participantId: string, updates: Partial<CharityParticipant>): Promise<void> {
    try {
      if (!participantId) {
        throw new Error('Participant ID is required for update')
      }
      const { doc, updateDoc, Timestamp, collection, db } = await getFirestore()
      const participantsRef = collection(db, 'charity-events', eventId, 'participants')
      const docRef = doc(participantsRef, participantId)
      const updateData: any = { ...updates }

      if (updates.updatedAt) {
        updateData.updatedAt = Timestamp.fromDate(updates.updatedAt)
      }

      if (updates.lastContributionAt) {
        updateData.lastContributionAt = Timestamp.fromDate(updates.lastContributionAt)
      }

      const cleanedUpdates = this.cleanObject(updateData)
      await updateDoc(docRef, cleanedUpdates)
    } catch (error) {
      console.error('Error updating participant:', error)
      throw error
    }
  }

  /**
   * Supprime un participant
   */
  static async delete(eventId: string, participantId: string): Promise<void> {
    try {
      if (!participantId) {
        throw new Error('Participant ID is required for delete')
      }
      const { doc, deleteDoc, collection, db } = await getFirestore()
      const participantsRef = collection(db, 'charity-events', eventId, 'participants')
      const docRef = doc(participantsRef, participantId)
      await deleteDoc(docRef)
    } catch (error) {
      console.error('Error deleting participant:', error)
      throw error
    }
  }

  /**
   * Convertit un timestamp Firestore en Date de manière sécurisée
   */
  private static toDateSafe(value: any): Date | undefined {
    if (!value) return undefined
    if (value instanceof Date) return value
    if (value && typeof value.toDate === 'function') {
      return value.toDate()
    }
    return new Date(value)
  }

  /**
   * Mappe un document Firestore vers un CharityParticipant
   */
  private static mapDocToParticipant(id: string, data: any): CharityParticipant {
    return {
      id,
      eventId: data.eventId,
      participantType: data.participantType,
      memberId: data.memberId,
      groupId: data.groupId,
      totalAmount: data.totalAmount || 0,
      contributionsCount: data.contributionsCount || 0,
      lastContributionAt: this.toDateSafe(data.lastContributionAt),
      createdAt: this.toDateSafe(data.createdAt) || new Date(),
      updatedAt: this.toDateSafe(data.updatedAt) || new Date(),
      createdBy: data.createdBy,
      updatedBy: data.updatedBy
    }
  }
}

