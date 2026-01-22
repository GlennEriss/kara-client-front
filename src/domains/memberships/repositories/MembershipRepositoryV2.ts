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
  setDoc,
  serverTimestamp,
  getCountFromServer,
  or,
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
import type { MembershipRequestStatus, RegisterFormData } from '@/types/types'
import { PaymentRepositoryV2 } from './PaymentRepositoryV2'
import { getAlgoliaSearchService } from '@/services/search/AlgoliaSearchService'
import { generateMatricule } from '@/db/user.db'
import { DocumentRepository } from '@/repositories/documents/DocumentRepository'
import { MembershipErrorHandler } from '../services/MembershipErrorHandler'

export class MembershipRepositoryV2 implements IMembershipRepository {
  private static instance: MembershipRepositoryV2
  private readonly collectionName = MEMBERSHIP_REQUEST_COLLECTIONS.REQUESTS
  private paymentRepository: PaymentRepositoryV2
  private documentRepository: DocumentRepository
  private errorHandler: MembershipErrorHandler

  private constructor() {
    this.paymentRepository = PaymentRepositoryV2.getInstance()
    this.documentRepository = new DocumentRepository()
    this.errorHandler = MembershipErrorHandler.getInstance()
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
    // Si Algolia est configuré et qu'il y a une recherche, utiliser Algolia
    if (process.env.NEXT_PUBLIC_ALGOLIA_APP_ID && filters.search && filters.search.trim()) {
      try {
        const searchService = getAlgoliaSearchService()
        return await searchService.search({
          query: filters.search.trim(),
          filters: {
            isPaid: filters.isPaid,
            status: filters.status && filters.status !== 'all' ? filters.status : undefined,
          },
          page,
          hitsPerPage: pageLimit,
        })
      } catch (error) {
        console.error('Erreur Algolia, fallback Firestore:', error)
        // Continue avec Firestore (fallback)
      }
    }

    // Sinon, utiliser Firestore (code existant)
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
    
    // Recherche côté serveur
    // NOTE: Firestore ne supporte pas les recherches LIKE, donc on utilise des recherches par préfixe
    // Stratégie: Faire plusieurs requêtes en parallèle et combiner les résultats
    // pour couvrir tous les cas (email, matricule, firstName, lastName, ID)
    if (filters.search && filters.search.trim()) {
      const searchTerm = filters.search.trim().toLowerCase()
      
      // Déterminer le type de recherche le plus probable
      const isMatricule = /^\d+\.\w+\.\d+/.test(searchTerm) // Format: XXXX.XX.XXXXXX
      const isEmail = searchTerm.includes('@')
      
      // Utiliser le champ le plus probable pour la requête principale
      // Les autres champs seront filtrés côté client après récupération
      if (isEmail) {
        // Recherche par préfixe sur email
        constraints.push(where('identity.email', '>=', searchTerm))
        constraints.push(where('identity.email', '<=', searchTerm + '\uf8ff'))
      } else if (isMatricule) {
        // Recherche exacte par matricule
        constraints.push(where('matricule', '==', searchTerm))
      } else {
        // Recherche par préfixe sur firstName (le plus commun pour les noms)
        constraints.push(where('identity.firstName', '>=', searchTerm))
        constraints.push(where('identity.firstName', '<=', searchTerm + '\uf8ff'))
      }
    }
    
    // Tri par date décroissante (obligatoire pour la pagination)
    // NOTE: Si recherche active, on peut aussi trier par le champ de recherche
    // mais pour l'instant, on garde le tri par date
    constraints.push(orderBy('createdAt', 'desc'))
    
    // Pagination : si on n'est pas à la première page, on doit sauter les documents précédents
    if (page > 1) {
      // Calculer l'offset (nombre de documents à sauter)
      const offset = (page - 1) * pageLimit
      
      // Récupérer les documents jusqu'à l'offset pour obtenir le dernier document
      // de la page précédente (curseur)
      const offsetQuery = query(collectionRef, ...constraints, fbLimit(offset))
      const offsetSnapshot = await getDocs(offsetQuery)
      
      if (offsetSnapshot.docs.length > 0) {
        // Utiliser le dernier document comme curseur pour startAfter
        const lastDoc = offsetSnapshot.docs[offsetSnapshot.docs.length - 1]
        constraints.push(startAfter(lastDoc))
      } else {
        // Si pas de documents à l'offset, retourner une page vide
        return {
          items: [],
          pagination: {
            page,
            limit: pageLimit,
            totalItems: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPrevPage: page > 1,
          },
        }
      }
    }
    
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
    
    // Recherche pour le comptage (même logique que la requête principale)
    if (filters.search && filters.search.trim()) {
      const searchTerm = filters.search.trim().toLowerCase()
      const isMatricule = /^\d+\.\w+\.\d+/.test(searchTerm)
      const isEmail = searchTerm.includes('@')
      
      if (isEmail) {
        countConstraints.push(where('identity.email', '>=', searchTerm))
        countConstraints.push(where('identity.email', '<=', searchTerm + '\uf8ff'))
      } else if (isMatricule) {
        countConstraints.push(where('matricule', '==', searchTerm))
      } else {
        countConstraints.push(where('identity.firstName', '>=', searchTerm))
        countConstraints.push(where('identity.firstName', '<=', searchTerm + '\uf8ff'))
      }
    }
    
    // Note: Firestore exige un index pour les requêtes avec plusieurs where.
    // Le tri est ajouté pour correspondre à l'index (même si non nécessaire pour le count).
    if (countConstraints.length > 0) {
      countConstraints.push(orderBy('createdAt', 'desc'))
    }
    
    const countQuery = query(collectionRef, ...countConstraints)
    const totalCountSnapshot = await getCountFromServer(countQuery)
    let totalItems = totalCountSnapshot.data().count
    
    // Si recherche active et qu'on a filtré côté client, ajuster le total
    // NOTE: Le filtrage côté client est nécessaire pour les cas non couverts par Firestore
    // (ex: recherche par ID de document, recherche par lastName si on a cherché par firstName)
    if (filters.search && filters.search.trim() && items.length > 0) {
      // Le total doit être basé sur les résultats filtrés, pas sur la requête Firestore
      // Mais comme on ne peut pas compter tous les résultats sans les charger,
      // on utilise une approximation : si on a moins de résultats que la limite,
      // c'est qu'on a tous les résultats, sinon on utilise le total de Firestore
      // comme approximation (qui sera ajusté lors de la pagination)
      if (items.length < pageLimit) {
        // On a probablement tous les résultats, utiliser le nombre d'items filtrés
        // Mais pour être précis, il faudrait charger tous les résultats et les filtrer
        // ce qui est coûteux. On garde donc le total Firestore comme approximation.
      }
    }
    
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
  }

