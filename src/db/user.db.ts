import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  Timestamp,
  getCountFromServer
} from 'firebase/firestore'
import { db as firestore } from '@/firebase/firestore'
import type { User, UserFilters, UserStats, UserRole } from '@/types/types'
import { FIREBASE_COLLECTION_NAMES } from '@/constantes/firebase-collection-names'

// Supprime récursivement les clés avec valeur undefined (Firestore ne les accepte pas)
function sanitizeForFirestore<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((v) => sanitizeForFirestore(v)) as unknown as T
  }
  if (value && typeof value === 'object') {
    const result: any = {}
    for (const [k, v] of Object.entries(value as any)) {
      if (v === undefined) continue
      result[k] = sanitizeForFirestore(v as any)
    }
    return result
  }
  return value
}

// Convertit de manière sûre un champ Firestore (Timestamp | Date | string | number) en Date
function toDateSafe(value: any): Date {
  try {
    if (!value) return new Date(0)
    if (value instanceof Date) return value
    if (typeof value?.toDate === 'function') return value.toDate()
    const parsed = new Date(value)
    if (!isNaN(parsed.getTime())) return parsed
  } catch {
    // ignore
  }
  return new Date(0)
}

/**
 * Génère un matricule au format nombreUser.MK.dateCréation
 * Ex: 0004.MK.040825
 */
export async function generateMatricule(): Promise<string> {
  try {
    // Compter le nombre d'utilisateurs existants
    const usersRef = collection(firestore, FIREBASE_COLLECTION_NAMES.USERS)
    const snapshot = await getCountFromServer(usersRef)
    const userCount = snapshot.data().count
    
    // Numéro utilisateur avec zéros à gauche (4 chiffres)
    const userNumber = (userCount + 1).toString().padStart(4, '0')
    
    // Date actuelle au format DDMMYY
    const now = new Date()
    const day = now.getDate().toString().padStart(2, '0')
    const month = (now.getMonth() + 1).toString().padStart(2, '0')
    const year = now.getFullYear().toString().slice(-2)
    const dateString = `${day}${month}${year}`
    
    return `${userNumber}.MK.${dateString}`
  } catch (error) {
    console.error('Erreur lors de la génération du matricule:', error)
    throw new Error('Impossible de générer le matricule')
  }
}

/**
 * Crée un nouvel utilisateur dans la collection users
 */
