import { IRepository } from '../IRepository'
import type { Placement, CommissionPaymentPlacement, EarlyExitPlacement } from '@/types/types'
import { firebaseCollectionNames } from '@/constantes/firebase-collection-names'

const getFirestore = () => import('@/firebase/firestore')

export class PlacementRepository implements IRepository {
  readonly name = 'PlacementRepository'

  private collectionName = firebaseCollectionNames.placements || 'placements'

  async create(data: Omit<Placement, 'id' | 'createdAt' | 'updatedAt'>, customId?: string): Promise<Placement> {
    const { doc, setDoc, db, serverTimestamp, getDoc } = await getFirestore()
    
    // Utiliser l'ID personnalisé fourni, sinon générer un ID automatique
    const placementId = customId || `placement_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const docRef = doc(db, this.collectionName, placementId)
    
    await setDoc(docRef, {
      ...data,
      amount: Number((data as any).amount) || 0,
      rate: Number((data as any).rate) || 0,
      periodMonths: Number((data as any).periodMonths) || 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    
    const snap = await getDoc(docRef)
    const payload = snap.data()
    if (!payload) throw new Error('Placement introuvable après création')
    return {
      id: snap.id,
      ...(payload as any),
      createdAt: payload.createdAt?.toDate() || new Date(),
      updatedAt: payload.updatedAt?.toDate() || new Date(),
    } as Placement
  }

  async getAll(): Promise<Placement[]> {
    const { collection, getDocs, db, orderBy, query } = await getFirestore()
    const colRef = collection(db, this.collectionName)
    const q = query(colRef, orderBy('createdAt', 'desc'))
    const snaps = await getDocs(q)
    return snaps.docs.map(docSnap => {
      const d = docSnap.data()
      return {
        id: docSnap.id,
        ...(d as any),
        amount: Number((d as any).amount) || 0,
        rate: Number((d as any).rate) || 0,
        periodMonths: Number((d as any).periodMonths) || 0,
        startDate: d.startDate?.toDate ? d.startDate.toDate() : d.startDate,
        endDate: d.endDate?.toDate ? d.endDate.toDate() : d.endDate,
        nextCommissionDate: d.nextCommissionDate?.toDate ? d.nextCommissionDate.toDate() : d.nextCommissionDate,
        hasOverdueCommission: d.hasOverdueCommission ?? false,
        finalQuittanceDocumentId: d.finalQuittanceDocumentId,
        earlyExitQuittanceDocumentId: d.earlyExitQuittanceDocumentId,
        earlyExitAddendumDocumentId: d.earlyExitAddendumDocumentId,
        createdAt: d.createdAt?.toDate() || new Date(),
        updatedAt: d.updatedAt?.toDate() || new Date(),
      } as Placement
    })
  }

  async getById(id: string): Promise<Placement | null> {
    const { doc, getDoc, db } = await getFirestore()
    const ref = doc(db, this.collectionName, id)
    const snap = await getDoc(ref)
    if (!snap.exists()) return null
    const d = snap.data()
    return {
      id: snap.id,
      ...(d as any),
      amount: Number((d as any).amount) || 0,
      rate: Number((d as any).rate) || 0,
      periodMonths: Number((d as any).periodMonths) || 0,
      startDate: d.startDate?.toDate ? d.startDate.toDate() : d.startDate,
      endDate: d.endDate?.toDate ? d.endDate.toDate() : d.endDate,
      nextCommissionDate: d?.nextCommissionDate?.toDate ? d.nextCommissionDate.toDate() : d?.nextCommissionDate,
      hasOverdueCommission: d.hasOverdueCommission ?? false,
      finalQuittanceDocumentId: d.finalQuittanceDocumentId,
      earlyExitQuittanceDocumentId: d.earlyExitQuittanceDocumentId,
      earlyExitAddendumDocumentId: d.earlyExitAddendumDocumentId,
      createdAt: d.createdAt?.toDate() || new Date(),
      updatedAt: d.updatedAt?.toDate() || new Date(),
    } as Placement
  }

  async update(id: string, data: Partial<Omit<Placement, 'id' | 'createdAt'>>): Promise<Placement> {
    const { doc, updateDoc, db, serverTimestamp } = await getFirestore()
    const ref = doc(db, this.collectionName, id)
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() })
    const updated = await this.getById(id)
    if (!updated) throw new Error('Placement introuvable après mise à jour')
    return updated
  }

  async delete(id: string): Promise<void> {
    const { doc, deleteDoc, db } = await getFirestore()
    await deleteDoc(doc(db, this.collectionName, id))
  }

  // Commissions
  async createCommission(placementId: string, data: Omit<CommissionPaymentPlacement, 'id' | 'createdAt' | 'updatedAt'>): Promise<CommissionPaymentPlacement> {
    const { collection, addDoc, db, serverTimestamp, doc, getDoc } = await getFirestore()
    const colRef = collection(db, `${this.collectionName}/${placementId}/commissions`)
    const docRef = await addDoc(colRef, {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    const snap = await getDoc(docRef)
    const payload = snap.data()
    if (!payload) throw new Error('Commission introuvable après création')
    return {
      id: snap.id,
      ...(payload as any),
      dueDate: payload.dueDate?.toDate() || new Date(),
      paidAt: payload.paidAt?.toDate(),
      createdAt: payload.createdAt?.toDate() || new Date(),
      updatedAt: payload.updatedAt?.toDate() || new Date(),
    } as CommissionPaymentPlacement
  }

  async createCommissions(placementId: string, commissions: Omit<CommissionPaymentPlacement, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<CommissionPaymentPlacement[]> {
    const createdCommissions: CommissionPaymentPlacement[] = []
    for (const commissionData of commissions) {
      const commission = await this.createCommission(placementId, commissionData)
      createdCommissions.push(commission)
    }
    return createdCommissions
  }

  async listCommissions(placementId: string): Promise<CommissionPaymentPlacement[]> {
    const { collection, query, where, getDocs, db, orderBy } = await getFirestore()
    const colRef = collection(db, `${this.collectionName}/${placementId}/commissions`)
    const q = query(colRef, orderBy('dueDate', 'asc'))
    const snaps = await getDocs(q)
    return snaps.docs.map(s => {
      const d = s.data()
      return {
        id: s.id,
        ...(d as any),
        dueDate: d.dueDate?.toDate() || new Date(),
        paidAt: d.paidAt?.toDate(),
        createdAt: d.createdAt?.toDate() || new Date(),
        updatedAt: d.updatedAt?.toDate() || new Date(),
      } as CommissionPaymentPlacement
    })
  }

  async updateCommission(placementId: string, commissionId: string, data: Partial<CommissionPaymentPlacement>): Promise<CommissionPaymentPlacement> {
    const { doc, updateDoc, db, serverTimestamp, getDoc } = await getFirestore()
    const ref = doc(db, `${this.collectionName}/${placementId}/commissions`, commissionId)
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() })
    const snap = await getDoc(ref)
    if (!snap.exists()) throw new Error('Commission introuvable')
    const d = snap.data()
    return {
      id: snap.id,
      ...(d as any),
      dueDate: d.dueDate?.toDate() || new Date(),
      paidAt: d.paidAt?.toDate(),
      createdAt: d.createdAt?.toDate() || new Date(),
      updatedAt: d.updatedAt?.toDate() || new Date(),
    } as CommissionPaymentPlacement
  }

  // Retrait anticipé
  async getEarlyExit(placementId: string): Promise<EarlyExitPlacement | null> {
    const { doc, getDoc, db } = await getFirestore()
    const ref = doc(db, `${this.collectionName}/${placementId}/earlyExit`, 'current')
    const snap = await getDoc(ref)
    if (!snap.exists()) return null
    const d = snap.data()
    return {
      id: snap.id,
      ...(d as any),
      requestedAt: d.requestedAt?.toDate() || new Date(),
      validatedAt: d.validatedAt?.toDate(),
      createdAt: d.createdAt?.toDate() || new Date(),
      updatedAt: d.updatedAt?.toDate() || new Date(),
    } as EarlyExitPlacement
  }

  async saveEarlyExit(placementId: string, data: Omit<EarlyExitPlacement, 'id' | 'createdAt' | 'updatedAt'>): Promise<EarlyExitPlacement> {
    const { doc, setDoc, db, serverTimestamp, getDoc } = await getFirestore()
    const ref = doc(db, `${this.collectionName}/${placementId}/earlyExit`, 'current')
    await setDoc(ref, {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    const snap = await getDoc(ref)
    const d = snap.data()
    if (!d) throw new Error('Early exit introuvable')
    return {
      id: snap.id,
      ...(d as any),
      requestedAt: d.requestedAt?.toDate() || new Date(),
      validatedAt: d.validatedAt?.toDate(),
      createdAt: d.createdAt?.toDate() || new Date(),
      updatedAt: d.updatedAt?.toDate() || new Date(),
    } as EarlyExitPlacement
  }
}

