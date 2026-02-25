/**
 * Script de migration pour ajouter createdAt/updatedAt aux demandes Caisse Spéciale existantes
 *
 * Les demandes sans createdAt sont EXCLUES des requêtes Firestore (orderBy exclut les docs sans le champ).
 * Ce script corrige les documents créés avant la V2 ou importés manuellement.
 *
 * Usage:
 *   pnpm migrate-caisse-speciale-demands-created-at:dev    # Base DEV
 *   pnpm migrate-caisse-speciale-demands-created-at:preprod # Base préprod
 *   pnpm migrate-caisse-speciale-demands-created-at:prod   # Base PROD
 *
 * Ou directement :
 *   pnpm tsx scripts/migrate-caisse-speciale-demands-created-at.ts dev
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import * as path from 'path'
import * as fs from 'fs'

const ENV_CONFIG: Record<string, { projectId: string; description: string }> = {
  dev: { projectId: 'kara-gabon-dev', description: 'Développement' },
  preprod: { projectId: 'kara-gabon-preprod', description: 'Pré-production' },
  prod: { projectId: 'kara-gabon', description: 'Production' },
}

const COLLECTION_NAME = 'caisseSpecialeDemands'

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
      `Placez le fichier JSON dans service-accounts/ (ex: kara-gabon-dev-xxx.json pour dev).`
  )
}

async function migrate() {
  const env = process.argv[2] || 'dev'
  const config = ENV_CONFIG[env]

  if (!config) {
    console.error(`❌ Environnement invalide: "${env}"`)
    console.log('   Usage: pnpm tsx scripts/migrate-caisse-speciale-demands-created-at.ts [dev|preprod|prod]')
    process.exit(1)
  }

  console.log(
    `🚀 Migration createdAt/updatedAt - Demandes Caisse Spéciale - ${config.description} (${config.projectId})\n`
  )

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
      console.error("❌ Erreur lors de l'initialisation de Firebase Admin:", error)
      console.log('\n💡 Assurez-vous que le fichier service account existe:')
      console.log(`   ${serviceAccountPath}`)
      process.exit(1)
    }
  }

  const db = getFirestore()
  console.log(`📂 Collection: ${COLLECTION_NAME}`)

  try {
    const snapshot = await db.collection(COLLECTION_NAME).get()
    let updated = 0
    let skipped = 0
    let errors = 0

    let batch = db.batch()
    let batchCount = 0
    const MAX_BATCH_SIZE = 500

    const fallbackDate = Timestamp.fromDate(new Date('2000-01-01T00:00:00Z'))

    for (const doc of snapshot.docs) {
      const data = doc.data()
      const updates: Record<string, any> = {}

      const hasCreatedAt = data.createdAt != null
      const hasUpdatedAt = data.updatedAt != null

      const toTimestamp = (v: unknown): Timestamp => {
        if (!v) return fallbackDate
        if (v instanceof Timestamp) return v
        if (typeof (v as any).toDate === 'function') return v as Timestamp
        try {
          const d = v instanceof Date ? v : new Date(v as string | number)
          return isNaN(d.getTime()) ? fallbackDate : Timestamp.fromDate(d)
        } catch {
          return fallbackDate
        }
      }

      if (!hasCreatedAt) {
        updates.createdAt = toTimestamp(
          data.updatedAt ?? data.approvedAt ?? data.rejectedAt ?? data.convertedAt ?? data.decisionMadeAt
        )
      }

      if (!hasUpdatedAt) {
        updates.updatedAt = toTimestamp(
          data.createdAt ?? data.approvedAt ?? data.rejectedAt ?? data.convertedAt ?? data.decisionMadeAt
        )
      }

      if (Object.keys(updates).length === 0) {
        skipped++
        continue
      }

      try {
        batch.update(doc.ref, updates)
        batchCount++
        updated++
        console.log(`   📝 ${doc.id}: ajout de ${Object.keys(updates).join(', ')}`)

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

    if (batchCount > 0) {
      await batch.commit()
    }

    console.log(`\n   ✅ ${updated} documents mis à jour`)
    console.log(`   ⏭️  ${skipped} ignorés (createdAt/updatedAt déjà présents)`)
    if (errors > 0) {
      console.log(`   ❌ ${errors} erreurs`)
    }

    console.log('\n' + '='.repeat(50))
    console.log('🎉 Migration terminée! Les demandes devraient maintenant s\'afficher dans la liste.')
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error)
    process.exit(1)
  }
}

migrate().catch(console.error)
