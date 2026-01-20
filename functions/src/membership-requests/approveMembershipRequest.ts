import * as admin from 'firebase-admin'
import { onCall } from 'firebase-functions/v2/https'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import * as crypto from 'crypto'

/**
 * Cloud Function pour approuver une demande d'adhésion de manière atomique
 * 
 * Cette fonction effectue une opération atomique avec rollback automatique pour :
 * 1. Valider la demande (payée, statut 'pending' ou 'under_review')
 * 2. Générer email et mot de passe
 * 3. Créer utilisateur Firebase Auth
 * 4. Créer document users dans Firestore
 * 5. Créer abonnement (subscription)
 * 6. Mettre à jour statut de la demande (approved, approvedBy, approvedAt)
 * 7. Archiver PDF d'adhésion dans documents
 * 8. Créer notification d'approbation
 * 
 * @returns { success: boolean, matricule: string, email: string, password: string, subscriptionId: string }
 */
export const approveMembershipRequest = onCall(
  {
    memory: '512MiB',
    timeoutSeconds: 60,
    cors: true, // Permettre les appels depuis le client web
  },
  async (request) => {
    const { requestId, adminId, membershipType, companyId, professionId, adhesionPdfURL } = request.data

    // ==================== VALIDATION DES PARAMÈTRES ====================
    if (!requestId || typeof requestId !== 'string') {
      throw new Error('requestId est requis et doit être une chaîne')
    }

    if (!adminId || typeof adminId !== 'string') {
      throw new Error('adminId est requis et doit être une chaîne')
    }

    if (!membershipType || !['adherant', 'bienfaiteur', 'sympathisant'].includes(membershipType)) {
      throw new Error('membershipType est requis et doit être valide (adherant, bienfaiteur, sympathisant)')
    }

    if (!adhesionPdfURL || typeof adhesionPdfURL !== 'string') {
      throw new Error('adhesionPdfURL est requis (PDF obligatoire)')
    }

    // ==================== VALIDATION DES PERMISSIONS ====================
    // Vérifier que l'utilisateur est authentifié
    if (!request.auth) {
      throw new Error('Utilisateur non authentifié')
    }

    // Vérifier que l'utilisateur est admin
    const userRole = (request.auth.token as any).role
    if (!userRole || !['Admin', 'SuperAdmin', 'Secretary'].includes(userRole)) {
      throw new Error('Permissions insuffisantes. Seuls les admins peuvent approuver.')
    }

    // Vérifier que l'adminId correspond à l'utilisateur authentifié
    if (request.auth.uid !== adminId) {
      throw new Error('L\'adminId ne correspond pas à l\'utilisateur authentifié')
    }

    const db = getFirestore()
    const auth = getAuth()
    const requestRef = db.collection('membership-requests').doc(requestId)

    // ==================== VALIDATION DE LA DEMANDE ====================
    const requestDoc = await requestRef.get()

    if (!requestDoc.exists) {
      throw new Error('Demande d\'adhésion non trouvée')
    }

    const membershipRequest = requestDoc.data()!

    // Vérifier que la demande est payée
    if (!membershipRequest.isPaid) {
      throw new Error('La demande doit être payée avant approbation')
    }

    // Vérifier que le statut permet l'approbation
    if (membershipRequest.status !== 'pending' && membershipRequest.status !== 'under_review') {
      throw new Error(`La demande doit être en attente ou en cours de correction. Statut actuel: ${membershipRequest.status}`)
    }

    const matricule = membershipRequest.matricule || requestId

    // ==================== GÉNÉRATION EMAIL ET MOT DE PASSE ====================
    // Générer email : {firstName}{lastName}{4premiersChiffresMatricule}@kara.ga
    const rawFirstName = (membershipRequest.identity?.firstName || '').toString()
    const rawLastName = (membershipRequest.identity?.lastName || '').toString()
    const firstName = rawFirstName.toLowerCase().replace(/[^a-z]/g, '')
    const lastName = rawLastName.toLowerCase().replace(/[^a-z]/g, '')
    const matriculeDigits = matricule.replace(/\D/g, '').slice(0, 4)
    const namePart = (firstName + lastName) || 'member'
    const generatedEmail = `${namePart}${matriculeDigits}@kara.ga`

    // Générer mot de passe sécurisé (12+ caractères)
    function generateSecurePassword(length: number = 12): string {
      const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
      const randomValues = new Uint8Array(length)
      crypto.randomFillSync(randomValues)
      return Array.from(randomValues, (byte: number) => charset[byte % charset.length]).join('')
    }

    const temporaryPassword = generateSecurePassword(12)

    // ==================== STRUCTURE DE ROLLBACK ====================
    const rollbackActions: Array<() => Promise<void>> = []
    let subscriptionRef: admin.firestore.DocumentReference | null = null
    let documentRef: admin.firestore.DocumentReference | null = null

    try {
      // ==================== 1. CRÉATION UTILISATEUR FIREBASE AUTH ====================
      console.log(`[approveMembershipRequest] Création utilisateur Auth: ${matricule}`)

      try {
        // Vérifier si l'utilisateur existe déjà
        try {
          await auth.getUser(matricule)
          console.log(`[approveMembershipRequest] Utilisateur Auth existant: ${matricule}`)
        } catch (error: any) {
          if (error.code === 'auth/user-not-found') {
            // Créer l'utilisateur
            await auth.createUser({
              uid: matricule,
              email: generatedEmail,
              password: temporaryPassword,
              disabled: false,
              emailVerified: true,
            })
            console.log(`[approveMembershipRequest] Utilisateur Auth créé: ${matricule}`)

            // Ajouter action de rollback
            rollbackActions.push(async () => {
              console.log(`[approveMembershipRequest] Rollback: Suppression utilisateur Auth ${matricule}`)
              try {
                await auth.deleteUser(matricule)
              } catch (rollbackError) {
                console.error(`[approveMembershipRequest] Erreur lors du rollback Auth:`, rollbackError)
              }
            })
          } else {
            throw error
          }
        }
      } catch (error: any) {
        console.error('[approveMembershipRequest] Erreur création utilisateur Auth:', error)
        throw new Error(`Erreur lors de la création de l'utilisateur Firebase Auth: ${error.message}`)
      }

      // ==================== 2. CRÉATION DOCUMENT UTILISATEUR (FIRESTORE) ====================
      console.log(`[approveMembershipRequest] Création document users: ${matricule}`)

      // Convertir membershipType en UserRole
      function membershipTypeToRole(membershipType: string): string {
        switch (membershipType) {
          case 'adherant':
            return 'Adherant'
          case 'bienfaiteur':
            return 'Bienfaiteur'
          case 'sympathisant':
            return 'Sympathisant'
          default:
            return 'Adherant'
        }
      }

      const userRole = membershipTypeToRole(membershipType)

      // Préparer les données utilisateur
      const userData = {
        matricule,
        firstName: membershipRequest.identity?.firstName || '',
        lastName: membershipRequest.identity?.lastName || '',
        birthDate: membershipRequest.identity?.birthDate || '',
        birthPlace: membershipRequest.identity?.birthPlace || '',
        contacts: membershipRequest.identity?.contacts || [],
        gender: membershipRequest.identity?.gender || '',
        email: generatedEmail,
        nationality: membershipRequest.identity?.nationality || '',
        hasCar: membershipRequest.identity?.hasCar || false,
        address: membershipRequest.address || {},
        photoURL: membershipRequest.identity?.photoURL || null,
        photoPath: membershipRequest.identity?.photoPath || null,
        identityDocument: membershipRequest.documents?.identityDocument || '',
        identityDocumentNumber: membershipRequest.documents?.identityDocumentNumber || '',
        subscriptions: [], // Sera mis à jour après création de l'abonnement
        dossier: requestId,
        membershipType,
        roles: [userRole],
        isActive: true,
        companyId: companyId || null,
        professionId: professionId || null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }

      // Créer le document users
      await db.collection('users').doc(matricule).set(userData)
      console.log(`[approveMembershipRequest] Document users créé: ${matricule}`)

      // Ajouter action de rollback
      rollbackActions.push(async () => {
        console.log(`[approveMembershipRequest] Rollback: Suppression document users ${matricule}`)
        try {
          await db.collection('users').doc(matricule).delete()
        } catch (rollbackError) {
          console.error(`[approveMembershipRequest] Erreur lors du rollback users:`, rollbackError)
        }
      })

      // ==================== 3. CRÉATION ABONNEMENT ====================
      console.log(`[approveMembershipRequest] Création abonnement pour: ${matricule}`)

      // Calculer les dates (1 an de validité)
      const startDate = Timestamp.now()
      const endDate = new Date(startDate.toDate())
      endDate.setFullYear(endDate.getFullYear() + 1)

      const subscriptionData = {
        memberId: matricule,
        membershipType,
        startDate,
        endDate: Timestamp.fromDate(endDate),
        status: 'active',
        adhesionPdfURL, // URL du PDF d'adhésion (obligatoire)
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }

      // Créer l'abonnement
      subscriptionRef = await db.collection('subscriptions').add(subscriptionData)
      console.log(`[approveMembershipRequest] Abonnement créé: ${subscriptionRef.id}`)

      // Ajouter action de rollback
      rollbackActions.push(async () => {
        if (subscriptionRef) {
          console.log(`[approveMembershipRequest] Rollback: Suppression abonnement ${subscriptionRef.id}`)
          try {
            await subscriptionRef.delete()
          } catch (rollbackError) {
            console.error(`[approveMembershipRequest] Erreur lors du rollback subscription:`, rollbackError)
          }
        }
      })

      // Mettre à jour le document users avec l'ID de l'abonnement
      await db.collection('users').doc(matricule).update({
        subscriptions: admin.firestore.FieldValue.arrayUnion(subscriptionRef.id),
        updatedAt: Timestamp.now(),
      })

      // ==================== 4. MISE À JOUR STATUT DE LA DEMANDE ====================
      console.log(`[approveMembershipRequest] Mise à jour statut demande: ${requestId}`)

      await requestRef.update({
        status: 'approved',
        approvedBy: adminId, // ID de l'admin qui a approuvé (obligatoire pour traçabilité)
        approvedAt: Timestamp.now(), // Date d'approbation (obligatoire pour traçabilité)
        updatedAt: Timestamp.now(),
      })

      console.log(`[approveMembershipRequest] Statut mis à jour: approved`)
      console.log(`[approveMembershipRequest] Approuvé par: ${adminId} à ${new Date().toISOString()}`)

      // ==================== 5. ARCHIVAGE DOCUMENT PDF ====================
      console.log(`[approveMembershipRequest] Archivage document PDF: ${adhesionPdfURL}`)

      // Extraire le nom du fichier depuis l'URL
      const fileName = adhesionPdfURL.split('/').pop() || `adhesion_${matricule}.pdf`

      // Créer le document dans la collection documents
      const documentData = {
        type: 'ADHESION',
        format: 'pdf',
        libelle: `Fiche d'adhésion - ${matricule}`,
        memberId: matricule,
        url: adhesionPdfURL,
        path: adhesionPdfURL, // Chemin dans Firebase Storage
        fileName,
        size: null, // Taille en bytes (optionnel, peut être récupérée depuis Storage)
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }

      documentRef = await db.collection('documents').add(documentData)
      console.log(`[approveMembershipRequest] Document archivé: ${documentRef.id}`)

      // Ajouter action de rollback
      rollbackActions.push(async () => {
        if (documentRef) {
          console.log(`[approveMembershipRequest] Rollback: Suppression document ${documentRef.id}`)
          try {
            await documentRef.delete()
          } catch (rollbackError) {
            console.error(`[approveMembershipRequest] Erreur lors du rollback document:`, rollbackError)
          }
        }
      })

      // ==================== 6. CRÉATION NOTIFICATION ====================
      console.log(`[approveMembershipRequest] Création notification d'approbation`)

      const memberName = `${membershipRequest.identity?.firstName || ''} ${membershipRequest.identity?.lastName || ''}`.trim()

      const notificationData = {
        module: 'memberships',
        entityId: requestId,
        type: 'status_update',
        title: 'Demande d\'adhésion approuvée',
        message: `La demande de ${memberName} a été approuvée. Matricule: ${matricule}`,
        isRead: false,
        createdAt: Timestamp.now(),
        metadata: {
          requestId,
          memberId: matricule,
          memberName,
          email: generatedEmail,
          status: 'approved',
          approvedBy: adminId,
          approvedAt: Timestamp.now(),
        },
      }

      await db.collection('notifications').add(notificationData)
      console.log(`[approveMembershipRequest] Notification créée`)

      // ==================== 7. RETOUR DE LA RÉPONSE ====================
      console.log(`[approveMembershipRequest] Approbation réussie: ${matricule}`)

      return {
        success: true,
        matricule,
        email: generatedEmail,
        password: temporaryPassword, // Retourné UNIQUEMENT dans la réponse HTTPS
        subscriptionId: subscriptionRef.id,
        companyId: companyId || null,
        professionId: professionId || null,
      }
    } catch (error: any) {
      // ==================== ROLLBACK EN CAS D'ERREUR ====================
      console.error('[approveMembershipRequest] Erreur, rollback en cours...', error)

      // Rollback en ordre inverse (dernier créé = premier supprimé)
      for (const rollbackAction of rollbackActions.reverse()) {
        try {
          await rollbackAction()
        } catch (rollbackError) {
          console.error('[approveMembershipRequest] Erreur lors du rollback:', rollbackError)
          // Logger pour intervention manuelle si nécessaire
        }
      }

      throw new Error(`Erreur lors de l'approbation: ${error.message}`)
    }
  }
)
