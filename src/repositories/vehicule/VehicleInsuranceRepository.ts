import { VehicleInsurance, VehicleInsuranceFilters, VehicleInsuranceListResult, VehicleInsuranceStats, VehicleInsuranceStatus } from '@/types/types'
import { IRepository } from '@/repositories/IRepository'

const getFirestore = () => import('@/firebase/firestore')

const COLLECTION_NAME = 'vehicle-insurances'

type FirestoreVehicleInsurance = Omit<VehicleInsurance, 'id' | 'startDate' | 'endDate' | 'createdAt' | 'updatedAt' | 'lastRenewedAt'> & {
  startDate: any
  endDate: any
  createdAt: any
  updatedAt: any
  lastRenewedAt?: any
}

export class VehicleInsuranceRepository implements IRepository {
  readonly name = 'VehicleInsuranceRepository'

  /**
   * Récupération paginée (pagination côté client après fetch)
   */
  async list(filters?: VehicleInsuranceFilters, page: number = 1, pageSize: number = 12): Promise<VehicleInsuranceListResult> {
    const { collection, query, where, orderBy, getDocs, db } = await getFirestore()
    const collectionRef = collection(db, COLLECTION_NAME)
    const constraints: any[] = []

    if (filters?.status && filters.status !== 'all') {
      constraints.push(where('status', '==', filters.status))
    }

    if (filters?.vehicleType && filters.vehicleType !== 'all') {
      constraints.push(where('vehicleType', '==', filters.vehicleType))
    }

    if (filters?.insuranceCompany) {
      constraints.push(where('insuranceCompany', '==', filters.insuranceCompany))
    }

    if (filters?.sponsorMemberId) {
      constraints.push(where('sponsorMemberId', '==', filters.sponsorMemberId))
    }

    const orderField = filters?.orderByField || 'endDate'
    const orderDirection = filters?.orderByDirection || (orderField === 'endDate' ? 'asc' : 'desc')
    constraints.push(orderBy(orderField, orderDirection))

    const q = query(collectionRef, ...constraints)
    const snapshot = await getDocs(q)

    let items = snapshot.docs.map(doc => this.mapDocToEntity(doc.id, doc.data() as FirestoreVehicleInsurance))

    // Filtrer par type de titulaire
    if (filters?.holderType && filters.holderType !== 'all') {
      items = items.filter(item => item.holderType === filters.holderType)
    }

    if (filters?.searchQuery) {
      const search = filters.searchQuery.toLowerCase()
      items = items.filter(item => {
        // Recherche dans les noms (membre ou non-membre)
        const firstName = item.holderType === 'member' 
          ? (item.memberFirstName || '') 
          : (item.nonMemberFirstName || '')
        const lastName = item.holderType === 'member'
          ? (item.memberLastName || '')
          : (item.nonMemberLastName || '')
        const fullName = `${firstName} ${lastName}`.toLowerCase()
        const phone = (item.primaryPhone || item.nonMemberPhone1 || item.memberContacts?.[0] || '').toLowerCase()
        const city = (item.city || '').toLowerCase()
        return fullName.includes(search) ||
          city.includes(search) ||
          phone.includes(search) ||
          item.policyNumber.toLowerCase().includes(search) ||
          (item.plateNumber?.toLowerCase().includes(search) ?? false) ||
          item.insuranceCompany.toLowerCase().includes(search) ||
          (item.memberMatricule?.toLowerCase().includes(search) ?? false)
      })
    }

    if (filters?.alphabeticalOrder) {
      const direction = filters.alphabeticalOrder === 'asc' ? 1 : -1
      items = items.sort((a, b) => {
        const aLastName = a.holderType === 'member' 
          ? (a.memberLastName || '') 
          : (a.nonMemberLastName || '')
        const aFirstName = a.holderType === 'member'
          ? (a.memberFirstName || '')
          : (a.nonMemberFirstName || '')
        const bLastName = b.holderType === 'member'
          ? (b.memberLastName || '')
          : (b.nonMemberLastName || '')
        const bFirstName = b.holderType === 'member'
          ? (b.memberFirstName || '')
          : (b.nonMemberFirstName || '')
        
        const aName = `${aLastName} ${aFirstName}`.toLowerCase()
        const bName = `${bLastName} ${bFirstName}`.toLowerCase()
        if (aName < bName) return -1 * direction
        if (aName > bName) return 1 * direction
        return 0
      })
    }

    const total = items.length
    const limitValue = filters?.limit || pageSize
    const currentPage = filters?.page ?? page
    const startIndex = (currentPage - 1) * limitValue
    const paginated = items.slice(startIndex, startIndex + limitValue)

    return {
      items: paginated,
      total,
      page: currentPage,
      limit: limitValue,
      hasNextPage: startIndex + limitValue < total,
      hasPrevPage: currentPage > 1,
      nextCursor: undefined,
    }
  }

