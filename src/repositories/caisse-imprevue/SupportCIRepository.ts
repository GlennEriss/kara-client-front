import { ISupportCIRepository } from './ISupportCIRepository'
import { SupportCI, SupportRepaymentCI } from '@/types/types'
import { IRepository } from '@/repositories/IRepository'

const getFirestore = () => import('@/firebase/firestore')

export class SupportCIRepository implements ISupportCIRepository, IRepository {
  readonly name = 'SupportCIRepository'
  private readonly contractsCollection = 'contractsCI'

  /**
   * Convertit un document Firestore en SupportCI
   */
  private mapToSupportCI(id: string, data: any): SupportCI {
    return {
      id,
      contractId: data.contractId,
      amount: data.amount,
      status: data.status,
      amountRepaid: data.amountRepaid,
      amountRemaining: data.amountRemaining,
      deductions: data.deductions || [],
      repayments: (data.repayments || []).map((r: any) => ({
        ...r,
        createdAt: r.createdAt?.toDate?.() || new Date(r.createdAt),
      })),
      requestedAt: data.requestedAt?.toDate?.() || new Date(data.requestedAt),
      approvedAt: data.approvedAt?.toDate?.() || new Date(data.approvedAt),
      approvedBy: data.approvedBy,
      repaidAt: data.repaidAt?.toDate?.() || (data.repaidAt ? new Date(data.repaidAt) : undefined),
      createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
      createdBy: data.createdBy,
      updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt),
      updatedBy: data.updatedBy,
    }
  }

  /**
   * Crée un nouveau support
   */
  async createSupport(
    contractId: string,
    support: Omit<SupportCI, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<SupportCI> {
    const { collection, doc, addDoc, updateDoc, Timestamp, arrayUnion, db } = await getFirestore()
    
    const supportsRef = collection(db, this.contractsCollection, contractId, 'supports')

    const now = Timestamp.now()
    const supportData = {
      ...support,
      requestedAt: Timestamp.fromDate(support.requestedAt),
      approvedAt: Timestamp.fromDate(support.approvedAt),
      repaidAt: support.repaidAt ? Timestamp.fromDate(support.repaidAt) : null,
      repayments: support.repayments.map((r) => ({
        ...r,
        createdAt: Timestamp.fromDate(r.createdAt),
      })),
      createdAt: now,
      updatedAt: now,
    }

    const docRef = await addDoc(supportsRef, supportData)

    // Mettre à jour le contrat avec le currentSupportId et supportHistory
    const contractRef = doc(db, this.contractsCollection, contractId)
    await updateDoc(contractRef, {
      currentSupportId: docRef.id,
      supportHistory: arrayUnion(docRef.id),
      updatedAt: now,
    })

    return this.mapToSupportCI(docRef.id, supportData)
  }

  /**
   * Récupère un support par son ID
   */
  async getSupportById(contractId: string, supportId: string): Promise<SupportCI | null> {
    const { doc, getDoc, db } = await getFirestore()
    
    const supportRef = doc(db, this.contractsCollection, contractId, 'supports', supportId)
    const supportSnap = await getDoc(supportRef)

    if (!supportSnap.exists()) {
      return null
    }

    return this.mapToSupportCI(supportSnap.id, supportSnap.data())
  }

  /**
   * Récupère le support actif d'un contrat
   */
  async getActiveSupportByContractId(contractId: string): Promise<SupportCI | null> {
    const { collection, query, where, orderBy, getDocs, db } = await getFirestore()
    
    const supportsRef = collection(db, this.contractsCollection, contractId, 'supports')
    const q = query(supportsRef, where('status', '==', 'ACTIVE'), orderBy('createdAt', 'desc'))

    const querySnapshot = await getDocs(q)

    if (querySnapshot.empty) {
      return null
    }

    const firstDoc = querySnapshot.docs[0]
    return this.mapToSupportCI(firstDoc.id, firstDoc.data())
  }

  /**
   * Récupère l'historique complet des supports d'un contrat
   */
  async getSupportHistory(contractId: string): Promise<SupportCI[]> {
    const { collection, query, orderBy, getDocs, db } = await getFirestore()
    
    const supportsRef = collection(db, this.contractsCollection, contractId, 'supports')
    const q = query(supportsRef, orderBy('createdAt', 'desc'))

    const querySnapshot = await getDocs(q)

    return querySnapshot.docs.map((doc) => this.mapToSupportCI(doc.id, doc.data()))
  }

  /**
   * Ajoute un remboursement à un support
   */
  async addRepayment(
    contractId: string,
    supportId: string,
    repayment: Omit<SupportRepaymentCI, 'createdAt'>
  ): Promise<void> {
    const { doc, updateDoc, Timestamp, arrayUnion, db } = await getFirestore()
    
    const supportRef = doc(db, this.contractsCollection, contractId, 'supports', supportId)

    const repaymentWithTimestamp = {
      ...repayment,
      createdAt: Timestamp.now(),
    }

    await updateDoc(supportRef, {
      repayments: arrayUnion(repaymentWithTimestamp),
      updatedAt: Timestamp.now(),
    })
  }

  /**
   * Met à jour le statut d'un support
   */
  async updateSupportStatus(
    contractId: string,
    supportId: string,
    status: 'ACTIVE' | 'REPAID',
    repaidAt?: Date
  ): Promise<void> {
    const { doc, updateDoc, Timestamp, db } = await getFirestore()
    
    const supportRef = doc(db, this.contractsCollection, contractId, 'supports', supportId)
    const contractRef = doc(db, this.contractsCollection, contractId)

    const updateData: any = {
      status,
      updatedAt: Timestamp.now(),
    }

    if (status === 'REPAID') {
      updateData.repaidAt = repaidAt ? Timestamp.fromDate(repaidAt) : Timestamp.now()
      
      // Mettre à jour le contrat pour retirer le currentSupportId
      await updateDoc(contractRef, {
        currentSupportId: null,
        updatedAt: Timestamp.now(),
      })
    }

    await updateDoc(supportRef, updateData)
  }

  /**
   * Met à jour les montants remboursés d'un support
   */
  async updateSupportAmounts(
    contractId: string,
    supportId: string,
    amountRepaid: number,
    amountRemaining: number
  ): Promise<void> {
    const { doc, updateDoc, Timestamp, db } = await getFirestore()
    
    const supportRef = doc(db, this.contractsCollection, contractId, 'supports', supportId)

    await updateDoc(supportRef, {
      amountRepaid,
      amountRemaining,
      updatedAt: Timestamp.now(),
    })
  }
}

