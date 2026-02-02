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
  getCountFromServer,
  Timestamp,
} from '@/firebase/firestore'
import type { QueryConstraint } from 'firebase/firestore'
import { db } from '@/firebase/firestore'
import type { AgentRecouvrement, AgentsFilters, AgentsStats } from '@/types/types'
import { firebaseCollectionNames } from '@/constantes/firebase-collection-names'

const COLLECTION = firebaseCollectionNames.agentsRecouvrement || 'agentsRecouvrement'

function toDate(value: unknown): Date {
  if (!value) return new Date(0)
  if (typeof value === 'object' && value !== null) {
    // Détecter les données corrompues (serverTimestamp non résolu)
    if ('_methodName' in value && (value as { _methodName?: string })._methodName === 'serverTimestamp') {
      return new Date(0) // Traiter comme date manquante
    }
    if ('toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
      return (value as { toDate: () => Date }).toDate()
    }
    // Timestamp sérialisé {seconds, _seconds} (client SDK ou Admin SDK)
    const seconds = (value as { seconds?: number; _seconds?: number }).seconds ?? (value as { _seconds?: number })._seconds
    if (typeof seconds === 'number') {
      const d = new Date(seconds * 1000)
      return isNaN(d.getTime()) ? new Date(0) : d
    }
  }
  if (value instanceof Date) return value
  const d = new Date(value as string | number)
  return isNaN(d.getTime()) ? new Date(0) : d
}

function mapDocToAgent(docSnap: DocumentSnapshot): AgentRecouvrement {
  const data = docSnap.data() || {}
  const piece = data.pieceIdentite || {}
  return {
    id: docSnap.id,
    nom: data.nom || '',
    prenom: data.prenom || '',
    sexe: data.sexe || 'M',
    pieceIdentite: {
      type: piece.type || 'CNI',
      numero: piece.numero || '',
      dateDelivrance: toDate(piece.dateDelivrance),
      dateExpiration: toDate(piece.dateExpiration),
    },
    dateNaissance: toDate(data.dateNaissance),
    birthMonth: data.birthMonth,
    birthDay: data.birthDay,
    lieuNaissance: data.lieuNaissance || '',
    tel1: data.tel1 || '',
    tel2: data.tel2,
    photoUrl: data.photoUrl ?? null,
    photoPath: data.photoPath ?? null,
    actif: data.actif ?? true,
    searchableTextLastNameFirst: data.searchableTextLastNameFirst || '',
    searchableTextFirstNameFirst: data.searchableTextFirstNameFirst || '',
    searchableTextNumeroFirst: data.searchableTextNumeroFirst || '',
    createdBy: data.createdBy || '',
    createdAt: toDate(data.createdAt),
    updatedBy: data.updatedBy,
    updatedAt: toDate(data.updatedAt),
  }
}

function sanitizeForFirestore<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((v) => sanitizeForFirestore(v)) as unknown as T
  }
  if (value && typeof value === 'object') {
    // Ne pas modifier Timestamp Firestore ni serverTimestamp() (FieldValue)
    if (value instanceof Timestamp) return value
    const result: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === undefined) continue
      result[k] = sanitizeForFirestore(v)
    }
    return result as T
  }
  return value
}

export interface PaginatedAgents {
  data: AgentRecouvrement[]
  pagination: {
    currentPage: number
    totalPages: number
    totalItems: number
    itemsPerPage: number
    hasNextPage: boolean
    hasPrevPage: boolean
    nextCursor: DocumentSnapshot | null
    prevCursor: DocumentSnapshot | null
  }
}

export async function getAgentsWithFilters(
  filters: AgentsFilters = {},
  page: number = 1,
  itemsPerPage: number = 12,
  cursor?: DocumentSnapshot
): Promise<PaginatedAgents> {
  const agentsRef = collection(db, COLLECTION)
  const constraints: QueryConstraint[] = []

  const tab = filters.tab || 'actifs'
  if (tab === 'actifs') {
    constraints.push(where('actif', '==', true))
  } else if (tab === 'inactifs') {
    constraints.push(where('actif', '==', false))
  }
  // tab === 'tous' : pas de filtre actif
  // tab === 'anniversaires' : filtre actif + birthMonth (géré séparément)

  const orderField = filters.orderByField || 'nom'
  const orderDir = filters.orderByDirection || 'asc'
  constraints.push(orderBy(orderField, orderDir))

  if (cursor) {
    constraints.push(startAfter(cursor))
  }
  constraints.push(limit(itemsPerPage + 1))

  const q = query(agentsRef, ...constraints)
  const snap = await getDocs(q)

  const items: AgentRecouvrement[] = []
  for (let i = 0; i < Math.min(snap.docs.length, itemsPerPage); i++) {
    items.push(mapDocToAgent(snap.docs[i]))
  }
  const hasNextPage = snap.docs.length > itemsPerPage
  const nextCursor = snap.docs.length > 0 ? snap.docs[Math.min(itemsPerPage - 1, snap.docs.length - 1)] : null

  // Filtre recherche côté client si searchQuery
  let filtered = items
  if (filters.searchQuery && filters.searchQuery.trim().length >= 2) {
    const s = filters.searchQuery.toLowerCase()
    filtered = items.filter(
      (a) =>
        a.nom.toLowerCase().includes(s) ||
        a.prenom.toLowerCase().includes(s) ||
        a.pieceIdentite.numero.toLowerCase().includes(s) ||
        a.tel1.toLowerCase().includes(s) ||
        (a.tel2?.toLowerCase().includes(s) ?? false)
    )
  }

  const totalItems = filtered.length
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage))

  return {
    data: filtered,
    pagination: {
      currentPage: page,
      totalPages,
      totalItems,
      itemsPerPage,
      hasNextPage,
      hasPrevPage: page > 1,
      nextCursor,
      prevCursor: null,
    },
  }
}

