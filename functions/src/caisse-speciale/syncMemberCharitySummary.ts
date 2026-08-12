/**
 * Cloud Function : met à jour le cache member-charity-summary à chaque création / modification / suppression
 * d'une contribution (charity-events/{eventId}/contributions).
 * Voir documentation/caisse-speciale/V2/check-charity-contrib/function/README.md
 */

import * as admin from 'firebase-admin'
import { onDocumentWritten } from 'firebase-functions/v2/firestore'

if (admin.apps.length === 0) {
  admin.initializeApp()
}

const db = admin.firestore()
const COLLECTION_SUMMARY = 'member-charity-summary'

function toDate(val: unknown): Date | null {
  if (val == null) return null
  if (val instanceof Date) return val
  
  // Gérer les objets avec seconds/nanoseconds (format sérialisé des Timestamps dans Cloud Functions v2)
  const ts = val as { seconds?: number; nanoseconds?: number; _seconds?: number; _nanoseconds?: number }
  if (typeof ts.seconds === 'number') {
    return new Date(ts.seconds * 1000 + Math.floor((ts.nanoseconds || 0) / 1000000))
  }
  if (typeof ts._seconds === 'number') {
    return new Date(ts._seconds * 1000 + Math.floor((ts._nanoseconds || 0) / 1000000))
  }
  
  // Gérer les Timestamps Firestore avec méthode toDate()
  const t = val as { toDate?: () => Date }
  if (typeof t.toDate === 'function') return t.toDate()
  
  try {
    const d = new Date(val as number)
    return isNaN(d.getTime()) ? null : d
  } catch {
    return null
  }
}

/**
 * Une contribution ouvre droit à une étoile si elle est confirmée. Les documents
 * antérieurs à l'introduction du statut n'en portent pas : ils sont comptés,
 * puisque le formulaire a toujours créé les contributions en `confirmed`. Seuls
 * `pending` et `canceled` sont écartés.
 */
function countsTowardStars(data: admin.firestore.DocumentData | undefined): boolean {
  if (!data) return false
  const status = data.status
  return status == null || status === 'confirmed'
}

async function getMemberIdFromParticipant(eventId: string, participantId: string): Promise<string | null> {
  const ref = db.collection('charity-events').doc(eventId).collection('participants').doc(participantId)
  const snap = await ref.get()
  if (!snap.exists) return null
  const data = snap.data()!
  if (data.participantType !== 'member' || !data.memberId) return null
  return data.memberId
}

/**
 * Recalcule le résumé à partir des documents de contributions (source de vérité),
 * pas depuis le document participant, pour éviter une condition de concurrence :
 * le frontend met à jour le participant après avoir créé la contribution.
 * Si triggerContribution est fourni, il est utilisé en secours si les requêtes
 * ne retournent rien (index en cours, etc.).
 */
