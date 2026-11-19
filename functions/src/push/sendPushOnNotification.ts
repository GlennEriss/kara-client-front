/**
 * Push FCM web et Android/iOS déclenché à la création d'un document `notifications`.
 *
 * Toutes les notifications in-app des deux applications passent par cette
 * collection — ce déclencheur couvre donc automatiquement tous les flux :
 *  - `recipientId` renseigné  → push au MEMBRE concerné (matricule ou uid) ;
 *  - pas de `recipientId`     → push aux ADMINS.
 *
 * Les tokens sont stockés dans `fcmTokens/{token}` par les deux apps :
 * Web : { audience: 'admin' | 'member', memberIds?: string[], updatedAt }.
 * Natif : uid, platform, notificationScopes, muted et expiresAt sont vérifiés
 * par l'API authentifiée. Le contenu sensible reste dans l'application.
 * Les tokens expirés/invalides sont supprimés après chaque envoi.
 */

import * as admin from 'firebase-admin'
import {
  canDeliverPush,
  pushMessage,
  type PushNotificationData,
} from './push-delivery'

if (!admin.apps.length) {
  admin.initializeApp()
}

const db = admin.firestore()

const INVALID_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
])

export async function sendPushForNotification(
  notificationId: string,
  data: PushNotificationData,
): Promise<void> {
  const isMemberNotification =
    typeof data.recipientId === 'string' && data.recipientId.length > 0

  // Tokens destinataires.
  const tokensSnap = isMemberNotification
    ? await db
        .collection('fcmTokens')
        .where('memberIds', 'array-contains', data.recipientId)
        .get()
    : await db.collection('fcmTokens').where('audience', '==', 'admin').get()

  const devices = tokensSnap.docs.filter((d) => canDeliverPush(d.data(), data))
  const tokens = devices.map((d) => d.id)
  if (tokens.length === 0) {
    console.log(
      `[push] ${notificationId}: aucun token pour ${isMemberNotification ? `membre ${data.recipientId}` : 'les admins'}`,
    )
    return
  }

  const responses: admin.messaging.SendResponse[] = []
  let successCount = 0
  for (let offset = 0; offset < devices.length; offset += 500) {
    const response = await admin
      .messaging()
      .sendEach(
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
      deletions.push(db.collection('fcmTokens').doc(tokens[i]).delete())
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
