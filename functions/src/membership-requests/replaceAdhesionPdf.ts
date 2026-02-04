import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'

export interface ReplaceAdhesionPdfPayload {
  requestId: string
  adminId: string
  pdf: {
    url: string
    path: string
    size: number
  }
}

/**
 * Cloud Function callable : remplacer le PDF d'adhésion d'une demande déjà payée et approuvée.
 * - Vérifie approved + paid
 * - Met à jour membership-requests (adhesionPdfURL, adhesionPdfUpdatedAt, adhesionPdfUpdatedBy)
 * - Crée un nouveau document ADHESION dans documents (isCurrent=true, requestId, source)
 * - Marque l'ancien document ADHESION isCurrent=false (replacedAt, replacedBy)
 * - Aligne adhesionPdfURL sur la subscription si elle existe
 */
export const replaceAdhesionPdf = onCall(
  {
    memory: '256MiB',
    timeoutSeconds: 30,
    // Autoriser localhost (dev) et les origines Firebase / production
    cors: [
      /^https?:\/\/localhost(:\d+)?$/,
      /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
      /\.firebaseapp\.com$/,
      /\.web\.app$/,
      /\.vercel\.app$/,
    ],
  },
  async (request) => {
    const data = request.data as ReplaceAdhesionPdfPayload | undefined

    if (!data?.requestId || typeof data.requestId !== 'string') {
      throw new HttpsError('invalid-argument', 'requestId est requis et doit être une chaîne')
    }
    if (!data?.adminId || typeof data.adminId !== 'string') {
      throw new HttpsError('invalid-argument', 'adminId est requis et doit être une chaîne')
    }
    if (!data?.pdf || typeof data.pdf !== 'object') {
      throw new HttpsError('invalid-argument', 'pdf est requis')
    }
    const { url: pdfUrl, path: pdfPath, size: pdfSize } = data.pdf
    if (!pdfUrl || typeof pdfUrl !== 'string' || !pdfPath || typeof pdfPath !== 'string') {
      throw new HttpsError('invalid-argument', 'pdf.url et pdf.path sont requis')
    }

    if (!request.auth) {
      throw new HttpsError('permission-denied', 'Utilisateur non authentifié')
    }
    const userRole = (request.auth.token as { role?: string }).role
    if (!userRole || !['Admin', 'SuperAdmin', 'Secretary', 'Administrateur'].includes(userRole)) {
      throw new HttpsError('permission-denied', 'Seuls les admins peuvent remplacer le PDF d\'adhésion')
    }
    if (request.auth.uid !== data.adminId) {
      throw new HttpsError('permission-denied', 'L\'adminId ne correspond pas à l\'utilisateur authentifié')
    }

    const db = getFirestore()
    const requestRef = db.collection('membership-requests').doc(data.requestId)
    const requestSnap = await requestRef.get()

    if (!requestSnap.exists) {
      throw new HttpsError('not-found', 'Demande d\'adhésion non trouvée')
    }

    const membershipRequest = requestSnap.data()!
    if (membershipRequest.status !== 'approved') {
      throw new HttpsError(
        'failed-precondition',
        `La demande doit être approuvée. Statut actuel: ${membershipRequest.status}`
      )
    }
    if (!membershipRequest.isPaid) {
      throw new HttpsError('failed-precondition', 'La demande doit être payée pour remplacer le PDF')
    }

    const matricule = membershipRequest.matricule || data.requestId
    const oldAdhesionPdfURL = membershipRequest.adhesionPdfURL || null
    const now = Timestamp.now()

    // 1. Mise à jour de la demande
    await requestRef.update({
      adhesionPdfURL: pdfUrl,
      adhesionPdfUpdatedAt: now,
      adhesionPdfUpdatedBy: data.adminId,
      updatedAt: now,
    })

    // 2. Marquer l'ancien document ADHESION comme remplacé (si on peut l'identifier)
    if (oldAdhesionPdfURL) {
      const documentsSnap = await db
        .collection('documents')
        .where('memberId', '==', matricule)
        .where('type', '==', 'ADHESION')
        .get()

      const batch = db.batch()
      let updateCount = 0
      for (const doc of documentsSnap.docs) {
        const d = doc.data()
        const isCurrent = d.isCurrent !== false
        const matchesOldUrl = (d.url || d.path) === oldAdhesionPdfURL
        if (isCurrent && matchesOldUrl) {
          batch.update(doc.ref, {
            isCurrent: false,
            replacedAt: now,
            replacedBy: data.adminId,
            updatedAt: now,
          })
          updateCount += 1
        }
      }
      if (updateCount > 0) {
        await batch.commit()
      }
    }

    // 3. Créer le nouveau document ADHESION
    const fileName = pdfUrl.split('/').pop() || `adhesion_${matricule}_${now.toMillis()}.pdf`
    await db.collection('documents').add({
      type: 'ADHESION',
      format: 'pdf',
      libelle: `Fiche d'adhésion - ${matricule}`,
      memberId: matricule,
      requestId: data.requestId,
      source: 'membership-requests',
      isCurrent: true,
      url: pdfUrl,
      path: pdfPath,
      fileName,
      size: typeof pdfSize === 'number' ? pdfSize : null,
      createdBy: data.adminId,
      updatedBy: data.adminId,
      createdAt: now,
      updatedAt: now,
    })

    // 4. Aligner la subscription (userId = matricule)
    const subscriptionsSnap = await db
        .collection('subscriptions')
        .where('userId', '==', matricule)
        .get()

    if (!subscriptionsSnap.empty) {
      const subBatch = db.batch()
      for (const sub of subscriptionsSnap.docs) {
        subBatch.update(sub.ref, {
          adhesionPdfURL: pdfUrl,
          updatedAt: now,
        })
      }
      await subBatch.commit()
    }

    return { success: true }
  }
)
