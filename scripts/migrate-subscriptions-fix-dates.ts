/**
 * Script de migration : Renommer startDate → dateStart et endDate → dateEnd dans les abonnements
 * 
 * Ce script corrige l'incohérence où les abonnements ont été créés avec 'startDate'/'endDate'
 * alors que le frontend et l'interface TypeScript utilisent 'dateStart'/'dateEnd'.
 * 
 * Usage:
 *   npx tsx scripts/migrate-subscriptions-fix-dates.ts [dev|preprod|prod] [--yes]
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
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

async function migrateSubscriptions(env: string) {
  const config = ENV_CONFIG[env]
  if (!config) {
    console.error(`❌ Environnement invalide: ${env}`)
    console.error(`Environnements disponibles: ${Object.keys(ENV_CONFIG).join(', ')}`)
    process.exit(1)
  }

  console.log(`\n🔄 Migration des abonnements: ${config.description} (${config.projectId})`)
  console.log(`   Renommer 'startDate' → 'dateStart' et 'endDate' → 'dateEnd'\n`)

  // Vérifier si --yes est passé en argument
  const skipConfirmation = process.argv.includes('--yes') || process.argv.includes('-y')

  // Demander confirmation sauf si --yes
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
        // Renommer startDate → dateStart
        if (data.startDate && !data.dateStart) {
          updates.dateStart = data.startDate
          updates.startDate = FieldValue.delete()
          needsUpdate = true
        }

        // Renommer endDate → dateEnd
        if (data.endDate && !data.dateEnd) {
          updates.dateEnd = data.endDate
          updates.endDate = FieldValue.delete()
          needsUpdate = true
        }

        // Renommer membershipType → type (si présent)
        if (data.membershipType && !data.type) {
          updates.type = data.membershipType
          updates.membershipType = FieldValue.delete()
          needsUpdate = true
        }

        if (needsUpdate) {
          await doc.ref.update(updates)
          console.log(`✅ ${subscriptionId}: Champs renommés (startDate→dateStart, endDate→dateEnd${data.membershipType ? ', membershipType→type' : ''})`)
          migrated++
        } else {
          console.log(`⏭️  ${subscriptionId}: Déjà migré (dateStart et dateEnd présents)`)
          skipped++
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
    console.log(`\n✅ Migration terminée!\n`)
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error)
    process.exit(1)
  }
}

// Point d'entrée
const env = process.argv[2] || 'dev'

if (!ENV_CONFIG[env]) {
  console.error(`❌ Environnement invalide: ${env}`)
  console.error(`Usage: npx tsx scripts/migrate-subscriptions-fix-dates.ts [dev|preprod|prod] [--yes]`)
  process.exit(1)
}

migrateSubscriptions(env)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Erreur fatale:', error)
    process.exit(1)
  })
