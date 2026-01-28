/**
 * Repository V2 pour les Demandes Caisse Imprévue
 * 
 * Implémentation avec pagination serveur cursor-based, génération ID standardisé,
 * et traçabilité complète selon le workflow V2.
 */

import {
  db,
  collection,
  query,
  where,
  orderBy,
  limit as fbLimit,
  startAfter,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  getCountFromServer,
  Timestamp,
} from '@/firebase/firestore'
import { firebaseCollectionNames } from '@/constantes/firebase-collection-names'
import type { IDemandCIRepository } from './IDemandCIRepository'
import type {
  CaisseImprevueDemand,
  CreateCaisseImprevueDemandInput,
  UpdateCaisseImprevueDemandInput,
  AcceptDemandInput,
  RejectDemandInput,
  ReopenDemandInput,
  CaisseImprevueDemandStatus,
} from '../entities/demand.types'
import type {
  DemandFilters,
  PaginationParams,
  SortParams,
  PaginatedDemands,
  DemandStats,
} from '../entities/demand-filters.types'

export class DemandCIRepository implements IDemandCIRepository {
  private static instance: DemandCIRepository
  private readonly collectionName = firebaseCollectionNames.caisseImprevueDemands

  private constructor() {}

  static getInstance(): DemandCIRepository {
    if (!DemandCIRepository.instance) {
      DemandCIRepository.instance = new DemandCIRepository()
    }
    return DemandCIRepository.instance
  }

  /**
   * Génère un ID standardisé pour une demande
   * Format: MK_DEMANDE_CI_{4PremiersChiffresMatricule}_{DDMMYY}_{HHMM}
   * Exemple: MK_DEMANDE_CI_8438_270126_2219
   */
  private generateDemandId(memberMatricule: string): string {
    // Extraire les 4 premiers chiffres du matricule
    // Exemple: "8438.MK.160126" → "8438"
    const matriculePart = memberMatricule.split('.')[0] || memberMatricule.replace(/[^0-9]/g, '').slice(0, 4)
    const matriculeFormatted = matriculePart.padStart(4, '0')

    // Générer date et heure
    const now = new Date()
    const day = String(now.getDate()).padStart(2, '0')
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const year = String(now.getFullYear()).slice(-2)
    const dateFormatted = `${day}${month}${year}`
    
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    const timeFormatted = `${hours}${minutes}`

    return `MK_DEMANDE_CI_${matriculeFormatted}_${dateFormatted}_${timeFormatted}`
  }

  /**
   * Transforme un document Firestore en CaisseImprevueDemand
   */
  private transformDocument(docSnap: any): CaisseImprevueDemand {
    const data = docSnap.data()
    
    // Fonction helper pour convertir Timestamp en Date
    const toDate = (ts: any): Date | undefined => {
      if (!ts) return undefined
      if (ts instanceof Date) return ts
      if (ts?.toDate) return ts.toDate()
      return new Date(ts)
    }

    return {
      id: docSnap.id,
      ...data,
      createdAt: toDate(data.createdAt) || new Date(),
      updatedAt: toDate(data.updatedAt) || new Date(),
      acceptedAt: toDate(data.acceptedAt),
      rejectedAt: toDate(data.rejectedAt),
      reopenedAt: toDate(data.reopenedAt),
      deletedAt: toDate(data.deletedAt),
      convertedAt: toDate(data.convertedAt),
      decisionDate: toDate(data.decisionDate),
      convertedDate: toDate(data.convertedDate),
    } as CaisseImprevueDemand
  }

  /**
   * Calcule la priorité pour le tri par statut
   */
  private getStatusPriority(status: CaisseImprevueDemandStatus): number {
    const priorities: Record<CaisseImprevueDemandStatus, number> = {
      PENDING: 1,
      APPROVED: 2,
      REJECTED: 3,
      CONVERTED: 4,
      REOPENED: 5,
    }
    return priorities[status] || 99
  }

