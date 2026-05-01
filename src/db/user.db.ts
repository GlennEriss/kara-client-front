import { FIREBASE_COLLECTION_NAMES } from '@/constantes/firebase-collection-names'
import { db as firestore } from '@/firebase/firestore'
import type { User, UserFilters, UserRole, UserStats } from '@/types/types'
import {
    collection,
    doc,
    limit as firestoreLimit,
    getCountFromServer,
    getDoc,
    getDocs,
    orderBy,
    query,
    setDoc,
    startAfter,
    Timestamp,
    updateDoc,
    where
} from 'firebase/firestore'

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
 * Génère un matricule unique au format nombreUser.MK.dateCréation
 * Ex: 1234.MK.150125
 * Vérifie l'unicité dans membershipRequests ET users
 */
export async function generateMatricule(): Promise<string> {
  try {
    const { firebaseCollectionNames } = await import('@/constantes/firebase-collection-names')
    
    let matricule: string = ''
    let isUnique = false
    let attempts = 0
    const maxAttempts = 50 // Réduire le nombre de tentatives
    
    // Date actuelle au format DDMMYY
    const now = new Date()
    const day = now.getDate().toString().padStart(2, '0')
    const month = (now.getMonth() + 1).toString().padStart(2, '0')
    const year = now.getFullYear().toString().slice(-2)
    const dateString = `${day}${month}${year}`
    
    while (!isUnique && attempts < maxAttempts) {
      // Générer un numéro utilisateur avec une meilleure distribution
      // Utiliser timestamp pour réduire les collisions
      const timestamp = Date.now().toString().slice(-4) // 4 derniers chiffres du timestamp
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
      const userNumber = (parseInt(timestamp) + parseInt(random)) % 9000 + 1000
      
      matricule = `${userNumber}.MK.${dateString}`
      
      // Vérifier l'unicité dans membershipRequests ET users
      const isUniqueInMembershipRequests = await checkMatriculeUniquenessInCollection(
        firebaseCollectionNames.membershipRequests || "membership-requests", 
        matricule
      )
      
      const isUniqueInUsers = await checkMatriculeUniquenessInCollection(
        firebaseCollectionNames.users || "users", 
        matricule
      )
      const isUniqueInAdmins = await checkMatriculeUniquenessInCollection(
        firebaseCollectionNames.admins || "admins", 
        matricule
      )
      if (isUniqueInMembershipRequests && isUniqueInUsers && isUniqueInAdmins) {
        isUnique = true
      } else {
        attempts++
      }
    }
    
    // Si on n'a pas trouvé de matricule unique, utiliser un mécanisme de fallback
    if (!isUnique) {
      console.warn('Tentatives épuisées, utilisation du mécanisme de fallback')
      const fallbackTimestamp = Date.now().toString().slice(-6) // 6 derniers chiffres
      matricule = `${fallbackTimestamp}.MK.${dateString}`
      
      // Vérifier une dernière fois l'unicité avec le fallback
      const isUniqueInMembershipRequests = await checkMatriculeUniquenessInCollection(
        firebaseCollectionNames.membershipRequests || "membership-requests", 
        matricule
      )
      
      const isUniqueInUsers = await checkMatriculeUniquenessInCollection(
        firebaseCollectionNames.users || "users", 
        matricule
      )
      
      if (!isUniqueInMembershipRequests || !isUniqueInUsers) {
        // En dernier recours, ajouter des millisecondes pour garantir l'unicité
        const milliseconds = Date.now().toString().slice(-3)
        matricule = `${fallbackTimestamp}${milliseconds}.MK.${dateString}`
      }
    }
    
    return matricule
  } catch (error) {
    console.error('Erreur lors de la génération du matricule:', error)
    throw new Error('Impossible de générer le matricule')
  }
}

/**
 * Vérifie l'unicité d'un matricule dans une collection spécifique
 */
