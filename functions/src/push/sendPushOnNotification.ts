/**
 * Push FCM web et Android/iOS déclenché à la création d'un document `notifications`.
 *
 * Toutes les notifications in-app des deux applications passent par cette
 * collection — ce déclencheur couvre donc automatiquement tous les flux :
 *  - `recipientId` renseigné  → push au MEMBRE concerné (matricule ou uid) ;
 *  - pas de `recipientId`     → push aux ADMINS.
 *
 * Les tokens web et admin natifs sont stockés dans `fcmTokens/{token}` :
 * Web : { audience: 'admin' | 'member', memberIds?: string[], updatedAt }.
 * Les appareils membres natifs sont dans `memberMobileDevices/{token}`.
 * Natif : uid, platform, notificationScopes, muted et expiresAt sont vérifiés
 * par l'API authentifiée. Le contenu sensible reste dans l'application.
 * Les tokens expirés/invalides sont supprimés après chaque envoi.
 */

import * as admin from 'firebase-admin'
import { deliverPushForNotification } from './deliver-notification'
import type { PushNotificationData } from './push-delivery'
if (!admin.apps.length) admin.initializeApp()
const db = admin.firestore()
export async function sendPushForNotification(
  notificationId: string,
  data: PushNotificationData,
): Promise<void> {
  await deliverPushForNotification(db, admin.messaging(), notificationId, data)
}