export async function createUser(userData: Omit<User, 'id' | 'matricule' | 'createdAt' | 'updatedAt'>): Promise<User> {
  try {
    // Générer le matricule
    const matricule = await generateMatricule()
    
    // Le matricule est aussi l'ID du document
    const userId = matricule
    
    const userDocData: User = {
      ...userData,
      id: userId,
      matricule,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    
    const userRef = doc(firestore, FIREBASE_COLLECTION_NAMES.USERS, userId)
    const payload = sanitizeForFirestore({
      ...userDocData,
      createdAt: Timestamp.fromDate(userDocData.createdAt),
      updatedAt: Timestamp.fromDate(userDocData.updatedAt),
    })
    await setDoc(userRef, payload)
    
    console.log('Utilisateur créé avec succès:', userId)
    return userDocData
  } catch (error) {
    console.error('Erreur lors de la création de l\'utilisateur:', error)
    throw new Error('Impossible de créer l\'utilisateur')
  }
}

/**
 * Crée un nouvel utilisateur avec un matricule existant
 */
export async function createUserWithMatricule(
  userData: Omit<User, 'id' | 'matricule' | 'createdAt' | 'updatedAt'>, 
  existingMatricule: string
): Promise<User> {
  try {
    // Utiliser le matricule fourni comme ID du document
    const userId = existingMatricule
    
    const userDocData: User = {
      ...userData,
      id: userId,
      matricule: existingMatricule,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    
    const userRef = doc(firestore, FIREBASE_COLLECTION_NAMES.USERS, userId)
    const payload = sanitizeForFirestore({
      ...userDocData,
      createdAt: Timestamp.fromDate(userDocData.createdAt),
      updatedAt: Timestamp.fromDate(userDocData.updatedAt),
    })
    await setDoc(userRef, payload)
    
    console.log('Utilisateur créé avec matricule existant:', userId)
    return userDocData
  } catch (error) {
    console.error('Erreur lors de la création de l\'utilisateur avec matricule:', error)
    throw new Error('Impossible de créer l\'utilisateur avec le matricule fourni')
  }
}

/**
 * Crée un document utilisateur minimal sans stocker le champ `id`.
 * Ajoute automatiquement `matricule`, `createdAt`, `updatedAt`.
 */
export async function createUserRawWithMatricule(
  data: Record<string, any>,
  matricule: string
): Promise<void> {
  try {
    const userRef = doc(firestore, FIREBASE_COLLECTION_NAMES.USERS, matricule)
    const now = new Date()
    const payload = sanitizeForFirestore({
      ...data,
      matricule,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    })
    await setDoc(userRef, payload)
  } catch (error) {
    console.error('Erreur lors de la création du document utilisateur (minimal):', error)
    throw new Error("Impossible de créer l'utilisateur")
  }
}

/**
 * Récupère un utilisateur par son ID/matricule
 */
export async function getUserById(userId: string): Promise<User | null> {
  try {
    const userRef = doc(firestore, FIREBASE_COLLECTION_NAMES.USERS, userId)
    const docSnap = await getDoc(userRef)
    
    if (!docSnap.exists()) {
      return null
    }
    
    const data = docSnap.data()
    return {
      id: docSnap.id,
      ...(data as any),
      createdAt: toDateSafe(data.createdAt),
      updatedAt: toDateSafe(data.updatedAt),
    } as User
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'utilisateur:', error)
    throw new Error('Impossible de récupérer l\'utilisateur')
  }
}

/**
 * Récupère un utilisateur par son email
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const usersRef = collection(firestore, FIREBASE_COLLECTION_NAMES.USERS)
    const q = query(usersRef, where('email', '==', email), limit(1))
    const querySnapshot = await getDocs(q)
    
    if (querySnapshot.empty) {
      return null
    }
    
    const doc = querySnapshot.docs[0]
    const data = doc.data()
    
    return {
      id: doc.id,
      ...(data as any),
      createdAt: toDateSafe(data.createdAt),
      updatedAt: toDateSafe(data.updatedAt),
    } as User
  } catch (error) {
    console.error('Erreur lors de la recherche par email:', error)
    throw new Error('Impossible de rechercher l\'utilisateur par email')
  }
}

/**
 * Met à jour un utilisateur
 */
export async function updateUser(userId: string, updates: Partial<Omit<User, 'id' | 'matricule' | 'createdAt'>>): Promise<boolean> {
  try {
    const userRef = doc(firestore, FIREBASE_COLLECTION_NAMES.USERS, userId)
    
    const updateData = sanitizeForFirestore({
      ...updates,
      updatedAt: Timestamp.fromDate(new Date()),
    })
    
    await updateDoc(userRef, updateData)
    console.log('Utilisateur mis à jour avec succès:', userId)
    return true
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'utilisateur:', error)
    return false
  }
}

/**
 * Récupère plusieurs utilisateurs par lot (chunk de 10 ids max par requête Firestore "in")
 */
export async function getUsersByIds(userIds: string[]): Promise<User[]> {
  try {
    const ids = Array.from(new Set(userIds.filter(Boolean)))
    if (ids.length === 0) return []
    const usersRef = collection(firestore, FIREBASE_COLLECTION_NAMES.USERS)
    const chunkSize = 10
    const chunks: string[][] = []
    for (let i = 0; i < ids.length; i += chunkSize) chunks.push(ids.slice(i, i + chunkSize))
    const results: User[] = []
    for (const chunk of chunks) {
      const q = query(usersRef, where('id', 'in', chunk))
      const snap = await getDocs(q)
      snap.docs.forEach((d) => {
        const data = d.data() as any
        results.push({
          id: d.id,
          ...data,
          createdAt: toDateSafe(data.createdAt),
          updatedAt: toDateSafe(data.updatedAt),
        } as User)
      })
    }
    return results
  } catch (error) {
    console.error('Erreur getUsersByIds:', error)
    return []
  }
}

