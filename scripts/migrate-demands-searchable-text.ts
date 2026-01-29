/**
 * Script de migration pour ajouter le champ `searchableText` aux demandes Caisse Imprévue existantes
 *
 * searchableText = lastName + firstName + matricule (lowercase, sans accents)
 * Utilisé pour la recherche par préfixe Firestore
 *
 * @see documentation/caisse-imprevue/V2/recherche-demande/RECHERCHE_ANALYSE.md
 *
 * Usage:
 *   pnpm migrate-demands-searchable-text:dev    # Base DEV (kara-gabon-dev)
 *   pnpm migrate-demands-searchable-text:preprod # Base préprod (kara-gabon-preprod)
 *   pnpm migrate-demands-searchable-text:prod   # Base PROD (kara-gabon)
 *
 * Ou directement :
 *   pnpm tsx scripts/migrate-demands-searchable-text.ts dev
 *   pnpm tsx scripts/migrate-demands-searchable-text.ts preprod
 *   pnpm tsx scripts/migrate-demands-searchable-text.ts prod
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import * as path from 'path'
import * as fs from 'fs'
import { generateAllDemandSearchableTexts } from '../src/utils/demandSearchableText'

// Configuration des environnements
const ENV_CONFIG: Record<string, { projectId: string; description: string }> = {
  dev: { projectId: 'kara-gabon-dev', description: 'Développement' },
  preprod: { projectId: 'kara-gabon-preprod', description: 'Pré-production' },
  prod: { projectId: 'kara-gabon', description: 'Production' },
}

const COLLECTION_NAME = 'caisseImprevueDemands'

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
    console.log('   Usage: pnpm tsx scripts/migrate-demands-searchable-text.ts [dev|preprod|prod]')
    process.exit(1)
  }

  console.log(`🚀 Migration searchableText - Demandes Caisse Imprévue - ${config.description} (${config.projectId})\n`)

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
  console.log(`📂 Migration de la collection: ${COLLECTION_NAME}`)

  try {
    const snapshot = await db.collection(COLLECTION_NAME).get()
    let updated = 0
    let skipped = 0
    let errors = 0

    let batch = db.batch()
    let batchCount = 0
    const MAX_BATCH_SIZE = 500

    for (const doc of snapshot.docs) {
      const data = doc.data()
      const memberLastName = data.memberLastName ?? ''
      const memberFirstName = data.memberFirstName ?? ''
      const memberMatricule = data.memberMatricule ?? ''

      const searchableTexts = generateAllDemandSearchableTexts(
        memberLastName,
        memberFirstName,
        memberMatricule
      )

      // Vérifier si la mise à jour est nécessaire (tous les champs déjà présents et corrects)
      const needsUpdate =
        data.searchableText !== searchableTexts.searchableText ||
        data.searchableTextFirstNameFirst !== searchableTexts.searchableTextFirstNameFirst ||
        data.searchableTextMatriculeFirst !== searchableTexts.searchableTextMatriculeFirst

      if (!needsUpdate) {
        skipped++
        continue
      }

      try {
        batch.update(doc.ref, searchableTexts)
        batchCount++
        updated++

        // Commit le batch si trop grand (Firestore limite à 500 ops par batch)
        if (batchCount >= MAX_BATCH_SIZE) {
          await batch.commit()
          console.log(`   ✅ Batch de ${batchCount} documents committé`)
          batch = db.batch()
          batchCount = 0
        }
      } catch (err) {
        console.error(`   ⚠️ Erreur pour document ${doc.id}:`, err)
        errors++
      }
    }

    // Commit le dernier batch
    if (batchCount > 0) {
      await batch.commit()
    }

    console.log(`\n   ✅ ${updated} documents mis à jour`)
    console.log(`   ⏭️  ${skipped} ignorés (searchableText déjà correct)`)
    if (errors > 0) {
      console.log(`   ❌ ${errors} erreurs`)
    }

    console.log('\n' + '='.repeat(50))
    console.log('🎉 Migration terminée!')
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error)
    process.exit(1)
  }
}

// Exécuter la migration
migrate().catch(console.error)
