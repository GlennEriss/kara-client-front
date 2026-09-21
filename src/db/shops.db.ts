import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { db } from '@/firebase/firestore'
import { firebaseCollectionNames } from '@/constantes/firebase-collection-names'
import type { Shop, ShopPhoto, ShopStatus } from '@/types/types'

const COL = firebaseCollectionNames.shops

export type ShopInput = Omit<Shop, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>

/** Retire les clés `undefined` (Firestore ne les accepte pas). */
function clean<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v
  }
  return out as T
}

function mapShop(id: string, data: any): Shop {
  const toDate = (v: any) =>
    v?.toDate ? v.toDate() : v ? new Date(v) : undefined
  return {
    id,
    name: data.name ?? '',
    category: data.category ?? '',
    description: data.description ?? '',
    ownerMemberId: data.ownerMemberId ?? '',
    ownerName: data.ownerName ?? '',
    ownerMatricule: data.ownerMatricule ?? '',
    phone: data.phone ?? '',
    whatsapp: data.whatsapp ?? '',
    email: data.email ?? '',
    province: data.province ?? '',
    city: data.city ?? '',
    district: data.district ?? '',
    address: data.address ?? '',
    photoURL: data.photoURL ?? '',
    photoPath: data.photoPath ?? '',
    // Documents créés avant la galerie n'ont pas le champ : on normalise en
    // tableau vide, et on ignore les entrées sans URL exploitable.
    gallery: Array.isArray(data.gallery)
      ? (data.gallery as ShopPhoto[]).filter((p) => p && typeof p.url === 'string' && p.url)
      : [],
    openingHours: Array.isArray(data.openingHours) ? data.openingHours : [],
    isActive: data.isActive ?? true,
    // Fiches créées avant le circuit de validation : pas de champ `status`,
    // elles étaient publiées d'office et le restent.
    status: (data.status as ShopStatus) ?? 'approved',
    submittedBy: data.submittedBy ?? '',
    submittedAt: toDate(data.submittedAt),
    reviewedBy: data.reviewedBy ?? '',
    reviewedAt: toDate(data.reviewedAt),
    rejectionReason: data.rejectionReason ?? '',
    createdAt: toDate(data.createdAt) ?? new Date(),
    createdBy: data.createdBy ?? '',
    updatedAt: toDate(data.updatedAt) ?? new Date(),
    updatedBy: data.updatedBy ?? '',
  }
}

/** Liste toutes les boutiques (triées par nom). */
export async function listShops(): Promise<Shop[]> {
  const snap = await getDocs(query(collection(db, COL), orderBy('name', 'asc')))
  return snap.docs.map((d) => mapShop(d.id, d.data()))
}

export async function getShop(id: string): Promise<Shop | null> {
  const s = await getDoc(doc(db, COL, id))
  return s.exists() ? mapShop(s.id, s.data()) : null
}

export async function createShop(input: ShopInput, adminId: string): Promise<string> {
  const id = doc(collection(db, COL)).id
  await setDoc(doc(db, COL, id), {
    ...clean(input as Record<string, unknown>),
    isActive: input.isActive ?? true,
    // Une fiche saisie par un admin est déjà validée : il est l'instance de
    // contrôle, la faire passer par sa propre file n'aurait pas de sens.
    status: input.status ?? 'approved',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: adminId,
    updatedBy: adminId,
  })
  return id
}

export async function updateShop(
  id: string,
  updates: Partial<ShopInput>,
  adminId: string,
): Promise<void> {
  await updateDoc(doc(db, COL, id), {
    ...clean(updates as Record<string, unknown>),
    updatedAt: serverTimestamp(),
    updatedBy: adminId,
  })
}

export async function deleteShop(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id))
}

/**
 * Tranche une boutique soumise par un membre.
 *
 * L'acceptation la publie (`isActive`), le refus la laisse hors annuaire avec
 * son motif : le membre peut la corriger et la resoumettre sans tout ressaisir.
 */
export async function reviewShop(
  id: string,
  decision: Extract<ShopStatus, 'approved' | 'rejected'>,
  adminId: string,
  rejectionReason?: string,
): Promise<void> {
  await updateDoc(doc(db, COL, id), {
    status: decision,
    isActive: decision === 'approved',
    rejectionReason: decision === 'rejected' ? (rejectionReason || '').trim() : '',
    reviewedBy: adminId,
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    updatedBy: adminId,
  })
}
