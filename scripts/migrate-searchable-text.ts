/**
 * Script de migration pour ajouter le champ `searchableText` aux documents existants
 *
 * Ce champ est utilisé pour la recherche côté serveur avec préfixe
 *
 * Usage:
 *   pnpm migrate-searchable-text:dev   # Base DEV (kara-gabon-dev)
 *   pnpm migrate-searchable-text:prod  # Base PROD (kara-gabon)
 *
 * Ou directement :
 *   pnpm tsx scripts/migrate-searchable-text.ts dev
 *   pnpm tsx scripts/migrate-searchable-text.ts prod
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import * as path from 'path'
import * as fs from 'fs'

// Configuration des environnements
const ENV_CONFIG: Record<string, { projectId: string; description: string }> = {
  dev: { projectId: 'kara-gabon-dev', description: 'Développement' },
  preprod: { projectId: 'kara-gabon-preprod', description: 'Pré-production' },
  prod: { projectId: 'kara-gabon', description: 'Production' },
}

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

function getServiceAccountPath(env: string): string {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return process.env.GOOGLE_APPLICATION_CREDENTIALS
  }
  const serviceAccountsDir = path.join(process.cwd(), 'service-accounts')
  if (fs.existsSync(serviceAccountsDir)) {
    const files = fs.readdirSync(serviceAccountsDir)
    let serviceAccountFile: string | undefined
    if (env === 'dev') {
      serviceAccountFile = files.find((f) => f.includes('kara-gabon-dev') && f.endsWith('.json'))
    } else if (env === 'preprod') {
      serviceAccountFile = files.find((f) => f.includes('kara-gabon-preprod') && f.endsWith('.json'))
    } else if (env === 'prod') {
      serviceAccountFile = files.find(
        (f) => f.includes('kara-gabon') && !f.includes('dev') && !f.includes('preprod') && f.endsWith('.json')
      )
    }
    if (serviceAccountFile) {
      return path.join(serviceAccountsDir, serviceAccountFile)
    }
  }
  throw new Error(
    `Fichier service account non trouvé pour "${env}". ` +
      `Placez le fichier JSON dans service-accounts/ (ex: kara-gabon-dev-xxx.json pour dev, kara-gabon-xxx.json pour prod).`
  )
}

async function migrate() {
  const env = process.argv[2] || 'dev'
  const config = ENV_CONFIG[env]

  if (!config) {
    console.error(`❌ Environnement invalide: "${env}"`)
    console.log('   Usage: pnpm tsx scripts/migrate-searchable-text.ts [dev|preprod|prod]')
    process.exit(1)
  }

  console.log(`🚀 Migration searchableText - ${config.description} (${config.projectId})\n`)

  const serviceAccountPath = getServiceAccountPath(env)

  if (getApps().length === 0) {
    try {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'))
      initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id || config.projectId,
      })
      console.log('✅ Firebase Admin initialisé\n')
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation de Firebase Admin:', error)
      console.log('\n💡 Assurez-vous que le fichier service account existe:')
      console.log(`   ${serviceAccountPath}`)
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
