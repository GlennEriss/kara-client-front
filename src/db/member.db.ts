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
  Timestamp,
  getCountFromServer,
  serverTimestamp,
  updateDoc,
  arrayUnion
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
 * Compte le nombre de membres rattachés à un groupId
 */
export async function countMembersByGroup(groupId: string): Promise<number> {
  try {
    const membersRef = collection(db, 'users')
    const memberRoles = ['Adherant', 'Bienfaiteur', 'Sympathisant']
    const q = query(membersRef, where('roles', 'array-contains-any', memberRoles), where('groupIds', 'array-contains', groupId))
    const snap = await getCountFromServer(q as any)
    return snap.data().count || 0
  } catch (e) {
    console.error('Erreur countMembersByGroup:', e)
    return 0
  }
}

/**
 * Retire un membre d'un groupe en mettant à jour updatedBy et updatedAt
 */
export async function removeMemberFromGroup(userId: string, groupId: string, updatedBy: string): Promise<boolean> {
  try {
    const userRef = doc(db, 'users', userId)
    // Récupérer les groupes actuels et retirer le groupe spécifique
    const userDoc = await getDoc(userRef)
    const currentGroupIds = userDoc.data()?.groupIds || []
    const newGroupIds = currentGroupIds.filter((id: string) => id !== groupId)
    
    await updateDoc(userRef, {
      groupIds: newGroupIds,
      updatedBy,
      updatedAt: serverTimestamp(),
    } as any)
    return true
  } catch (e) {
    console.error('Erreur removeMemberFromGroup:', e)
    return false
  }
}

/**
 * Associe un contrat de Caisse Spéciale à un membre (User) ou un groupe
 */
export async function addCaisseContractToEntity(entityId: string, contractId: string, entityType: 'USER' | 'GROUP'): Promise<boolean> {
  try {
    if (entityType === 'USER') {
      const userRef = doc(db, 'users', entityId)
      await updateDoc(userRef, {
        caisseContractIds: arrayUnion(contractId),
        updatedAt: serverTimestamp(),
      } as any)
    } else if (entityType === 'GROUP') {
      const groupRef = doc(db, 'groups', entityId)
      await updateDoc(groupRef, {
        caisseContractIds: arrayUnion(contractId),
        updatedAt: serverTimestamp(),
      } as any)
    }
    return true
  } catch (e) {
    console.error('Erreur addCaisseContractToEntity:', e)
    return false
  }
}

/**
 * Associe un contrat de Caisse Spéciale à un membre (User) - Compatibilité
 */
