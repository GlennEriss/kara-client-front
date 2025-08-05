import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter, 
  getDocs, 
  getDoc,
  doc,
  DocumentSnapshot,
  QueryConstraint,
  Timestamp
} from 'firebase/firestore'
import { db } from '@/firebase/firestore'
import { User, UserFilters, UserStats, Subscription } from '@/types/types'

/**
 * Fonction helper pour convertir les dates Firestore
 */
function convertFirestoreDate(dateField: any): Date | null {
  if (!dateField) return null
  if (dateField.toDate && typeof dateField.toDate === 'function') {
    return dateField.toDate()
  }
  if (dateField instanceof Date) {
    return dateField
  }
  if (typeof dateField === 'string') {
    return new Date(dateField)
  }
  return null
}

/**
 * Interface pour les résultats paginés des membres
 */
export interface PaginatedMembers {
  data: User[]
  pagination: {
    currentPage: number
    totalPages: number
    totalItems: number
    itemsPerPage: number
    hasNextPage: boolean
    hasPrevPage: boolean
    nextCursor: any
    prevCursor: any
  }
}

/**
 * Interface pour un membre avec sa dernière subscription
 */
export interface MemberWithSubscription extends User {
  lastSubscription?: Subscription | null
  isSubscriptionValid?: boolean
}

/**
 * Récupère la liste des membres avec pagination et filtres
 */
export async function getMembers(
  filters: UserFilters = {},
  page: number = 1,
  itemsPerPage: number = 10,
  cursor?: DocumentSnapshot
): Promise<PaginatedMembers> {
  try {
    const membersRef = collection(db, 'users')
    
    // Construction des contraintes de requête
    const constraints: QueryConstraint[] = []
    
    // Filtrer par rôles (seulement les membres, pas les admins)
    const memberRoles = ['Adherant', 'Bienfaiteur', 'Sympathisant']
    if (filters.roles && filters.roles.length > 0) {
      const filteredRoles = filters.roles.filter(role => memberRoles.includes(role))
      if (filteredRoles.length > 0) {
        constraints.push(where('roles', 'array-contains-any', filteredRoles))
      }
    } else {
      constraints.push(where('roles', 'array-contains-any', memberRoles))
    }
    
    // Filtrer par type de membership
    if (filters.membershipType && filters.membershipType.length > 0) {
      constraints.push(where('membershipType', 'in', filters.membershipType))
    }
    
    // Filtrer par nationalité
    if (filters.nationality && filters.nationality.length > 0) {
      constraints.push(where('nationality', 'in', filters.nationality))
    }
    
    // Filtrer par possession de voiture
    if (filters.hasCar !== undefined) {
      constraints.push(where('hasCar', '==', filters.hasCar))
    }
    
    // Filtrer par statut actif
    if (filters.isActive !== undefined) {
      constraints.push(where('isActive', '==', filters.isActive))
    }
    
    // Tri
    const orderField = filters.orderByField || 'createdAt'
    const orderDirection = filters.orderByDirection || 'desc'
    constraints.push(orderBy(orderField, orderDirection))
    
    // Pagination avec curseur
    if (cursor) {
      constraints.push(startAfter(cursor))
    }
    
    // Limite
    constraints.push(limit(itemsPerPage + 1)) // +1 pour savoir s'il y a une page suivante
    
    const q = query(membersRef, ...constraints)
    const querySnapshot = await getDocs(q)
    
    const members: User[] = []
    let hasNextPage = false
    
    querySnapshot.docs.forEach((doc, index) => {
      if (index < itemsPerPage) {
        const data = doc.data()
        members.push({
          id: doc.id,
          ...data,
          createdAt: convertFirestoreDate(data.createdAt) || new Date(),
          updatedAt: convertFirestoreDate(data.updatedAt) || new Date()
        } as User)
      } else {
        hasNextPage = true
      }
    })
    
    // Appliquer les filtres de recherche côté client si nécessaire
    let filteredMembers = members
    if (filters.searchQuery) {
      const searchLower = filters.searchQuery.toLowerCase()
      filteredMembers = members.filter(member => 
        member.firstName.toLowerCase().includes(searchLower) ||
        member.lastName.toLowerCase().includes(searchLower) ||
        member.matricule.toLowerCase().includes(searchLower) ||
        member.email?.toLowerCase().includes(searchLower)
      )
    }
    
    const nextCursor = members.length > 0 ? querySnapshot.docs[Math.min(itemsPerPage - 1, querySnapshot.docs.length - 1)] : null
    
    return {
      data: filteredMembers,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(filteredMembers.length / itemsPerPage), // Approximation
        totalItems: filteredMembers.length, // Approximation
        itemsPerPage,
        hasNextPage,
        hasPrevPage: page > 1,
        nextCursor,
        prevCursor: null
      }
    }
  } catch (error) {
    console.error('Erreur lors de la récupération des membres:', error)
    throw new Error('Impossible de récupérer les membres')
  }
}