/**
 * Supprime un utilisateur (soft delete en désactivant)
 */
export async function deactivateUser(userId: string): Promise<boolean> {
  try {
    return await updateUser(userId, { 
      isActive: false,
      updatedAt: new Date()
    })
  } catch (error) {
    console.error('Erreur lors de la désactivation de l\'utilisateur:', error)
    return false
  }
}

/**
 * Récupère tous les utilisateurs avec filtres et pagination
 */
export async function getAllUsers(filters: UserFilters = {}): Promise<{ users: User[], total: number }> {
  try {
    const usersRef = collection(firestore, FIREBASE_COLLECTION_NAMES.USERS)
    let q = query(usersRef)
    
    // Appliquer les filtres
    if (filters.membershipType && filters.membershipType.length > 0) {
      q = query(q, where('membershipType', 'in', filters.membershipType))
    }
    
    // Filtre par rôles
    if (filters.roles && filters.roles.length > 0) {
      q = query(q, where('roles', 'array-contains-any', filters.roles))
    }
    
    if (filters.hasCar !== undefined) {
      q = query(q, where('hasCar', '==', filters.hasCar))
    }
    
    if (filters.isActive !== undefined) {
      q = query(q, where('isActive', '==', filters.isActive))
    }
    
    // Tri
    if (filters.orderByField) {
      const direction = filters.orderByDirection || 'desc'
      q = query(q, orderBy(filters.orderByField, direction))
    } else {
      q = query(q, orderBy('createdAt', 'desc'))
    }
    
    // Limite
    if (filters.limit) {
      q = query(q, limit(filters.limit))
    }
    
    const querySnapshot = await getDocs(q)
    const users: User[] = []
    
    querySnapshot.forEach((doc) => {
      const data = doc.data()
      users.push({
        id: doc.id,
        ...(data as any),
        createdAt: toDateSafe(data.createdAt),
        updatedAt: toDateSafe(data.updatedAt),
      } as User)
    })
    
    // Compter le total (sans filtres de pagination)
    const countQuery = query(usersRef)
    const countSnapshot = await getCountFromServer(countQuery)
    const total = countSnapshot.data().count
    
    return { users, total }
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error)
    throw new Error('Impossible de récupérer les utilisateurs')
  }
}

/**
 * Ajoute une souscription à un utilisateur
 */
export async function addSubscriptionToUser(userId: string, subscriptionId: string): Promise<boolean> {
  try {
    const user = await getUserById(userId)
    if (!user) {
      throw new Error('Utilisateur non trouvé')
    }
    
    const updatedSubscriptions = [...user.subscriptions, subscriptionId]
    return await updateUser(userId, { subscriptions: updatedSubscriptions })
  } catch (error) {
    console.error('Erreur lors de l\'ajout de la souscription:', error)
    return false
  }
}

/**
 * Retire une souscription d'un utilisateur
 */
export async function removeSubscriptionFromUser(userId: string, subscriptionId: string): Promise<boolean> {
  try {
    const user = await getUserById(userId)
    if (!user) {
      throw new Error('Utilisateur non trouvé')
    }
    
    const updatedSubscriptions = user.subscriptions.filter(id => id !== subscriptionId)
    return await updateUser(userId, { subscriptions: updatedSubscriptions })
  } catch (error) {
    console.error('Erreur lors de la suppression de la souscription:', error)
    return false
  }
}

/**
 * Récupère les statistiques des utilisateurs
 */