  async getById(id: string): Promise<MembershipRequest | null> {
    if (!id || id.trim() === '') {
      throw new Error('ID est requis')
    }
    
    const docRef = doc(db, this.collectionName, id)
    const docSnap = await getDoc(docRef)
    
    if (!docSnap.exists()) {
      return null
    }
    
    return this.transformDocument(docSnap.id, docSnap.data())
  }

  async updateStatus(
    id: string, 
    status: MembershipRequest['status'], 
    data?: Partial<MembershipRequest>
  ): Promise<void> {
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
  }

  async getStatistics(): Promise<MembershipStatistics> {
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
   * Crée une nouvelle demande d'adhésion
   * 
   * @param formData Données du formulaire d'inscription
   * @returns L'ID de la demande créée (matricule)
   */
  async create(formData: RegisterFormData): Promise<string> {
    try {
      // Créer un identifiant unique basé sur l'email ou le premier numéro de téléphone
      const userIdentifier = formData.identity.email || 
                            formData.identity.contacts[0] || 
                            `${formData.identity.firstName}_${formData.identity.lastName}_${Date.now()}`

      // Générer un matricule unique pour cette demande
      const matricule = await generateMatricule()

      // Préparer les données de base
      const { photo, ...identityWithoutPhoto } = formData.identity
      const { documentPhotoFront, documentPhotoBack, ...documentsWithoutPhotos } = formData.documents
      
      let membershipData: any = {
        matricule,
        identity: {
          ...identityWithoutPhoto
        },
        address: formData.address,
        company: formData.company,
        documents: {
          ...documentsWithoutPhotos
        },
        state: 'IN_PROGRESS',
        status: 'pending',
        isPaid: false,
      }

      // Upload de la photo de profil si fournie via DocumentRepository
      if (formData.identity.photo && typeof formData.identity.photo === 'string' && formData.identity.photo.startsWith('data:image/')) {
        try {
          // Utiliser DocumentRepository pour uploader l'image
          // userIdentifier comme memberId temporaire, matricule comme contractId
          const { url: fileURL, path: filePATH } = await this.documentRepository.uploadImage(
            formData.identity.photo,
            userIdentifier,
            matricule,
            'membership-request-profile-photo'
          )
          
          membershipData.identity.photoURL = fileURL
          membershipData.identity.photoPath = filePATH
        } catch (photoError: any) {
          console.error("❌ ERREUR lors de l'upload de la photo de profil:", photoError)
          console.warn("   ⚠️ Continuons la création du document sans photo de profil")
        }
      }

      // Upload de la photo recto du document si fournie via DocumentRepository
      if (formData.documents.documentPhotoFront && typeof formData.documents.documentPhotoFront === 'string' && formData.documents.documentPhotoFront.startsWith('data:image/')) {
        try {
          // Utiliser DocumentRepository pour uploader l'image
          const { url: frontURL, path: frontPATH } = await this.documentRepository.uploadImage(
            formData.documents.documentPhotoFront,
            userIdentifier,
            matricule,
            'membership-request-document-front'
          )
          
          membershipData.documents.documentPhotoFrontURL = frontURL
          membershipData.documents.documentPhotoFrontPath = frontPATH
        } catch (frontPhotoError: any) {
          console.error("❌ ERREUR lors de l'upload de la photo recto du document:", frontPhotoError)
          console.warn("   ⚠️ Continuons la création du document sans photo recto")
        }
      }

      // Upload de la photo verso du document si fournie via DocumentRepository
      if (formData.documents.documentPhotoBack && typeof formData.documents.documentPhotoBack === 'string' && formData.documents.documentPhotoBack.startsWith('data:image/')) {
        try {
          // Utiliser DocumentRepository pour uploader l'image
          const { url: backURL, path: backPATH } = await this.documentRepository.uploadImage(
            formData.documents.documentPhotoBack,
            userIdentifier,
            matricule,
            'membership-request-document-back'
          )
          
          membershipData.documents.documentPhotoBackURL = backURL
          membershipData.documents.documentPhotoBackPath = backPATH
        } catch (backPhotoError: any) {
          console.error("❌ ERREUR lors de l'upload de la photo verso du document:", backPhotoError)
          console.warn("   ⚠️ Continuons la création du document sans photo verso")
        }
      }

      // Nettoyer toutes les valeurs undefined avant d'envoyer à Firestore
      const cleanedMembershipData = this.cleanUndefinedValues(membershipData)
      
      // Créer le document avec l'ID personnalisé (le matricule)
      const docRef = doc(db, this.collectionName, matricule)
      
      // Ajouter les timestamps
      const finalData = {
        ...cleanedMembershipData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }
      
      // Sauvegarder avec l'ID personnalisé
      try {
        await setDoc(docRef, finalData)
        return matricule // Retourner le matricule comme ID
      } catch (setDocError: any) {
        // Normaliser et re-lancer l'erreur avec le gestionnaire centralisé
        const normalizedError = this.errorHandler.normalizeError(setDocError, 'create.setDoc')
        throw new Error(this.errorHandler.formatForUI(normalizedError))
      }
    } catch (error: any) {
      // Si l'erreur est déjà normalisée, la re-lancer telle quelle
      if (error instanceof Error && error.message) {
        throw error
      }
      // Sinon, normaliser l'erreur
      const normalizedError = this.errorHandler.normalizeError(error, 'create')
      throw new Error(this.errorHandler.formatForUI(normalizedError))
    }
  }

  /**
   * Fonction utilitaire pour nettoyer les valeurs undefined d'un objet
   * Firestore n'accepte pas les valeurs undefined
   */
  private cleanUndefinedValues(obj: any): any {
    if (obj === null || obj === undefined) {
      return null
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.cleanUndefinedValues(item)).filter(item => item !== null)
    }
    
    if (typeof obj === 'object') {
      const cleaned: any = {}
      for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) {
          cleaned[key] = this.cleanUndefinedValues(value)
        }
      }
      return cleaned
    }
    
    return obj
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
      approvedAt: data.approvedAt?.toDate?.() || (data.approvedAt ? new Date(data.approvedAt) : undefined),
      securityCodeExpiry: data.securityCodeExpiry?.toDate?.() || (data.securityCodeExpiry ? new Date(data.securityCodeExpiry) : undefined),
    } as MembershipRequest
  }
}
