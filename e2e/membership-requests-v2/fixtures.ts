/**
 * Fixtures pour les tests E2E du module Membership Requests V2
 * 
 * Fournit des fonctions pour créer et supprimer des demandes de test dans Firestore
 * Utilise Firebase Admin SDK pour les opérations de base de données
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import * as path from 'path'
import * as fs from 'fs'
import type { MembershipRequestStatus, Payment, PaymentMode } from '@/types/types'

// Configuration Firebase Admin
const initializeFirebaseAdmin = () => {
  if (getApps().length > 0) {
    return getApps()[0]
  }

  // Option 1: Variables d'environnement (prioritaire)
  if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PROJECT_ID) {
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }
    return initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.projectId,
    })
  }

  // Option 2: Fichier service account
  const serviceAccountsDir = path.join(process.cwd(), 'service-accounts')
  if (!fs.existsSync(serviceAccountsDir)) {
    throw new Error('Dossier service-accounts/ non trouvé. Veuillez configurer les variables d\'environnement ou placer le fichier service account dans service-accounts/')
  }

  const files = fs.readdirSync(serviceAccountsDir)
  const devServiceAccountFile = files.find(f => f.includes('kara-gabon-dev') && f.endsWith('.json'))

  if (!devServiceAccountFile) {
    throw new Error('Fichier service account dev non trouvé dans service-accounts/. Cherchez un fichier contenant "kara-gabon-dev"')
  }

  const serviceAccountPath = path.join(serviceAccountsDir, devServiceAccountFile)
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'))

  return initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id,
  })
}

// Interface pour les options de création de demande de test
export interface CreateTestRequestOptions {
  status?: MembershipRequestStatus
  isPaid?: boolean
  payments?: Payment[]
  reviewNote?: string
  motifReject?: string
  processedAt?: Date
  processedBy?: string
  memberNumber?: string
}

/**
 * Génère un matricule unique pour les tests
 */
function generateTestMatricule(): string {
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 1000)
  return `TEST.${timestamp}.${random}`
}

/**
 * Crée une demande d'adhésion de test dans Firestore
 * 
 * @param options - Options pour personnaliser la demande
 * @returns L'ID de la demande créée
 */
export async function createTestMembershipRequest(
  options: CreateTestRequestOptions = {}
): Promise<string> {
  try {
    initializeFirebaseAdmin()
    const db = getFirestore()

    const {
      status = 'pending',
      isPaid = false,
      payments = [],
      reviewNote,
      motifReject,
      processedAt,
      processedBy,
      memberNumber,
    } = options

    const matricule = generateTestMatricule()
    const now = Timestamp.now()
    const timestamp = Date.now()

    // Données de base pour une demande de test
    const requestData = {
      matricule,
      status,
      isPaid, // ✅ Champ critique pour le workflow
      identity: {
        civility: 'Monsieur',
        lastName: 'Test',
        firstName: 'E2E',
        birthDate: '1990-01-15',
        birthPlace: 'Libreville',
        birthCertificateNumber: `TEST-${timestamp}`,
        prayerPlace: 'Église',
        religion: 'Christianisme',
        contacts: ['+241061234567'],
        email: `test-e2e-${timestamp}@kara.test`,
        gender: 'Homme',
        nationality: 'Gabonaise',
        maritalStatus: 'Célibataire',
        intermediaryCode: '0000.MK.00001',
        hasCar: false,
        photoURL: null,
        photoPath: null,
      },
      address: {
        province: 'Estuaire',
        city: 'Libreville Centre',
        district: 'Centre-Ville',
        arrondissement: '1er Arrondissement',
        additionalInfo: 'Adresse de test E2E',
      },
      company: {
        isEmployed: true,
        companyName: 'Test Company E2E',
        companyAddress: {
          province: 'Estuaire',
          city: 'Libreville Centre',
          district: 'Centre-Ville',
        },
        profession: 'Testeur',
        seniority: '2 ans',
      },
      documents: {
        identityDocument: 'CNI',
        identityDocumentNumber: `TEST-${timestamp}`,
        documentPhotoFrontURL: null,
        documentPhotoFrontPath: null,
        documentPhotoBackURL: null,
        documentPhotoBackPath: null,
        expirationDate: '2030-12-31',
        issuingPlace: 'Libreville',
        issuingDate: '2020-01-01',
      },
      payments: payments.length > 0 ? payments : [],
      reviewNote: reviewNote || null,
      motifReject: motifReject || null,
      processedAt: processedAt ? Timestamp.fromDate(processedAt) : null,
      processedBy: processedBy || null,
      memberNumber: memberNumber || null,
      createdAt: now,
      updatedAt: now,
    }

    // Créer la demande dans Firestore
    const docRef = await db.collection('membership-requests').add(requestData)
    
    console.log(`✅ Demande de test créée: ${docRef.id} (matricule: ${matricule})`)
    
    return docRef.id
  } catch (error) {
    console.error('❌ Erreur lors de la création de la demande de test:', error)
    throw error
  }
}

