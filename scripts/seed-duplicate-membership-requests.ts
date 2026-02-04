/**
 * Script pour créer 2 demandes d'adhésion identiques (même email, téléphone, numéro de pièce)
 * afin de tester la fonctionnalité de détection des doublons.
 *
 * Usage: pnpm tsx scripts/seed-duplicate-membership-requests.ts
 *
 * Prérequis:
 * - Firebase Admin configuré (variables d'environnement ou fichier service account dans service-accounts/)
 * - Cloud Function onMembershipRequestWrite déployée (pour que les doublons soient détectés après écriture)
 *
 * Après exécution: aller sur /membership-requests et vérifier l'alerte doublons + l'onglet Doublons.
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import * as path from 'path'
import * as fs from 'fs'

const COLLECTION = 'membership-requests'

function initializeFirebaseAdmin() {
  if (getApps().length > 0) {
    return getApps()[0]
  }

  if (
    process.env.FIREBASE_PRIVATE_KEY &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PROJECT_ID
  ) {
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

  const serviceAccountsDir = path.join(process.cwd(), 'service-accounts')
  if (!fs.existsSync(serviceAccountsDir)) {
    throw new Error(
      "Dossier service-accounts/ non trouvé. Configurez les variables d'environnement ou placez le fichier service account dans service-accounts/"
    )
  }

  const files = fs.readdirSync(serviceAccountsDir)
  const devFile = files.find((f) => f.includes('kara-gabon-dev') && f.endsWith('.json'))
  if (!devFile) {
    throw new Error(
      'Fichier service account dev non trouvé dans service-accounts/. Cherchez un fichier contenant "kara-gabon-dev"'
    )
  }

  const serviceAccount = JSON.parse(
    fs.readFileSync(path.join(serviceAccountsDir, devFile), 'utf8')
  )
  return initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id,
  })
}

// Données identiques pour les 2 demandes (déclencheront la détection doublon)
const SHARED_EMAIL = 'test-doublon@example.com'
const SHARED_PHONE = '077123456'
const SHARED_IDENTITY_DOC_NUMBER = 'TEST-NUM-PIECE-12345'

function buildMembershipRequestData(matricule: string) {
  return {
    matricule,
    status: 'pending',
    state: 'IN_PROGRESS',
    isPaid: false,
    identity: {
      civility: 'M.',
      lastName: 'Dupont',
      firstName: 'Jean',
      birthDate: '1990-01-15',
      birthPlace: 'Libreville',
      birthCertificateNumber: 'BC-001',
      prayerPlace: 'Libreville',
      religion: 'Christianisme',
      contacts: [SHARED_PHONE],
      email: SHARED_EMAIL,
      gender: 'M',
      nationality: 'Gabonaise',
      maritalStatus: 'single',
      hasCar: false,
    },
    address: {
      province: 'Estuaire',
      city: 'Libreville',
      district: 'Centre',
      arrondissement: 'Centre-ville',
    },
    company: {
      isEmployed: true,
      companyName: 'Test SARL',
      profession: 'Employé',
    },
    documents: {
      identityDocument: 'CNI',
      identityDocumentNumber: SHARED_IDENTITY_DOC_NUMBER,
      expirationDate: '2030-12-31',
      issuingPlace: 'Libreville',
      issuingDate: '2020-01-01',
      termsAccepted: true,
    },
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }
}

async function main() {
  console.log('Initialisation Firebase Admin...')
  initializeFirebaseAdmin()
  const db = getFirestore()

  const matricule1 = `TEST-DOUBLON-${Date.now()}`
  const matricule2 = `TEST-DOUBLON-${Date.now() + 1}`

  console.log('Création de 2 demandes identiques (même email, téléphone, numéro de pièce)...')
  const data1 = buildMembershipRequestData(matricule1)
  const data2 = buildMembershipRequestData(matricule2)

  const ref1 = db.collection(COLLECTION).doc(matricule1)
  const ref2 = db.collection(COLLECTION).doc(matricule2)

  await ref1.set(data1)
  console.log('  ✓ Demande 1 créée:', matricule1)

  await ref2.set(data2)
  console.log('  ✓ Demande 2 créée:', matricule2)

  console.log('')
  console.log('Terminé. Si la Cloud Function onMembershipRequestWrite est déployée,')
  console.log('les doublons seront détectés et un groupe apparaîtra dans l’onglet Doublons.')
  console.log('')
  console.log('Vérifiez sur /membership-requests :')
  console.log('  - alerte « Dossiers en doublon détectés »')
  console.log('  - onglet « Doublons » avec le groupe (email, téléphone, pièce)')
  console.log('')
  console.log('Matricules créés:', matricule1, matricule2)
}

main().catch((err) => {
  console.error('Erreur:', err)
  process.exit(1)
})
