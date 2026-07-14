/**
 * Push web (FCM) déclenché à la création d'un document `notifications`.
 *
 * Toutes les notifications in-app des deux applications passent par cette
 * collection — ce déclencheur couvre donc automatiquement tous les flux :
 *  - `recipientId` renseigné  → push au MEMBRE concerné (matricule ou uid) ;
 *  - pas de `recipientId`     → push aux ADMINS.
 *
 * Les tokens sont stockés dans `fcmTokens/{token}` par les deux apps :
 *  { audience: 'admin' | 'member', memberIds?: string[], updatedAt }
 * Les tokens expirés/invalides sont supprimés après chaque envoi.
 */

import * as admin from 'firebase-admin'

if (!admin.apps.length) {
  admin.initializeApp()
}

const db = admin.firestore()

const INVALID_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
])

interface NotificationDoc {
  title?: string
  message?: string
  module?: string
  entityId?: string
  recipientId?: unknown
}

export async function sendPushForNotification(
  notificationId: string,
  data: NotificationDoc,
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

  const tokens = tokensSnap.docs.map((d) => d.id)
  if (tokens.length === 0) {
    console.log(
      `[push] ${notificationId}: aucun token pour ${isMemberNotification ? `membre ${data.recipientId}` : 'les admins'}`,
    )
    return
  }

  const response = await admin.messaging().sendEachForMulticast({
    tokens,
    notification: {
      title: data.title || 'KARA',
      body: data.message || '',
    },
    data: {
      notificationId,
      module: String(data.module ?? ''),
      entityId: String(data.entityId ?? ''),
      audience: isMemberNotification ? 'member' : 'admin',
    },
    webpush: {
      notification: {
        icon: '/icon-192.png',
        badge: '/icon-192.png',
      },
      fcmOptions: {
        // Ouvre l'app sur la page des notifications au clic.
        link: '/notifications',
      },
    },
  })

  // Nettoyage des tokens morts (désinstallation, permission révoquée…).
  const deletions: Promise<unknown>[] = []
  response.responses.forEach((r, i) => {
    if (!r.success && INVALID_TOKEN_CODES.has(r.error?.code ?? '')) {
      deletions.push(db.collection('fcmTokens').doc(tokens[i]).delete())
    }
  })
  await Promise.all(deletions)

  console.log(
    `[push] ${notificationId}: ${response.successCount}/${tokens.length} envoyés` +
      (deletions.length ? `, ${deletions.length} token(s) invalide(s) supprimé(s)` : ''),
  )
}
