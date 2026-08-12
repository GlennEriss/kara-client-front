/**
 * Lecture et ajustement des étoiles de charité d'un membre.
 *
 * Les étoiles acquises sont maintenues par la Cloud Function
 * `syncMemberCharitySummary` ; ce service ne les écrit jamais. Il ne touche qu'à
 * `starDeductions` et au registre `star-adjustments`, ce que les règles
 * Firestore imposent également.
 */

import { firebaseCollectionNames } from '@/constantes/firebase-collection-names'
import {
  addDoc,
  arrayUnion,
  collection,
  db,
  doc,
  documentId,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from '@/firebase/firestore'
import {
  computeCharityStars,
  type CharityStarAdjustment,
  type MemberCharityStars,
} from '../entities/charity-stars.types'

const SUMMARY_COLLECTION = firebaseCollectionNames.memberCharitySummary
const ADJUSTMENTS_SUBCOLLECTION = 'star-adjustments'

/** Firestore limite `in` à 30 valeurs par requête. */
const IN_QUERY_CHUNK_SIZE = 30

function toDate(value: unknown): Date {
  if (value instanceof Date) return value
  if (value && typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate()
  }
  const parsed = new Date(value as string | number)
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

export class CharityStarsService {
  private static instance: CharityStarsService

  static getInstance(): CharityStarsService {
    if (!CharityStarsService.instance) {
      CharityStarsService.instance = new CharityStarsService()
    }
    return CharityStarsService.instance
  }

  /** Solde d'un membre. Un membre sans résumé a zéro étoile, pas d'erreur. */
  async getMemberStars(memberId: string): Promise<MemberCharityStars> {
    const snap = await getDoc(doc(db, SUMMARY_COLLECTION, memberId))
    if (!snap.exists()) return computeCharityStars({ memberId })

    const data = snap.data()
    return computeCharityStars({
      memberId,
      starredEvents: data?.starredEvents,
      deductions: data?.starDeductions,
    })
  }

  /**
   * Soldes de plusieurs membres, pour les listes. Une seule requête par lot de
   * 30 identifiants au lieu d'une lecture par ligne affichée.
   */
  async getMemberStarsMany(memberIds: string[]): Promise<Map<string, MemberCharityStars>> {
    const result = new Map<string, MemberCharityStars>()
    const uniqueIds = Array.from(new Set(memberIds.filter(Boolean)))
    if (uniqueIds.length === 0) return result

    // Les membres sans document de résumé n'apparaissent pas dans la réponse :
    // on les initialise à zéro pour que l'appelant ait toujours une entrée.
    uniqueIds.forEach((id) => result.set(id, computeCharityStars({ memberId: id })))

    const batches = chunk(uniqueIds, IN_QUERY_CHUNK_SIZE)
    const snapshots = await Promise.all(
      batches.map((ids) =>
        getDocs(query(collection(db, SUMMARY_COLLECTION), where(documentId(), 'in', ids)))
      )
    )

    for (const snapshot of snapshots) {
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data()
        result.set(
          docSnap.id,
          computeCharityStars({
            memberId: docSnap.id,
            starredEvents: data?.starredEvents,
            deductions: data?.starDeductions,
          })
        )
      }
    }

    return result
  }

  /** Historique des retraits, du plus récent au plus ancien. */
  async listAdjustments(memberId: string): Promise<CharityStarAdjustment[]> {
    const ref = collection(db, SUMMARY_COLLECTION, memberId, ADJUSTMENTS_SUBCOLLECTION)
    const snapshot = await getDocs(query(ref, orderBy('createdAt', 'desc')))

    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data()
      return {
        id: docSnap.id,
        memberId,
        delta: Number(data?.delta ?? 0),
        reason: String(data?.reason ?? ''),
        createdAt: toDate(data?.createdAt),
        createdBy: String(data?.createdBy ?? ''),
        createdByName: data?.createdByName ?? undefined,
      }
    })
  }

  /**
   * Retranche une étoile : trace la décision puis enregistre sa date.
   *
   * Le registre est écrit en premier — si l'incrément échoue, il reste une trace
   * exploitable ; l'ordre inverse amputerait le solde sans motif consultable.
   */
  async deductStar(params: {
    memberId: string
    reason: string
    adminId: string
    adminName?: string
  }): Promise<void> {
    const reason = params.reason.trim()
    if (reason.length < 10) {
      throw new Error('Le motif du retrait doit contenir au moins 10 caractères')
    }

    const current = await this.getMemberStars(params.memberId)
    if (current.stars <= 0) {
      throw new Error('Ce membre n’a aucune étoile à retrancher')
    }

    await addDoc(collection(db, SUMMARY_COLLECTION, params.memberId, ADJUSTMENTS_SUBCOLLECTION), {
      delta: -1,
      reason,
      createdAt: serverTimestamp(),
      createdBy: params.adminId,
      ...(params.adminName ? { createdByName: params.adminName } : {}),
    })

    // Une date, pas un compteur : le retrait suit la même fenêtre de six ans
    // que l'étoile qu'il vise. `arrayUnion` évite d'écraser les retraits
    // concurrents d'un autre admin.
    await updateDoc(doc(db, SUMMARY_COLLECTION, params.memberId), {
      starDeductions: arrayUnion(Timestamp.fromDate(new Date())),
    })
  }
}
