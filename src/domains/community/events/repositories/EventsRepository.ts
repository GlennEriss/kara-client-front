/**
 * Repository Firestore pour les Événements
 *
 * Collection principale : events
 * Sous-collection : events/{eventId}/votes (doc id = memberId)
 *
 * Garanties :
 * - Génération d'id standardisé MK_EVENT_{YYYYMMDD}_{HHMM}_{4charRandom}
 * - Vote = upsert atomique (transaction) avec mise à jour des compteurs dénormalisés
 * - Suppression interdite si statut != 'draft' (préserve l'historique)
 */

import {
  db,
  collection,
  query,
  where,
  orderBy,
  limit as fbLimit,
  startAfter,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  getCountFromServer,
  runTransaction,
  increment,
  Timestamp,
} from '@/firebase/firestore'
import { firebaseCollectionNames } from '@/constantes/firebase-collection-names'
import type { IEventsRepository } from './IEventsRepository'
import type {
  Event,
  CreateEventInput,
  UpdateEventInput,
  ConfirmLocationInput,
  CancelEventInput,
} from '../entities/event.types'
import type {
  EventFilters,
  EventsPaginationParams,
  EventsSortParams,
  PaginatedEvents,
  EventStats,
} from '../entities/event-filters.types'
import type {
  EventVote,
  CastVoteInput,
  EventVoter,
} from '../entities/event-vote.types'

const VOTES_SUBCOLLECTION = 'votes'

export class EventsRepository implements IEventsRepository {
  private static instance: EventsRepository
  private readonly collectionName = firebaseCollectionNames.events

  private constructor() {}

  static getInstance(): EventsRepository {
    if (!EventsRepository.instance) {
      EventsRepository.instance = new EventsRepository()
    }
    return EventsRepository.instance
  }

  // ===== Helpers =====

  /**
   * Génère un id : MK_EVENT_{YYYYMMDD}_{HHMM}_{4charRandom}
   */
  private generateEventId(): string {
    const now = new Date()
    const yyyy = now.getFullYear()
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const dd = String(now.getDate()).padStart(2, '0')
    const hh = String(now.getHours()).padStart(2, '0')
    const mi = String(now.getMinutes()).padStart(2, '0')
    const rand = Math.random().toString(36).slice(2, 6)
    return `MK_EVENT_${yyyy}${mm}${dd}_${hh}${mi}_${rand}`
  }

  /** Convertit un Timestamp ou Date en Date, ou undefined */
  private toDate(value: unknown): Date | undefined {
    if (!value) return undefined
    if (value instanceof Date) return value
    if (typeof value === 'object' && value && 'toDate' in value && typeof (value as any).toDate === 'function') {
      return (value as any).toDate() as Date
    }
    if (typeof value === 'string' || typeof value === 'number') {
      const d = new Date(value)
      return Number.isNaN(d.getTime()) ? undefined : d
    }
    return undefined
  }

  /** Transforme un snapshot Firestore en Event */
  private transformEventDoc(snap: any): Event {
    const data = snap.data() ?? {}
    return {
      id: snap.id,
      title: data.title ?? '',
      description: data.description ?? '',
      imageURL: data.imageURL,
      type: data.type,
      startDate: this.toDate(data.startDate) ?? new Date(),
      endDate: this.toDate(data.endDate),
      status: data.status ?? 'draft',
      pollEnabled: data.pollEnabled === true,
      proposedLocations: data.proposedLocations,
      pollClosesAt: this.toDate(data.pollClosesAt),
      pollClosedAt: this.toDate(data.pollClosedAt),
      finalLocation: data.finalLocation,
      totalVotes: data.totalVotes ?? 0,
      votesByOptionId: data.votesByOptionId ?? {},
      createdBy: data.createdBy ?? '',
      createdAt: this.toDate(data.createdAt) ?? new Date(),
      updatedBy: data.updatedBy,
      updatedAt: this.toDate(data.updatedAt),
      publishedBy: data.publishedBy,
      publishedAt: this.toDate(data.publishedAt),
      cancelledBy: data.cancelledBy,
      cancelledAt: this.toDate(data.cancelledAt),
      cancellationReason: data.cancellationReason,
    }
  }

  private transformVoteDoc(snap: any): EventVote {
    const data = snap.data() ?? {}
    return {
      memberId: snap.id,
      memberName: data.memberName,
      optionId: data.optionId ?? '',
      votedAt: this.toDate(data.votedAt) ?? new Date(),
      updatedAt: this.toDate(data.updatedAt),
    }
  }

