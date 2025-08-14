import { firebaseCollectionNames } from '@/constantes/firebase-collection-names'
const getFirestore = () => import('@/firebase/firestore')

export async function addPayment(contractId: string, input: any) {
  const { db, collection, addDoc, serverTimestamp, doc } = await getFirestore() as any
  const colRef = collection(db, `${firebaseCollectionNames.caisseContracts}/${contractId}/payments`)
  const ref = await addDoc(colRef, { ...input, createdAt: serverTimestamp() })
  return ref.id
}

export async function listPayments(contractId: string) {
  const { db, collection, getDocs, orderBy, query } = await getFirestore() as any
  const colRef = collection(db, `${firebaseCollectionNames.caisseContracts}/${contractId}/payments`)
  const q = query(colRef, orderBy('dueMonthIndex', 'asc'))
  const snap = await getDocs(q)
  return snap.docs.map((d: any) => {
    const data = d.data()
    return {
      id: d.id,
      ...data,
      dueAt: (typeof data.dueAt?.toDate === 'function') ? data.dueAt.toDate() : (data.dueAt ? new Date(data.dueAt) : undefined),
      paidAt: (typeof data.paidAt?.toDate === 'function') ? data.paidAt.toDate() : (data.paidAt ? new Date(data.paidAt) : undefined),
    }
  })
}

export async function updatePayment(contractId: string, paymentId: string, updates: any) {
  const { db, doc, updateDoc, serverTimestamp } = await getFirestore() as any
  const ref = doc(db, `${firebaseCollectionNames.caisseContracts}/${contractId}/payments`, paymentId)
  const payload = { ...updates, updatedAt: serverTimestamp() }
  Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k])
  await updateDoc(ref, payload)
  return true
}

