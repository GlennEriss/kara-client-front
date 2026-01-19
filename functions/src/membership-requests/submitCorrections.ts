import * as admin from 'firebase-admin'
import { onCall } from 'firebase-functions/v2/https'

/**
 * Cloud Function pour soumettre les corrections de manière atomique
 * 
 * Cette fonction effectue une transaction atomique pour :
 * 1. Récupérer la demande
 * 2. Re-valider le securityCode (non utilisé, non expiré)
 * 3. Fusionner formData avec les données existantes
 * 4. Mettre à jour status à 'pending'
 * 5. Marquer securityCodeUsed = true
 * 6. Nettoyer reviewNote, securityCode, securityCodeExpiry
 * 7. Créer notification NOTIF-CORR-002 (Corrections soumises)
 * 
 * @returns { success: boolean }
 */
export const submitCorrections = onCall(
  {
    memory: '512MiB',
    timeoutSeconds: 30,
    cors: true, // Permettre les appels depuis le client web
  },
  async (request) => {
    const { requestId, securityCode, formData } = request.data

    // Validation des paramètres
    if (!requestId || typeof requestId !== 'string') {
      throw new Error('requestId est requis et doit être une chaîne de caractères')
    }

    if (!securityCode || typeof securityCode !== 'string') {
      throw new Error('securityCode est requis et doit être une chaîne de caractères')
    }

    if (!formData || typeof formData !== 'object') {
      throw new Error('formData est requis et doit être un objet')
    }

    const db = admin.firestore()
    const requestRef = db.collection('membership-requests').doc(requestId)

    // Transaction atomique pour vérifier, marquer comme utilisé et mettre à jour
    return await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(requestRef)

      if (!doc.exists) {
        throw new Error('Demande introuvable')
      }

      const data = doc.data()!

      // Vérifications de sécurité
      if (data.status !== 'under_review') {
        throw new Error('La demande n\'est pas en cours de correction')
      }

      if (data.securityCode !== securityCode) {
        throw new Error('Code de sécurité incorrect')
      }

      if (data.securityCodeUsed === true) {
        throw new Error('Code de sécurité déjà utilisé')
      }

      // Vérifier l'expiration
      if (data.securityCodeExpiry) {
        const expiry = data.securityCodeExpiry.toDate ? data.securityCodeExpiry.toDate() : new Date(data.securityCodeExpiry)
        if (expiry.getTime() <= Date.now()) {
          throw new Error('Code de sécurité expiré')
        }
      } else {
        // Pas de date d'expiration = code invalide
        throw new Error('Code de sécurité expiré')
      }

      // Préparer les données pour la mise à jour
      // Fusionner formData avec les données existantes (garder les champs non modifiés)
      
      // Gérer les photos : si c'est une URL Firebase Storage, préserver photoURL/photoPath
      // Si c'est une data URL, elle sera uploadée côté client avant l'appel
      const identityPhoto = formData.identity?.photo
      const identityUpdate: any = {
        ...data.identity,
        ...formData.identity,
      }
      
      // Si la photo est une URL Firebase Storage, préserver les URLs/chemins existants
      if (identityPhoto && typeof identityPhoto === 'string' && (identityPhoto.startsWith('http://') || identityPhoto.startsWith('https://'))) {
        // C'est une URL Firebase Storage, préserver les métadonnées existantes
        // Ne pas écraser photoURL et photoPath si elles existent déjà
        if (data.identity?.photoURL) {
          identityUpdate.photoURL = data.identity.photoURL
        }
        if (data.identity?.photoPath) {
          identityUpdate.photoPath = data.identity.photoPath
        }
        // Ne pas stocker l'URL dans le champ photo (garder seulement photoURL)
        delete identityUpdate.photo
      } else if (identityPhoto && typeof identityPhoto === 'string' && identityPhoto.startsWith('data:image/')) {
        // C'est une data URL (nouvelle photo), elle sera uploadée côté client
        // Ne pas stocker la data URL dans Firestore (trop volumineux)
        // Le client doit uploader avant d'appeler cette fonction
        delete identityUpdate.photo
      }
      
      // Même logique pour les documents
      const documentsUpdate: any = {
        ...data.documents,
        ...formData.documents,
      }
      
      // Photo recto
      if (formData.documents?.documentPhotoFront && typeof formData.documents.documentPhotoFront === 'string') {
        if (formData.documents.documentPhotoFront.startsWith('http://') || formData.documents.documentPhotoFront.startsWith('https://')) {
          // URL Firebase Storage, préserver les métadonnées
          if (data.documents?.documentPhotoFrontURL) {
            documentsUpdate.documentPhotoFrontURL = data.documents.documentPhotoFrontURL
          }
          if (data.documents?.documentPhotoFrontPath) {
            documentsUpdate.documentPhotoFrontPath = data.documents.documentPhotoFrontPath
          }
          delete documentsUpdate.documentPhotoFront
        } else if (formData.documents.documentPhotoFront.startsWith('data:image/')) {
          // Data URL, sera uploadée côté client
          delete documentsUpdate.documentPhotoFront
        }
      }
      
      // Photo verso
      if (formData.documents?.documentPhotoBack && typeof formData.documents.documentPhotoBack === 'string') {
        if (formData.documents.documentPhotoBack.startsWith('http://') || formData.documents.documentPhotoBack.startsWith('https://')) {
          // URL Firebase Storage, préserver les métadonnées
          if (data.documents?.documentPhotoBackURL) {
            documentsUpdate.documentPhotoBackURL = data.documents.documentPhotoBackURL
          }
          if (data.documents?.documentPhotoBackPath) {
            documentsUpdate.documentPhotoBackPath = data.documents.documentPhotoBackPath
          }
          delete documentsUpdate.documentPhotoBack
        } else if (formData.documents.documentPhotoBack.startsWith('data:image/')) {
          // Data URL, sera uploadée côté client
          delete documentsUpdate.documentPhotoBack
        }
      }
      
      const updatedData: any = {
        // Mettre à jour les champs du formulaire
        identity: identityUpdate,
        address: {
          ...data.address,
          ...formData.address,
        },
        company: {
          ...data.company,
          ...formData.company,
        },
        documents: documentsUpdate,
        // Mettre à jour le statut
        status: 'pending',
        // Marquer le code comme utilisé
        securityCodeUsed: true,
        // Nettoyer les champs de correction
        securityCode: admin.firestore.FieldValue.delete(),
        securityCodeExpiry: admin.firestore.FieldValue.delete(),
        reviewNote: admin.firestore.FieldValue.delete(),
        securityCodeVerifiedAt: admin.firestore.FieldValue.delete(),
        // Timestamp de mise à jour
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }

      // Mise à jour atomique
      transaction.update(requestRef, updatedData)

      // Préparer les données pour la notification (hors transaction)
      // Utiliser formData pour obtenir le nom (les données mises à jour)
      const memberName = `${formData.identity?.firstName || data.identity?.firstName || ''} ${formData.identity?.lastName || data.identity?.lastName || ''}`.trim() || 'Demandeur inconnu'
      const processedBy = data.processedBy || ''

      return { success: true, memberName, processedBy }
    }).then(async (result) => {
      // Après la transaction (hors transaction pour éviter les timeouts)
      // Créer notification NOTIF-CORR-002 (Corrections soumises) - Tous les admins
      try {
        const notificationsRef = db.collection('notifications')
        const notificationData = {
          module: 'memberships',
          entityId: requestId,
          type: 'corrections_submitted',
          title: 'Corrections soumises',
          message: `${result.memberName} a soumis ses corrections pour la demande. Elle est de nouveau en attente de validation.`,
          isRead: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          metadata: {
            requestId,
            memberName: result.memberName,
            submittedAt: new Date().toISOString(),
            wasExpired: false, // Le code était valide puisqu'on arrive ici
            previousAdminId: result.processedBy,
          },
        }
        await notificationsRef.add(notificationData)
        console.log(`[submitCorrections] Notification créée pour requestId: ${requestId}`)
      } catch (error) {
        // Ne pas bloquer la soumission si la notification échoue
        console.error(`[submitCorrections] Erreur lors de la création de la notification:`, error)
      }

      return { success: true }
    })
  }
)