export async function getAgentsAnniversairesMois(
  page: number = 1,
  itemsPerPage: number = 12,
  cursor?: DocumentSnapshot
): Promise<PaginatedAgents> {
  const agentsRef = collection(db, COLLECTION)
  const currentMonth = new Date().getMonth() + 1

  const constraints: Parameters<typeof query>[1][] = [
    where('actif', '==', true),
    where('birthMonth', '==', currentMonth),
    orderBy('birthDay', 'asc'),
  ]
  if (cursor) constraints.push(startAfter(cursor))
  constraints.push(limit(itemsPerPage + 1))

  const q = query(agentsRef, ...constraints)
  const snap = await getDocs(q)

  const agents: AgentRecouvrement[] = []
  for (let i = 0; i < Math.min(snap.docs.length, itemsPerPage); i++) {
    agents.push(mapDocToAgent(snap.docs[i]))
  }
  const hasNextPage = snap.docs.length > itemsPerPage
  const nextCursor = snap.docs.length > 0 ? snap.docs[Math.min(itemsPerPage - 1, snap.docs.length - 1)] : null

  return {
    data: agents,
    pagination: {
      currentPage: page,
      totalPages: Math.max(1, Math.ceil(agents.length / itemsPerPage)),
      totalItems: agents.length,
      itemsPerPage,
      hasNextPage,
      hasPrevPage: page > 1,
      nextCursor,
      prevCursor: null,
    },
  }
}

export async function getAgentById(id: string): Promise<AgentRecouvrement | null> {
  const ref = doc(db, COLLECTION, id)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return mapDocToAgent(snap)
}

export async function getAgentsStats(): Promise<AgentsStats> {
  const agentsRef = collection(db, COLLECTION)
  const allSnap = await getDocs(query(agentsRef))

  let total = 0
  let actifs = 0
  let inactifs = 0
  let hommes = 0
  let femmes = 0
  const currentMonth = new Date().getMonth() + 1
  let anniversairesMois = 0

  allSnap.docs.forEach((d) => {
    const data = d.data()
    total++
    if (data.actif) actifs++
    else inactifs++
    if (data.sexe === 'M') hommes++
    else if (data.sexe === 'F') femmes++
    if (data.actif && data.birthMonth === currentMonth) anniversairesMois++
  })

  return {
    total,
    actifs,
    inactifs,
    hommes,
    femmes,
    anniversairesMois,
  }
}

export interface CreateAgentInput {
  nom: string
  prenom: string
  sexe: 'M' | 'F'
  pieceIdentite: {
    type: string
    numero: string
    dateDelivrance: Date
    dateExpiration: Date
  }
  dateNaissance: Date
  lieuNaissance: string
  tel1: string
  tel2?: string
  photoUrl?: string | null
  photoPath?: string | null
  actif?: boolean
  createdBy: string
}

function computeSearchableTexts(input: CreateAgentInput): {
  searchableTextLastNameFirst: string
  searchableTextFirstNameFirst: string
  searchableTextNumeroFirst: string
} {
  const parts = [
    input.nom,
    input.prenom,
    input.pieceIdentite.numero,
    input.tel1,
    input.tel2 || '',
  ].filter(Boolean)
  const lower = parts.map((p) => p.toLowerCase()).join(' ')
  return {
    searchableTextLastNameFirst: [input.nom, input.prenom, input.pieceIdentite.numero, input.tel1, input.tel2 || ''].filter(Boolean).join(' ').toLowerCase(),
    searchableTextFirstNameFirst: [input.prenom, input.nom, input.pieceIdentite.numero, input.tel1, input.tel2 || ''].filter(Boolean).join(' ').toLowerCase(),
    searchableTextNumeroFirst: [input.pieceIdentite.numero, input.tel1, input.tel2 || '', input.nom, input.prenom].filter(Boolean).join(' ').toLowerCase(),
  }
}

