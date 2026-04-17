import { firebaseCollectionNames } from '@/constantes/firebase-collection-names'
import {
  db,
  collection,
  doc,
  getDoc,
  getDocs,
  limit as fbLimit,
  orderBy,
  query,
  where,
} from '@/firebase/firestore'
import type { MemberOverviewMemberInfo } from '../entities/member-overview.types'
import type { IMemberOverviewRepository, OverviewRawRecord } from './IMemberOverviewRepository'

function coerceDate(value: unknown): string | undefined {
  if (!value) return undefined

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value.toISOString()
  }

  if (typeof value === 'object') {
    const maybeTimestamp = value as { toDate?: () => Date; seconds?: number; _seconds?: number }
    if (typeof maybeTimestamp.toDate === 'function') {
      const date = maybeTimestamp.toDate()
      return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
    }
    const seconds = maybeTimestamp.seconds ?? maybeTimestamp._seconds
    if (typeof seconds === 'number') {
      const date = new Date(seconds * 1000)
      return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
    }
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
  }

  return undefined
}

function normalizeRecord(id: string, data: Record<string, unknown>): OverviewRawRecord {
  const amount =
    typeof data.amount === 'number'
      ? data.amount
      : typeof data.monthlyAmount === 'number'
      ? data.monthlyAmount
      : undefined

  return {
    id,
    status: typeof data.status === 'string' ? data.status : undefined,
    amount,
    contractId: typeof data.contractId === 'string' ? data.contractId : undefined,
    createdAt: data.createdAt,
    desiredDate: data.desiredDate,
    ...data,
  }
}

export class MemberOverviewRepository implements IMemberOverviewRepository {
  private static instance: MemberOverviewRepository

  private constructor() {}

  static getInstance(): MemberOverviewRepository {
    if (!MemberOverviewRepository.instance) {
      MemberOverviewRepository.instance = new MemberOverviewRepository()
    }
    return MemberOverviewRepository.instance
  }

  async getMemberById(memberId: string): Promise<MemberOverviewMemberInfo | null> {
    const memberDocRef = doc(db, firebaseCollectionNames.users, memberId)
    const memberSnap = await getDoc(memberDocRef)

    if (!memberSnap.exists()) return null

    const data = memberSnap.data() as Record<string, unknown>
    return {
      id: memberSnap.id,
      matricule: typeof data.matricule === 'string' ? data.matricule : undefined,
      firstName: typeof data.firstName === 'string' ? data.firstName : undefined,
      lastName: typeof data.lastName === 'string' ? data.lastName : undefined,
      contacts: Array.isArray(data.contacts)
        ? data.contacts.filter((contact): contact is string => typeof contact === 'string')
        : undefined,
      membershipType: data.membershipType as MemberOverviewMemberInfo['membershipType'],
      roles: Array.isArray(data.roles)
        ? data.roles.filter((role): role is MemberOverviewMemberInfo['roles'][number] => typeof role === 'string')
        : undefined,
      isActive: typeof data.isActive === 'boolean' ? data.isActive : undefined,
      photoURL: typeof data.photoURL === 'string' ? data.photoURL : null,
    }
  }

  private async getByMemberField(
    collectionName: string,
    memberField: string,
    memberId: string,
    limitPerSection: number
  ): Promise<OverviewRawRecord[]> {
    const q = query(
      collection(db, collectionName),
      where(memberField, '==', memberId),
      orderBy('createdAt', 'desc'),
      fbLimit(limitPerSection),
    )

    const snap = await getDocs(q)
    return snap.docs.map((d) => normalizeRecord(d.id, d.data() as Record<string, unknown>))
  }

  async getCaisseSpecialeDemands(memberId: string, limitPerSection: number): Promise<OverviewRawRecord[]> {
    return this.getByMemberField(
      firebaseCollectionNames.caisseSpecialeDemands,
      'memberId',
      memberId,
      limitPerSection,
    )
  }

  async getCaisseSpecialeContracts(memberId: string, limitPerSection: number): Promise<OverviewRawRecord[]> {
    return this.getByMemberField(
      firebaseCollectionNames.caisseContracts,
      'memberId',
      memberId,
      limitPerSection,
    )
  }

  async getCaisseImprevueDemands(memberId: string, limitPerSection: number): Promise<OverviewRawRecord[]> {
    return this.getByMemberField(
      firebaseCollectionNames.caisseImprevueDemands,
      'memberId',
      memberId,
      limitPerSection,
    )
  }

  async getCaisseImprevueContracts(memberId: string, limitPerSection: number): Promise<OverviewRawRecord[]> {
    return this.getByMemberField(
      firebaseCollectionNames.contractsCI,
      'memberId',
      memberId,
      limitPerSection,
    )
  }

  async getCreditDemands(
    memberId: string,
    creditType: 'SPECIALE' | 'FIXE' | 'AIDE',
    limitPerSection: number,
  ): Promise<OverviewRawRecord[]> {
    const q = query(
      collection(db, firebaseCollectionNames.creditDemands),
      where('clientId', '==', memberId),
      where('creditType', '==', creditType),
      orderBy('createdAt', 'desc'),
      fbLimit(limitPerSection),
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => normalizeRecord(d.id, d.data() as Record<string, unknown>))
  }

  async getCreditContracts(
    memberId: string,
    creditType: 'SPECIALE' | 'FIXE' | 'AIDE',
    limitPerSection: number,
  ): Promise<OverviewRawRecord[]> {
    const q = query(
      collection(db, firebaseCollectionNames.creditContracts),
      where('clientId', '==', memberId),
      where('creditType', '==', creditType),
      orderBy('createdAt', 'desc'),
      fbLimit(limitPerSection),
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => normalizeRecord(d.id, d.data() as Record<string, unknown>))
  }

  async getPlacementDemands(memberId: string, limitPerSection: number): Promise<OverviewRawRecord[]> {
    return this.getByMemberField(
      firebaseCollectionNames.placementDemands,
      'benefactorId',
      memberId,
      limitPerSection,
    )
  }

  async getPlacements(memberId: string, limitPerSection: number): Promise<OverviewRawRecord[]> {
    return this.getByMemberField(
      firebaseCollectionNames.placements,
      'benefactorId',
      memberId,
      limitPerSection,
    )
  }
}

export { coerceDate }

