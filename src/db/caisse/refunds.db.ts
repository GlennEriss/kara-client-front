import { firebaseCollectionNames } from '@/constantes/firebase-collection-names'
const getFirestore = () => import('@/firebase/firestore')

export async function addRefund(contractId: string, input: any) {
  const { db, collection, addDoc, serverTimestamp } = await getFirestore() as any
  const colRef = collection(db, `${firebaseCollectionNames.caisseContracts}/${contractId}/refunds`)
  const ref = await addDoc(colRef, { ...input, createdAt: serverTimestamp() })
  return ref.id
}

export async function listRefunds(contractId: string) {
  const { db, collection, getDocs, orderBy, query } = await getFirestore() as any
  const colRef = collection(db, `${firebaseCollectionNames.caisseContracts}/${contractId}/refunds`)
  const q = query(colRef, orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d: any) => {
    const data = d.data()
    return {
      id: d.id,
      ...data,
      deadlineAt: (typeof data.deadlineAt?.toDate === 'function') ? data.deadlineAt.toDate() : (data.deadlineAt ? new Date(data.deadlineAt) : undefined),
      createdAt: (typeof data.createdAt?.toDate === 'function') ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : undefined),
      processedAt: (typeof data.processedAt?.toDate === 'function') ? data.processedAt.toDate() : (data.processedAt ? new Date(data.processedAt) : undefined),
    }
  })
}

export async function updateRefund(contractId: string, refundId: string, updates: any) {
  const { db, doc, updateDoc, serverTimestamp } = await getFirestore() as any
  const ref = doc(db, `${firebaseCollectionNames.caisseContracts}/${contractId}/refunds`, refundId)
  const payload = { ...updates, updatedAt: serverTimestamp() }
  Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k])
  await updateDoc(ref, payload)
  return true
}

export async function deleteRefund(contractId: string, refundId: string) {
  const { db, doc, deleteDoc } = await getFirestore() as any
  const ref = doc(db, `${firebaseCollectionNames.caisseContracts}/${contractId}/refunds`, refundId)
  await deleteDoc(ref)
  return true
}