/**
 * Récupère un membre avec sa dernière subscription
 */
export async function getMemberWithSubscription(userId: string): Promise<MemberWithSubscription | null> {
  try {
    // Récupérer le membre
    const userDoc = await getDoc(doc(db, 'users', userId))
    if (!userDoc.exists()) {
      return null
    }
    
    const userData = userDoc.data() as User
    const member: User = {
      ...userData,
      id: userDoc.id,
      createdAt: convertFirestoreDate(userData.createdAt) || new Date(),
      updatedAt: convertFirestoreDate(userData.updatedAt) || new Date()
    }
    
    // Récupérer la dernière subscription
    let lastSubscription: Subscription | null = null
    let isSubscriptionValid = false
    
    if (member.subscriptions && member.subscriptions.length > 0) {
      // Récupérer toutes les subscriptions et trouver la plus récente
      const subscriptionPromises = member.subscriptions.map(async (subId) => {
        const subDoc = await getDoc(doc(db, 'subscriptions', subId))
        if (subDoc.exists()) {
          const subData = subDoc.data()
          return {
            id: subDoc.id,
            ...subData,
            dateStart: convertFirestoreDate(subData.dateStart) || new Date(),
            dateEnd: convertFirestoreDate(subData.dateEnd) || new Date(),
            createdAt: convertFirestoreDate(subData.createdAt) || new Date(),
            updatedAt: convertFirestoreDate(subData.updatedAt) || new Date()
          } as Subscription
        }
        return null
      })
      
      const subscriptions = (await Promise.all(subscriptionPromises)).filter(Boolean) as Subscription[]
      
      if (subscriptions.length > 0) {
        // Trier par date de fin décroissante pour avoir la plus récente
        subscriptions.sort((a, b) => b.dateEnd.getTime() - a.dateEnd.getTime())
        lastSubscription = subscriptions[0]
        
        // Vérifier si la subscription est valide (date de fin > maintenant)
        isSubscriptionValid = lastSubscription.dateEnd > new Date()
      }
    }
    
    return {
      ...member,
      lastSubscription,
      isSubscriptionValid
    }
  } catch (error) {
    console.error('Erreur lors de la récupération du membre avec subscription:', error)
    throw new Error('Impossible de récupérer le membre')
  }
}

/**
 * Récupère toutes les subscriptions d'un membre
 */
export async function getMemberSubscriptions(userId: string): Promise<Subscription[]> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId))
    if (!userDoc.exists()) {
      return []
    }
    
    const userData = userDoc.data() as User
    
    if (!userData.subscriptions || userData.subscriptions.length === 0) {
      return []
    }
    
    const subscriptionPromises = userData.subscriptions.map(async (subId) => {
      const subDoc = await getDoc(doc(db, 'subscriptions', subId))
      if (subDoc.exists()) {
        const subData = subDoc.data()
        return {
          id: subDoc.id,
          ...subData,
          dateStart: convertFirestoreDate(subData.dateStart) || new Date(),
          dateEnd: convertFirestoreDate(subData.dateEnd) || new Date(),
          createdAt: convertFirestoreDate(subData.createdAt) || new Date(),
          updatedAt: convertFirestoreDate(subData.updatedAt) || new Date()
        } as Subscription
      }
      return null
    })
    
    const subscriptions = (await Promise.all(subscriptionPromises)).filter(Boolean) as Subscription[]
    
    // Trier par date de création décroissante
    return subscriptions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  } catch (error) {
    console.error('Erreur lors de la récupération des subscriptions:', error)
    throw new Error('Impossible de récupérer les subscriptions')
  }
}

/**
 * Récupère les statistiques des membres
 */
