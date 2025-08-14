import { firebaseCollectionNames } from '@/constantes/firebase-collection-names'
import type { CaisseType } from '@/services/caisse/types'
const getFirestore = () => import('@/firebase/firestore')

export async function getActiveSettings(type?: CaisseType) {
  const { db, collection, getDocs, query, where, orderBy, limit } = await getFirestore() as any
  const colRef = collection(db, firebaseCollectionNames.caisseSettings)
  const base = type ? query(colRef, where('caisseType', '==', type)) : query(colRef)
  const q = query(base, where('isActive', '==', true), orderBy('effectiveAt', 'desc'), limit(1))
  const snap = await getDocs(q)
  if (snap.empty) return null
  const d = snap.docs[0]
  return { id: d.id, ...d.data() }
}

export async function createSettings(input: any) {
  const { db, collection, addDoc, serverTimestamp } = await getFirestore() as any
  const colRef = collection(db, firebaseCollectionNames.caisseSettings)
  const ref = await addDoc(colRef, { ...input, createdAt: serverTimestamp() })
  return ref.id
}

export async function listSettings() {
  const { db, collection, getDocs, orderBy, query } = await getFirestore() as any
  const colRef = collection(db, firebaseCollectionNames.caisseSettings)
  // Trier par date de création pour toujours voir les dernières versions,
  // même si 'effectiveAt' n'est pas renseignée
  const q = query(colRef, orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d: any) => ({ id: d.id, ...d.data() }))
}

export async function updateSettings(id: string, updates: any) {
  const { db, doc, updateDoc, serverTimestamp } = await getFirestore() as any
  const ref = doc(db, firebaseCollectionNames.caisseSettings, id)
  const payload = { ...updates, updatedAt: serverTimestamp() }
  Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k])
  await updateDoc(ref, payload)
  return true
}

export async function activateSettings(id: string) {
  const { db, collection, getDocs, query, doc, writeBatch, getDoc, where } = await getFirestore() as any
  const colRef = collection(db, firebaseCollectionNames.caisseSettings)
  const current = await getDoc(doc(db, firebaseCollectionNames.caisseSettings, id))
  const type = current.exists() ? (current.data()?.caisseType || null) : null
  const snap = await getDocs(type ? query(colRef, where('caisseType', '==', type)) : query(colRef))
  const batch = writeBatch(db)
  snap.docs.forEach((d: any) => {
    batch.update(doc(db, firebaseCollectionNames.caisseSettings, d.id), { isActive: d.id === id })
  })
  await batch.commit()
  return true
}

export async function deleteSettings(id: string) {
  const { db, doc, deleteDoc } = await getFirestore() as any
  await deleteDoc(doc(db, firebaseCollectionNames.caisseSettings, id))
  return true
}