function computeBirthMonthDay(date: Date): { birthMonth: number; birthDay: number } {
  return {
    birthMonth: date.getMonth() + 1,
    birthDay: date.getDate(),
  }
}

export async function createAgent(input: CreateAgentInput): Promise<string> {
  const agentsRef = collection(db, COLLECTION)
  const searchable = computeSearchableTexts(input)
  const { birthMonth, birthDay } = computeBirthMonthDay(input.dateNaissance)

  const sanitized = sanitizeForFirestore({
    ...input,
    pieceIdentite: {
      ...input.pieceIdentite,
      dateDelivrance: Timestamp.fromDate(input.pieceIdentite.dateDelivrance),
      dateExpiration: Timestamp.fromDate(input.pieceIdentite.dateExpiration),
    },
    dateNaissance: Timestamp.fromDate(input.dateNaissance),
    birthMonth,
    birthDay,
    actif: input.actif ?? true,
    ...searchable,
  })
  const payload = { ...sanitized, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }
  const docRef = await addDoc(agentsRef, payload)
  return docRef.id
}

export async function updateAgent(
  id: string,
  updates: Partial<Omit<AgentRecouvrement, 'id' | 'createdAt' | 'createdBy'>>,
  updatedBy: string
): Promise<boolean> {
  const ref = doc(db, COLLECTION, id)
  const clean: Record<string, unknown> = { ...updates, updatedBy }

  // Vérifier et corriger createdAt corrompu (bug serverTimestamp non résolu)
  const snap = await getDoc(ref)
  if (snap.exists()) {
    const data = snap.data()
    const createdAt = data?.createdAt
    const isCorrupted = createdAt &&
      typeof createdAt === 'object' &&
      '_methodName' in createdAt &&
      (createdAt as { _methodName?: string })._methodName === 'serverTimestamp'
    if (isCorrupted || !createdAt) {
      clean.createdAt = serverTimestamp()
    }
  }

  if (updates.dateNaissance) {
    const { birthMonth, birthDay } = computeBirthMonthDay(updates.dateNaissance)
    clean.birthMonth = birthMonth
    clean.birthDay = birthDay
    clean.dateNaissance = Timestamp.fromDate(updates.dateNaissance)
  }
  if (updates.pieceIdentite) {
    clean.pieceIdentite = {
      ...updates.pieceIdentite,
      dateDelivrance: Timestamp.fromDate(updates.pieceIdentite.dateDelivrance),
      dateExpiration: Timestamp.fromDate(updates.pieceIdentite.dateExpiration),
    }
  }
  if (updates.nom !== undefined || updates.prenom !== undefined || updates.tel1 !== undefined || updates.tel2 !== undefined || updates.pieceIdentite) {
    const agent = await getAgentById(id)
    if (agent) {
      const input = {
        nom: updates.nom ?? agent.nom,
        prenom: updates.prenom ?? agent.prenom,
        tel1: updates.tel1 ?? agent.tel1,
        tel2: updates.tel2 ?? agent.tel2,
        pieceIdentite: updates.pieceIdentite ?? agent.pieceIdentite,
      }
      const searchable = computeSearchableTexts({ ...agent, ...input } as CreateAgentInput)
      clean.searchableTextLastNameFirst = searchable.searchableTextLastNameFirst
      clean.searchableTextFirstNameFirst = searchable.searchableTextFirstNameFirst
      clean.searchableTextNumeroFirst = searchable.searchableTextNumeroFirst
    }
  }

  const sanitized = sanitizeForFirestore(clean) as Record<string, unknown>
  await updateDoc(ref, { ...sanitized, updatedAt: serverTimestamp() })
  return true
}

export async function deactivateAgent(id: string, updatedBy: string): Promise<boolean> {
  return updateAgent(id, { actif: false }, updatedBy)
}

export async function reactivateAgent(id: string, updatedBy: string): Promise<boolean> {
  return updateAgent(id, { actif: true }, updatedBy)
}

export async function deleteAgent(id: string): Promise<boolean> {
  const ref = doc(db, COLLECTION, id)
  await deleteDoc(ref)
  return true
}

export async function getAgentsActifs(): Promise<AgentRecouvrement[]> {
  const agentsRef = collection(db, COLLECTION)
  const q = query(agentsRef, where('actif', '==', true), orderBy('nom', 'asc'))
  const snap = await getDocs(q)
  return snap.docs.map(mapDocToAgent)
}
