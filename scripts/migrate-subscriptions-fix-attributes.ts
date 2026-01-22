/**
 * Script de migration : Corriger les attributs d'abonnement
 * 
 * Ce script corrige les incohérences de nommage dans les abonnements :
 * - Renomme startDate → dateStart
 * - Renomme endDate → dateEnd
 * - Renomme membershipType → type
 * - Ajoute les champs manquants : montant, currency, createdBy
 * 
 * Usage:
 *   npx tsx scripts/migrate-subscriptions-fix-attributes.ts [dev|preprod|prod] [--dry-run]
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import * as readline from 'readline'
import * as path from 'path'
import * as fs from 'fs'

// Configuration des environnements
const ENV_CONFIG: Record<string, { projectId: string; description: string }> = {
  dev: {
    projectId: 'kara-gabon-dev',
    description: 'Développement',
  },
  preprod: {
    projectId: 'kara-gabon-preprod',
    description: 'Pré-production',
  },
  prod: {
    projectId: 'kara-gabon',
    description: 'Production',
  },
}

// Montants par défaut selon le type de membre
const DEFAULT_AMOUNTS: Record<string, number> = {
  adherant: 10300,
  bienfaiteur: 10300,
  sympathisant: 10300,
}

// Initialiser Firebase Admin
function initializeFirebase(env: string, projectId: string) {
  if (getApps().length > 0) {
    const existingApp = getApps().find(app => app.options.projectId === projectId)
    if (existingApp) {
      return getFirestore(existingApp)
    }
  }

  // Option 1: Variables d'environnement (prioritaire)
  if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PROJECT_ID) {
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }
    const app = initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.projectId,
    })
    return getFirestore(app)
  }

  // Option 2: Fichier service account
  const serviceAccountsDir = path.join(process.cwd(), 'service-accounts')
  if (fs.existsSync(serviceAccountsDir)) {
    const files = fs.readdirSync(serviceAccountsDir)
    let serviceAccountFile: string | undefined

    if (env === 'dev') {
      serviceAccountFile = files.find(f => f.includes('kara-gabon-dev') && f.endsWith('.json'))
    } else if (env === 'preprod') {
      serviceAccountFile = files.find(f => f.includes('kara-gabon-preprod') && f.endsWith('.json'))
    } else if (env === 'prod') {
      serviceAccountFile = files.find(f => f.includes('kara-gabon') && !f.includes('dev') && !f.includes('preprod') && f.endsWith('.json'))
    }

    if (serviceAccountFile) {
      const serviceAccountPath = path.join(serviceAccountsDir, serviceAccountFile)
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'))
      const app = initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id || projectId,
      })
      return getFirestore(app)
    }
  }

  // Option 3: Utiliser les credentials par défaut (Firebase CLI)
  const app = initializeApp({
    projectId,
  })
  return getFirestore(app)
}

// Fonction pour demander confirmation
function askConfirmation(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question(`${question} (oui/non): `, (answer) => {
      rl.close()
      resolve(answer.toLowerCase() === 'oui' || answer.toLowerCase() === 'o')
    })
  })
}

async function migrateSubscriptions(env: string, dryRun: boolean = false) {
  const config = ENV_CONFIG[env]
  if (!config) {
    console.error(`❌ Environnement invalide: ${env}`)
    console.error(`Environnements disponibles: ${Object.keys(ENV_CONFIG).join(', ')}`)
    process.exit(1)
  }

  console.log(`\n🔄 Migration des attributs d'abonnement: ${config.description} (${config.projectId})`)
  console.log(`   Corrections:`)
  console.log(`   - startDate → dateStart`)
  console.log(`   - endDate → dateEnd`)
  console.log(`   - membershipType → type`)
  console.log(`   - Ajout montant, currency, createdBy si manquants`)
  if (dryRun) {
    console.log(`\n⚠️  MODE DRY-RUN : Aucune modification ne sera effectuée\n`)
  } else {
    console.log()

    // Demander confirmation
    const skipConfirmation = process.argv.includes('--yes') || process.argv.includes('-y')
    if (!skipConfirmation) {
      const confirmed = await askConfirmation(
        `⚠️  Êtes-vous sûr de vouloir migrer les abonnements dans ${config.description}?`
      )

      if (!confirmed) {
        console.log('❌ Migration annulée')
        process.exit(0)
      }
    } else {
      console.log('✅ Confirmation automatique (--yes)\n')
    }
  }

  const db = initializeFirebase(env, config.projectId)

  try {
    // Récupérer tous les abonnements
    const subscriptionsRef = db.collection('subscriptions')
    const snapshot = await subscriptionsRef.get()

    if (snapshot.empty) {
      console.log('✅ Aucun abonnement trouvé')
      return
    }

    console.log(`\n📊 ${snapshot.size} abonnement(s) trouvé(s)\n`)

    let migrated = 0
    let skipped = 0
    let errors = 0

    // Traiter chaque abonnement
    for (const doc of snapshot.docs) {
      const data = doc.data()
      const subscriptionId = doc.id
      const updates: Record<string, any> = {}
      let needsUpdate = false

      try {
        // 1. Renommer startDate → dateStart
        if (data.startDate && !data.dateStart) {
          updates.dateStart = data.startDate
          updates.startDate = FieldValue.delete()
          needsUpdate = true
          console.log(`  ✅ ${subscriptionId}: startDate → dateStart`)
        }

        // 2. Renommer endDate → dateEnd
        if (data.endDate && !data.dateEnd) {
          updates.dateEnd = data.endDate
          updates.endDate = FieldValue.delete()
          needsUpdate = true
          console.log(`  ✅ ${subscriptionId}: endDate → dateEnd`)
        }

        // 3. Renommer membershipType → type
        if (data.membershipType && !data.type) {
          updates.type = data.membershipType
          updates.membershipType = FieldValue.delete()
          needsUpdate = true
          console.log(`  ✅ ${subscriptionId}: membershipType → type`)
        }

        // 4. Ajouter montant si manquant
        if (!data.montant) {
          const membershipType = data.type || data.membershipType || 'adherant'
          updates.montant = DEFAULT_AMOUNTS[membershipType] || 10300
          needsUpdate = true
          console.log(`  ✅ ${subscriptionId}: Ajout montant (${updates.montant} XOF)`)
        }

        // 5. Ajouter currency si manquant
        if (!data.currency) {
          updates.currency = 'XOF'
          needsUpdate = true
          console.log(`  ✅ ${subscriptionId}: Ajout currency (XOF)`)
        }

        // 6. Ajouter createdBy si manquant (utiliser 'system' par défaut)
        if (!data.createdBy) {
          updates.createdBy = 'system'
          needsUpdate = true
          console.log(`  ✅ ${subscriptionId}: Ajout createdBy (system)`)
        }

        // 7. Recalculer isValid si dateEnd existe
        if (data.dateEnd || data.endDate) {
          const endDate = data.dateEnd || data.endDate
          const endDateValue = endDate?.toDate ? endDate.toDate() : (endDate instanceof Date ? endDate : new Date())
          const isValid = endDateValue > new Date()
          
          // Mettre à jour isValid seulement si différent
          if (data.isValid !== isValid) {
            updates.isValid = isValid
            needsUpdate = true
            console.log(`  ✅ ${subscriptionId}: Recalcul isValid (${isValid ? 'valide' : 'expiré'})`)
          }
        }

        if (needsUpdate && !dryRun) {
          await doc.ref.update(updates)
          migrated++
          console.log(`✅ ${subscriptionId}: Migration complétée\n`)
        } else if (needsUpdate && dryRun) {
          migrated++
          console.log(`🔍 ${subscriptionId}: [DRY-RUN] Modifications à appliquer\n`)
        } else {
          skipped++
          console.log(`⏭️  ${subscriptionId}: Déjà conforme\n`)
        }
      } catch (error) {
        console.error(`❌ ${subscriptionId}: Erreur lors de la migration:`, error)
        errors++
      }
    }

    console.log(`\n📊 Résumé de la migration:`)
    console.log(`   ✅ Migrés: ${migrated}`)
    console.log(`   ⏭️  Ignorés: ${skipped}`)
    console.log(`   ❌ Erreurs: ${errors}`)
    if (dryRun) {
      console.log(`\n⚠️  MODE DRY-RUN : Aucune modification n'a été effectuée`)
    } else {
      console.log(`\n✅ Migration terminée!\n`)
    }
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error)
    process.exit(1)
  }
}

// Point d'entrée
const env = process.argv[2] || 'dev'
const dryRun = process.argv.includes('--dry-run')

if (!ENV_CONFIG[env]) {
  console.error(`❌ Environnement invalide: ${env}`)
  console.error(`Usage: npx tsx scripts/migrate-subscriptions-fix-attributes.ts [dev|preprod|prod] [--dry-run] [--yes]`)
  process.exit(1)
}

migrateSubscriptions(env, dryRun)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Erreur fatale:', error)
    process.exit(1)
  })
