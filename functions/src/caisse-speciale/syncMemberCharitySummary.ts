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
    lastAmount: number | null
  }> = []

  // Secours : inclure la contribution qui a déclenché la fonction (évite les summary vides si index manquant / en cours)
  if (triggerContribution) {
    const d = triggerContribution.data
    const effectiveAt = toDate(d.contributionDate) ?? toDate(d.createdAt)
    if (effectiveAt) {
      let amount: number | null = null
      if (d.payment?.amount != null) amount = Number(d.payment.amount)
      else if (d.estimatedValue != null) amount = Number(d.estimatedValue)
      withContributions.push({
        eventId: triggerContribution.eventId,
        lastContributionAt: effectiveAt,
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

    const contributionsRef = db
      .collection('charity-events')
      .doc(eventId)
      .collection('contributions')
      .where('participantId', '==', participantId)
      .orderBy('createdAt', 'desc')
      .limit(1)
    const contribSnap = await contributionsRef.get()
    if (contribSnap.empty) continue

    const contribDoc = contribSnap.docs[0]
    const contribData = contribDoc.data()
    // Date de référence : contributionDate si présent, sinon createdAt (cf. doc)
    const effectiveContributionAt = toDate(contribData.contributionDate) ?? toDate(contribData.createdAt)
    if (!effectiveContributionAt) continue

    let lastAmount: number | null = null
    if (contribData.payment?.amount != null) lastAmount = Number(contribData.payment.amount)
    else if (contribData.estimatedValue != null) lastAmount = Number(contribData.estimatedValue)

    withContributions.push({ eventId, lastContributionAt: effectiveContributionAt, lastAmount })
  }

  const now = admin.firestore.Timestamp.now()
  const summaryRef = db.collection(COLLECTION_SUMMARY).doc(memberId)

  if (withContributions.length === 0) {
    await summaryRef.set({
      eligible: false,
      lastContributionAt: null,
      lastEventId: null,
      lastEventName: null,
      lastAmount: null,
      updatedAt: now,
    })
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

  await summaryRef.set({
    eligible: true,
    lastContributionAt: admin.firestore.Timestamp.fromDate(best.lastContributionAt),
    lastEventId: best.eventId,
    lastEventName,
    lastAmount: best.lastAmount,
    updatedAt: now,
  })
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
