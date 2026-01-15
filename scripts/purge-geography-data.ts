/**
 * Script pour purger toutes les données de géographie existantes
 * 
 * Usage: pnpm tsx scripts/purge-geography-data.ts
 * 
 * Ce script supprime toutes les données des collections :
 * - quarters
 * - districts
 * - communes
 * - departments
 * - provinces
 * 
 * ATTENTION: Cette opération est irréversible !
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import * as path from 'path'
import * as fs from 'fs'

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
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'))

  return initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id,
  })
}

/**
 * Supprime tous les documents d'une collection
 */
async function deleteCollection(db: FirebaseFirestore.Firestore, collectionName: string) {
  const collectionRef = db.collection(collectionName)
  const snapshot = await collectionRef.get()
  
  if (snapshot.empty) {
    console.log(`  ℹ️  Collection ${collectionName} est déjà vide`)
    return 0
  }

  const batch = db.batch()
  let count = 0
  
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref)
    count++
  })
  
  await batch.commit()
  return count
}

async function purgeGeographyData() {
  try {
    console.log('🚀 Initialisation de Firebase Admin...')
    initializeFirebaseAdmin()
    const db = getFirestore()

    console.log('🗑️  Purge des données de géographie existantes...\n')

    // Ordre de suppression : du plus spécifique au plus général (pour respecter les références)
    const collections = [
      'quarters',      // Quartiers (référencent districts)
      'districts',     // Arrondissements (référencent communes)
      'communes',      // Communes (référencent departments)
      'departments',   // Départements (référencent provinces)
      'provinces',     // Provinces
    ]

    let totalDeleted = 0

    for (const collectionName of collections) {
      console.log(`📌 Suppression de la collection ${collectionName}...`)
      const deleted = await deleteCollection(db, collectionName)
      totalDeleted += deleted
      console.log(`  ✅ ${deleted} document(s) supprimé(s)`)
    }

    console.log('\n✅ Purge terminée avec succès !')
    console.log(`\n📊 Résumé:`)
    console.log(`   - ${totalDeleted} document(s) supprimé(s) au total`)

    process.exit(0)
  } catch (error) {
    console.error('❌ Erreur lors de la purge des données:', error)
    process.exit(1)
  }
}

// Exécuter le script
purgeGeographyData()
