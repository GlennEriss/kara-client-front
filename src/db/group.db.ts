import { firebaseCollectionNames } from '@/constantes/firebase-collection-names'
import type { Group } from '@/types/types'

const getFirestore = () => import('@/firebase/firestore')

function toDateSafe(v: any): Date {
  try {
    if (!v) return new Date(0)
    if (v instanceof Date) return v
    if (typeof v?.toDate === 'function') return v.toDate()
    const d = new Date(v)
    return isNaN(d.getTime()) ? new Date(0) : d
  } catch {
    return new Date(0)
  }
}

export async function createGroup(input: Omit<Group, 'id' | 'createdAt' | 'updatedAt'>): Promise<Group> {
  const { db, collection, addDoc, serverTimestamp, doc, getDoc } = await getFirestore() as any
  const colRef = collection(db, firebaseCollectionNames.groups || 'groups')
  const now = serverTimestamp()
  const ref = await addDoc(colRef, {
    name: input.name,
    label: input.label ?? null,
    description: input.description ?? null,
    createdBy: input.createdBy,
    updatedBy: input.updatedBy ?? input.createdBy,
    createdAt: now,
    updatedAt: now,
  })
  const snap = await getDoc(doc(db, firebaseCollectionNames.groups || 'groups', ref.id))
  const data = snap.data() as any
  return {
    id: ref.id,
    name: data.name,
    label: data.label ?? undefined,
    description: data.description ?? undefined,
    createdBy: data.createdBy,
    updatedBy: data.updatedBy,
    createdAt: toDateSafe(data.createdAt),
    updatedAt: toDateSafe(data.updatedAt),
  } as Group
}

export async function updateGroup(id: string, updates: Partial<Omit<Group, 'id' | 'createdAt'>>): Promise<boolean> {
  const { db, doc, updateDoc, serverTimestamp } = await getFirestore() as any
  const ref = doc(db, firebaseCollectionNames.groups || 'groups', id)
  const payload: any = { ...updates, updatedAt: serverTimestamp() }
  // nettoyer undefined
  Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k])
  await updateDoc(ref, payload)
  return true
}

export async function deleteGroup(id: string): Promise<boolean> {
  const { db, doc, deleteDoc } = await getFirestore() as any
  const ref = doc(db, firebaseCollectionNames.groups || 'groups', id)
  await deleteDoc(ref)
  return true
}

export async function getGroupById(id: string): Promise<Group | null> {
  try {
    const { db, doc, getDoc } = await getFirestore() as any
    const ref = doc(db, firebaseCollectionNames.groups || 'groups', id)
    const snap = await getDoc(ref)
    
    if (!snap.exists()) {
      return null
    }
    
    const data = snap.data()
    return {
      id: snap.id,
      name: data.name,
      label: data.label ?? undefined,
      description: data.description ?? undefined,
      createdBy: data.createdBy,
      updatedBy: data.updatedBy,
      createdAt: toDateSafe(data.createdAt),
      updatedAt: toDateSafe(data.updatedAt),
    } as Group
  } catch (error) {
    console.error('Erreur lors de la récupération du groupe:', error)
    return null
  }
}

export async function listGroups(): Promise<Group[]> {
  const { db, collection, getDocs, orderBy, query } = await getFirestore() as any
  const colRef = collection(db, firebaseCollectionNames.groups || 'groups')
  const q = query(colRef, orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d: any) => {
    const data = d.data()
    return {
      id: d.id,
      name: data.name,
      label: data.label ?? undefined,
      description: data.description ?? undefined,
      createdBy: data.createdBy,
      updatedBy: data.updatedBy,
      createdAt: toDateSafe(data.createdAt),
      updatedAt: toDateSafe(data.updatedAt),
    } as Group
  })
}

/**
 * Recherche des groupes par nom ou description
 */
export async function searchGroups(
  query: string, 
  limit: number = 20
): Promise<Group[]> {
  try {
    if (!query || query.trim().length < 2) {
      return []
    }

    const searchTerm = query.trim().toLowerCase()
    const { db, collection, getDocs, orderBy, query: firestoreQuery, limit: firestoreLimit } = await getFirestore() as any
    const colRef = collection(db, firebaseCollectionNames.groups || 'groups')
    
    // Récupérer les groupes récents pour la recherche
    const q = firestoreQuery(colRef, orderBy('createdAt', 'desc'), firestoreLimit(limit * 2))
    const snap = await getDocs(q)
    
    const groups: Group[] = []
    
    snap.docs.forEach((d: any) => {
      const data = d.data()
      const group = {
        id: d.id,
        name: data.name,
        label: data.label ?? undefined,
        description: data.description ?? undefined,
        createdBy: data.createdBy,
        updatedBy: data.updatedBy,
        createdAt: toDateSafe(data.createdAt),
        updatedAt: toDateSafe(data.updatedAt),
      } as Group
      
      // Filtrer côté client pour la recherche
      const matchesSearch = 
        group.name?.toLowerCase().includes(searchTerm) ||
        group.label?.toLowerCase().includes(searchTerm) ||
        group.description?.toLowerCase().includes(searchTerm)
      
      if (matchesSearch) {
        groups.push(group)
      }
    })
    
    // Retourner seulement le nombre demandé
    return groups.slice(0, limit)
  } catch (error) {
    console.error('Erreur lors de la recherche de groupes:', error)
    throw new Error('Impossible de rechercher les groupes')
  }
}