  async getById(id: string): Promise<VehicleInsurance | null> {
    const { doc, getDoc, db } = await getFirestore()
    const docRef = doc(db, COLLECTION_NAME, id)
    const snap = await getDoc(docRef)
    if (!snap.exists()) return null
    return this.mapDocToEntity(snap.id, snap.data() as FirestoreVehicleInsurance)
  }

  async getByMemberId(memberId: string): Promise<VehicleInsurance | null> {
    const { collection, query, where, getDocs, limit, db } = await getFirestore()
    const collectionRef = collection(db, COLLECTION_NAME)
    const q = query(collectionRef, where('memberId', '==', memberId), limit(1))
    const snapshot = await getDocs(q)
    if (snapshot.empty) return null
    const docSnap = snapshot.docs[0]
    return this.mapDocToEntity(docSnap.id, docSnap.data() as FirestoreVehicleInsurance)
  }

  async create(data: Omit<VehicleInsurance, 'id'>): Promise<string> {
    const { addDoc, collection, Timestamp, db } = await getFirestore()
    const collectionRef = collection(db, COLLECTION_NAME)
    const payload = this.mapEntityToDoc(data, Timestamp)
    const docRef = await addDoc(collectionRef, payload)
    return docRef.id
  }

  async update(id: string, updates: Partial<VehicleInsurance>): Promise<void> {
    const { doc, updateDoc, Timestamp, db } = await getFirestore()
    const docRef = doc(db, COLLECTION_NAME, id)
    const payload = this.mapEntityToDoc(updates as VehicleInsurance, Timestamp, true)
    await updateDoc(docRef, payload)
  }

  async delete(id: string): Promise<void> {
    const { doc, deleteDoc, db } = await getFirestore()
    const docRef = doc(db, COLLECTION_NAME, id)
    await deleteDoc(docRef)
  }

  async getStats(): Promise<VehicleInsuranceStats> {
    const { collection, getDocs, db } = await getFirestore()
    const snapshot = await getDocs(collection(db, COLLECTION_NAME))
    const items = snapshot.docs.map(doc => this.mapDocToEntity(doc.id, doc.data() as FirestoreVehicleInsurance))
    const now = new Date()
    const soonThreshold = new Date()
    soonThreshold.setDate(soonThreshold.getDate() + 30)

    const totals = items.reduce(
      (acc, item) => {
        if (item.status === 'expired' || item.endDate < now) {
          acc.expired += 1
        } else if (item.status === 'expires_soon' || item.endDate <= soonThreshold) {
          acc.expiresSoon += 1
        } else {
          acc.active += 1
        }
        return acc
      },
      { active: 0, expiresSoon: 0, expired: 0 }
    )

    // Compter les membres et non-membres
    const membersCount = items.filter(item => item.holderType === 'member').length
    const nonMembersCount = items.filter(item => item.holderType === 'non-member').length

    const byCompanyMap = new Map<string, number>()
    const byVehicleTypeMap = new Map<string, number>()
    items.forEach(item => {
      byCompanyMap.set(item.insuranceCompany, (byCompanyMap.get(item.insuranceCompany) || 0) + 1)
      byVehicleTypeMap.set(item.vehicleType, (byVehicleTypeMap.get(item.vehicleType) || 0) + 1)
    })

    const expiringSoonList = items
      .filter(item => item.endDate <= soonThreshold)
      .sort((a, b) => a.endDate.getTime() - b.endDate.getTime())
      .slice(0, 5)

    return {
      totalInsured: items.length,
      active: totals.active,
      expiresSoon: totals.expiresSoon,
      expired: totals.expired,
      membersCount,
      nonMembersCount,
      byCompany: Array.from(byCompanyMap.entries()).map(([company, count]) => ({ company, count })),
      byVehicleType: Array.from(byVehicleTypeMap.entries()).map(([type, count]) => ({ type: type as any, count })),
      expiringSoonList,
    }
  }