async function checkMatriculeUniquenessInCollection(collectionName: string, matricule: string): Promise<boolean> {
  try {
    const collectionRef = collection(firestore, collectionName)
    const q = query(collectionRef, where("matricule", "==", matricule))
    const snapshot = await getDocs(q)
    return snapshot.empty
  } catch (error) {
    console.error(`Erreur lors de la vérification d'unicité dans ${collectionName}:`, error)
    return false // En cas d'erreur, considérer comme non unique pour être sûr
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
    const q = query(usersRef, where('email', '==', email), firestoreLimit(1))
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
 * Cherche à la fois par le champ 'id' et par le champ 'matricule' pour couvrir les deux cas
 */
export async function getUsersByIds(userIds: string[]): Promise<User[]> {
  try {
    const ids = Array.from(new Set(userIds.filter(Boolean)))
    if (ids.length === 0) return []
    const usersRef = collection(firestore, FIREBASE_COLLECTION_NAMES.USERS)
    const chunkSize = 10
    const chunks: string[][] = []
    for (let i = 0; i < ids.length; i += chunkSize) chunks.push(ids.slice(i, i + chunkSize))
    const resultsMap = new Map<string, User>()
    
    for (const chunk of chunks) {
      // Chercher par id
      const qById = query(usersRef, where('id', 'in', chunk))
      const snapById = await getDocs(qById)
      snapById.docs.forEach((d) => {
        const data = d.data() as any
        const user = {
          id: d.id,
          ...data,
          createdAt: toDateSafe(data.createdAt),
          updatedAt: toDateSafe(data.updatedAt),
        } as User
        resultsMap.set(d.id, user)
      })
      
      // Chercher par matricule (pour les contrats qui stockent le matricule)
      const qByMatricule = query(usersRef, where('matricule', 'in', chunk))
      const snapByMatricule = await getDocs(qByMatricule)
      snapByMatricule.docs.forEach((d) => {
        if (!resultsMap.has(d.id)) {
          const data = d.data() as any
          const user = {
            id: d.id,
            ...data,
            createdAt: toDateSafe(data.createdAt),
            updatedAt: toDateSafe(data.updatedAt),
          } as User
          resultsMap.set(d.id, user)
        }
      })
    }
    
    const results = Array.from(resultsMap.values())
    console.log('[getUsersByIds] Trouvé', results.length, 'utilisateur(s) pour', ids.length, 'id(s) demandé(s)')
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
      q = query(q, firestoreLimit(filters.limit))
    }
    
    const querySnapshot = await getDocs(q)
    const users: User[] = []
    
    querySnapshot.forEach((doc) => {
      const data = doc.data() as any
      users.push({
        id: doc.id,
        ...data,
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
 * Récupère une page d'utilisateurs avec pagination Firestore côté serveur
 * La pagination est basée sur le champ createdAt décroissant.
 * Retourne un curseur (ISO string) utilisable pour la page suivante.
 */
export async function getUsersPage(params: { limit?: number; cursorCreatedAt?: string }): Promise<{ users: User[]; nextCursorCreatedAt: string | null }> {
  const { limit = 20, cursorCreatedAt } = params || {}
  const usersRef = collection(firestore, FIREBASE_COLLECTION_NAMES.USERS)
  let q = query(usersRef, orderBy('createdAt', 'desc'), firestoreLimit(limit))

  if (cursorCreatedAt) {
    try {
      const ts = Timestamp.fromDate(new Date(cursorCreatedAt))
      q = query(usersRef, orderBy('createdAt', 'desc'), startAfter(ts), firestoreLimit(limit))
    } catch (e) {
      // fallback: ignore invalid cursor
    }
  }

  const snap = await getDocs(q)
  const users: User[] = []
  snap.docs.forEach((d) => {
    const data = d.data() as any
    users.push({
      id: d.id,
      ...data,
      createdAt: toDateSafe(data.createdAt),
      updatedAt: toDateSafe(data.updatedAt),
    } as User)
  })

  const lastDoc = snap.docs[snap.docs.length - 1]
  const nextCursorCreatedAt = lastDoc ? toDateSafe(lastDoc.data().createdAt).toISOString() : null
  return { users, nextCursorCreatedAt }
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

/**
 * Recherche des utilisateurs par nom, prénom ou matricule
 */
export async function searchUsers(
  searchQuery: string, 
  limit: number = 20
): Promise<User[]> {
  try {
    if (!searchQuery || searchQuery.trim().length < 2) {
      return []
    }

    const normalizeText = (value: unknown): string =>
      String(value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()

    const compactText = (value: unknown): string =>
      normalizeText(value).replace(/[^a-z0-9]/g, '')

    const searchTermRaw = searchQuery.trim()
    const searchTerm = normalizeText(searchTermRaw)
    const searchCompact = compactText(searchTermRaw)
    const searchTokens = searchTerm
      .split(/\s+/)
      .map(token => token.trim())
      .filter(Boolean)

    const usersRef = collection(firestore, FIREBASE_COLLECTION_NAMES.USERS)
    
    // Si la recherche ressemble à un matricule (contient .MK.), chercher directement par ID
    if (searchTerm.includes('.mk.')) {
      console.log('🔍 Recherche par matricule direct:', searchTermRaw)
      const matriculeCandidate = searchTermRaw.toUpperCase()
      try {
        const user = await getUserById(matriculeCandidate)
        if (user) {
          console.log('✅ Utilisateur trouvé par matricule:', user.matricule, user.firstName, user.lastName)
          return [user]
        } else {
          console.log('❌ Utilisateur non trouvé par matricule:', matriculeCandidate)
        }
      } catch (error) {
        console.error('❌ Erreur lors de la recherche par matricule:', error)
      }
    }

    const toUser = (snapshotDoc: any): User => {
      const data = snapshotDoc.data() as any
      return {
        id: snapshotDoc.id,
        ...data,
        createdAt: toDateSafe(data.createdAt),
        updatedAt: toDateSafe(data.updatedAt),
      } as User
    }

    const matchesSearch = (user: User): boolean => {
      const rawFirstName = user.firstName || (user as any).prenom || ''
      const rawLastName = user.lastName || (user as any).nom || ''
      const firstName = normalizeText(rawFirstName)
      const lastName = normalizeText(rawLastName)
      const firstLast = `${firstName} ${lastName}`.trim()
      const lastFirst = `${lastName} ${firstName}`.trim()
      const matricule = normalizeText(user.matricule || '')
      const matriculeCompact = compactText(user.matricule || '')
      const email = normalizeText((user as any).email || '')
      const contacts = (user.contacts || []).map(contact => normalizeText(contact))
      const contactsCompact = (user.contacts || []).map(contact => compactText(contact))

      const tokenMatch = searchTokens.every(token =>
        firstName.includes(token) ||
        lastName.includes(token) ||
        firstLast.includes(token) ||
        lastFirst.includes(token) ||
        matricule.includes(token) ||
        email.includes(token) ||
        contacts.some(contact => contact.includes(token))
      )

      const compactMatch =
        matriculeCompact.includes(searchCompact) ||
        contactsCompact.some(contact => contact.includes(searchCompact))

      return tokenMatch || compactMatch
    }

    const dedupe = new Map<string, User>()
    const maxDocsToScan = 2000
    const pageSize = Math.max(150, limit * 8)

    // Passage principal : scan paginé par createdAt (rapide pour les docs "standards")
    console.log('🔍 Recherche générale dans les utilisateurs (scan paginé)...')
    let lastDoc: any | null = null
    let scanned = 0
    let pageCount = 0

    while (scanned < maxDocsToScan && pageCount < 20) {
      const constraints = [orderBy('createdAt', 'desc')] as any[]
      if (lastDoc) {
        constraints.push(startAfter(lastDoc))
      }
      constraints.push(firestoreLimit(pageSize))

      const snap = await getDocs(query(usersRef, ...constraints))
      if (snap.empty) {
        break
      }

      scanned += snap.size
      pageCount += 1

      snap.docs.forEach(docSnap => {
        const user = toUser(docSnap)
        if (matchesSearch(user)) {
          dedupe.set(user.id, user)
        }
      })

      lastDoc = snap.docs[snap.docs.length - 1] || null

      if (snap.size < pageSize || dedupe.size >= limit * 3) {
        break
      }
    }

    // Fallback : certains documents peuvent ne pas avoir createdAt, donc non retournés par orderBy(createdAt)
    if (dedupe.size === 0) {
      console.log('🔁 Fallback de recherche sans tri createdAt...')
      const fallbackSnap = await getDocs(query(usersRef, firestoreLimit(Math.max(500, limit * 20))))
      fallbackSnap.docs.forEach(docSnap => {
        const user = toUser(docSnap)
        if (matchesSearch(user)) {
          dedupe.set(user.id, user)
        }
      })
    }

    const users = Array.from(dedupe.values())
    console.log('📊 Nombre d\'utilisateurs correspondants:', users.length)

    // Trier par pertinence (matricule exact en premier, puis correspondance du nom)
    users.sort((a, b) => {
      const aMatricule = normalizeText(a.matricule || '')
      const bMatricule = normalizeText(b.matricule || '')
      const aName = normalizeText(`${a.firstName || (a as any).prenom || ''} ${a.lastName || (a as any).nom || ''}`)
      const bName = normalizeText(`${b.firstName || (b as any).prenom || ''} ${b.lastName || (b as any).nom || ''}`)

      // Priorité aux matricules exacts
      if (aMatricule === searchTerm && bMatricule !== searchTerm) return -1
      if (bMatricule === searchTerm && aMatricule !== searchTerm) return 1

      // Puis aux matricules qui commencent par la recherche
      if (aMatricule.startsWith(searchTerm) && !bMatricule.startsWith(searchTerm)) return -1
      if (bMatricule.startsWith(searchTerm) && !aMatricule.startsWith(searchTerm)) return 1

      // Puis aux noms qui commencent par la recherche
      if (aName.startsWith(searchTerm) && !bName.startsWith(searchTerm)) return -1
      if (bName.startsWith(searchTerm) && !aName.startsWith(searchTerm)) return 1

      return 0
    })

    return users.slice(0, limit)
  } catch (error) {
    console.error('Erreur lors de la recherche d\'utilisateurs:', error)
    throw new Error('Impossible de rechercher les utilisateurs')
  }
}
