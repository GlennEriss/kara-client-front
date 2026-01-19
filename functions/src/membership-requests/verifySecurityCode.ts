import * as admin from 'firebase-admin'
import { onCall } from 'firebase-functions/v2/https'

/**
 * Cloud Function pour vérifier un code de sécurité de manière atomique
 * 
 * Cette fonction effectue une transaction atomique pour :
 * 1. Récupérer la demande
 * 2. Valider le format du code (6 chiffres)
 * 3. Vérifier que le code correspond
 * 4. Vérifier que le code n'est pas déjà utilisé
 * 5. Vérifier que le code n'est pas expiré
 * 6. Vérifier que le statut est 'under_review'
 * 7. Marquer comme vérifié (securityCodeVerifiedAt)
 * 
 * @returns { isValid: boolean, reason?: string, requestData?: any }
 */
export const verifySecurityCode = onCall(
  {
    memory: '256MiB',
    timeoutSeconds: 10,
    cors: true, // Permettre les appels depuis le client web
  },
  async (request) => {
    const { requestId, code } = request.data

    // Validation des paramètres
    if (!requestId || typeof requestId !== 'string') {
      throw new Error('requestId est requis et doit être une chaîne de caractères')
    }

    if (!code || typeof code !== 'string') {
      throw new Error('code est requis et doit être une chaîne de caractères')
    }

    // Valider le format du code (6 chiffres)
    if (!/^\d{6}$/.test(code)) {
      return { isValid: false, reason: 'FORMAT_INVALID' }
    }

    const db = admin.firestore()
    const requestRef = db.collection('membership-requests').doc(requestId)

    // Transaction atomique pour vérifier et marquer comme vérifié
    return await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(requestRef)

      if (!doc.exists) {
        return { isValid: false, reason: 'REQUEST_NOT_FOUND' }
      }

      const data = doc.data()!

      // Vérifier le statut d'abord (pour éviter de vérifier le code si le statut est incorrect)
      if (data.status !== 'under_review') {
        return { isValid: false, reason: 'INVALID_STATUS' }
      }

      // Vérifier si déjà utilisé
      if (data.securityCodeUsed === true) {
        return { isValid: false, reason: 'CODE_ALREADY_USED' }
      }

      // Vérifier l'expiration
      if (data.securityCodeExpiry) {
        const expiry = data.securityCodeExpiry.toDate ? data.securityCodeExpiry.toDate() : new Date(data.securityCodeExpiry)
        const now = Date.now()
        if (expiry.getTime() <= now) {
          return { isValid: false, reason: 'CODE_EXPIRED' }
        }
      } else {
        // Pas de date d'expiration = code invalide
        return { isValid: false, reason: 'CODE_EXPIRED' }
      }

      // Vérifier que le code existe
      if (!data.securityCode || typeof data.securityCode !== 'string') {
        return { isValid: false, reason: 'CODE_INCORRECT' }
      }

      // Vérifier le code (comparaison stricte)
      if (data.securityCode !== code) {
        return { isValid: false, reason: 'CODE_INCORRECT' }
      }

      // Code valide - marquer comme vérifié (mais pas encore utilisé)
      // L'utilisation se fera lors de la soumission des corrections
      transaction.update(requestRef, {
        securityCodeVerifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })

      return {
        isValid: true,
        requestData: {
          reviewNote: data.reviewNote,
          // Retourner les données nécessaires pour pré-remplir le formulaire (optionnel)
        },
      }
    })
  }
)
