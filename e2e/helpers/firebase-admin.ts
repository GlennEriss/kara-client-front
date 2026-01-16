/**
 * Helper Firebase Admin pour les tests E2E
 * 
 * Permet de vérifier les documents créés dans Firestore après soumission du formulaire
 */

import { initializeApp, cert, getApps, App } from 'firebase-admin/app'
import { getFirestore, Firestore, Timestamp } from 'firebase-admin/firestore'
import * as path from 'path'
import * as fs from 'fs'

let adminApp: App | null = null
let firestoreInstance: Firestore | null = null

/**
 * Initialise Firebase Admin avec le service account de dev
 */
export function initializeFirebaseAdmin(): App {
  if (adminApp) {
    return adminApp
  }

  if (getApps().length > 0) {
    adminApp = getApps()[0]
    return adminApp
  }

  // Option 1: Variables d'environnement (prioritaire)
  if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PROJECT_ID) {
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }
    adminApp = initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.projectId,
    })
    return adminApp
  }

  // Option 2: Fichier service account local
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
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'))

  adminApp = initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id,
  })

  return adminApp
}

/**
 * Récupère l'instance Firestore
 */
export function getFirestoreInstance(): Firestore {
  if (firestoreInstance) {
    return firestoreInstance
  }

  initializeFirebaseAdmin()
  firestoreInstance = getFirestore()
  return firestoreInstance
}

/**
 * Recherche une demande d'inscription par numéro de téléphone
 */
export async function findMembershipRequestByPhone(phone: string): Promise<any | null> {
  const db = getFirestoreInstance()
  
  // Le numéro est stocké avec le préfixe +241
  const fullPhone = phone.startsWith('+241') ? phone : `+241${phone}`
  
  const snapshot = await db
    .collection('membership-requests')
    .where('identity.phone', '==', fullPhone)
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get()

  if (snapshot.empty) {
    return null
  }

  const doc = snapshot.docs[0]
  return { id: doc.id, ...doc.data() }
}

/**
 * Recherche une demande d'inscription par matricule
 */
export async function findMembershipRequestByMatricule(matricule: string): Promise<any | null> {
  const db = getFirestoreInstance()
  
  const snapshot = await db
    .collection('membership-requests')
    .where('matricule', '==', matricule)
    .limit(1)
    .get()

  if (snapshot.empty) {
    return null
  }

  const doc = snapshot.docs[0]
  return { id: doc.id, ...doc.data() }
}

/**
 * Recherche une demande d'inscription par nom et prénom
 */
export async function findMembershipRequestByName(lastName: string, firstName: string): Promise<any | null> {
  const db = getFirestoreInstance()
  
  const snapshot = await db
    .collection('membership-requests')
    .where('identity.lastName', '==', lastName.toUpperCase())
    .where('identity.firstName', '==', firstName)
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get()

  if (snapshot.empty) {
    return null
  }

  const doc = snapshot.docs[0]
  return { id: doc.id, ...doc.data() }
}

/**
 * Supprime une demande d'inscription par ID (nettoyage après test)
 */
export async function deleteMembershipRequest(id: string): Promise<void> {
  const db = getFirestoreInstance()
  await db.collection('membership-requests').doc(id).delete()
}

/**
 * Supprime toutes les demandes d'inscription d'un test par téléphone
 */
export async function cleanupTestMembershipRequests(phone: string): Promise<number> {
  const db = getFirestoreInstance()
  
  const fullPhone = phone.startsWith('+241') ? phone : `+241${phone}`
  
  const snapshot = await db
    .collection('membership-requests')
    .where('identity.phone', '==', fullPhone)
    .get()

  if (snapshot.empty) {
    return 0
  }

  const batch = db.batch()
  snapshot.docs.forEach(doc => {
    batch.delete(doc.ref)
  })
  await batch.commit()

  return snapshot.docs.length
}

/**
 * Récupère une demande d'inscription par ID
 */
export async function getMembershipRequestById(id: string): Promise<any | null> {
  const db = getFirestoreInstance()
  const doc = await db.collection('membership-requests').doc(id).get()
  
  if (!doc.exists) {
    return null
  }

  return { id: doc.id, ...doc.data() }
}

/**
 * Supprime toutes les données de géographie créées par les tests E2E
 * (celles qui contiennent "Test E2E" dans le nom)
 */
export async function cleanupGeographyTestData(): Promise<number> {
  const db = getFirestoreInstance()
  let totalDeleted = 0

  // Ordre de suppression : du plus spécifique au plus général (pour respecter les références)
  const collections = [
    { name: 'quarters', field: 'name' },
    { name: 'districts', field: 'name' },
    { name: 'communes', field: 'name' },
    { name: 'departments', field: 'name' },
    { name: 'provinces', field: 'name' },
  ]

  for (const collection of collections) {
    try {
      // Récupérer tous les documents de la collection
      const snapshot = await db.collection(collection.name).get()
      
      if (snapshot.empty) {
        continue
      }

      const batch = db.batch()
      let batchCount = 0

      snapshot.docs.forEach((doc) => {
        const data = doc.data()
        const name = data[collection.field] || data.name || ''
        const code = data.code || ''
        
        // Supprimer si le nom contient "Test E2E", "Modif E2E" ou les patterns de viewport
        // Ou si le code commence par "PT" (Province Test)
        const shouldDelete = 
          name.includes('Test E2E') ||
          name.includes('Modif E2E') ||
          name.includes('Province Desktop E2E') ||
          name.includes('Province Tablette E2E') ||
          name.includes('Province Mobile E2E') ||
          name.includes('Département Test E2E') ||
          name.includes('Commune Test E2E') ||
          name.includes('Arrondissement Test E2E') ||
          name.includes('Quartier Test E2E') ||
          (collection.name === 'provinces' && code.startsWith('PT') && code.length > 2) // Code de test province
        
        if (shouldDelete) {
          batch.delete(doc.ref)
          batchCount++
        }
      })

      if (batchCount > 0) {
        await batch.commit()
        totalDeleted += batchCount
        console.log(`  ✅ ${batchCount} document(s) supprimé(s) de ${collection.name}`)
      }
    } catch (error) {
      console.error(`  ❌ Erreur lors de la suppression de ${collection.name}:`, error)
    }
  }

  return totalDeleted
}