/**
 * Supprime une demande de test de Firestore
 * 
 * @param requestId - ID de la demande à supprimer
 */
export async function deleteTestMembershipRequest(requestId: string): Promise<void> {
  try {
    initializeFirebaseAdmin()
    const db = getFirestore()

    await db.collection('membership-requests').doc(requestId).delete()
    
    console.log(`✅ Demande de test supprimée: ${requestId}`)
  } catch (error) {
    console.error(`❌ Erreur lors de la suppression de la demande ${requestId}:`, error)
    throw error
  }
}

/**
 * Supprime plusieurs demandes de test
 * 
 * @param requestIds - Tableau d'IDs de demandes à supprimer
 */
export async function deleteTestMembershipRequests(requestIds: string[]): Promise<void> {
  try {
    initializeFirebaseAdmin()
    const db = getFirestore()

    const batch = db.batch()
    requestIds.forEach((id) => {
      const docRef = db.collection('membership-requests').doc(id)
      batch.delete(docRef)
    })

    await batch.commit()
    
    console.log(`✅ ${requestIds.length} demande(s) de test supprimée(s)`)
  } catch (error) {
    console.error('❌ Erreur lors de la suppression des demandes:', error)
    throw error
  }
}

/**
 * Crée une demande de test "En attente" non payée
 */
export async function createPendingUnpaidRequest(): Promise<string> {
  return createTestMembershipRequest({
    status: 'pending',
    isPaid: false,
  })
}

/**
 * Crée une demande de test "En attente" payée
 */
export async function createPendingPaidRequest(): Promise<string> {
  const payment: Payment = {
    date: new Date(),
    mode: 'cash' as PaymentMode,
    amount: 25000,
    acceptedBy: 'test-admin',
    paymentType: 'Membership',
    time: '10:30',
    withFees: false,
  }

  return createTestMembershipRequest({
    status: 'pending',
    isPaid: true,
    payments: [payment],
  })
}

/**
 * Crée une demande de test "Approuvée"
 */
export async function createApprovedRequest(): Promise<string> {
  const payment: Payment = {
    date: new Date(),
    mode: 'cash' as PaymentMode,
    amount: 25000,
    acceptedBy: 'test-admin',
    paymentType: 'Membership',
    time: '10:30',
    withFees: false,
  }

  return createTestMembershipRequest({
    status: 'approved',
    isPaid: true,
    payments: [payment],
    processedAt: new Date(),
    processedBy: 'test-admin',
    memberNumber: `MEM-${Date.now()}`,
  })
}

/**
 * Crée une demande de test "Rejetée"
 */
export async function createRejectedRequest(): Promise<string> {
  return createTestMembershipRequest({
    status: 'rejected',
    isPaid: false,
    motifReject: 'Document d\'identité invalide (test E2E)',
    processedAt: new Date(),
    processedBy: 'test-admin',
  })
}

/**
 * Crée une demande de test "En cours de révision"
 */
export async function createUnderReviewRequest(): Promise<string> {
  return createTestMembershipRequest({
    status: 'under_review',
    isPaid: false,
    reviewNote: 'Vérification en cours (test E2E)',
  })
}

/**
 * Crée une demande de test avec corrections demandées
 */
export async function createRequestWithCorrections(): Promise<string> {
  return createTestMembershipRequest({
    status: 'pending',
    isPaid: false,
    reviewNote: 'Veuillez mettre à jour votre photo et corriger votre adresse (test E2E)',
  })
}
