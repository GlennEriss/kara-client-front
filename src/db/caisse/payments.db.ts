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

export async function getPaymentByDate(contractId: string, targetDate: Date) {
  const { db, collection, getDocs, query, where } = await getFirestore() as any
  const colRef = collection(db, `${firebaseCollectionNames.caisseContracts}/${contractId}/payments`)

  // Normaliser la date cible (ignorer l'heure)
  const normalizedTargetDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate())
  console.log('🔍 Recherche pour la date:', normalizedTargetDate.toLocaleDateString('fr-FR'))

  try {
    const snap = await getDocs(colRef)
    console.log('📊 Nombre total de paiements trouvés:', snap.docs.length)

    const payments = snap.docs.map((d: any) => {
      const data = d.data()
      return {
        id: d.id,
        ...data,
        dueAt: (typeof data.dueAt?.toDate === 'function') ? data.dueAt.toDate() : (data.dueAt ? new Date(data.dueAt) : undefined),
        paidAt: (typeof data.paidAt?.toDate === 'function') ? data.paidAt.toDate() : (data.paidAt ? new Date(data.paidAt) : undefined),
      }
    })

    // Debug: afficher la structure de chaque paiement
    payments.forEach((payment: any, index: number) => {
      console.log(`📋 Paiement ${index + 1} (ID: ${payment.id}):`, {
        dueMonthIndex: payment.dueMonthIndex,
        contribs: payment.contribs,
        contribsType: typeof payment.contribs,
        contribsIsArray: Array.isArray(payment.contribs),
        contribsLength: payment.contribs?.length
      })
    })

    // Rechercher dans les contributions de chaque paiement
    for (const payment of payments) {
      if (payment.contribs && Array.isArray(payment.contribs)) {

        const contribution = payment.contribs.find((c: any) => {
          if (!c.paidAt) {
            return false
          }
          // Convertir le Timestamp Firestore en Date JavaScript
          let contribDate: Date
          if (typeof c.paidAt?.toDate === 'function') {
            contribDate = c.paidAt.toDate()
          } else if (c.paidAt instanceof Date) {
            contribDate = c.paidAt
          } else {
            contribDate = new Date(c.paidAt)
          }

          const normalizedContribDate = new Date(contribDate.getFullYear(), contribDate.getMonth(), contribDate.getDate())
          const isMatch = normalizedContribDate.getTime() === normalizedTargetDate.getTime()

          return isMatch
        })
        if (contribution) {
          return { payment, contribution }
        }
      } else {
        console.log(`  ❌ Pas de contributions ou pas un tableau:`, payment.contribs)
      }
    }

    console.log('❌ Aucune contribution trouvée pour cette date')
    return null
  } catch (error) {
    console.error('❌ Erreur lors de la récupération du paiement par date:', error)
    return null
  }
}

