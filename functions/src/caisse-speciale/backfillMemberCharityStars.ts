/**
 * Cloud Function callable : reconstitution des étoiles de charité existantes.
 *
 * `syncMemberCharitySummary` ne se déclenche qu'à l'écriture d'une contribution.
 * Les donations antérieures à la mise en place des étoiles n'ont donc jamais
 * produit de `starredEvents` : sans ce rattrapage, tous les membres affichent
 * zéro étoile alors que leurs dons sont bien en base.
 *
 * Réutilise `recalculateAndWriteSummary`, la même fonction que le déclencheur :
 * une seule implémentation, aucun risque que le rattrapage et le temps réel
 * divergent.
 *
 * Idempotente : relancer ne fait que réécrire les mêmes valeurs. Les retraits
 * admin (`starDeductions`) sont préservés, l'écriture se faisant en `merge`.
 */

import * as admin from 'firebase-admin'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { recalculateAndWriteSummary } from './syncMemberCharitySummary'

if (admin.apps.length === 0) {
  admin.initializeApp()
}

const db = admin.firestore()

/** Membres traités par appel. Au-delà, l'appelant relance avec le curseur rendu. */
const DEFAULT_BATCH_SIZE = 200

/** Recalculs menés de front. Chacun fait plusieurs lectures Firestore. */
const CONCURRENCY = 10

async function mapWithConcurrency<T>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<void>
): Promise<{ processed: number; failed: string[] }> {
  const failed: string[] = []
  let processed = 0
  let cursor = 0

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++
      const item = items[index]
      try {
        await task(item)
        processed++
      } catch (error) {
        console.error('[backfillStars] échec pour', item, error)
        failed.push(String(item))
      }
    }
  })

  await Promise.all(workers)
  return { processed, failed }
}

export const backfillMemberCharityStars = onCall(
  {
    memory: '512MiB',
    timeoutSeconds: 540,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentification requise')
    }
    const role = (request.auth.token as { role?: string })?.role
    if (!role || !['Admin', 'SuperAdmin', 'Secretary', 'Administrateur'].includes(role)) {
      throw new HttpsError('permission-denied', 'Réservé aux administrateurs')
    }

    const batchSize = Number((request.data as { batchSize?: number })?.batchSize) || DEFAULT_BATCH_SIZE
    // Reprise : identifiant du dernier membre traité lors de l'appel précédent.
    const startAfterMemberId = (request.data as { startAfterMemberId?: string })?.startAfterMemberId
    const dryRun = Boolean((request.data as { dryRun?: boolean })?.dryRun)

    // Les membres concernés sont ceux qui figurent comme participants d'au moins
    // une œuvre. Inutile de parcourir toute la base des membres.
    const participantsSnap = await db
      .collectionGroup('participants')
      .where('participantType', '==', 'member')
      .get()

    const memberIds = Array.from(
      new Set(
        participantsSnap.docs
          .map((doc) => doc.data()?.memberId)
          .filter((id): id is string => typeof id === 'string' && id.length > 0)
      )
    ).sort()

    // Tri stable + curseur : la reprise ne saute et ne redouble aucun membre.
    const startIndex = startAfterMemberId
      ? memberIds.findIndex((id) => id > startAfterMemberId)
      : 0
    const pending = startIndex < 0 ? [] : memberIds.slice(startIndex)
    const batch = pending.slice(0, batchSize)

    if (dryRun) {
      return {
        dryRun: true,
        totalMembers: memberIds.length,
        remaining: pending.length,
        wouldProcess: batch.length,
      }
    }

    const { processed, failed } = await mapWithConcurrency(batch, CONCURRENCY, (memberId) =>
      recalculateAndWriteSummary(memberId)
    )

    const lastProcessed = batch[batch.length - 1]
    const remaining = pending.length - batch.length

    console.log(
      `[backfillStars] ${processed}/${batch.length} membres recalculés, ${remaining} restants`
    )

    return {
      totalMembers: memberIds.length,
      processed,
      failed,
      remaining,
      // À repasser tel quel au prochain appel tant que `done` est faux.
      nextCursor: remaining > 0 ? lastProcessed ?? null : null,
      done: remaining === 0,
    }
  }
)
