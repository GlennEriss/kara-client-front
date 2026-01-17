/**
 * Repository V2 pour la collection centralisée des paiements
 * 
 * Cette collection centralise TOUS les versements de l'application :
 * - Paiements d'adhésion (membership-requests)
 * - Paiements de caisse spéciale
 * - Paiements de caisse imprévue
 * - Paiements de crédit spéciale
 * - Paiements de placement
 * - etc.
 */

import { collection, doc, setDoc, getDoc, query, where, getDocs, orderBy, limit, serverTimestamp, Timestamp } from 'firebase/firestore'
import { db } from '@/firebase/firestore'
import { firebaseCollectionNames } from '@/constantes/firebase-collection-names'
import type { Payment } from '@/types/types'

export interface CentralizedPayment extends Payment {
  id: string
  // Référence vers la source du paiement
  sourceType: 'membership-request' | 'caisse-speciale' | 'caisse-imprevue' | 'credit-speciale' | 'placement' | 'other'
  sourceId: string // ID du document source (membership-request, contract, etc.)
  // Informations du bénéficiaire (pour faciliter les recherches)
  beneficiaryId?: string // ID du membre/utilisateur
  beneficiaryName?: string // Nom complet du bénéficiaire
  createdAt: Date
  updatedAt: Date
}

export interface PaymentFilters {
  sourceType?: CentralizedPayment['sourceType']
  sourceId?: string
  beneficiaryId?: string
  paymentType?: Payment['paymentType']
  dateFrom?: Date
  dateTo?: Date
  recordedBy?: string
  mode?: Payment['mode']
}

export class PaymentRepositoryV2 {
  private static instance: PaymentRepositoryV2
  private readonly collectionName = firebaseCollectionNames.payments

  private constructor() {}

  static getInstance(): PaymentRepositoryV2 {
    if (!PaymentRepositoryV2.instance) {
      PaymentRepositoryV2.instance = new PaymentRepositoryV2()
    }
    return PaymentRepositoryV2.instance
  }

  /**
   * Crée un paiement dans la collection centralisée
   */
  async createPayment(payment: Omit<CentralizedPayment, 'id' | 'createdAt' | 'updatedAt'>): Promise<CentralizedPayment> {
    try {
      const paymentData: any = {
        ...payment,
        date: payment.date instanceof Date ? payment.date : new Date(payment.date),
        recordedAt: payment.recordedAt instanceof Date ? payment.recordedAt : new Date(payment.recordedAt),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }

      // Nettoyer les champs undefined
      Object.keys(paymentData).forEach(key => {
        if (paymentData[key] === undefined) {
          delete paymentData[key]
        }
      })

      const docRef = doc(collection(db, this.collectionName))
      await setDoc(docRef, paymentData)

      const created = await this.getPaymentById(docRef.id)
      if (!created) {
        throw new Error('Erreur lors de la récupération du paiement créé')
      }

      return created
    } catch (error) {
      console.error('❌ Erreur PaymentRepository.createPayment:', error)
      throw error
    }
  }

  /**
   * Récupère un paiement par son ID
   */
  async getPaymentById(id: string): Promise<CentralizedPayment | null> {
    try {
      const docRef = doc(db, this.collectionName, id)
      const docSnap = await getDoc(docRef)

      if (!docSnap.exists()) {
        return null
      }

      return this.transformDocument(docSnap.id, docSnap.data())
    } catch (error) {
      console.error('❌ Erreur PaymentRepository.getPaymentById:', error)
      throw error
    }
  }

  /**
   * Récupère les paiements avec filtres
   */
  async getPayments(filters: PaymentFilters = {}, limitCount: number = 100): Promise<CentralizedPayment[]> {
    try {
      const constraints: any[] = []

      if (filters.sourceType) {
        constraints.push(where('sourceType', '==', filters.sourceType))
      }

      if (filters.sourceId) {
        constraints.push(where('sourceId', '==', filters.sourceId))
      }

      if (filters.beneficiaryId) {
        constraints.push(where('beneficiaryId', '==', filters.beneficiaryId))
      }

      if (filters.paymentType) {
        constraints.push(where('paymentType', '==', filters.paymentType))
      }

      if (filters.recordedBy) {
        constraints.push(where('recordedBy', '==', filters.recordedBy))
      }

      if (filters.mode) {
        constraints.push(where('mode', '==', filters.mode))
      }

      if (filters.dateFrom) {
        constraints.push(where('date', '>=', filters.dateFrom))
      }

      if (filters.dateTo) {
        constraints.push(where('date', '<=', filters.dateTo))
      }

      // Trier par date de versement (plus récent en premier)
      constraints.push(orderBy('date', 'desc'))
      constraints.push(limit(limitCount))

      const q = query(collection(db, this.collectionName), ...constraints)
      const snapshot = await getDocs(q)

      return snapshot.docs.map(doc => this.transformDocument(doc.id, doc.data()))
    } catch (error) {
      console.error('❌ Erreur PaymentRepository.getPayments:', error)
      throw error
    }
  }

  /**
   * Récupère tous les paiements d'une source spécifique
   */
  async getPaymentsBySource(sourceType: CentralizedPayment['sourceType'], sourceId: string): Promise<CentralizedPayment[]> {
    return this.getPayments({ sourceType, sourceId })
  }

  /**
   * Transforme un document Firestore en CentralizedPayment
   */
  private transformDocument(id: string, data: any): CentralizedPayment {
    return {
      id,
      ...data,
      date: data.date?.toDate?.() || new Date(data.date || Date.now()),
      recordedAt: data.recordedAt?.toDate?.() || new Date(data.recordedAt || Date.now()),
      createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt || Date.now()),
      updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt || Date.now()),
    } as CentralizedPayment
  }
}