export async function addCaisseContractToUser(userId: string, contractId: string): Promise<boolean> {
  return addCaisseContractToEntity(userId, contractId, 'USER')
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
    
    const members: MemberWithSubscription[] = []
    let hasNextPage = false
    
    // Traitement séquentiel pour éviter de surcharger Firebase
    for (let index = 0; index < querySnapshot.docs.length; index++) {
      if (index < itemsPerPage) {
        const doc = querySnapshot.docs[index]
        
        // Récupérer chaque membre avec ses subscriptions
        const memberWithSubscription = await getMemberWithSubscription(doc.id)
        
        if (memberWithSubscription) {
          members.push(memberWithSubscription)
        }
      } else {
        hasNextPage = true
        break
      }
    }
    
    // Appliquer les filtres côté client
    let filteredMembers = members
    
    // Filtre de recherche textuelle
    if (filters.searchQuery) {
      const searchLower = filters.searchQuery.toLowerCase()
      filteredMembers = filteredMembers.filter(member => 
        member.firstName.toLowerCase().includes(searchLower) ||
        member.lastName.toLowerCase().includes(searchLower) ||
        member.matricule.toLowerCase().includes(searchLower) ||
        member.email?.toLowerCase().includes(searchLower)
      )
    }
    
    // Filtres d'adresse
    if (filters.province) {
      filteredMembers = filteredMembers.filter(member => 
        member.address?.province === filters.province
      )
    }
    
    if (filters.city) {
      filteredMembers = filteredMembers.filter(member => 
        member.address?.city === filters.city
      )
    }
    
    if (filters.arrondissement) {
      filteredMembers = filteredMembers.filter(member => 
        member.address?.arrondissement === filters.arrondissement
      )
    }
    
    if (filters.district) {
      filteredMembers = filteredMembers.filter(member => 
        member.address?.district === filters.district
      )
    }
    
    // Filtres professionnels
    if (filters.companyName) {
      filteredMembers = filteredMembers.filter(member => 
        member.companyName === filters.companyName
      )
    }
    
    if (filters.profession) {
      filteredMembers = filteredMembers.filter(member => 
        member.profession === filters.profession
      )
    }
    
    // Log du résultat final en mode debug
    if (process.env.NODE_ENV === 'development') {
      const activeFilters = Object.entries(filters)
        .filter(([key, value]) => {
          if (key === 'page' || key === 'limit' || key === 'orderByField' || key === 'orderByDirection') return false
          if (Array.isArray(value)) return value.length > 0
          return value !== undefined && value !== null
        })
        .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
        .join(', ')
      
      console.log(`🎯 [getMembers] Processed ${filteredMembers.length} members${activeFilters ? ` with filters: ${activeFilters}` : ''}`)
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
 * Récupère un membre avec sa dernière subscription via requête directe
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
    
    // Récupérer les subscriptions directement via requête sur la collection
    let lastSubscription: Subscription | null = null
    let isSubscriptionValid = false
    
    try {
      // Requête pour récupérer toutes les subscriptions de cet utilisateur
      const subscriptionsQuery = query(
        collection(db, 'subscriptions'),
        where('userId', '==', userId)
      )
      
      const subscriptionsSnapshot = await getDocs(subscriptionsQuery)
      
      if (!subscriptionsSnapshot.empty) {
        // Récupérer toutes les subscriptions et les trier côté client
        const subscriptions: Subscription[] = []
        
        subscriptionsSnapshot.docs.forEach(doc => {
          const subData = doc.data()
          subscriptions.push({
            id: doc.id,
            ...subData,
            dateStart: convertFirestoreDate(subData.dateStart) || new Date(),
            dateEnd: convertFirestoreDate(subData.dateEnd) || new Date(),
            createdAt: convertFirestoreDate(subData.createdAt) || new Date(),
            updatedAt: convertFirestoreDate(subData.updatedAt) || new Date()
          } as Subscription)
        })
        
        // Trier par date de fin décroissante et prendre la plus récente
        subscriptions.sort((a, b) => b.dateEnd.getTime() - a.dateEnd.getTime())
        lastSubscription = subscriptions[0]
        
        // Vérifier si la subscription est valide (date de fin > maintenant)
        isSubscriptionValid = lastSubscription.dateEnd > new Date()
      }
    } catch (queryError) {
      console.error(`Error querying subscriptions for user ${userId}:`, queryError)
      
      // Fallback: essayer avec l'ancienne méthode si la requête échoue
      if (member.subscriptions && member.subscriptions.length > 0) {
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
          subscriptions.sort((a, b) => b.dateEnd.getTime() - a.dateEnd.getTime())
          lastSubscription = subscriptions[0]
          isSubscriptionValid = lastSubscription.dateEnd > new Date()
        }
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
 * Récupère toutes les subscriptions d'un membre via requête directe
 */
export async function getMemberSubscriptions(userId: string): Promise<Subscription[]> {
  try {
    // Requête pour récupérer toutes les subscriptions de cet utilisateur
    const subscriptionsQuery = query(
      collection(db, 'subscriptions'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    )
    
    const subscriptionsSnapshot = await getDocs(subscriptionsQuery)
    
    const subscriptions: Subscription[] = []
    
    subscriptionsSnapshot.docs.forEach(doc => {
      const subData = doc.data()
      subscriptions.push({
        id: doc.id,
        ...subData,
        dateStart: convertFirestoreDate(subData.dateStart) || new Date(),
        dateEnd: convertFirestoreDate(subData.dateEnd) || new Date(),
        createdAt: convertFirestoreDate(subData.createdAt) || new Date(),
        updatedAt: convertFirestoreDate(subData.updatedAt) || new Date()
      } as Subscription)
    })
    
    return subscriptions
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
 * Récupère les membres d'un groupe spécifique
 */
export async function getMembersByGroup(groupId: string): Promise<User[]> {
  try {
    const membersRef = collection(db, 'users')
    const memberRoles = ['Adherant', 'Bienfaiteur', 'Sympathisant']
    const q = query(
      membersRef, 
      where('roles', 'array-contains-any', memberRoles), 
      where('groupIds', 'array-contains', groupId)
    )
    
    const querySnapshot = await getDocs(q)
    const members: User[] = []
    
    querySnapshot.docs.forEach(doc => {
      const data = doc.data()
      members.push({
        id: doc.id,
        ...data,
        createdAt: convertFirestoreDate(data.createdAt) || new Date(),
        updatedAt: convertFirestoreDate(data.updatedAt) || new Date(),
      } as User)
    })
    
    // Trier par nom de famille puis prénom
    members.sort((a, b) => {
      const lastNameComparison = (a.lastName || '').localeCompare(b.lastName || '')
      if (lastNameComparison !== 0) return lastNameComparison
      return (a.firstName || '').localeCompare(b.firstName || '')
    })
    
    return members
  } catch (error) {
    console.error('Erreur lors de la récupération des membres du groupe:', error)
    throw new Error('Impossible de récupérer les membres du groupe')
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