  /** Convertit Date|string|undefined en Timestamp Firestore (pour écriture) */
  private toTimestamp(value: Date | string | undefined | null): Timestamp | undefined {
    if (!value) return undefined
    if (value instanceof Date) return Timestamp.fromDate(value)
    if (typeof value === 'string') {
      const d = new Date(value)
      return Number.isNaN(d.getTime()) ? undefined : Timestamp.fromDate(d)
    }
    return undefined
  }

  /** Retire les champs undefined avant écriture (Firestore les refuse) */
  private stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(obj)) {
      if (v !== undefined) out[k] = v
    }
    return out as Partial<T>
  }

  // ===== CRUD Événements =====

  async getPaginated(
    filters?: EventFilters,
    pagination?: EventsPaginationParams,
    sort?: EventsSortParams,
  ): Promise<PaginatedEvents> {
    const colRef = collection(db, this.collectionName)
    const sortField = sort?.field ?? 'startDate'
    const sortDir = sort?.direction ?? 'desc'
    const pageSize = pagination?.pageSize ?? 20

    const constraints: any[] = []

    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        constraints.push(where('status', 'in', filters.status))
      } else {
        constraints.push(where('status', '==', filters.status))
      }
    }
    if (filters?.type) {
      constraints.push(where('type', '==', filters.type))
    }
    if (filters?.pollEnabled !== undefined) {
      constraints.push(where('pollEnabled', '==', filters.pollEnabled))
    }
    if (filters?.fromDate) {
      constraints.push(where('startDate', '>=', Timestamp.fromDate(filters.fromDate)))
    }
    if (filters?.toDate) {
      constraints.push(where('startDate', '<=', Timestamp.fromDate(filters.toDate)))
    }

    constraints.push(orderBy(sortField, sortDir))

    if (pagination?.cursor) {
      constraints.push(startAfter(pagination.cursor))
    }

    constraints.push(fbLimit(pageSize + 1))   // +1 pour détecter la page suivante

    const snap = await getDocs(query(colRef, ...constraints)).catch((err) => {
      console.error('[EventsRepository] getPaginated error (index manquant ?):', err)
      throw err
    })

    let docs = snap.docs
    const hasMore = docs.length > pageSize
    if (hasMore) docs = docs.slice(0, pageSize)

    const items = docs.map((d) => this.transformEventDoc(d))

    // Filtre recherche libre (post-query, pas indexable simplement)
    let filtered = items
    if (filters?.search) {
      const q = filters.search.trim().toLowerCase()
      if (q.length > 0) {
        filtered = filtered.filter((e) =>
          (e.title ?? '').toLowerCase().includes(q) ||
          (e.description ?? '').toLowerCase().includes(q),
        )
      }
    }

    return {
      events: filtered,
      nextCursor: hasMore ? docs[docs.length - 1] : undefined,
    }
  }

  async getById(id: string): Promise<Event | null> {
    const snap = await getDoc(doc(db, this.collectionName, id))
    if (!snap.exists()) return null
    return this.transformEventDoc(snap)
  }

  async create(data: CreateEventInput, createdBy: string): Promise<Event> {
    const id = this.generateEventId()
    const status = data.status ?? 'draft'

    const payload = this.stripUndefined({
      title: data.title,
      description: data.description,
      imageURL: data.imageURL,
      type: data.type,
      startDate: this.toTimestamp(data.startDate),
      endDate: this.toTimestamp(data.endDate),
      status,
      pollEnabled: data.pollEnabled === true,
      proposedLocations: data.pollEnabled ? data.proposedLocations : undefined,
      pollClosesAt: data.pollEnabled ? this.toTimestamp(data.pollClosesAt) : undefined,
      finalLocation: !data.pollEnabled ? data.finalLocation : undefined,
      totalVotes: 0,
      votesByOptionId: {},
      createdBy,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    await setDoc(doc(db, this.collectionName, id), payload)

    const created = await this.getById(id)
    if (!created) throw new Error('Échec de création de l\'événement')
    return created
  }

  async update(id: string, data: UpdateEventInput, updatedBy: string): Promise<Event> {
    const payload: Record<string, unknown> = {
      updatedBy,
      updatedAt: serverTimestamp(),
    }
    if (data.title !== undefined) payload.title = data.title
    if (data.description !== undefined) payload.description = data.description
    if (data.imageURL !== undefined) payload.imageURL = data.imageURL
    if (data.type !== undefined) payload.type = data.type
    if (data.startDate !== undefined) payload.startDate = this.toTimestamp(data.startDate)
    if (data.endDate !== undefined) payload.endDate = this.toTimestamp(data.endDate)
    if (data.pollEnabled !== undefined) payload.pollEnabled = data.pollEnabled
    if (data.proposedLocations !== undefined) payload.proposedLocations = data.proposedLocations
    if (data.pollClosesAt !== undefined) payload.pollClosesAt = this.toTimestamp(data.pollClosesAt)
    if (data.finalLocation !== undefined) payload.finalLocation = data.finalLocation
    if (data.status !== undefined) payload.status = data.status

    await updateDoc(doc(db, this.collectionName, id), this.stripUndefined(payload) as any)

    const updated = await this.getById(id)
    if (!updated) throw new Error('Événement introuvable après mise à jour')
    return updated
  }

  async delete(id: string, _deletedBy: string): Promise<void> {
    const current = await this.getById(id)
    if (!current) return
    if (current.status !== 'draft') {
      throw new Error('Seul un événement en brouillon peut être supprimé')
    }
    await deleteDoc(doc(db, this.collectionName, id))
  }

  async publish(id: string, publishedBy: string): Promise<Event> {
    const current = await this.getById(id)
    if (!current) throw new Error('Événement introuvable')

    const newStatus = current.pollEnabled ? 'poll_open' : 'published'

    await updateDoc(doc(db, this.collectionName, id), {
      status: newStatus,
      publishedBy,
      publishedAt: serverTimestamp(),
      updatedBy: publishedBy,
      updatedAt: serverTimestamp(),
    })

    const updated = await this.getById(id)
    if (!updated) throw new Error('Événement introuvable après publication')
    return updated
  }

  async confirmLocation(
    id: string,
    input: ConfirmLocationInput,
    confirmedBy: string,
  ): Promise<Event> {
    const current = await this.getById(id)
    if (!current) throw new Error('Événement introuvable')
    if (!current.pollEnabled) {
      throw new Error('Cet événement n\'a pas de sondage')
    }
    const option = current.proposedLocations?.find((o) => o.id === input.optionId)
    if (!option) {
      throw new Error('Option de lieu invalide')
    }

    await updateDoc(doc(db, this.collectionName, id), {
      status: 'location_confirmed',
      finalLocation: {
        id: option.id,
        name: option.name,
        address: option.address ?? null,
        description: option.description ?? null,
      },
      pollClosedAt: serverTimestamp(),
      updatedBy: confirmedBy,
      updatedAt: serverTimestamp(),
    })

    const updated = await this.getById(id)
    if (!updated) throw new Error('Événement introuvable après clôture du sondage')
    return updated
  }

  async cancel(
    id: string,
    input: CancelEventInput,
    cancelledBy: string,
  ): Promise<Event> {
    await updateDoc(doc(db, this.collectionName, id), {
      status: 'cancelled',
      cancellationReason: input.reason,
      cancelledBy,
      cancelledAt: serverTimestamp(),
      updatedBy: cancelledBy,
      updatedAt: serverTimestamp(),
    })

    const updated = await this.getById(id)
    if (!updated) throw new Error('Événement introuvable après annulation')
    return updated
  }

  async search(searchQuery: string, limitN = 20): Promise<Event[]> {
    // Recherche simple : on récupère un buffer et on filtre côté client.
    // Pour de gros volumes, prévoir un searchableText dénormalisé.
    const colRef = collection(db, this.collectionName)
    const snap = await getDocs(query(colRef, orderBy('startDate', 'desc'), fbLimit(200)))
    const q = searchQuery.trim().toLowerCase()
    if (!q) return []
    return snap.docs
      .map((d) => this.transformEventDoc(d))
      .filter((e) =>
        (e.title ?? '').toLowerCase().includes(q) ||
        (e.description ?? '').toLowerCase().includes(q),
      )
      .slice(0, limitN)
  }

  async getStats(): Promise<EventStats> {
    const colRef = collection(db, this.collectionName)
    const now = Timestamp.now()

    const [totalSnap, draftSnap, pollSnap, cancelledSnap, upcomingSnap, pastSnap] = await Promise.all([
      getCountFromServer(query(colRef)),
      getCountFromServer(query(colRef, where('status', '==', 'draft'))),
      getCountFromServer(query(colRef, where('status', '==', 'poll_open'))),
      getCountFromServer(query(colRef, where('status', '==', 'cancelled'))),
      getCountFromServer(
        query(
          colRef,
          where('status', 'in', ['published', 'poll_open', 'location_confirmed']),
          where('startDate', '>=', now),
        ),
      ),
      getCountFromServer(query(colRef, where('startDate', '<', now))),
    ]).catch((err) => {
      console.error('[EventsRepository] getStats error (index manquant ?):', err)
      throw err
    })

    return {
      total: totalSnap.data().count,
      draft: draftSnap.data().count,
      upcoming: upcomingSnap.data().count,
      pollOpen: pollSnap.data().count,
      past: pastSnap.data().count,
      cancelled: cancelledSnap.data().count,
    }
  }

  // ===== Votes =====

  async listVotes(eventId: string): Promise<EventVoter[]> {
    const colRef = collection(db, this.collectionName, eventId, VOTES_SUBCOLLECTION)
    const snap = await getDocs(query(colRef, orderBy('votedAt', 'desc')))
    return snap.docs.map((d) => {
      const data = d.data() ?? {}
      return {
        memberId: d.id,
        memberName: data.memberName,
        optionId: data.optionId ?? '',
        votedAt: this.toDate(data.votedAt) ?? new Date(),
      }
    })
  }

  async getMemberVote(eventId: string, memberId: string): Promise<EventVote | null> {
    const snap = await getDoc(
      doc(db, this.collectionName, eventId, VOTES_SUBCOLLECTION, memberId),
    )
    if (!snap.exists()) return null
    return this.transformVoteDoc(snap)
  }

  /**
   * Upsert atomique d'un vote.
   *
   * Transaction :
   *   1. Lit le vote existant éventuel (pour décrémenter l'ancien optionId)
   *   2. Lit l'événement (pour valider l'option)
   *   3. Écrit le vote
   *   4. Met à jour les compteurs : -1 sur ancien, +1 sur nouveau, totalVotes éventuel
   *
   * Renvoie le vote tel qu'enregistré.
   */
  async castVote(eventId: string, input: CastVoteInput): Promise<EventVote> {
    const eventRef = doc(db, this.collectionName, eventId)
    const voteRef = doc(db, this.collectionName, eventId, VOTES_SUBCOLLECTION, input.memberId)

    return await runTransaction(db, async (tx) => {
      const eventSnap = await tx.get(eventRef)
      if (!eventSnap.exists()) {
        throw new Error('Événement introuvable')
      }
      const eventData = eventSnap.data() as any
      if (eventData.status !== 'poll_open') {
        throw new Error('Le sondage n\'est pas ouvert')
      }
      const validIds = new Set<string>(
        (eventData.proposedLocations ?? []).map((o: { id: string }) => o.id),
      )
      if (!validIds.has(input.optionId)) {
        throw new Error('Option de vote invalide')
      }

      const previousSnap = await tx.get(voteRef)
      const previousOptionId = previousSnap.exists()
        ? (previousSnap.data() as any)?.optionId
        : undefined

      // Compteurs dénormalisés
      const counterUpdates: Record<string, unknown> = {}
      if (previousOptionId && previousOptionId !== input.optionId) {
        counterUpdates[`votesByOptionId.${previousOptionId}`] = increment(-1)
        counterUpdates[`votesByOptionId.${input.optionId}`] = increment(1)
        // totalVotes inchangé (modification, pas nouveau votant)
      } else if (!previousSnap.exists()) {
        counterUpdates[`votesByOptionId.${input.optionId}`] = increment(1)
        counterUpdates.totalVotes = increment(1)
      } else {
        // Vote identique : pas de changement de compteur
      }

      const votePayload: Record<string, unknown> = {
        memberName: input.memberName ?? null,
        optionId: input.optionId,
        updatedAt: serverTimestamp(),
      }
      if (!previousSnap.exists()) {
        votePayload.votedAt = serverTimestamp()
      }

      tx.set(voteRef, votePayload, { merge: true })

      if (Object.keys(counterUpdates).length > 0) {
        tx.update(eventRef, counterUpdates as any)
      }

      return {
        memberId: input.memberId,
        memberName: input.memberName,
        optionId: input.optionId,
        votedAt: previousSnap.exists()
          ? this.toDate((previousSnap.data() as any).votedAt) ?? new Date()
          : new Date(),
        updatedAt: new Date(),
      }
    })
  }

  async removeVote(eventId: string, memberId: string): Promise<void> {
    const eventRef = doc(db, this.collectionName, eventId)
    const voteRef = doc(db, this.collectionName, eventId, VOTES_SUBCOLLECTION, memberId)

    await runTransaction(db, async (tx) => {
      const voteSnap = await tx.get(voteRef)
      if (!voteSnap.exists()) return
      const previousOptionId = (voteSnap.data() as any)?.optionId

      tx.delete(voteRef)
      if (previousOptionId) {
        tx.update(eventRef, {
          [`votesByOptionId.${previousOptionId}`]: increment(-1),
          totalVotes: increment(-1),
        })
      }
    })
  }
}
