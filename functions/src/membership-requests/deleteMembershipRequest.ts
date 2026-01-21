/**
 * Cloud Function pour supprimer définitivement une demande d'adhésion rejetée
 * 
 * Cette fonction effectue une suppression complète et sécurisée :
 * 1. Validation permissions admin
 * 2. Validation statut = 'rejected'
 * 3. Validation matricule (double confirmation de sécurité)
 * 4. Création log d'audit AVANT suppression
 * 5. Suppression fichiers Storage (photos, pièces d'identité)
 * 6. Suppression document Firestore
 * 7. Création notification (optionnel)
 * 
 * @returns { success: true, requestId: string, filesDeleted: number, deletedAt: string }
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'

export const deleteMembershipRequest = onCall(
  {
    memory: '512MiB',
    timeoutSeconds: 60,
    cors: true,
  },
  async (request) => {
    const { requestId, confirmedMatricule } = request.data

    // ==================== VALIDATION DES PARAMÈTRES ====================
    if (!requestId || typeof requestId !== 'string') {
      throw new HttpsError('invalid-argument', 'requestId est requis et doit être une chaîne de caractères')
    }

    if (!confirmedMatricule || typeof confirmedMatricule !== 'string') {
      throw new HttpsError('invalid-argument', 'confirmedMatricule est requis et doit être une chaîne de caractères')
    }

    // ==================== VALIDATION DES PERMISSIONS ====================
    // Vérifier que l'utilisateur est authentifié
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Utilisateur non authentifié')
    }

    // Vérifier que l'utilisateur est admin
    const userRole = (request.auth.token as any).role
    if (!userRole || !['Admin', 'SuperAdmin', 'Secretary'].includes(userRole)) {
      throw new HttpsError(
        'permission-denied',
        'Permissions insuffisantes. Seuls les administrateurs peuvent supprimer des demandes.'
      )
    }

    console.log(`[deleteMembershipRequest] Début suppression: ${requestId}`)
    console.log(`[deleteMembershipRequest] Supprimé par: ${request.auth.uid}`)

    const db = getFirestore()
    const storage = getStorage()
    const bucket = storage.bucket()

    // ==================== RÉCUPÉRATION DE LA DEMANDE ====================
    const membershipRequestRef = db.collection('membership-requests').doc(requestId)
    const membershipRequestDoc = await membershipRequestRef.get()

    if (!membershipRequestDoc.exists) {
      throw new HttpsError('not-found', `Demande d'adhésion ${requestId} introuvable`)
    }

    const membershipRequest = membershipRequestDoc.data()!

    console.log(`[deleteMembershipRequest] Matricule: ${membershipRequest.matricule}`)
    console.log(
      `[deleteMembershipRequest] Nom: ${membershipRequest.identity?.firstName} ${membershipRequest.identity?.lastName}`
    )

    // ==================== VALIDATION DU STATUT ====================
    if (membershipRequest.status !== 'rejected') {
      throw new HttpsError(
        'failed-precondition',
        `Seules les demandes rejetées peuvent être supprimées. Statut actuel: ${membershipRequest.status}`
      )
    }

    // ==================== VALIDATION DU MATRICULE ====================
    // Vérifier que le matricule confirmé correspond au matricule du dossier
    if (confirmedMatricule !== membershipRequest.matricule) {
      throw new HttpsError(
        'permission-denied',
        'Le matricule confirmé ne correspond pas au matricule du dossier. Suppression annulée pour des raisons de sécurité.'
      )
    }

    // ==================== LOGGING D'AUDIT AVANT SUPPRESSION ====================
    const auditLog = {
      action: 'membership_request_deleted',
      requestId,
      matricule: membershipRequest.matricule,
      memberName: `${membershipRequest.identity?.firstName || ''} ${membershipRequest.identity?.lastName || ''}`.trim(),
      deletedBy: request.auth.uid,
      deletedByName: (request.auth.token as any).name || 'Admin',
      deletedAt: FieldValue.serverTimestamp(),
      reason: 'Suppression définitive d\'une demande rejetée',
      metadata: {
        status: membershipRequest.status,
        motifReject: membershipRequest.motifReject,
        processedAt: membershipRequest.processedAt,
        processedBy: membershipRequest.processedBy,
        createdAt: membershipRequest.createdAt,
        // Ne pas sauvegarder toutes les données personnelles pour respecter RGPD
        // Seulement les données nécessaires pour audit
      },
    }

    try {
      await db.collection('audit-logs').add(auditLog)
      console.log(`[deleteMembershipRequest] Log d'audit créé pour ${requestId}`)
    } catch (error: any) {
      console.error(`[deleteMembershipRequest] Erreur création log d'audit:`, error)
      // Ne pas faire échouer la suppression si le log échoue
      // Mais logger pour intervention manuelle
    }

    // ==================== SUPPRESSION DES FICHIERS STORAGE ====================
    const filesToDelete: string[] = []

    // Collecter les chemins des fichiers à supprimer
    if (membershipRequest.identity?.photo) {
      filesToDelete.push(membershipRequest.identity.photo)
    }

    if (membershipRequest.documents?.documentPhotoFront) {
      filesToDelete.push(membershipRequest.documents.documentPhotoFront)
    }

    if (membershipRequest.documents?.documentPhotoBack) {
      filesToDelete.push(membershipRequest.documents.documentPhotoBack)
    }

    // Supprimer les fichiers Storage
    let filesDeletedCount = 0
    const filesDeletionErrors: string[] = []

    for (const filePath of filesToDelete) {
      try {
        const file = bucket.file(filePath)
        const [exists] = await file.exists()

        if (exists) {
          await file.delete()
          filesDeletedCount++
          console.log(`[deleteMembershipRequest] Fichier Storage supprimé: ${filePath}`)
        } else {
          console.warn(`[deleteMembershipRequest] Fichier Storage introuvable: ${filePath}`)
        }
      } catch (error: any) {
        filesDeletionErrors.push(`${filePath}: ${error.message}`)
        console.error(`[deleteMembershipRequest] Erreur lors de la suppression de ${filePath}:`, error)
        // Ne pas faire échouer la suppression si un fichier ne peut pas être supprimé
        // Logger pour intervention manuelle
      }
    }

    if (filesDeletionErrors.length > 0) {
      console.warn(`[deleteMembershipRequest] Erreurs lors de la suppression de fichiers:`, filesDeletionErrors)
      // Optionnel : Notifier les admins pour intervention manuelle
    }

    // ==================== SUPPRESSION DU DOCUMENT FIRESTORE ====================
    try {
      await membershipRequestRef.delete()
      console.log(`[deleteMembershipRequest] Document Firestore supprimé: ${requestId}`)
    } catch (error: any) {
      console.error(`[deleteMembershipRequest] Erreur suppression Firestore:`, error)
      throw new HttpsError('internal', `Erreur lors de la suppression du document: ${error.message}`)
    }

    // ==================== LOGGING FINAL ====================
    console.log(`[deleteMembershipRequest] Suppression terminée avec succès`)
    console.log(`[deleteMembershipRequest] RequestId: ${requestId}`)
    console.log(`[deleteMembershipRequest] Matricule: ${membershipRequest.matricule}`)
    console.log(
      `[deleteMembershipRequest] Nom: ${membershipRequest.identity?.firstName} ${membershipRequest.identity?.lastName}`
    )
    console.log(`[deleteMembershipRequest] Supprimé par: ${request.auth.uid}`)
    console.log(`[deleteMembershipRequest] Fichiers supprimés: ${filesDeletedCount}/${filesToDelete.length}`)

    if (filesDeletionErrors.length > 0) {
      console.warn(`[deleteMembershipRequest] Fichiers non supprimés (intervention manuelle requise):`, filesDeletionErrors)
    }

    // ==================== RETOUR DE LA RÉPONSE ====================
    return {
      success: true,
      requestId,
      filesDeleted: filesDeletedCount,
      deletedAt: new Date().toISOString(),
      warnings:
        filesDeletionErrors.length > 0
          ? `Certains fichiers n'ont pas pu être supprimés. Intervention manuelle requise.`
          : undefined,
    }
  }
)