  async getPaginated(
    filters: DemandFilters = {},
    pagination: PaginationParams = { page: 1, limit: 10 },
    sort: SortParams = { sortBy: 'date', sortOrder: 'desc' }
  ): Promise<PaginatedDemands> {
    try {
      const collectionRef = collection(db, this.collectionName)
      const constraints: any[] = []

      // Filtres
      if (filters.status && filters.status !== 'all') {
        constraints.push(where('status', '==', filters.status))
      }

      if (filters.paymentFrequency && filters.paymentFrequency !== 'all') {
        constraints.push(where('paymentFrequency', '==', filters.paymentFrequency))
      }

      if (filters.subscriptionCIID) {
        constraints.push(where('subscriptionCIID', '==', filters.subscriptionCIID))
      }

      if (filters.memberId) {
        constraints.push(where('memberId', '==', filters.memberId))
      }

      // Tri
      if (sort.sortBy === 'date') {
        constraints.push(orderBy('createdAt', sort.sortOrder))
      } else if (sort.sortBy === 'alphabetical') {
        constraints.push(orderBy('memberLastName', sort.sortOrder))
        constraints.push(orderBy('memberFirstName', sort.sortOrder))
      }

      // Calculer le total
      const countQuery = query(collectionRef, ...constraints)
      const countSnapshot = await getCountFromServer(countQuery)
      const total = countSnapshot.data().count

      // Pagination cursor-based
      let queryRef = query(collectionRef, ...constraints)

      // Si on n'est pas à la première page, utiliser startAfter
      if (pagination.page > 1 && pagination.cursor) {
        const cursorDoc = await getDoc(doc(db, this.collectionName, pagination.cursor))
        if (cursorDoc.exists()) {
          queryRef = query(queryRef, startAfter(cursorDoc))
        }
      }

      // Limite
      queryRef = query(queryRef, fbLimit(pagination.limit))

      // Exécuter la requête
      const snapshot = await getDocs(queryRef)
      const items: CaisseImprevueDemand[] = []

      snapshot.forEach((docSnap) => {
        items.push(this.transformDocument(docSnap))
      })

      // Si tab "Toutes", trier par priorité de statut puis par date
      if (filters.status === 'all' || !filters.status) {
        items.sort((a, b) => {
          const priorityA = this.getStatusPriority(a.status)
          const priorityB = this.getStatusPriority(b.status)
          if (priorityA !== priorityB) {
            return priorityA - priorityB
          }
          // Si même priorité, trier par date décroissante
          return b.createdAt.getTime() - a.createdAt.getTime()
        })
      }

      // Calculer les métadonnées de pagination
      const totalPages = Math.ceil(total / pagination.limit)
      const lastDoc = items.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null
      const firstDoc = items.length > 0 ? snapshot.docs[0] : null

      return {
        items,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          totalPages,
          hasNextPage: pagination.page < totalPages,
          hasPreviousPage: pagination.page > 1,
          nextCursor: lastDoc?.id,
          previousCursor: firstDoc?.id,
        },
      }
    } catch (error) {
      console.error('Erreur lors de la récupération paginée des demandes:', error)
      throw error
    }
  }

  async getById(id: string): Promise<CaisseImprevueDemand | null> {
    try {
      const docRef = doc(db, this.collectionName, id)
      const docSnap = await getDoc(docRef)

      if (!docSnap.exists()) {
        return null
      }

      return this.transformDocument(docSnap)
    } catch (error) {
      console.error('Erreur lors de la récupération de la demande:', error)
      throw error
    }
  }

  async create(
    data: CreateCaisseImprevueDemandInput,
    memberMatricule: string
  ): Promise<CaisseImprevueDemand> {
    try {
      // Générer l'ID standardisé
      const demandId = this.generateDemandId(memberMatricule)

      // Préparer les données avec traçabilité
      const demandData: any = {
        ...data,
        id: demandId,
        status: 'PENDING' as CaisseImprevueDemandStatus,
        priority: this.getStatusPriority('PENDING'),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }

      // Nettoyer les valeurs undefined
      Object.keys(demandData).forEach((key) => {
        if (demandData[key] === undefined) {
          delete demandData[key]
        }
      })

      // Utiliser setDoc avec l'ID explicite (pas addDoc)
      const demandRef = doc(db, this.collectionName, demandId)
      await setDoc(demandRef, demandData)

      // Récupérer la demande créée
      const created = await this.getById(demandId)
      if (!created) {
        throw new Error('Erreur lors de la récupération de la demande créée')
      }

      return created
    } catch (error) {
      console.error('Erreur lors de la création de la demande:', error)
      throw error
    }
  }

  async update(
    id: string,
    data: UpdateCaisseImprevueDemandInput,
    updatedBy: string
  ): Promise<CaisseImprevueDemand> {
    try {
      const demandRef = doc(db, this.collectionName, id)

      const updateData: any = {
        ...data,
        updatedBy,
        updatedAt: serverTimestamp(),
      }

      // Nettoyer les valeurs undefined
      Object.keys(updateData).forEach((key) => {
        if (updateData[key] === undefined) {
          delete updateData[key]
        }
      })

      await updateDoc(demandRef, updateData)

      const updated = await this.getById(id)
      if (!updated) {
        throw new Error('Erreur lors de la récupération de la demande mise à jour')
      }

      return updated
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la demande:', error)
      throw error
    }
  }

  async accept(
    id: string,
    input: AcceptDemandInput,
    acceptedBy: string
  ): Promise<CaisseImprevueDemand> {
    try {
      const demandRef = doc(db, this.collectionName, id)
      const now = Timestamp.now()

      await updateDoc(demandRef, {
        status: 'APPROVED' as CaisseImprevueDemandStatus,
        priority: this.getStatusPriority('APPROVED'),
        decisionReason: input.reason,
        // Traçabilité V2
        acceptedBy,
        acceptedAt: now,
        // Compatibilité V1
        decisionMadeBy: acceptedBy,
        decisionDate: now,
        updatedBy: acceptedBy,
        updatedAt: serverTimestamp(),
      })

      const updated = await this.getById(id)
      if (!updated) {
        throw new Error('Erreur lors de la récupération de la demande acceptée')
      }

      return updated
    } catch (error) {
      console.error('Erreur lors de l\'acceptation de la demande:', error)
      throw error
    }
  }

  async reject(
    id: string,
    input: RejectDemandInput,
    rejectedBy: string
  ): Promise<CaisseImprevueDemand> {
    try {
      const demandRef = doc(db, this.collectionName, id)
      const now = Timestamp.now()

      await updateDoc(demandRef, {
        status: 'REJECTED' as CaisseImprevueDemandStatus,
        priority: this.getStatusPriority('REJECTED'),
        decisionReason: input.reason,
        // Traçabilité V2
        rejectedBy,
        rejectedAt: now,
        // Compatibilité V1
        decisionMadeBy: rejectedBy,
        decisionDate: now,
        updatedBy: rejectedBy,
        updatedAt: serverTimestamp(),
      })

      const updated = await this.getById(id)
      if (!updated) {
        throw new Error('Erreur lors de la récupération de la demande refusée')
      }

      return updated
    } catch (error) {
      console.error('Erreur lors du refus de la demande:', error)
      throw error
    }
  }

  async reopen(
    id: string,
    input: ReopenDemandInput,
    reopenedBy: string
  ): Promise<CaisseImprevueDemand> {
    try {
      const demandRef = doc(db, this.collectionName, id)
      const currentDemand = await this.getById(id)
      
      if (!currentDemand) {
        throw new Error('Demande non trouvée')
      }

      const now = Timestamp.now()

      await updateDoc(demandRef, {
        status: 'REOPENED' as CaisseImprevueDemandStatus,
        priority: this.getStatusPriority('REOPENED'),
        reopenReason: input.reason,
        // Traçabilité V2
        reopenedBy,
        reopenedAt: now,
        // Compatibilité V1
        reopenedDate: now,
        updatedBy: reopenedBy,
        updatedAt: serverTimestamp(),
      })

      const updated = await this.getById(id)
      if (!updated) {
        throw new Error('Erreur lors de la récupération de la demande réouverte')
      }

      return updated
    } catch (error) {
      console.error('Erreur lors de la réouverture de la demande:', error)
      throw error
    }
  }

  async delete(id: string, deletedBy: string): Promise<void> {
    try {
      const demandRef = doc(db, this.collectionName, id)
      const now = Timestamp.now()

      // Enregistrer la traçabilité AVANT la suppression
      await updateDoc(demandRef, {
        deletedBy,
        deletedAt: now,
        updatedBy: deletedBy,
        updatedAt: serverTimestamp(),
      })

      // Supprimer le document
      await deleteDoc(demandRef)
    } catch (error) {
      console.error('Erreur lors de la suppression de la demande:', error)
      throw error
    }
  }

  async search(
    query: string,
    filters: DemandFilters = {},
    limit: number = 50
  ): Promise<CaisseImprevueDemand[]> {
    try {
      const collectionRef = collection(db, this.collectionName)
      const normalizedQuery = query.trim().toLowerCase()
      const constraints: any[] = []

      // Recherche par préfixe sur nom de famille
      constraints.push(where('memberLastName', '>=', normalizedQuery))
      constraints.push(where('memberLastName', '<=', normalizedQuery + '\uf8ff'))
      constraints.push(orderBy('memberLastName'))
      constraints.push(fbLimit(limit))

      // Appliquer les filtres additionnels
      if (filters.status && filters.status !== 'all') {
        constraints.push(where('status', '==', filters.status))
      }

      const q = query(collectionRef, ...constraints)
      const snapshot = await getDocs(q)
      const results: CaisseImprevueDemand[] = []

      snapshot.forEach((docSnap) => {
        const demand = this.transformDocument(docSnap)
        
        // Filtrer aussi par prénom côté client si nécessaire
        const matchesFirstName = demand.memberFirstName
          ?.toLowerCase()
          .includes(normalizedQuery)
        
        const matchesLastName = demand.memberLastName
          ?.toLowerCase()
          .includes(normalizedQuery)

        if (matchesFirstName || matchesLastName) {
          results.push(demand)
        }
      })

      return results
    } catch (error) {
      console.error('Erreur lors de la recherche de demandes:', error)
      throw error
    }
  }

  async getStats(filters: DemandFilters = {}): Promise<DemandStats> {
    try {
      const collectionRef = collection(db, this.collectionName)
      const constraints: any[] = []

      // Appliquer les filtres
      if (filters.paymentFrequency && filters.paymentFrequency !== 'all') {
        constraints.push(where('paymentFrequency', '==', filters.paymentFrequency))
      }

      if (filters.subscriptionCIID) {
        constraints.push(where('subscriptionCIID', '==', filters.subscriptionCIID))
      }

      // Compter par statut
      const statuses: CaisseImprevueDemandStatus[] = ['PENDING', 'APPROVED', 'REJECTED', 'CONVERTED', 'REOPENED']
      const counts: Record<string, number> = {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        converted: 0,
        reopened: 0,
      }

      // Compter le total
      const totalQuery = query(collectionRef, ...constraints)
      const totalSnapshot = await getCountFromServer(totalQuery)
      counts.total = totalSnapshot.data().count

      // Compter par statut
      for (const status of statuses) {
        const statusQuery = query(collectionRef, ...constraints, where('status', '==', status))
        const statusSnapshot = await getCountFromServer(statusQuery)
        counts[status.toLowerCase()] = statusSnapshot.data().count
      }

      return {
        total: counts.total,
        pending: counts.pending,
        approved: counts.approved,
        rejected: counts.rejected,
        converted: counts.converted,
        reopened: counts.reopened,
      }
    } catch (error) {
      console.error('Erreur lors du calcul des statistiques:', error)
      throw error
    }
  }
}
