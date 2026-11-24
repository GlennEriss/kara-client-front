import type { Firestore } from 'firebase-admin/firestore'
import type { Messaging, SendResponse } from 'firebase-admin/messaging'
import {
  canDeliverPush,
  pushMessage,
  type PushNotificationData,
} from './push-delivery'

const INVALID_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
])

export async function deliverPushForNotification(
  db: Firestore,
  messaging: Pick<Messaging, 'sendEach'>,
  notificationId: string,
  data: PushNotificationData,
): Promise<void> {
  const isMemberNotification =
    typeof data.recipientId === 'string' && data.recipientId.length > 0

  if (isMemberNotification && (
    data.module === 'placement' || data.type?.startsWith('placement_') ||
    (data.metadata && typeof data.metadata === 'object' && 'placementId' in data.metadata)
  )) return

  // Tokens destinataires.
  const tokensSnap = isMemberNotification
    ? await db
        .collection('fcmTokens')
        .where('memberIds', 'array-contains', data.recipientId)
        .get()
    : await db.collection('fcmTokens').where('audience', '==', 'admin').get()

  // Les appareils membres natifs sont enregistrés par l'API dans une collection
  // sans accès client. Le query destinataire reste limité au membre concerné.
  const nativeMembers = isMemberNotification
    ? await db
        .collection('memberMobileDevices')
        .where('memberIds', 'array-contains', data.recipientId)
        .get()
    : null
  const byToken = new Map(
    [...tokensSnap.docs, ...(nativeMembers?.docs || [])].map((d) => [d.id, d]),
  )
  const devices = [...byToken.values()].filter((d) =>
    canDeliverPush(d.data(), data),
  )
  const tokens = devices.map((d) => d.id)
  if (tokens.length === 0) {
    console.log(
      `[push] ${notificationId}: aucun token pour ${isMemberNotification ? `membre ${data.recipientId}` : 'les admins'}`,
    )
    return
  }

  const responses: SendResponse[] = []
  let successCount = 0
  for (let offset = 0; offset < devices.length; offset += 500) {
    const response = await messaging.sendEach(
      devices
        .slice(offset, offset + 500)
        .map((d) => pushMessage(d.id, d.data(), notificationId, data)),
    )
    successCount += response.successCount
    responses.push(...response.responses)
  }

  // Nettoyage des tokens morts (désinstallation, permission révoquée…).
  const deletions: Promise<unknown>[] = []
  responses.forEach((r, i) => {
    if (!r.success && INVALID_TOKEN_CODES.has(r.error?.code ?? '')) {
      deletions.push(devices[i].ref.delete())
    }
  })
  await Promise.all(deletions)

  console.log(
    `[push] ${notificationId}: ${successCount}/${tokens.length} envoyés` +
      (deletions.length
        ? `, ${deletions.length} token(s) invalide(s) supprimé(s)`
        : ''),
  )
}
