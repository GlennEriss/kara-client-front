import * as admin from 'firebase-admin'
import { onCall } from 'firebase-functions/v2/https'

/**
 * Cloud Function pour régénérer un code de sécurité de manière atomique
 * 
 * Cette fonction effectue une transaction atomique pour :
 * 1. Récupérer la demande
 * 2. Vérifier que le statut est 'under_review'
 * 3. Générer un nouveau code de sécurité (6 chiffres)
 * 4. Calculer la nouvelle date d'expiration (48h)
 * 5. Invalider l'ancien code et mettre à jour avec le nouveau
 * 6. Réinitialiser securityCodeUsed = false
 * 
 * @returns { success: boolean, newCode: string, newExpiry: Date }
 */
export const renewSecurityCode = onCall(
  {
    memory: '256MiB',
    timeoutSeconds: 10,
    cors: true, // Permettre les appels depuis le client web
  },
  async (request) => {
    const { requestId, adminId } = request.data

    // Validation des paramètres
    if (!requestId || typeof requestId !== 'string') {
      throw new Error('requestId est requis et doit être une chaîne de caractères')
    }

    if (!adminId || typeof adminId !== 'string') {
      throw new Error('adminId est requis et doit être une chaîne de caractères')
    }

    const db = admin.firestore()
    const requestRef = db.collection('membership-requests').doc(requestId)

    // Générer un nouveau code de sécurité (6 chiffres, entre 100000 et 999999)
    const generateSecurityCode = (): string => {
      const min = 100000
      const max = 999999
      const code = Math.floor(Math.random() * (max - min + 1)) + min
      return code.toString()
    }

    // Calculer la date d'expiration (48h à partir de maintenant)
    const calculateCodeExpiry = (): Date => {
      const now = new Date()
      const expiry = new Date(now.getTime() + 48 * 60 * 60 * 1000) // 48 heures
      return expiry
    }

    // Transaction atomique pour régénérer le code
    return await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(requestRef)

      if (!doc.exists) {
        throw new Error('Demande introuvable')
      }

      const data = doc.data()!

      // Vérifier que la demande est en statut 'under_review'
      if (data.status !== 'under_review') {
        throw new Error(`La demande doit être en statut 'under_review' pour régénérer le code. Statut actuel: ${data.status}`)
      }

      // Générer le nouveau code et la nouvelle date d'expiration
      const newCode = generateSecurityCode()
      const newExpiry = calculateCodeExpiry()

      // Mettre à jour avec le nouveau code (invalide automatiquement l'ancien)
      transaction.update(requestRef, {
        securityCode: newCode,
        securityCodeExpiry: admin.firestore.Timestamp.fromDate(newExpiry),
        securityCodeUsed: false, // Réinitialiser l'état d'utilisation
        securityCodeVerifiedAt: admin.firestore.FieldValue.delete(), // Supprimer la vérification précédente
        processedBy: adminId, // Mettre à jour l'admin qui a régénéré le code
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })

      return {
        success: true,
        newCode,
        newExpiry: newExpiry.toISOString(),
      }
    })
  }
)