export async function getUserStats(): Promise<UserStats> {
  try {
    const usersRef = collection(firestore, FIREBASE_COLLECTION_NAMES.USERS)
    
    // Total des utilisateurs
    const totalSnapshot = await getCountFromServer(usersRef)
    const total = totalSnapshot.data().count
    
    // Utilisateurs actifs
    const activeQuery = query(usersRef, where('isActive', '==', true))
    const activeSnapshot = await getCountFromServer(activeQuery)
    const active = activeSnapshot.data().count
    
    // Utilisateurs avec voiture
    const withCarQuery = query(usersRef, where('hasCar', '==', true))
    const withCarSnapshot = await getCountFromServer(withCarQuery)
    const withCar = withCarSnapshot.data().count
    
    // Récupérer tous les utilisateurs pour calculer les stats détaillées
    const allUsersSnapshot = await getDocs(usersRef)
    let adherant = 0, bienfaiteur = 0, sympathisant = 0
    let newThisMonth = 0, newThisYear = 0
    
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfYear = new Date(now.getFullYear(), 0, 1)
    
    allUsersSnapshot.forEach((doc) => {
      const data = doc.data()
      const createdAt = toDateSafe(data.createdAt)
      
      // Compter par type
      if (data.membershipType === 'adherant') adherant++
      else if (data.membershipType === 'bienfaiteur') bienfaiteur++
      else if (data.membershipType === 'sympathisant') sympathisant++
      
      // Compter les nouveaux
      if (createdAt >= startOfMonth) newThisMonth++
      if (createdAt >= startOfYear) newThisYear++
    })
    
    return {
      total,
      active,
      inactive: total - active,
      byMembershipType: {
        adherant,
        bienfaiteur,
        sympathisant
      },
      withCar,
      withoutCar: total - withCar,
      newThisMonth,
      newThisYear
    }
  } catch (error) {
    console.error('Erreur lors du calcul des statistiques:', error)
    throw new Error('Impossible de calculer les statistiques')
  }
}

/**
 * Ajoute un rôle à un utilisateur
 */
export async function addRoleToUser(userId: string, role: UserRole): Promise<boolean> {
  try {
    const user = await getUserById(userId)
    if (!user) {
      throw new Error('Utilisateur non trouvé')
    }
    
    // Vérifier si le rôle n'existe pas déjà
    if (user.roles.includes(role)) {
      console.log('L\'utilisateur a déjà ce rôle:', role)
      return true
    }
    
    const updatedRoles = [...user.roles, role]
    return await updateUser(userId, { roles: updatedRoles })
  } catch (error) {
    console.error('Erreur lors de l\'ajout du rôle:', error)
    return false
  }
}

/**
 * Retire un rôle d'un utilisateur
 */
export async function removeRoleFromUser(userId: string, role: UserRole): Promise<boolean> {
  try {
    const user = await getUserById(userId)
    if (!user) {
      throw new Error('Utilisateur non trouvé')
    }
    
    const updatedRoles = user.roles.filter(r => r !== role)
    return await updateUser(userId, { roles: updatedRoles })
  } catch (error) {
    console.error('Erreur lors de la suppression du rôle:', error)
    return false
  }
}

/**
 * Vérifie si un utilisateur a un rôle spécifique
 */
export async function userHasRole(userId: string, role: UserRole): Promise<boolean> {
  try {
    const user = await getUserById(userId)
    if (!user) {
      return false
    }
    
    return user.roles.includes(role)
  } catch (error) {
    console.error('Erreur lors de la vérification du rôle:', error)
    return false
  }
}

/**
 * Vérifie si un utilisateur est admin
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  return await userHasRole(userId, 'Admin')
}

/**
 * Récupère tous les utilisateurs ayant un rôle spécifique
 */
export async function getUsersByRole(role: UserRole): Promise<User[]> {
  try {
    const result = await getAllUsers({ roles: [role] })
    return result.users
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs par rôle:', error)
    throw new Error('Impossible de récupérer les utilisateurs par rôle')
  }
}