async function recalculateAndWriteSummary(
  memberId: string,
  triggerContribution?: { eventId: string; participantId: string; data: admin.firestore.DocumentData }
): Promise<void> {
  const withContributions: Array<{
    eventId: string
    lastContributionAt: Date
    /** Premier don confirmé à cette œuvre : c'est là que l'étoile est acquise. */
    firstContributionAt: Date
    lastAmount: number | null
  }> = []

  // Secours : inclure la contribution qui a déclenché la fonction (évite les summary vides si index manquant / en cours)
  if (triggerContribution && countsTowardStars(triggerContribution.data)) {
    const d = triggerContribution.data
    const effectiveAt = toDate(d.contributionDate) ?? toDate(d.createdAt)
    if (effectiveAt) {
      let amount: number | null = null
      if (d.payment?.amount != null) amount = Number(d.payment.amount)
      else if (d.estimatedValue != null) amount = Number(d.estimatedValue)
      withContributions.push({
        eventId: triggerContribution.eventId,
        lastContributionAt: effectiveAt,
        firstContributionAt: effectiveAt,
        lastAmount: amount,
      })
    }
  }

  const participantsSnap = await db
    .collectionGroup('participants')
    .where('memberId', '==', memberId)
    .where('participantType', '==', 'member')
    .get()

  for (const participantDoc of participantsSnap.docs) {
    const eventId = participantDoc.ref.parent.parent?.id
    if (!eventId) continue
    const participantId = participantDoc.id

    // Pas de `limit(1)` ni de filtre sur `status` dans la requête : le tri se
    // fait déjà sur `createdAt` avec l'index existant, et écarter les statuts en
    // mémoire évite d'exiger un nouvel index composite. Une contribution annulée
    // ne doit pas masquer une contribution confirmée plus ancienne.
    const contributionsRef = db
      .collection('charity-events')
      .doc(eventId)
      .collection('contributions')
      .where('participantId', '==', participantId)
      .orderBy('createdAt', 'desc')
    const contribSnap = await contributionsRef.get()
    if (contribSnap.empty) continue

    // Les documents sont triés du plus récent au plus ancien : le premier
    // confirmé donne la dernière contribution, le dernier donne la première.
    const confirmedDocs = contribSnap.docs.filter((d) => countsTowardStars(d.data()))
    if (confirmedDocs.length === 0) continue

    const contribData = confirmedDocs[0].data()
    // Date de référence : contributionDate si présent, sinon createdAt (cf. doc)
    const effectiveContributionAt = toDate(contribData.contributionDate) ?? toDate(contribData.createdAt)
    if (!effectiveContributionAt) continue

    // L'étoile est acquise au premier don à cette œuvre, et expire six ans
    // après cette date : c'est elle qu'il faut persister, pas la plus récente.
    const oldestData = confirmedDocs[confirmedDocs.length - 1].data()
    const firstContributionAt =
      toDate(oldestData.contributionDate) ?? toDate(oldestData.createdAt) ?? effectiveContributionAt

    let lastAmount: number | null = null
    if (contribData.payment?.amount != null) lastAmount = Number(contribData.payment.amount)
    else if (contribData.estimatedValue != null) lastAmount = Number(contribData.estimatedValue)

    withContributions.push({
      eventId,
      lastContributionAt: effectiveContributionAt,
      firstContributionAt,
      lastAmount,
    })
  }

  const now = admin.firestore.Timestamp.now()
  const summaryRef = db.collection(COLLECTION_SUMMARY).doc(memberId)

  // Une œuvre = une étoile, acquise au premier don confirmé et valable six ans.
  // On persiste la liste **datée** plutôt qu'un compteur : une étoile expire un
  // jour où cette fonction ne tourne pas, un total figé deviendrait faux tout
  // seul. Le solde est donc recalculé à chaque lecture, côté client.
  // Le secours ci-dessus peut réintroduire un événement déjà parcouru : on
  // garde la date d'acquisition la plus ancienne pour chaque œuvre.
  const earnedAtByEvent = new Map<string, Date>()
  for (const contribution of withContributions) {
    const known = earnedAtByEvent.get(contribution.eventId)
    if (!known || contribution.firstContributionAt.getTime() < known.getTime()) {
      earnedAtByEvent.set(contribution.eventId, contribution.firstContributionAt)
    }
  }
  const starredEvents = Array.from(earnedAtByEvent.entries())
    .sort((a, b) => a[1].getTime() - b[1].getTime())
    .map(([eventId, earnedAt]) => ({
      eventId,
      earnedAt: admin.firestore.Timestamp.fromDate(earnedAt),
    }))

  // `merge` obligatoire : `starDeductions` appartient à l'admin, pas à cette
  // fonction. Un `set()` complet effacerait ses retraits au prochain don.
  if (withContributions.length === 0) {
    await summaryRef.set(
      {
        eligible: false,
        lastContributionAt: null,
        lastEventId: null,
        lastEventName: null,
        lastAmount: null,
        starredEvents: [],
        updatedAt: now,
      },
      { merge: true }
    )
    return
  }

  withContributions.sort((a, b) => b.lastContributionAt.getTime() - a.lastContributionAt.getTime())
  const best = withContributions[0]

  let lastEventName: string | null = null
  try {
    const eventSnap = await db.collection('charity-events').doc(best.eventId).get()
    if (eventSnap.exists) {
      // Le modèle CharityEvent utilise "title" (pas "name")
      lastEventName = eventSnap.data()?.title ?? null
    }
  } catch {
    // event supprimé ou inaccessible
  }

  await summaryRef.set(
    {
      eligible: true,
      lastContributionAt: admin.firestore.Timestamp.fromDate(best.lastContributionAt),
      lastEventId: best.eventId,
      lastEventName,
      lastAmount: best.lastAmount,
      starredEvents,
      updatedAt: now,
    },
    { merge: true }
  )
}

export const syncMemberCharitySummary = onDocumentWritten(
  {
    document: 'charity-events/{eventId}/contributions/{contributionId}',
    memory: '256MiB',
    timeoutSeconds: 60,
  },
  async (event) => {
    const eventId = event.params.eventId as string
    const before = event.data?.before?.exists ? event.data.before.data() : undefined
    const after = event.data?.after?.exists ? event.data.after.data() : undefined

    const memberIdsToUpdate = new Map<string, { eventId: string; participantId: string; data: admin.firestore.DocumentData } | undefined>()

    if (after?.participantId) {
      const memberId = await getMemberIdFromParticipant(eventId, after.participantId)
      if (memberId) {
        memberIdsToUpdate.set(memberId, { eventId, participantId: after.participantId, data: after })
      }
    }
    if (before?.participantId && before.participantId !== after?.participantId) {
      const memberId = await getMemberIdFromParticipant(eventId, before.participantId)
      if (memberId && !memberIdsToUpdate.has(memberId)) {
        memberIdsToUpdate.set(memberId, undefined)
      }
    }

    for (const [memberId, trigger] of memberIdsToUpdate) {
      await recalculateAndWriteSummary(memberId, trigger)
    }
  }
)
