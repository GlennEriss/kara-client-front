import { firebaseCollectionNames } from '@/constantes/firebase-collection-names'
const getFirestore = () => import('@/firebase/firestore')

export async function createContract(input: any) {
  const { db, collection, addDoc, serverTimestamp } = await getFirestore() as any
  const colRef = collection(db, firebaseCollectionNames.caisseContracts)
  const now = serverTimestamp()
  
  // Nettoyer les valeurs undefined pour éviter les erreurs Firestore
  const cleanInput = { ...input }
  Object.keys(cleanInput).forEach((key) => {
    if (cleanInput[key] === undefined) {
      delete cleanInput[key]
    }
  })
  
  console.log('🧹 Données nettoyées dans createContract:', cleanInput)
  
  const docRef = await addDoc(colRef, {
    ...cleanInput,
    status: 'DRAFT',
    nominalPaid: 0,
    bonusAccrued: 0,
    penaltiesTotal: 0,
    currentMonthIndex: 0,
    withdrawLockedUntilM: 4,
    createdAt: now,
    updatedAt: now,
  })
  return docRef.id
}

export async function getContract(id: string) {
  const { db, doc, getDoc } = await getFirestore() as any
  const ref = doc(db, firebaseCollectionNames.caisseContracts, id)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  const data = snap.data()
  return {
    id: snap.id,
    ...data,
    contractStartAt: (typeof data.contractStartAt?.toDate === 'function') ? data.contractStartAt.toDate() : (data.contractStartAt ? new Date(data.contractStartAt) : undefined),
    contractEndAt: (typeof data.contractEndAt?.toDate === 'function') ? data.contractEndAt.toDate() : (data.contractEndAt ? new Date(data.contractEndAt) : undefined),
    nextDueAt: (typeof data.nextDueAt?.toDate === 'function') ? data.nextDueAt.toDate() : (data.nextDueAt ? new Date(data.nextDueAt) : undefined),
    createdAt: (typeof data.createdAt?.toDate === 'function') ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : undefined),
    updatedAt: (typeof data.updatedAt?.toDate === 'function') ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : undefined),
  }
}

export async function updateContract(id: string, updates: any) {
  const { db, doc, updateDoc, serverTimestamp } = await getFirestore() as any
  const ref = doc(db, firebaseCollectionNames.caisseContracts, id)
  const payload = { ...updates, updatedAt: serverTimestamp() }
  // Verrouiller caisseType (non changeable)
  if (Object.prototype.hasOwnProperty.call(payload, 'caisseType')) {
    delete (payload as any).caisseType
  }
  Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k])
  await updateDoc(ref, payload)
  return true
}

export async function listContractsByMember(memberId: string, opts: { status?: string } = {}) {
  const { db, collection, getDocs, query, where, orderBy } = await getFirestore() as any
  const colRef = collection(db, firebaseCollectionNames.caisseContracts)
  const cons: any[] = [where('memberId', '==', memberId)]
  if (opts.status) cons.push(where('status', '==', opts.status))
  cons.push(orderBy('createdAt', 'desc'))
  const q = query(colRef, ...cons)
  const snap = await getDocs(q)
  return snap.docs.map((d: any) => ({ id: d.id, ...d.data() }))
}

export async function listContracts(opts: { status?: string; limit?: number } = {}) {
  const { db, collection, getDocs, query, where, orderBy, limit } = await getFirestore() as any
  const colRef = collection(db, firebaseCollectionNames.caisseContracts)
  const cons: any[] = []
  if (opts.status) cons.push(where('status', '==', opts.status))
  cons.push(orderBy('nextDueAt', 'desc'))
  if (opts.limit) cons.push(limit(opts.limit))
  const q = query(colRef, ...cons)
  const snap = await getDocs(q)
  return snap.docs.map((d: any) => ({ id: d.id, ...d.data() }))
}

// Nouvelle fonction pour récupérer tous les contrats
export async function getAllContracts() {
  const { db, collection, getDocs, query, orderBy } = await getFirestore() as any
  const colRef = collection(db, firebaseCollectionNames.caisseContracts)
  const q = query(colRef, orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d: any) => {
    const data = d.data()
    return {
      id: d.id,
      ...data,
      contractStartAt: (typeof data.contractStartAt?.toDate === 'function') ? data.contractStartAt.toDate() : (data.contractStartAt ? new Date(data.contractStartAt) : undefined),
      contractEndAt: (typeof data.contractEndAt?.toDate === 'function') ? data.contractEndAt.toDate() : (data.contractEndAt ? new Date(data.contractEndAt) : undefined),
      nextDueAt: (typeof data.nextDueAt?.toDate === 'function') ? data.nextDueAt.toDate() : (data.nextDueAt ? new Date(data.nextDueAt) : undefined),
      createdAt: (typeof data.createdAt?.toDate === 'function') ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : undefined),
      updatedAt: (typeof data.updatedAt?.toDate === 'function') ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : undefined),
    }
  })
}