export async function getMemberStats(): Promise<UserStats> {
  try {
    const membersRef = collection(db, 'users')
    const memberRoles = ['Adherant', 'Bienfaiteur', 'Sympathisant']
    
    // Requête pour tous les membres
    const allMembersQuery = query(
      membersRef,
      where('roles', 'array-contains-any', memberRoles)
    )
    const allMembersSnapshot = await getDocs(allMembersQuery)
    
    let total = 0
    let active = 0
    let inactive = 0
    let withCar = 0
    let withoutCar = 0
    let newThisMonth = 0
    let newThisYear = 0
    
    const byMembershipType = {
      adherant: 0,
      bienfaiteur: 0,
      sympathisant: 0
    }
    
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfYear = new Date(now.getFullYear(), 0, 1)
    
    allMembersSnapshot.docs.forEach(doc => {
      const data = doc.data() as User
      total++
      
      // Statut actif/inactif
      if (data.isActive) {
        active++
      } else {
        inactive++
      }
      
      // Possession de voiture
      if (data.hasCar) {
        withCar++
      } else {
        withoutCar++
      }
      
      // Type de membership
      if (data.membershipType && byMembershipType.hasOwnProperty(data.membershipType)) {
        byMembershipType[data.membershipType]++
      }
      
      // Nouveaux membres ce mois et cette année
      const createdAt = convertFirestoreDate(data.createdAt) || new Date()
      if (createdAt >= startOfMonth) {
        newThisMonth++
      }
      if (createdAt >= startOfYear) {
        newThisYear++
      }
    })
    
    return {
      total,
      active,
      inactive,
      byMembershipType,
      withCar,
      withoutCar,
      newThisMonth,
      newThisYear
    }
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error)
    throw new Error('Impossible de récupérer les statistiques')
  }
}

/**
 * Récupère le MembershipRequest associé à un User via son dossier
 */
export async function getMembershipRequestByDossier(dossierId: string) {
  try {
    const dossierDoc = await getDoc(doc(db, 'membership-requests', dossierId))
    if (!dossierDoc.exists()) {
      return null
    }
    
    const data = dossierDoc.data()
    
    return {
      ...data,
      id: dossierDoc.id,
      createdAt: convertFirestoreDate(data.createdAt) || new Date(),
      updatedAt: convertFirestoreDate(data.updatedAt) || new Date(),
      processedAt: convertFirestoreDate(data.processedAt),
      // Convertir les dates dans l'identity si nécessaire
      identity: {
        ...data.identity,
        birthDate: convertFirestoreDate(data.identity?.birthDate) || data.identity?.birthDate
      },
      // Convertir les dates dans les documents si nécessaire
      documents: {
        ...data.documents,
        expirationDate: convertFirestoreDate(data.documents?.expirationDate) || data.documents?.expirationDate,
        issuingDate: convertFirestoreDate(data.documents?.issuingDate) || data.documents?.issuingDate
      }
    }
  } catch (error) {
    console.error('Erreur lors de la récupération du dossier:', error)
    throw new Error('Impossible de récupérer le dossier')
  }
}

/**
 * Recherche des membres par terme de recherche
 */
export async function searchMembers(searchTerm: string, limit: number = 10): Promise<User[]> {
  try {
    const membersRef = collection(db, 'users')
    const memberRoles = ['Adherant', 'Bienfaiteur', 'Sympathisant']
    
    // Pour une recherche simple, on récupère tous les membres et on filtre côté client
    // Dans un vrai système, on utiliserait un service de recherche comme Algolia
    const q = query(
      membersRef,
      where('roles', 'array-contains-any', memberRoles),
      orderBy('createdAt', 'desc')
    )
    
    const querySnapshot = await getDocs(q)
    const members: User[] = []
    
    const searchLower = searchTerm.toLowerCase()
    
    querySnapshot.docs.forEach(doc => {
      const data = doc.data()
      const member: User = {
        id: doc.id,
        ...data,
        createdAt: convertFirestoreDate(data.createdAt) || new Date(),
        updatedAt: convertFirestoreDate(data.updatedAt) || new Date()
      } as User
      
      // Filtrer par terme de recherche
      if (
        member.firstName.toLowerCase().includes(searchLower) ||
        member.lastName.toLowerCase().includes(searchLower) ||
        member.matricule.toLowerCase().includes(searchLower) ||
        member.email?.toLowerCase().includes(searchLower)
      ) {
        members.push(member)
      }
    })
    
    return members.slice(0, limit)
  } catch (error) {
    console.error('Erreur lors de la recherche des membres:', error)
    throw new Error('Impossible de rechercher les membres')
  }
}