/**
 * Script de migration pour ajouter le champ `isPaid: false` aux documents existants
 * dans la collection `membership-requests` du projet dev.
 * 
 * Ce script met à jour uniquement les documents qui n'ont pas encore le champ `isPaid`.
 * 
 * Usage:
 *   pnpm tsx scripts/migrate-membership-requests-ispaid.ts
 * 
 * Ou avec Node:
 *   npx ts-node scripts/migrate-membership-requests-ispaid.ts
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import * as path from 'path'
import * as fs from 'fs'
import { fileURLToPath } from 'url'

// Configuration du projet dev
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const SERVICE_ACCOUNT_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  path.join(__dirname, '../service-accounts/kara-gabon-dev-firebase-adminsdk-fbsvc-449838b888.json')

const COLLECTION_NAME = 'membership-requests'
const FIELD_NAME = 'isPaid'
const FIELD_VALUE = false

async function migrate() {
  console.log('🚀 Démarrage de la migration...\n')
  console.log(`📋 Collection: ${COLLECTION_NAME}`)
  console.log(`📋 Champ à ajouter: ${FIELD_NAME} = ${FIELD_VALUE}\n`)

  // Initialiser Firebase Admin
  if (getApps().length === 0) {
    try {
      // Vérifier que le fichier service account existe
      if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
        throw new Error(`Fichier service account non trouvé: ${SERVICE_ACCOUNT_PATH}`)
      }

      const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf-8'))
      
      initializeApp({
        credential: cert(serviceAccount as any),
        projectId: serviceAccount.project_id,
      })
      console.log(`✅ Firebase Admin initialisé pour le projet: ${serviceAccount.project_id}\n`)
    } catch (error: any) {
      console.error('❌ Erreur lors de l\'initialisation de Firebase Admin:', error.message)
      console.log('\n💡 Assurez-vous que le fichier service account existe:')
      console.log(`   ${SERVICE_ACCOUNT_PATH}`)
      process.exit(1)
    }
  }

  const db = getFirestore()
  let totalUpdated = 0
  let totalSkipped = 0
  let totalErrors = 0

  try {
    console.log(`📂 Récupération des documents de la collection "${COLLECTION_NAME}"...`)
    const snapshot = await db.collection(COLLECTION_NAME).get()
    const totalDocuments = snapshot.size
    console.log(`   ✅ ${totalDocuments} documents trouvés\n`)

    if (totalDocuments === 0) {
      console.log('✨ Aucun document à migrer.')
      return
    }

    let batch = db.batch()
    let batchCount = 0
    const MAX_BATCH_SIZE = 500 // Limite Firestore par batch

    console.log(`🔄 Traitement des documents...\n`)

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data()
      const docId = docSnap.id

      // Vérifier si le champ existe déjà
      if (FIELD_NAME in data) {
        // Le champ existe déjà, on le laisse tel quel
        totalSkipped++
        continue
      }

      // Ajouter le champ avec la valeur par défaut
      try {
        batch.update(docSnap.ref, { [FIELD_NAME]: FIELD_VALUE })
        batchCount++
        totalUpdated++

        // Afficher un log tous les 100 documents
        if (totalUpdated % 100 === 0) {
          console.log(`   ⏳ ${totalUpdated} documents préparés pour mise à jour...`)
        }

        // Commit le batch si trop grand et créer un nouveau batch
        if (batchCount >= MAX_BATCH_SIZE) {
          await batch.commit()
          console.log(`   ✅ Batch de ${batchCount} documents committé`)
          batch = db.batch() // Créer un nouveau batch
          batchCount = 0
        }
      } catch (error: any) {
        console.error(`   ❌ Erreur pour le document ${docId}:`, error.message)
        totalErrors++
      }
    }

    // Commit le dernier batch s'il y en a un
    if (batchCount > 0) {
      await batch.commit()
      console.log(`   ✅ Dernier batch de ${batchCount} documents committé\n`)
    }

    // Résumé
    console.log('\n📊 Résumé de la migration:')
    console.log(`   ✅ ${totalUpdated} documents mis à jour`)
    console.log(`   ⏭️  ${totalSkipped} documents ignorés (champ déjà présent)`)
    if (totalErrors > 0) {
      console.log(`   ❌ ${totalErrors} erreurs`)
    }
    console.log(`   📝 Total traité: ${totalUpdated + totalSkipped + totalErrors} / ${totalDocuments}\n`)

    if (totalUpdated > 0) {
      console.log('✨ Migration terminée avec succès!\n')
    } else {
      console.log('✨ Aucune mise à jour nécessaire. Tous les documents ont déjà le champ `isPaid`.\n')
    }

  } catch (error: any) {
    console.error('\n❌ Erreur lors de la migration:', error.message)
    console.error(error)
    process.exit(1)
  }
}

// Exécuter la migration
migrate()
  .then(() => {
    console.log('👋 Script terminé.')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Erreur fatale:', error)
    process.exit(1)
  })