  private toDate(value: any): Date {
    if (!value) return new Date()
    if (value instanceof Date) return value
    if (value.toDate) return value.toDate()
    return new Date(value)
  }

  private mapDocToEntity(id: string, data: FirestoreVehicleInsurance): VehicleInsurance {
    return {
      id,
      city: data.city,
      primaryPhone: data.primaryPhone || data.nonMemberPhone1 || data.memberContacts?.[0],
      holderType: data.holderType || (data.memberId ? 'member' : 'non-member'), // Rétrocompatibilité
      memberId: data.memberId,
      memberFirstName: data.memberFirstName,
      memberLastName: data.memberLastName,
      memberMatricule: data.memberMatricule,
      memberContacts: data.memberContacts,
      memberPhotoUrl: data.memberPhotoUrl,
      nonMemberFirstName: data.nonMemberFirstName,
      nonMemberLastName: data.nonMemberLastName,
      nonMemberPhone1: data.nonMemberPhone1,
      nonMemberPhone2: data.nonMemberPhone2,
      sponsorMemberId: data.sponsorMemberId,
      sponsorName: data.sponsorName,
      vehicleType: data.vehicleType,
      vehicleBrand: data.vehicleBrand,
      vehicleModel: data.vehicleModel,
      vehicleYear: data.vehicleYear,
      plateNumber: data.plateNumber,
      energySource: data.energySource,
      fiscalPower: data.fiscalPower,
      insuranceCompany: data.insuranceCompany,
      policyNumber: data.policyNumber,
      warrantyMonths: data.warrantyMonths,
      premiumAmount: data.premiumAmount,
      currency: data.currency || 'FCFA',
      startDate: this.toDate(data.startDate),
      endDate: this.toDate(data.endDate),
      status: this.computeStatus(data.status, this.toDate(data.endDate)),
      notes: data.notes,
      attachments: data.attachments,
      renewalCount: data.renewalCount,
      lastRenewedAt: data.lastRenewedAt ? this.toDate(data.lastRenewedAt) : undefined,
      createdAt: this.toDate(data.createdAt),
      createdBy: data.createdBy,
      updatedAt: this.toDate(data.updatedAt),
      updatedBy: data.updatedBy,
    }
  }

  private mapEntityToDoc(
    data: Partial<VehicleInsurance>,
    Timestamp: any,
    partial: boolean = false
  ): Partial<FirestoreVehicleInsurance> {
    const payload: any = { ...data }
    const originalDates: Record<string, Date> = {}
    const dateFields: Array<keyof VehicleInsurance> = ['startDate', 'endDate', 'createdAt', 'updatedAt', 'lastRenewedAt']
    dateFields.forEach(field => {
      if (payload[field]) {
        const dateValue = payload[field] as Date
        originalDates[field as string] = dateValue
        payload[field] = Timestamp.fromDate(dateValue)
      }
    })
    if (!partial && payload.status === undefined && originalDates.endDate) {
      payload.status = this.computeStatus(undefined, originalDates.endDate)
    }
    return payload
  }

  private computeStatus(status: VehicleInsuranceStatus | undefined, endDate: Date): VehicleInsuranceStatus {
    if (status === 'expired') return 'expired'
    const now = new Date()
    const soonThreshold = new Date()
    soonThreshold.setDate(soonThreshold.getDate() + 30)
    if (endDate < now) return 'expired'
    if (endDate <= soonThreshold) return 'expires_soon'
    return 'active'
  }
}

