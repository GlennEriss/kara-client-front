import * as admin from 'firebase-admin'

// Initialiser Firebase Admin si pas déjà fait
if (!admin.apps.length) {
  admin.initializeApp()
}

const db = admin.firestore()

/**
 * Traite les notifications programmées qui doivent être envoyées
 */
export async function processScheduledNotifications(): Promise<void> {
  console.log('Démarrage du traitement des notifications programmées')

  const now = new Date()
  const notificationsRef = db.collection('notifications')

  // Récupérer les notifications programmées qui doivent être envoyées
  // (scheduledAt <= now et sentAt == null)
  const snapshot = await notificationsRef
    .where('scheduledAt', '<=', admin.firestore.Timestamp.fromDate(now))
    .where('sentAt', '==', null)
    .get()

  console.log(`Nombre de notifications programmées à traiter : ${snapshot.size}`)

  let processedCount = 0
  let errorCount = 0

  for (const doc of snapshot.docs) {
    try {
      // Marquer la notification comme envoyée
      await doc.ref.update({
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
      })

      processedCount++
      console.log(`Notification ${doc.id} marquée comme envoyée`)
    } catch (error) {
      errorCount++
      console.error(`Erreur lors du traitement de la notification ${doc.id}:`, error)
    }
  }

  console.log(`Traitement terminé : ${processedCount} traitées, ${errorCount} erreurs`)
}

