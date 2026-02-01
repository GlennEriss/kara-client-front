import { firebaseCollectionNames } from '@/constantes/firebase-collection-names'
import { listRefunds, updateRefund } from './refunds.db'
const getFirestore = () => import('@/firebase/firestore')

/**
 * Génère un ID de contrat personnalisé selon le format :
 * MK_CS_TYPECONTRAT_MATRICULE_DATEDUJOUR_HEURE
 * Exemple: MK_CS_STANDARD_0001_100925_1640
 */
function generateCustomContractId(
  caisseType: string,
  matricule: string,
  date: Date = new Date()
): string {
  // Formater le type de contrat
  const typeFormatted = caisseType.toUpperCase()
  
  // Formater le matricule (4 chiffres avec zéros à gauche)
  const matriculeFormatted = matricule.padStart(4, '0')
  
  // Formater la date (DDMMYY)
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear().toString().slice(-2)
  const dateFormatted = `${day}${month}${year}`
  
  // Formater l'heure (HHMM)
  const hour = date.getHours().toString().padStart(2, '0')
  const minute = date.getMinutes().toString().padStart(2, '0')
  const timeFormatted = `${hour}${minute}`
  
  return `MK_CS_${typeFormatted}_${matriculeFormatted}_${dateFormatted}_${timeFormatted}`
}

/**
 * Calcule nextDueAt pour les contrats qui n'ont pas ce champ (contrats créés avant la correction).
 * Utilise contractStartAt ou firstPaymentDate + currentMonthIndex.
 */
function computeNextDueAtFallback(data: any): Date | undefined {
  const start = data.contractStartAt
    ? (typeof data.contractStartAt?.toDate === 'function' ? data.contractStartAt.toDate() : new Date(data.contractStartAt))
    : (data.firstPaymentDate ? new Date(data.firstPaymentDate) : null)
  if (!start || isNaN(start.getTime())) return undefined
  const m = data.currentMonthIndex ?? 0
  const next = new Date(start)
  next.setMonth(next.getMonth() + m)
  return next
}

export async function createContract(input: any) {
  const { db, collection, doc, setDoc, serverTimestamp } = await getFirestore() as any
  const now = serverTimestamp()
  
  // Nettoyer les valeurs undefined pour éviter les erreurs Firestore
  const cleanInput = { ...input }
  Object.keys(cleanInput).forEach((key) => {
    if (cleanInput[key] === undefined) {
      delete cleanInput[key]
    }
  })
  
  console.log('🧹 Données nettoyées dans createContract:', cleanInput)
  
  // Générer l'ID personnalisé
  const customId = generateCustomContractId(
    cleanInput.caisseType,
    cleanInput.memberMatricule || '0000', // Fallback si pas de matricule
    new Date()
  )
  
  console.log('🆔 ID de contrat généré:', customId)
  
  // Créer le document avec l'ID personnalisé
  const docRef = doc(db, firebaseCollectionNames.caisseContracts, customId)
  await setDoc(docRef, {
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
  
  return customId
}

export async function getContract(id: string) {
  const { db, doc, getDoc } = await getFirestore() as any
  const ref = doc(db, firebaseCollectionNames.caisseContracts, id)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  const data = snap.data()
  const contractStartAt = (typeof data.contractStartAt?.toDate === 'function') ? data.contractStartAt.toDate() : (data.contractStartAt ? new Date(data.contractStartAt) : undefined)
  const rawNextDueAt = (typeof data.nextDueAt?.toDate === 'function') ? data.nextDueAt.toDate() : (data.nextDueAt ? new Date(data.nextDueAt) : undefined)
  const nextDueAt = rawNextDueAt ?? computeNextDueAtFallback({ ...data, contractStartAt })

  return {
    id: snap.id,
    ...data,
    contractStartAt,
    contractEndAt: (typeof data.contractEndAt?.toDate === 'function') ? data.contractEndAt.toDate() : (data.contractEndAt ? new Date(data.contractEndAt) : undefined),
    nextDueAt,
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
    const contractStartAt = (typeof data.contractStartAt?.toDate === 'function') ? data.contractStartAt.toDate() : (data.contractStartAt ? new Date(data.contractStartAt) : undefined)
    const rawNextDueAt = (typeof data.nextDueAt?.toDate === 'function') ? data.nextDueAt.toDate() : (data.nextDueAt ? new Date(data.nextDueAt) : undefined)
    const nextDueAt = rawNextDueAt ?? computeNextDueAtFallback({ ...data, contractStartAt })

    return {
      id: d.id,
      ...data,
      contractStartAt,
      contractEndAt: (typeof data.contractEndAt?.toDate === 'function') ? data.contractEndAt.toDate() : (data.contractEndAt ? new Date(data.contractEndAt) : undefined),
      nextDueAt,
      createdAt: (typeof data.createdAt?.toDate === 'function') ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : undefined),
      updatedAt: (typeof data.updatedAt?.toDate === 'function') ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : undefined),
    }
  })
}

