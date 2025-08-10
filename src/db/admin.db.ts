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
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  DocumentSnapshot,
} from '@/firebase/firestore'
import { db } from '@/firebase/firestore'
import { setDoc } from '@/firebase/firestore'

// ================== TYPES POUR LES ADMINS ==================

export type AdminRole = 'SuperAdmin' | 'Admin' | 'Secretary'

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  SuperAdmin: 'Super Administrateur',
  Admin: 'Administrateur',
  Secretary: 'Secrétaire',
}

export interface AdminUser {
  id: string
  firstName: string
  lastName: string
  birthDate: string
  civility: 'Monsieur' | 'Madame' | 'Mademoiselle'
  gender: 'Homme' | 'Femme'
  email?: string
  contacts: string[]
  roles: AdminRole[]
  photoURL?: string | null
  photoPath?: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  permissions?: string[]
}

export interface AdminFilters {
  roles?: AdminRole[]
  isActive?: boolean
  searchQuery?: string
  orderByField?: string
  orderByDirection?: 'asc' | 'desc'
}

export interface PaginatedAdmins {
  data: AdminUser[]
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

// =============== SANITIZE HELPERS ===============
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

// ================== HELPERS ==================

function toDate(value: any): Date {
  if (!value) return new Date(0)
  if (value.toDate && typeof value.toDate === 'function') return value.toDate()
  if (value instanceof Date) return value
  return new Date(value)
}

function mapAdmin(docSnap: any): AdminUser {
  const data = docSnap.data() || {}
  return {
    id: docSnap.id,
    firstName: data.firstName || '',
    lastName: data.lastName || '',
    birthDate: data.birthDate || '',
    civility: data.civility || 'Monsieur',
    gender: data.gender || 'Homme',
    email: data.email,
    contacts: Array.isArray(data.contacts) ? data.contacts : [],
    roles: Array.isArray(data.roles) ? (data.roles as AdminRole[]) : [],
    photoURL: data.photoURL ?? null,
    photoPath: data.photoPath ?? null,
    isActive: data.isActive ?? true,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
    permissions: Array.isArray(data.permissions) ? data.permissions : undefined,
  }
}

// ================== QUERIES ==================

export async function getAdmins(
  filters: AdminFilters = {},
  page: number = 1,
  itemsPerPage: number = 10,
  cursor?: DocumentSnapshot
): Promise<PaginatedAdmins> {
  const adminsRef = collection(db, 'admins')

  const constraints: any[] = []

  if (filters.roles && filters.roles.length > 0) {
    // Les documents admins stockent les rôles dans un tableau `roles`
    constraints.push(where('roles', 'array-contains-any', filters.roles))
  }

  if (typeof filters.isActive === 'boolean') {
    constraints.push(where('isActive', '==', filters.isActive))
  }

  const orderField = filters.orderByField || 'createdAt'
  const orderDirection = filters.orderByDirection || 'desc'
  constraints.push(orderBy(orderField, orderDirection))

  if (cursor) {
    constraints.push(startAfter(cursor))
  }

  constraints.push(limit(itemsPerPage + 1))

  const q = query(adminsRef, ...constraints)
  const snap = await getDocs(q)

  const admins: AdminUser[] = []
  let hasNextPage = false

  for (let index = 0; index < snap.docs.length; index++) {
    if (index < itemsPerPage) {
      const d = snap.docs[index]
      admins.push(mapAdmin(d))
    } else {
      hasNextPage = true
      break
    }
  }

  // Filtre textuel côté client
  let filtered = admins
  if (filters.searchQuery && filters.searchQuery.trim().length > 0) {
    const s = filters.searchQuery.toLowerCase()
    filtered = admins.filter((a) =>
      a.firstName.toLowerCase().includes(s) ||
      a.lastName.toLowerCase().includes(s) ||
      (a.email?.toLowerCase().includes(s) ?? false)
    )
  }

  const nextCursor = admins.length > 0 ? snap.docs[Math.min(itemsPerPage - 1, snap.docs.length - 1)] : null

  return {
    data: filtered,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(filtered.length / itemsPerPage),
      totalItems: filtered.length,
      itemsPerPage,
      hasNextPage,
      hasPrevPage: page > 1,
      nextCursor,
      prevCursor: null,
    },
  }
}

export async function getAdminById(id: string): Promise<AdminUser | null> {
  const ref = doc(db, 'admins', id)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return mapAdmin(snap)
}

export async function searchAdmins(searchTerm: string, limitSize: number = 20): Promise<AdminUser[]> {
  // Récupération simple et filtrage côté client
  const firstPage = await getAdmins({ orderByField: 'createdAt', orderByDirection: 'desc' }, 1, limitSize)
  const s = searchTerm.toLowerCase()
  return firstPage.data.filter((a) =>
    a.firstName.toLowerCase().includes(s) ||
    a.lastName.toLowerCase().includes(s) ||
    (a.email?.toLowerCase().includes(s) ?? false)
  )
}

// ================== MUTATIONS ==================

export interface CreateAdminInput {
  firstName: string
  lastName: string
  birthDate: string
  civility: 'Monsieur' | 'Madame' | 'Mademoiselle'
  gender: 'Homme' | 'Femme'
  email?: string
  contacts: string[] // longueur=1
  roles: AdminRole[] // longueur>=1
  photoURL?: string | null
  photoPath?: string | null
  isActive?: boolean
}

export async function createAdmin(input: CreateAdminInput): Promise<string> {
  const adminsRef = collection(db, 'admins')
  const payload = sanitizeForFirestore({
    ...input,
    isActive: input.isActive ?? true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  const docRef = await addDoc(adminsRef, payload)
  return docRef.id
}

// Crée un admin avec un ID spécifique (ex: matricule)
export async function createAdminWithId(id: string, input: CreateAdminInput): Promise<string> {
  const ref = doc(db, 'admins', id)
  const payload = sanitizeForFirestore({
    ...input,
    isActive: input.isActive ?? true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  await setDoc(ref, payload)
  return id
}

export async function updateAdmin(id: string, updates: Partial<Omit<AdminUser, 'id'>>): Promise<boolean> {
  const ref = doc(db, 'admins', id)
  await updateDoc(ref, {
    ...updates,
    updatedAt: serverTimestamp(),
  })
  return true
}

// Met à jour l'admin côté Firestore ET (optionnel) côté Firebase Auth (displayName/phone/photo)
export async function updateAdminDeep(
  id: string,
  updates: Partial<Omit<AdminUser, 'id'>> & { updateAuth?: { phoneNumber?: string; displayName?: string; photoURL?: string } }
): Promise<boolean> {
  // Mise à jour Firestore
  await updateAdmin(id, updates)

  // Mise à jour Auth si demandé
  if (updates.updateAuth) {
    const body: any = { uid: id }
    if (updates.updateAuth.phoneNumber) body.phoneNumber = updates.updateAuth.phoneNumber
    if (updates.updateAuth.displayName) body.displayName = updates.updateAuth.displayName
    if (updates.updateAuth.photoURL) body.photoURL = updates.updateAuth.photoURL

    await fetch('/api/firebase/auth/update-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }

  return true
}

export async function deleteAdmin(id: string): Promise<boolean> {
  const ref = doc(db, 'admins', id)
  await deleteDoc(ref)
  return true
}

