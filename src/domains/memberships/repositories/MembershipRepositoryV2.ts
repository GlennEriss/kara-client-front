/**
 * Repository V2 pour Membership Requests
 * 
 * Implémentation propre avec TDD, respectant les diagrammes de séquence
 * et utilisant les index Firebase correctement.
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
  updateDoc,
  serverTimestamp,
  getCountFromServer,
} from '@/firebase/firestore'
import { IMembershipRepository } from './interfaces/IMembershipRepository'
import { 
  MembershipRequest, 
  MembershipRequestFilters, 
  MembershipRequestsResponse,
  MembershipStatistics,
  PaymentInfo,
  MembershipRequestPagination,
} from '../entities/MembershipRequest'
import { 
  MEMBERSHIP_REQUEST_COLLECTIONS, 
  MEMBERSHIP_REQUEST_PAGINATION 
} from '@/constantes/membership-requests'
import type { MembershipRequestStatus } from '@/types/types'

export class MembershipRepositoryV2 implements IMembershipRepository {
  private static instance: MembershipRepositoryV2
  private readonly collectionName = MEMBERSHIP_REQUEST_COLLECTIONS.REQUESTS

  private constructor() {}

  static getInstance(): MembershipRepositoryV2 {
    if (!MembershipRepositoryV2.instance) {
      MembershipRepositoryV2.instance = new MembershipRepositoryV2()
    }
    return MembershipRepositoryV2.instance
  }

  async getAll(
    filters: MembershipRequestFilters = {}, 
    page: number = 1, 
    pageLimit: number = MEMBERSHIP_REQUEST_PAGINATION.DEFAULT_LIMIT
  ): Promise<MembershipRequestsResponse> {
    try {
      const collectionRef = collection(db, this.collectionName)
      
      // Construction de la requête
      // IMPORTANT: L'ordre des where() doit correspondre à l'ordre des champs dans l'index Firestore
      const constraints: any[] = []
      
      // Ordre des filtres pour correspondre aux index :
      // 1. isPaid en premier (index: isPaid + status + createdAt)
      // 2. status en second (index: status + createdAt)
      // Si on a les deux, utiliser l'index composite: isPaid + status + createdAt
      // Si on a seulement isPaid, utiliser l'index: isPaid + createdAt
      // Si on a seulement status, utiliser l'index: status + createdAt
      
      // Filtre par paiement (premier pour correspondre aux index composites)
      // NOTE: On utilise '==' au lieu de '!=' pour éviter les problèmes d'index Firestore
      // avec les requêtes contenant des inégalités sur plusieurs champs.
      // Les documents sans le champ isPaid seront exclus, mais c'est acceptable
      // car les nouvelles demandes devraient avoir isPaid: false par défaut.
      if (filters.isPaid !== undefined) {
        constraints.push(where('isPaid', '==', filters.isPaid))
      }
      
      // Filtre par statut (après isPaid si présent)
      if (filters.status && filters.status !== 'all') {
        constraints.push(where('status', '==', filters.status))
      }
      
      // Tri par date décroissante (obligatoire pour la pagination)
      constraints.push(orderBy('createdAt', 'desc'))
      
      // Limite
      constraints.push(fbLimit(pageLimit))
      
      // Construire la requête
      const q = query(collectionRef, ...constraints)
      
      // Debug: Log de la requête pour vérification
      console.log('🔍 Repository.getAll - Filtres:', filters)
      console.log('🔍 Repository.getAll - Constraints:', constraints.map(c => c.type === 'where' ? `${c._field?.path || c.field} ${c._operator || c.op} ${c._value || c.value}` : c.type).join(', '))
      
      // Exécuter la requête
      const querySnapshot = await getDocs(q)
      
      console.log('🔍 Repository.getAll - Résultats trouvés:', querySnapshot.size, 'documents')
      
      // Transformer les documents
      const items: MembershipRequest[] = []
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data()
        items.push(this.transformDocument(docSnap.id, data))
      })
      
      // Calculer le total (requête séparée pour compter avec TOUS les filtres)
      // IMPORTANT: Même ordre que la requête principale pour correspondre aux index
      const countConstraints: any[] = []
      
      // Filtre par paiement (premier pour correspondre aux index composites)
      // IMPORTANT: Même logique que la requête principale
      // Filtre par paiement pour le comptage (même logique que la requête principale)
      if (filters.isPaid !== undefined) {
        countConstraints.push(where('isPaid', '==', filters.isPaid))
      }
      
      // Filtre par statut (après isPaid si présent)
      if (filters.status && filters.status !== 'all') {
        countConstraints.push(where('status', '==', filters.status))
      }
      
      // Note: Firestore exige un index pour les requêtes avec plusieurs where.
      // Le tri est ajouté pour correspondre à l'index (même si non nécessaire pour le count).
      if (countConstraints.length > 0) {
        countConstraints.push(orderBy('createdAt', 'desc'))
      }
      
      const countQuery = query(collectionRef, ...countConstraints)
      const totalCountSnapshot = await getCountFromServer(countQuery)
      const totalItems = totalCountSnapshot.data().count
      
      // Calculer la pagination
      const totalPages = totalItems > 0 ? Math.ceil(totalItems / pageLimit) : 0
      const pagination: MembershipRequestPagination = {
        page,
        limit: pageLimit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      }
      
      return {
        items,
        pagination,
      }
    } catch (error) {
      console.error('❌ Erreur Repository.getAll:', error)
      throw error
    }
  }

  async getById(id: string): Promise<MembershipRequest | null> {
    if (!id || id.trim() === '') {
      throw new Error('ID est requis')
    }
    
    try {
      const docRef = doc(db, this.collectionName, id)
      const docSnap = await getDoc(docRef)
      
      if (!docSnap.exists()) {
        return null
      }
      
      return this.transformDocument(docSnap.id, docSnap.data())
    } catch (error) {
      console.error('❌ Erreur Repository.getById:', error)
      throw error
    }
  }

  async updateStatus(
    id: string, 
    status: MembershipRequest['status'], 
    data?: Partial<MembershipRequest>
  ): Promise<void> {
    try {
      // Vérifier que le document existe
      const existing = await this.getById(id)
      if (!existing) {
        throw new Error(`Demande avec ID ${id} introuvable`)
      }
      
      const docRef = doc(db, this.collectionName, id)
      const updateData: any = {
        status,
        updatedAt: serverTimestamp(),
        ...data,
      }
      
      await updateDoc(docRef, updateData)
    } catch (error) {
      console.error('❌ Erreur Repository.updateStatus:', error)
      throw error
    }
  }

  async markAsPaid(id: string, paymentInfo: PaymentInfo): Promise<void> {
    // Validation
    if (paymentInfo.amount <= 0) {
      throw new Error('Le montant doit être positif')
    }
    
    const validModes: PaymentInfo['mode'][] = ['AirtelMoney', 'Mobicash', 'Cash', 'Virement', 'Chèque']
    if (!validModes.includes(paymentInfo.mode)) {
      throw new Error(`Mode de paiement invalide: ${paymentInfo.mode}`)
    }
    
    try {
      // Vérifier que le document existe
      const existing = await this.getById(id)
      if (!existing) {
        throw new Error(`Demande avec ID ${id} introuvable`)
      }
      
      // Transformer PaymentInfo en Payment pour MembershipRequest
      const payment: any = {
        date: new Date(paymentInfo.date),
        mode: paymentInfo.mode.toLowerCase().replace('money', '_money').replace('transfer', '_transfer') as any,
        amount: paymentInfo.amount,
        acceptedBy: existing.processedBy || 'admin', // TODO: récupérer l'admin actuel
        paymentType: 'Membership' as const,
        time: paymentInfo.time,
        withFees: paymentInfo.withFees,
      }
      
      const docRef = doc(db, this.collectionName, id)
      const currentPayments = existing.payments || []
      
      await updateDoc(docRef, {
        isPaid: true,
        payments: [...currentPayments, payment],
        updatedAt: serverTimestamp(),
      })
    } catch (error) {
      console.error('❌ Erreur Repository.markAsPaid:', error)
      throw error
    }
  }

  async getStatistics(): Promise<MembershipStatistics> {
    try {
      const collectionRef = collection(db, this.collectionName)
      
      // Compter le total
      const totalQuery = query(collectionRef)
      const totalSnapshot = await getCountFromServer(totalQuery)
      const total = totalSnapshot.data().count
      
      // Compter par statut
      const statusQueries = {
        pending: query(collectionRef, where('status', '==', 'pending')),
        under_review: query(collectionRef, where('status', '==', 'under_review')),
        approved: query(collectionRef, where('status', '==', 'approved')),
        rejected: query(collectionRef, where('status', '==', 'rejected')),
      }
      
      const [pendingSnap, underReviewSnap, approvedSnap, rejectedSnap] = await Promise.all([
        getCountFromServer(statusQueries.pending),
        getCountFromServer(statusQueries.under_review),
        getCountFromServer(statusQueries.approved),
        getCountFromServer(statusQueries.rejected),
      ])
      
      const byStatus = {
        pending: pendingSnap.data().count,
        under_review: underReviewSnap.data().count,
        approved: approvedSnap.data().count,
        rejected: rejectedSnap.data().count,
      }
      
      // Compter par paiement
      const paidQuery = query(collectionRef, where('isPaid', '==', true))
      const unpaidQuery = query(collectionRef, where('isPaid', '==', false))
      
      const [paidSnap, unpaidSnap] = await Promise.all([
        getCountFromServer(paidQuery),
        getCountFromServer(unpaidQuery),
      ])
      
      const byPayment = {
        paid: paidSnap.data().count,
        unpaid: unpaidSnap.data().count,
      }
      
      // Calculer les pourcentages
      const percentages = {
        pending: total > 0 ? Math.round((byStatus.pending / total) * 100 * 10) / 10 : 0,
        under_review: total > 0 ? Math.round((byStatus.under_review / total) * 100 * 10) / 10 : 0,
        approved: total > 0 ? Math.round((byStatus.approved / total) * 100 * 10) / 10 : 0,
        rejected: total > 0 ? Math.round((byStatus.rejected / total) * 100 * 10) / 10 : 0,
      }
      
      return {
        total,
        byStatus,
        byPayment,
        percentages,
      }
    } catch (error) {
      console.error('❌ Erreur Repository.getStatistics:', error)
      throw error
    }
  }

  async search(query: string, filters?: MembershipRequestFilters): Promise<MembershipRequest[]> {
    // TODO: Implémenter la recherche côté serveur (Algolia ou Firestore)
    // Pour l'instant, récupérer toutes les demandes et filtrer côté client
    // (solution temporaire, à améliorer avec Algolia ou searchableText)
    
    const result = await this.getAll(filters || {}, 1, MEMBERSHIP_REQUEST_PAGINATION.STATS_LIMIT)
    
    if (!query || query.trim() === '') {
      return result.items
    }
    
    const searchTerm = query.toLowerCase().trim()
    return result.items.filter(request => {
      const firstName = request.identity.firstName?.toLowerCase() || ''
      const lastName = request.identity.lastName?.toLowerCase() || ''
      const email = request.identity.email?.toLowerCase() || ''
      const contacts = request.identity.contacts || []
      
      return (
        firstName.includes(searchTerm) ||
        lastName.includes(searchTerm) ||
        email.includes(searchTerm) ||
        contacts.some(contact => contact?.toLowerCase().includes(searchTerm))
      )
    })
  }

  /**
   * Transforme un document Firestore en MembershipRequest
   */
  private transformDocument(id: string, data: any): MembershipRequest {
    return {
      id,
      ...data,
      // Normaliser isPaid : si undefined/null, considérer comme false (non payé par défaut)
      isPaid: data.isPaid === true ? true : false,
      createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt || Date.now()),
      updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt || Date.now()),
      processedAt: data.processedAt?.toDate?.() || (data.processedAt ? new Date(data.processedAt) : undefined),
      securityCodeExpiry: data.securityCodeExpiry?.toDate?.() || (data.securityCodeExpiry ? new Date(data.securityCodeExpiry) : undefined),
    } as MembershipRequest
  }
}
