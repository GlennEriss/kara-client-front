import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  Timestamp,
  getCountFromServer
} from 'firebase/firestore'
import { db } from '@/firebase/firestore'
import type { Subscription, MembershipType } from '@/types/types'
import { FIREBASE_COLLECTION_NAMES } from '@/constantes/firebase-collection-names'

/**
 * Crée une nouvelle souscription
 */
export async function createSubscription(subscriptionData: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>): Promise<Subscription> {
  try {
    // Générer un ID personnalisé au format MK_SUB_DDMMYY_HHMM
    const now = new Date()
    const day = String(now.getDate()).padStart(2, '0')
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const year = String(now.getFullYear()).slice(-2)
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    
    const subscriptionId = `MK_SUB_${day}${month}${year}_${hours}${minutes}`
    const subscriptionRef = doc(db, FIREBASE_COLLECTION_NAMES.SUBSCRIPTIONS, subscriptionId)
    
    // Calculer isValid basé sur la date de fin
    const isValid = subscriptionData.dateEnd > new Date()
    
    const subscriptionDocData: Subscription = {
      ...subscriptionData,
      id: subscriptionId,
      isValid,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    
    await setDoc(subscriptionRef, {
      ...subscriptionDocData,
      dateStart: Timestamp.fromDate(subscriptionDocData.dateStart),
      dateEnd: Timestamp.fromDate(subscriptionDocData.dateEnd),
      createdAt: Timestamp.fromDate(subscriptionDocData.createdAt),
      updatedAt: Timestamp.fromDate(subscriptionDocData.updatedAt),
    })
    
    console.log('Souscription créée avec succès:', subscriptionId)
    return subscriptionDocData
  } catch (error) {
    console.error('Erreur lors de la création de la souscription:', error)
    throw new Error('Impossible de créer la souscription')
  }
}

/**
 * Récupère une souscription par son ID
 */
export async function getSubscriptionById(subscriptionId: string): Promise<Subscription | null> {
  try {
    const subscriptionRef = doc(db, FIREBASE_COLLECTION_NAMES.SUBSCRIPTIONS, subscriptionId)
    const docSnap = await getDoc(subscriptionRef)
    
    if (!docSnap.exists()) {
      return null
    }
    
    const data = docSnap.data()
    // ✅ Fallback : supporter startDate/endDate (ancien format) et dateStart/dateEnd (nouveau format)
    const dateStartField = data.dateStart || data.startDate
    const dateEndField = data.dateEnd || data.endDate
    
    const dateStart = dateStartField?.toDate ? dateStartField.toDate() : new Date()
    const dateEnd = dateEndField?.toDate ? dateEndField.toDate() : new Date()
    
    return {
      ...data,
      dateStart,
      dateEnd,
      // ✅ Fallback : supporter membershipType (ancien) et type (nouveau)
      type: data.type || data.membershipType,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
      // Recalculer isValid au moment de la récupération
      isValid: dateEnd > new Date(),
    } as Subscription
  } catch (error) {
    console.error('Erreur lors de la récupération de la souscription:', error)
    throw new Error('Impossible de récupérer la souscription')
  }
}

/**
 * Récupère toutes les souscriptions d'un utilisateur
 */
export async function getSubscriptionsByUserId(userId: string): Promise<Subscription[]> {
  try {
    const subscriptionsRef = collection(db, FIREBASE_COLLECTION_NAMES.SUBSCRIPTIONS)
    // ✅ Fallback : chercher sur dateStart (nouveau) ou startDate (ancien)
    // Note: Firestore ne permet pas de faire un OR dans orderBy, donc on essaie dateStart d'abord
    let q
    try {
      q = query(subscriptionsRef, where('userId', '==', userId), orderBy('dateStart', 'desc'))
    } catch {
      // Si l'index dateStart n'existe pas, essayer startDate
      q = query(subscriptionsRef, where('userId', '==', userId), orderBy('startDate', 'desc'))
    }
    const querySnapshot = await getDocs(q)
    
    const subscriptions: Subscription[] = []
    
    querySnapshot.forEach((doc) => {
      const data = doc.data()
      // ✅ Fallback : supporter startDate/endDate (ancien format) et dateStart/dateEnd (nouveau format)
      const dateStart = data.dateStart?.toDate?.() || data.startDate?.toDate?.() || new Date()
      const dateEnd = data.dateEnd?.toDate?.() || data.endDate?.toDate?.() || new Date()
      
      subscriptions.push({
        ...data,
        id: doc.id,
        dateStart,
        dateEnd,
        // ✅ Fallback : supporter membershipType (ancien) et type (nouveau)
        type: data.type || data.membershipType,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
        // Recalculer isValid au moment de la récupération
        isValid: dateEnd > new Date(),
      } as Subscription)
    })
    
    return subscriptions
  } catch (error) {
    console.error('Erreur lors de la récupération des souscriptions de l\'utilisateur:', error)
    throw new Error('Impossible de récupérer les souscriptions de l\'utilisateur')
  }
}

/**
 * Récupère la souscription active d'un utilisateur (la plus récente et valide)
 */
export async function getActiveSubscriptionByUserId(userId: string): Promise<Subscription | null> {
  try {
    const subscriptions = await getSubscriptionsByUserId(userId)
    
    // Filtrer les souscriptions valides et prendre la plus récente
    const activeSubscriptions = subscriptions.filter(sub => sub.isValid)
    
    if (activeSubscriptions.length === 0) {
      return null
    }
    
    // Retourner la plus récente (déjà trié par dateStart desc)
    return activeSubscriptions[0]
  } catch (error) {
    console.error('Erreur lors de la récupération de la souscription active:', error)
    throw new Error('Impossible de récupérer la souscription active')
  }
}

/**
 * Met à jour une souscription
 */
export async function updateSubscription(subscriptionId: string, updates: Partial<Omit<Subscription, 'id' | 'createdAt'>>): Promise<boolean> {
  try {
    const subscriptionRef = doc(db, FIREBASE_COLLECTION_NAMES.SUBSCRIPTIONS, subscriptionId)
    
    const updateData: any = {
      ...updates,
      updatedAt: Timestamp.fromDate(new Date()),
    }
    
    // Convertir les dates si elles sont présentes dans les mises à jour
    if (updates.dateStart) {
      updateData.dateStart = Timestamp.fromDate(updates.dateStart)
    }
    if (updates.dateEnd) {
      updateData.dateEnd = Timestamp.fromDate(updates.dateEnd)
      // Recalculer isValid si la date de fin change
      updateData.isValid = updates.dateEnd > new Date()
    }
    
    await updateDoc(subscriptionRef, updateData)
    console.log('Souscription mise à jour avec succès:', subscriptionId)
    return true
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la souscription:', error)
    return false
  }
}

/**
 * Supprime une souscription
 */
export async function deleteSubscription(subscriptionId: string): Promise<boolean> {
  try {
    const subscriptionRef = doc(db, FIREBASE_COLLECTION_NAMES.SUBSCRIPTIONS, subscriptionId)
    await deleteDoc(subscriptionRef)
    console.log('Souscription supprimée avec succès:', subscriptionId)
    return true
  } catch (error) {
    console.error('Erreur lors de la suppression de la souscription:', error)
    return false
  }
}

/**
 * Récupère toutes les souscriptions avec filtres
 */
export async function getAllSubscriptions(filters: {
  userId?: string
  type?: MembershipType[]
  isValid?: boolean
  limit?: number
} = {}): Promise<{ subscriptions: Subscription[], total: number }> {
  try {
    const subscriptionsRef = collection(db, FIREBASE_COLLECTION_NAMES.SUBSCRIPTIONS)
    let q = query(subscriptionsRef)
    
    // Appliquer les filtres
    if (filters.userId) {
      q = query(q, where('userId', '==', filters.userId))
    }
    
    if (filters.type && filters.type.length > 0) {
      q = query(q, where('type', 'in', filters.type))
    }
    
    if (filters.isValid !== undefined) {
      q = query(q, where('isValid', '==', filters.isValid))
    }
    
    // Tri par date de création (plus récent en premier)
    q = query(q, orderBy('createdAt', 'desc'))
    
    // Limite
    if (filters.limit) {
      q = query(q, limit(filters.limit))
    }
    
    const querySnapshot = await getDocs(q)
    const subscriptions: Subscription[] = []
    
    querySnapshot.forEach((doc) => {
      const data = doc.data()
      // ✅ Fallback : supporter startDate/endDate (ancien format) et dateStart/dateEnd (nouveau format)
      const dateStartField = data.dateStart || data.startDate
      const dateEndField = data.dateEnd || data.endDate
      
      const dateStart = dateStartField?.toDate ? dateStartField.toDate() : new Date()
      const dateEnd = dateEndField?.toDate ? dateEndField.toDate() : new Date()
      
      subscriptions.push({
        ...data,
        dateStart,
        dateEnd,
        // ✅ Fallback : supporter membershipType (ancien) et type (nouveau)
        type: data.type || data.membershipType,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
        // Recalculer isValid au moment de la récupération
        isValid: dateEnd > new Date(),
      } as Subscription)
    })
    
    // Compter le total
    const countQuery = query(subscriptionsRef)
    const countSnapshot = await getCountFromServer(countQuery)
    const total = countSnapshot.data().count
    
    return { subscriptions, total }
  } catch (error) {
    console.error('Erreur lors de la récupération des souscriptions:', error)
    throw new Error('Impossible de récupérer les souscriptions')
  }
}

/**
 * Récupère les souscriptions qui expirent bientôt
 */
export async function getExpiringSoonSubscriptions(daysBeforeExpiry: number = 30): Promise<Subscription[]> {
  try {
    const now = new Date()
    const expiryThreshold = new Date()
    expiryThreshold.setDate(now.getDate() + daysBeforeExpiry)
    
    const subscriptionsRef = collection(db, FIREBASE_COLLECTION_NAMES.SUBSCRIPTIONS)
    const q = query(
      subscriptionsRef,
      where('dateEnd', '>', Timestamp.fromDate(now)),
      where('dateEnd', '<=', Timestamp.fromDate(expiryThreshold)),
      orderBy('dateEnd', 'asc')
    )
    
    const querySnapshot = await getDocs(q)
    const subscriptions: Subscription[] = []
    
    querySnapshot.forEach((doc) => {
      const data = doc.data()
      // ✅ Fallback : supporter startDate/endDate (ancien format) et dateStart/dateEnd (nouveau format)
      const dateStart = data.dateStart?.toDate?.() || data.startDate?.toDate?.() || new Date()
      const dateEnd = data.dateEnd?.toDate?.() || data.endDate?.toDate?.() || new Date()
      
      subscriptions.push({
        ...data,
        id: doc.id,
        dateStart,
        dateEnd,
        // ✅ Fallback : supporter membershipType (ancien) et type (nouveau)
        type: data.type || data.membershipType,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
        isValid: dateEnd > new Date(),
      } as Subscription)
    })
    
    return subscriptions
  } catch (error) {
    console.error('Erreur lors de la récupération des souscriptions qui expirent:', error)
    throw new Error('Impossible de récupérer les souscriptions qui expirent')
  }
}

/**
 * Crée une souscription par défaut pour un nouveau membre
 */
export async function createDefaultSubscription(
  userId: string, 
  membershipType: MembershipType,
  createdBy: string
): Promise<Subscription> {
  try {
    // Définir les montants par défaut selon le type
    const defaultAmounts = {
      adherant: 10300, 
      bienfaiteur: 10300, 
      sympathisant: 10300,
    }
    
    // Période de validité par défaut : 1 an
    const dateStart = new Date()
    const dateEnd = new Date()
    dateEnd.setFullYear(dateEnd.getFullYear() + 1)
    
    const subscriptionData = {
      userId,
      dateStart,
      dateEnd,
      montant: defaultAmounts[membershipType],
      currency: 'XOF',
      type: membershipType,
      createdBy,
    }
    
    return await createSubscription(subscriptionData)
  } catch (error) {
    console.error('Erreur lors de la création de la souscription par défaut:', error)
    throw new Error('Impossible de créer la souscription par défaut')
  }
}