/**
 * Update a refund with document information
 * @param contractId - Contract ID
 * @param refundId - Refund ID
 * @param documentData - Document data to add/update
 * @returns Promise<boolean>
 */
export async function updateRefundDocument(
  contractId: string, 
  refundId: string, 
  documentData: {
    url: string
    path: string
    uploadedBy: string
    originalFileName: string
    fileSize: number
  }
): Promise<boolean> {
  try {
    const { db, doc, updateDoc, serverTimestamp, arrayUnion } = await getFirestore() as any
    const contractRef = doc(db, firebaseCollectionNames.caisseContracts, contractId)
    
    // Get current contract data
    const contract = await getContract(contractId)
    if (!contract) {
      throw new Error('Contrat introuvable')
    }
    
    // Get refunds from subcollection
    const refunds = await listRefunds(contractId)
    console.log('🔍 Debug updateRefundDocument:', {
      contractId,
      refundId,
      refundsCount: refunds.length,
      refunds: refunds.map((r: any) => ({ id: r.id, type: r.type, status: r.status }))
    })
    
    const refundIndex = refunds.findIndex((r: any) => r.id === refundId)
    
    if (refundIndex === -1) {
      console.error('❌ Refund not found:', {
        refundId,
        availableRefunds: refunds.map((r: any) => r.id)
      })
      throw new Error('Remboursement introuvable')
    }
    
    // Create document object
    const document = {
      id: `${refundId}_doc_${Date.now()}`,
      url: documentData.url,
      path: documentData.path,
      uploadedAt: new Date(),
      uploadedBy: documentData.uploadedBy,
      originalFileName: documentData.originalFileName,
      fileSize: documentData.fileSize,
      status: 'active' as const
    }
    
    // Update the refund with document in subcollection
    await updateRefund(contractId, refundId, {
      document,
      updatedAt: new Date()
    })
    
    console.log('✅ Refund document updated successfully:', {
      contractId,
      refundId,
      documentId: document.id
    })
    
    return true
  } catch (error: any) {
    console.error('❌ Failed to update refund document:', error)
    throw new Error(`Failed to update refund document: ${error.message}`)
  }
}

/**
 * Remove document from a refund
 * @param contractId - Contract ID
 * @param refundId - Refund ID
 * @returns Promise<boolean>
 */
export async function removeRefundDocument(
  contractId: string, 
  refundId: string
): Promise<boolean> {
  try {
    // Get refunds from subcollection
    const refunds = await listRefunds(contractId)
    const refundIndex = refunds.findIndex((r: any) => r.id === refundId)
    
    if (refundIndex === -1) {
      throw new Error('Remboursement introuvable')
    }
    
    // Remove document from refund in subcollection
    await updateRefund(contractId, refundId, {
      document: undefined,
      updatedAt: new Date()
    })
    
    console.log('✅ Refund document removed successfully:', {
      contractId,
      refundId
    })
    
    return true
  } catch (error: any) {
    console.error('❌ Failed to remove refund document:', error)
    throw new Error(`Failed to remove refund document: ${error.message}`)
  }
}

/**
 * Update contract PDF document
 * @param contractId - Contract ID
 * @param contractPdf - PDF document data
 * @param updatedBy - User ID who updated the contract
 * @returns Promise<boolean>
 */
export async function updateContractPdf(
  contractId: string,
  contractPdf: {
    fileSize: number
    path: string
    originalFileName: string
    uploadedAt: Date
    url: string
  },
  updatedBy: string
): Promise<boolean> {
  try {
    const { db, doc, updateDoc, serverTimestamp } = await getFirestore() as any
    const contractRef = doc(db, firebaseCollectionNames.caisseContracts, contractId)
    
    // Update the contract with PDF document and updatedBy
    await updateDoc(contractRef, {
      contractPdf,
      updatedBy,
      updatedAt: serverTimestamp()
    })
    
    console.log('✅ Contract PDF updated successfully:', {
      contractId,
      contractPdf: {
        originalFileName: contractPdf.originalFileName,
        fileSize: contractPdf.fileSize,
        path: contractPdf.path
      },
      updatedBy
    })
    
    return true
  } catch (error: any) {
    console.error('❌ Failed to update contract PDF:', error)
    throw new Error(`Failed to update contract PDF: ${error.message}`)
  }
}

