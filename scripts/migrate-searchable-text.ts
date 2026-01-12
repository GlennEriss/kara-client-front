/**
 * Script de migration pour ajouter le champ `searchableText` aux documents existants
 * 
 * Ce champ est utilisé pour la recherche côté serveur avec préfixe
 * 
 * Usage:
 *   npx ts-node scripts/migrate-searchable-text.ts
 * 
 * Ou avec Firebase Admin SDK directement si problèmes de permissions
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import * as path from 'path'

// Configuration
const SERVICE_ACCOUNT_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  path.join(__dirname, '../service-accounts/kara-gabon-dev-firebase-adminsdk-fbsvc-449838b888.json')

const COLLECTIONS = [
  { name: 'provinces', fields: ['name', 'code'] },
  { name: 'departments', fields: ['name', 'code'] },
  { name: 'communes', fields: ['name', 'postalCode', 'alias'] },
  { name: 'districts', fields: ['name'] },
  { name: 'quarters', fields: ['name'] },
]

/**
 * Génère le texte de recherche (lowercase, sans accents)
 */
function generateSearchableText(...fields: (string | undefined | null)[]): string {
  return fields
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
}

async function migrate() {
  console.log('🚀 Démarrage de la migration...\n')

  // Initialiser Firebase Admin
  if (getApps().length === 0) {
    try {
      initializeApp({
        credential: cert(SERVICE_ACCOUNT_PATH),
      })
      console.log('✅ Firebase Admin initialisé\n')
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation de Firebase Admin:', error)
      console.log('\n💡 Assurez-vous que le fichier service account existe:')
      console.log(`   ${SERVICE_ACCOUNT_PATH}`)
      process.exit(1)
    }
  }

  const db = getFirestore()
  let totalUpdated = 0
  let totalSkipped = 0

  for (const collection of COLLECTIONS) {
    console.log(`📂 Migration de la collection: ${collection.name}`)
    
    try {
      const snapshot = await db.collection(collection.name).get()
      let updated = 0
      let skipped = 0

      const batch = db.batch()
      let batchCount = 0
      const MAX_BATCH_SIZE = 500

      for (const doc of snapshot.docs) {
        const data = doc.data()
        
        // Extraire les valeurs des champs
        const fieldValues = collection.fields.map(f => data[f])
        const searchableText = generateSearchableText(...fieldValues)
        
        // Vérifier si la mise à jour est nécessaire
        if (data.searchableText === searchableText) {
          skipped++
          continue
        }

        batch.update(doc.ref, { searchableText })
        batchCount++
        updated++

        // Commit le batch si trop grand
        if (batchCount >= MAX_BATCH_SIZE) {
          await batch.commit()
          console.log(`   ✅ Batch de ${batchCount} documents committé`)
          batchCount = 0
        }
      }

      // Commit le dernier batch
      if (batchCount > 0) {
        await batch.commit()
      }

      console.log(`   ✅ ${updated} documents mis à jour, ${skipped} ignorés\n`)
      totalUpdated += updated
      totalSkipped += skipped

    } catch (error) {
      console.error(`   ❌ Erreur pour ${collection.name}:`, error)
    }
  }

  console.log('=' .repeat(50))
  console.log(`🎉 Migration terminée!`)
  console.log(`   Total mis à jour: ${totalUpdated}`)
  console.log(`   Total ignorés: ${totalSkipped}`)
}

// Exécuter la migration
migrate().catch(console.error)
