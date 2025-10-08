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
  const { db, collection, doc, setDoc, serverTimestamp } = await getFirestore() as any
  const colRef = collection(db, firebaseCollectionNames.caisseSettings)
  
  // Si un ID personnalisé est fourni, l'utiliser comme ID du document
  if (input.id) {
    const customId = input.id
    const docRef = doc(colRef, customId)
    const { id, ...dataWithoutId } = input
    await setDoc(docRef, { ...dataWithoutId, createdAt: serverTimestamp() })
    return customId
  } else {
    // Méthode originale avec addDoc pour générer un ID automatique
    const { addDoc } = await getFirestore() as any
    const ref = await addDoc(colRef, { ...input, createdAt: serverTimestamp() })
    return ref.id
  }
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
  const { db, collection, getDocs, query, doc, writeBatch, getDoc, where, serverTimestamp } = await getFirestore() as any
  const colRef = collection(db, firebaseCollectionNames.caisseSettings)
  
  console.log(`🔍 [activateSettings] Début de l'activation pour ID: ${id}`)
  
  const current = await getDoc(doc(db, firebaseCollectionNames.caisseSettings, id))
  
  if (!current.exists()) {
    console.error(`❌ [activateSettings] Version ${id} introuvable dans Firestore`)
    throw new Error(`Version ${id} introuvable`)
  }
  
  const currentData = current.data()
  const type = currentData?.caisseType || 'STANDARD'
  
  console.log(`📋 [activateSettings] Version trouvée:`, {
    id,
    caisseType: type,
    isActive: currentData?.isActive,
    effectiveAt: currentData?.effectiveAt
  })
  
  // Ne récupérer QUE les versions du même type de caisse
  const snap = await getDocs(query(colRef, where('caisseType', '==', type)))
  
  console.log(`📊 [activateSettings] ${snap.docs.length} version(s) trouvée(s) pour le type ${type}:`)
  snap.docs.forEach((d: any) => {
    console.log(`  - ${d.id}: isActive=${d.data().isActive}`)
  })
  
  const batch = writeBatch(db)
  
  // Désactiver toutes les versions du même type, activer uniquement celle sélectionnée
  snap.docs.forEach((d: any) => {
    const newStatus = d.id === id
    console.log(`  ${newStatus ? '✅' : '❌'} ${d.id} -> isActive: ${newStatus}`)
    batch.update(doc(db, firebaseCollectionNames.caisseSettings, d.id), { 
      isActive: newStatus,
      updatedAt: serverTimestamp()
    })
  })
  
  await batch.commit()
  
  console.log(`✅ [activateSettings] Version ${id} activée pour le type ${type}. ${snap.docs.length - 1} autre(s) version(s) désactivée(s).`)
  
  return true
}

export async function deleteSettings(id: string) {
  const { db, doc, deleteDoc } = await getFirestore() as any
  await deleteDoc(doc(db, firebaseCollectionNames.caisseSettings, id))
  return true
}

