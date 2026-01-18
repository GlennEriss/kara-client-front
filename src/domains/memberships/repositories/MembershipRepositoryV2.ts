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
  MEMBERSHIP_REQUEST_PAGINATION,
  PAYMENT_MODES,
  type PaymentMode,
} from '@/constantes/membership-requests'
import type { MembershipRequestStatus } from '@/types/types'
import { PaymentRepositoryV2 } from './PaymentRepositoryV2'

export class MembershipRepositoryV2 implements IMembershipRepository {
  private static instance: MembershipRepositoryV2
  private readonly collectionName = MEMBERSHIP_REQUEST_COLLECTIONS.REQUESTS
  private paymentRepository: PaymentRepositoryV2

  private constructor() {
    this.paymentRepository = PaymentRepositoryV2.getInstance()
  }

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
      
      // Exécuter la requête
      const querySnapshot = await getDocs(q)
      
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
      throw error
    }
  }

  async markAsPaid(id: string, paymentInfo: PaymentInfo): Promise<void> {
    // Validation
    if (paymentInfo.amount <= 0) {
      throw new Error('Le montant doit être positif')
    }
    
    // Utiliser les constantes centralisées pour la validation
    const validModes = Object.values(PAYMENT_MODES) as PaymentMode[]
    if (!validModes.includes(paymentInfo.mode)) {
      throw new Error(`Mode de paiement invalide: ${paymentInfo.mode}. Modes autorisés: ${validModes.join(', ')}`)
    }
    
    try {
      // Vérifier que le document existe
      const existing = await this.getById(id)
      if (!existing) {
        throw new Error(`Demande avec ID ${id} introuvable`)
      }
      
      // Transformer PaymentInfo en Payment pour MembershipRequest
      // Le mode est déjà dans le bon format (PaymentMode), pas besoin de transformation
      // IMPORTANT: Ne pas inclure les champs undefined (Firestore refuse undefined)
      const payment: any = {
        date: new Date(paymentInfo.date),
        mode: paymentInfo.mode, // Déjà au format PaymentMode (airtel_money, cash, etc.)
        amount: paymentInfo.amount,
        acceptedBy: paymentInfo.recordedBy || existing.processedBy || 'admin', // ID de l'admin qui a enregistré
        paymentType: paymentInfo.paymentType || 'Membership',
        time: paymentInfo.time || '', // Obligatoire, ne peut pas être undefined
        // Traçabilité : qui a enregistré et quand
        recordedBy: paymentInfo.recordedBy, // ID de l'admin qui a enregistré
        recordedByName: paymentInfo.recordedByName, // Nom complet de l'admin
        recordedAt: paymentInfo.recordedAt || new Date(), // Date d'enregistrement
      }
      
      // Ajouter withFees seulement si défini (pour Airtel Money/Mobicash)
      if (paymentInfo.withFees !== undefined) {
        payment.withFees = paymentInfo.withFees
      }
      
      // Ajouter paymentMethodOther seulement si mode = 'other'
      if (paymentInfo.mode === 'other' && paymentInfo.paymentMethodOther) {
        payment.paymentMethodOther = paymentInfo.paymentMethodOther
      }
      
      // Ajouter proofUrl seulement si défini
      if (paymentInfo.proofUrl) {
        payment.proofUrl = paymentInfo.proofUrl
      }
      
      // Ajouter proofPath seulement si défini
      if (paymentInfo.proofPath) {
        payment.proofPath = paymentInfo.proofPath
      }
      
      const docRef = doc(db, this.collectionName, id)
      const currentPayments = existing.payments || []
      
      // Nettoyer le payload pour éviter les undefined
      const updateData: any = {
        isPaid: true,
        payments: [...currentPayments, payment],
        updatedAt: serverTimestamp(),
      }
      
      // Supprimer les champs undefined du updateData
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key]
        }
      })
      
      // 1. Mettre à jour le document membership-request (pour compatibilité)
      await updateDoc(docRef, updateData)
      
      // 2. Enregistrer dans la collection centralisée des paiements
      try {
        await this.paymentRepository.createPayment({
          ...payment,
          sourceType: 'membership-request',
          sourceId: id,
          beneficiaryId: existing.id, // ID de la demande
          beneficiaryName: `${existing.identity.firstName} ${existing.identity.lastName}`.trim(),
        })
      } catch (paymentError) {
        // Ignorer l'erreur pour ne pas bloquer la mise à jour du membership-request
        // (pour éviter de casser le flux si la collection centralisée a un problème)
        // On continue quand même car le paiement est déjà enregistré dans membership-request
      }
    } catch (error) {
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
