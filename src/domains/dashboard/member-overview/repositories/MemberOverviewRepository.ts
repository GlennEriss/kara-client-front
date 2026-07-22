import { firebaseCollectionNames } from '@/constantes/firebase-collection-names'
import {
  db,
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  limit as fbLimit,
  orderBy,
  query,
  where,
} from '@/firebase/firestore'
import type { UserRole } from '@/types/types'
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
  // Les contributions caritatives portent le montant dans `payment.amount`
  // (ou `estimatedValue` pour une contribution en nature), pas au 1er niveau.
  const nestedPaymentAmount = (data.payment as { amount?: unknown } | undefined)?.amount

  const amount =
    typeof data.amount === 'number'
      ? data.amount
      : typeof data.monthlyAmount === 'number'
      ? data.monthlyAmount
      : typeof nestedPaymentAmount === 'number'
      ? nestedPaymentAmount
      : typeof data.estimatedValue === 'number'
      ? data.estimatedValue
      : undefined

  return {
    id,
    status: typeof data.status === 'string' ? data.status : undefined,
    amount,
    contractId: typeof data.contractId === 'string' ? data.contractId : undefined,
    label: typeof data.label === 'string' ? data.label : undefined,
    createdAt: data.createdAt,
    desiredDate: data.desiredDate,
    ...data,
  }
}

const ALLOWED_USER_ROLES: UserRole[] = ['Adherant', 'Sympathisant', 'Bienfaiteur', 'Admin', 'SuperAdmin', 'Secretary']

async function getDocsWithTimeout<T>(promise: Promise<T>, timeoutMs = 12000): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | null = null
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error('Timeout Firestore: la requête met trop de temps')), timeoutMs)
  })
  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    if (timeout) clearTimeout(timeout)
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
    const memberSnap = await getDocsWithTimeout(getDoc(memberDocRef))

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
        ? data.roles.filter(
            (role): role is UserRole =>
              typeof role === 'string' && ALLOWED_USER_ROLES.includes(role as UserRole),
          )
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

    const snap = await getDocsWithTimeout(getDocs(q))
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
    const snap = await getDocsWithTimeout(getDocs(q))
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
    const snap = await getDocsWithTimeout(getDocs(q))
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

  /**
   * Déclarations de contribution caritative du membre.
   *
   * Indexées par MATRICULE (et non par l'id du document membre) : c'est
   * l'identifiant que l'app membre écrit dans `participantId`.
   */
  /** Titre d'un événement caritatif, mis en cache par requête. */
  private async getCharityEventTitles(eventIds: string[]): Promise<Map<string, string>> {
    const titles = new Map<string, string>()
    const unique = Array.from(new Set(eventIds.filter(Boolean)))
    await Promise.all(
      unique.map(async (id) => {
        const snap = await getDoc(doc(db, 'charity-events', id))
        const title = snap.exists() ? (snap.data() as { title?: unknown }).title : undefined
        if (typeof title === 'string' && title) titles.set(id, title)
      }),
    )
    return titles
  }

  async getCharityDeclarations(matricule: string, limitPerSection: number): Promise<OverviewRawRecord[]> {
    if (!matricule) return []
    const records = await this.getByMemberField(
      'charityContributions',
      'participantId',
      matricule,
      limitPerSection,
    )
    const titles = await this.getCharityEventTitles(
      records.map((r) => (typeof r.eventId === 'string' ? r.eventId : '')),
    )
    return records.map((r) => ({
      ...r,
      label: typeof r.eventId === 'string' ? titles.get(r.eventId) : undefined,
    }))
  }

  /**
   * Contributions caritatives RÉELLEMENT enregistrées (y compris celles
   * saisies directement par un gestionnaire, sans déclaration préalable).
   *
   * La contribution ne porte pas l'identité du membre mais l'id du document
   * participant : il faut donc passer par
   *   participants (memberId == X) -> contributions (participantId == participant.id)
   */
  async getCharityContributions(memberId: string, limitPerSection: number): Promise<OverviewRawRecord[]> {
    if (!memberId) return []

    const participantsSnap = await getDocs(
      query(
        collectionGroup(db, 'participants'),
        where('memberId', '==', memberId),
        where('participantType', '==', 'member'),
      ),
    )
    if (participantsSnap.empty) return []

    const perParticipant = await Promise.all(
      participantsSnap.docs.map(async (participantDoc) => {
        const eventRef = participantDoc.ref.parent.parent
        if (!eventRef) return []
        const snap = await getDocs(
          query(
            collection(eventRef, 'contributions'),
            where('participantId', '==', participantDoc.id),
          ),
        )
        const eventSnap = await getDoc(eventRef)
        const rawTitle = eventSnap.exists() ? (eventSnap.data() as { title?: unknown }).title : undefined
        const label = typeof rawTitle === 'string' && rawTitle ? rawTitle : undefined

        return snap.docs.map((d) =>
          normalizeRecord(d.id, {
            ...(d.data() as Record<string, unknown>),
            eventId: eventRef.id,
            label,
          }),
        )
      }),
    )

    return perParticipant
      .flat()
      .sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')))
      .slice(0, limitPerSection)
  }
}

export { coerceDate }
