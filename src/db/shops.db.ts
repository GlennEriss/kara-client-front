import {
  collection,
  deleteDoc,
  deleteField,
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
import { SHOP_PROPOSABLE_FIELDS, type Shop, type ShopArticle, type ShopChangeProposal, type ShopCreditPartner, type ShopPhoto, type ShopStatus } from '@/types/types'

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
    acceptsCredit: data.acceptsCredit === true,
    pendingChanges: data.pendingChanges && typeof data.pendingChanges === 'object' ? data.pendingChanges : null,
    pendingChangesSubmittedAt: toDate(data.pendingChangesSubmittedAt),
    pendingChangesSubmittedBy: data.pendingChangesSubmittedBy ?? '',
    pendingChangesRejectionReason: data.pendingChangesRejectionReason ?? '',
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

const PARTNERS_COL = firebaseCollectionNames.shopCreditPartners

function mapPartner(id: string, data: any): ShopCreditPartner {
  return {
    shopId: id,
    enabled: data.enabled === true,
    discountPercent: Number(data.discountPercent) || 0,
    payoutMode: data.payoutMode || undefined,
    payoutAccount: data.payoutAccount || undefined,
    agreementSigned: data.agreementSigned === true,
    agreementUrl: data.agreementUrl || undefined,
    agreementPath: data.agreementPath || undefined,
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : undefined,
    updatedBy: data.updatedBy || undefined,
  }
}

/** Conditions de partenariat « achat à crédit » de toutes les boutiques. */
export async function listShopCreditPartners(): Promise<ShopCreditPartner[]> {
  const snap = await getDocs(collection(db, PARTNERS_COL))
  return snap.docs.map((d) => mapPartner(d.id, d.data()))
}

export async function getShopCreditPartner(shopId: string): Promise<ShopCreditPartner | null> {
  const s = await getDoc(doc(db, PARTNERS_COL, shopId))
  return s.exists() ? mapPartner(s.id, s.data()) : null
}

/**
 * Enregistre les conditions d'une boutique partenaire et répercute sur la
 * fiche publique le seul fait qu'elle accepte le crédit.
 */
export async function saveShopCreditPartner(
  partner: Omit<ShopCreditPartner, 'updatedAt' | 'updatedBy'>,
  adminId: string,
): Promise<void> {
  const { shopId, ...rest } = partner
  await setDoc(doc(db, PARTNERS_COL, shopId), {
    ...clean(rest as Record<string, unknown>),
    updatedAt: serverTimestamp(),
    updatedBy: adminId,
  })
  await updateDoc(doc(db, COL, shopId), {
    acceptsCredit: partner.enabled,
    updatedAt: serverTimestamp(),
    updatedBy: adminId,
  })
}

/** Ne garde que les champs qu'un membre a le droit de faire modifier. */
export function pickProposableChanges(changes: Record<string, unknown> | null | undefined): ShopChangeProposal {
  const out: Record<string, unknown> = {}
  if (!changes) return out
  for (const key of SHOP_PROPOSABLE_FIELDS) {
    if (changes[key] !== undefined) out[key] = changes[key]
  }
  return out as ShopChangeProposal
}

const CLEAR_PROPOSAL = {
  pendingChanges: deleteField(),
  pendingChangesSubmittedAt: deleteField(),
  pendingChangesSubmittedBy: deleteField(),
}

/** Reporte sur la fiche publiée la modification proposée par le membre. */
export async function approveShopChanges(shop: Shop, adminId: string): Promise<void> {
  const changes = pickProposableChanges(shop.pendingChanges as Record<string, unknown>)
  await updateDoc(doc(db, COL, shop.id), {
    ...clean(changes as Record<string, unknown>),
    ...CLEAR_PROPOSAL,
    pendingChangesRejectionReason: '',
    reviewedBy: adminId,
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    updatedBy: adminId,
  })
}

/** Refuse la modification proposée : la fiche publiée reste telle quelle. */
export async function rejectShopChanges(shopId: string, adminId: string, reason: string): Promise<void> {
  await updateDoc(doc(db, COL, shopId), {
    ...CLEAR_PROPOSAL,
    pendingChangesRejectionReason: reason.trim(),
    reviewedBy: adminId,
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    updatedBy: adminId,
  })
}

const ARTICLES_COL = firebaseCollectionNames.shopArticles

function mapArticle(id: string, data: any): ShopArticle {
  const toDate = (v: any) => (v?.toDate ? v.toDate() : v ? new Date(v) : undefined)
  return {
    id,
    shopId: data.shopId ?? '',
    shopName: data.shopName ?? '',
    ownerMatricule: data.ownerMatricule ?? '',
    submittedBy: data.submittedBy ?? '',
    submittedByName: data.submittedByName ?? '',
    name: data.name ?? '',
    description: data.description ?? '',
    price: Number(data.price) || 0,
    photoURL: data.photoURL ?? '',
    photoPath: data.photoPath ?? '',
    isAvailable: data.isAvailable !== false,
    status: (data.status as ShopStatus) ?? 'pending',
    rejectionReason: data.rejectionReason ?? '',
    submittedAt: toDate(data.submittedAt),
    reviewedBy: data.reviewedBy ?? '',
    reviewedAt: toDate(data.reviewedAt),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  }
}

/** Tous les articles des boutiques (catalogues et file de validation). */
export async function listShopArticles(): Promise<ShopArticle[]> {
  const snap = await getDocs(collection(db, ARTICLES_COL))
  return snap.docs
    .map((d) => mapArticle(d.id, d.data()))
    .sort((a, b) => a.shopName.localeCompare(b.shopName, 'fr') || a.name.localeCompare(b.name, 'fr'))
}

export async function getShopArticle(id: string): Promise<ShopArticle | null> {
  const s = await getDoc(doc(db, ARTICLES_COL, id))
  return s.exists() ? mapArticle(s.id, s.data()) : null
}

/** Valide ou refuse un article proposé par le propriétaire de la boutique. */
export async function reviewShopArticle(
  id: string,
  decision: Extract<ShopStatus, 'approved' | 'rejected'>,
  adminId: string,
  rejectionReason?: string,
): Promise<void> {
  await updateDoc(doc(db, ARTICLES_COL, id), {
    status: decision,
    rejectionReason: decision === 'rejected' ? (rejectionReason || '').trim() : '',
    reviewedBy: adminId,
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function deleteShopArticle(id: string): Promise<void> {
  await deleteDoc(doc(db, ARTICLES_COL, id))
}
