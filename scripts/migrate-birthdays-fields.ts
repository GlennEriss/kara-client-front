/**
 * Script de migration : Ajouter les champs d'anniversaire aux utilisateurs existants
 * 
 * Ce script ajoute les champs suivants aux documents de la collection `users` :
 * - birthMonth (1-12) : Mois de naissance
 * - birthDay (1-31) : Jour de naissance
 * - birthDayOfYear (1-366) : Jour de l'année de naissance
 * 
 * Ces champs sont calculés à partir de `birthDate` existant.
 * Les documents déjà migrés (qui ont `birthDayOfYear`) sont ignorés.
 * 
 * Usage:
 *   npx tsx scripts/migrate-birthdays-fields.ts [dev|preprod|prod] [--dry-run]
 * 
 * Exemples:
 *   npx tsx scripts/migrate-birthdays-fields.ts dev
 *   npx tsx scripts/migrate-birthdays-fields.ts prod --dry-run
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
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

const COLLECTION_NAME = 'users'
const BATCH_SIZE = 500 // Limite Firestore par batch
const PAGE_SIZE = 1000 // Nombre de documents à lire par page

/**
 * Calcule le jour de l'année (1-366) pour une date donnée
 * Gère correctement les années bissextiles
 */
function calculateDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = date.getTime() - start.getTime()
  const oneDay = 1000 * 60 * 60 * 24
  return Math.floor(diff / oneDay)
}

/**
 * Calcule les champs d'anniversaire à partir de birthDate
 */
function calculateBirthdayFields(birthDateStr: string | undefined | null): {
  birthMonth: number | null
  birthDay: number | null
  birthDayOfYear: number | null
} {
  if (!birthDateStr) {
    return { birthMonth: null, birthDay: null, birthDayOfYear: null }
  }

  try {
    // Gérer les Timestamp Firestore
    let birthDate: Date
    if (typeof birthDateStr === 'object' && birthDateStr !== null) {
      if ('toDate' in birthDateStr) {
        // Timestamp Firestore
        birthDate = (birthDateStr as any).toDate()
      } else if ((birthDateStr as any) instanceof Date) {
        birthDate = birthDateStr as Date
      } else {
        // Essayer de convertir en Date
        birthDate = new Date(birthDateStr as any)
      }
    } else if (typeof birthDateStr === 'string') {
      birthDate = new Date(birthDateStr)
    } else {
      // Type inconnu, essayer de convertir
      birthDate = new Date(birthDateStr as any)
    }

    if (isNaN(birthDate.getTime())) {
      return { birthMonth: null, birthDay: null, birthDayOfYear: null }
    }

    const birthMonth = birthDate.getMonth() + 1 // 1-12
    const birthDay = birthDate.getDate() // 1-31
    const birthDayOfYear = calculateDayOfYear(birthDate) // 1-366

    return { birthMonth, birthDay, birthDayOfYear }
  } catch (error) {
    return { birthMonth: null, birthDay: null, birthDayOfYear: null }
  }
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
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes' || answer === '')
    })
  })
}

async function migrate(env: string, dryRun: boolean = false) {
  const config = ENV_CONFIG[env]
  if (!config) {
    console.error(`❌ Environnement invalide: ${env}`)
    console.error(`   Environnements disponibles: ${Object.keys(ENV_CONFIG).join(', ')}`)
    process.exit(1)
  }

  console.log('🚀 Démarrage de la migration des champs d\'anniversaire\n')
  console.log(`📋 Environnement: ${env} (${config.description})`)
  console.log(`📋 Projet: ${config.projectId}`)
  console.log(`📋 Collection: ${COLLECTION_NAME}`)
  console.log(`📋 Mode: ${dryRun ? 'DRY RUN (simulation)' : 'EXÉCUTION RÉELLE'}\n`)

  if (!dryRun) {
    const confirmed = await askConfirmation(
      `⚠️  Vous allez modifier la collection "${COLLECTION_NAME}" du projet "${config.projectId}".\n` +
      `   Continuer ? (y/N): `
    )
    if (!confirmed) {
      console.log('❌ Migration annulée.')
      process.exit(0)
    }
  }

  // Initialiser Firebase Admin
  const db = initializeFirebase(env, config.projectId)
  console.log(`✅ Firebase Admin initialisé pour le projet: ${config.projectId}\n`)

  let totalProcessed = 0
  let totalUpdated = 0
  let totalSkipped = 0
  let totalErrors = 0
  let totalNoBirthDate = 0

  try {
    console.log(`📂 Récupération des documents de la collection "${COLLECTION_NAME}"...\n`)

    let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null
    let batch = db.batch()
    let batchCount = 0

    while (true) {
      // Construire la requête avec pagination
      let query = db.collection(COLLECTION_NAME).orderBy('__name__').limit(PAGE_SIZE)
      if (lastDoc) {
        query = query.startAfter(lastDoc)
      }

      const snapshot = await query.get()

      if (snapshot.empty) {
        break
      }

      console.log(`📄 Traitement de ${snapshot.size} documents (total traité: ${totalProcessed})...`)

      for (const docSnap of snapshot.docs) {
        totalProcessed++
        const data = docSnap.data()
        const docId = docSnap.id

        // Skip si déjà migré
        if (data.birthDayOfYear !== undefined && data.birthDayOfYear !== null) {
          totalSkipped++
          lastDoc = docSnap
          continue
        }

        // Skip si pas de birthDate
        if (!data.birthDate) {
          totalNoBirthDate++
          lastDoc = docSnap
          continue
        }

        // Calculer les champs d'anniversaire
        const birthdayFields = calculateBirthdayFields(data.birthDate)

        // Vérifier si le calcul a réussi
        if (birthdayFields.birthDayOfYear === null) {
          console.warn(`   ⚠️  Document ${docId}: birthDate invalide (${data.birthDate})`)
          totalErrors++
          lastDoc = docSnap
          continue
        }

        // Ajouter au batch
        try {
          if (dryRun) {
            console.log(`   [DRY RUN] ${docId}: ajouterait birthMonth=${birthdayFields.birthMonth}, birthDay=${birthdayFields.birthDay}, birthDayOfYear=${birthdayFields.birthDayOfYear}`)
          } else {
            batch.update(docSnap.ref, {
              birthMonth: birthdayFields.birthMonth,
              birthDay: birthdayFields.birthDay,
              birthDayOfYear: birthdayFields.birthDayOfYear,
            })
            batchCount++
          }
          totalUpdated++

          // Commit le batch si trop grand
          if (!dryRun && batchCount >= BATCH_SIZE) {
            await batch.commit()
            console.log(`   ✅ Batch de ${batchCount} documents committé`)
            batch = db.batch()
            batchCount = 0
          }
        } catch (error: any) {
          console.error(`   ❌ Erreur pour le document ${docId}:`, error.message)
          totalErrors++
        }

        lastDoc = docSnap

        // Afficher un log tous les 100 documents
        if (totalProcessed % 100 === 0) {
          console.log(`   ⏳ ${totalProcessed} documents traités... (${totalUpdated} mis à jour, ${totalSkipped} ignorés)`)
        }
      }

      // Si on a traité moins de PAGE_SIZE, on a fini
      if (snapshot.size < PAGE_SIZE) {
        break
      }
    }

    // Commit le dernier batch s'il y en a un
    if (!dryRun && batchCount > 0) {
      await batch.commit()
      console.log(`   ✅ Dernier batch de ${batchCount} documents committé\n`)
    }

    // Résumé
    console.log('\n📊 Résumé de la migration:')
    console.log(`   ✅ ${totalUpdated} documents mis à jour`)
    console.log(`   ⏭️  ${totalSkipped} documents ignorés (déjà migrés)`)
    console.log(`   ⚠️  ${totalNoBirthDate} documents sans birthDate`)
    if (totalErrors > 0) {
      console.log(`   ❌ ${totalErrors} erreurs`)
    }
    console.log(`   📝 Total traité: ${totalProcessed} documents\n`)

    if (dryRun) {
      console.log('🔍 Mode DRY RUN: Aucune modification n\'a été effectuée.\n')
      console.log('   Pour exécuter réellement la migration, relancez sans --dry-run\n')
    } else if (totalUpdated > 0) {
      console.log('✨ Migration terminée avec succès!\n')
    } else {
      console.log('✨ Aucune mise à jour nécessaire. Tous les documents ont déjà les champs d\'anniversaire.\n')
    }

  } catch (error: any) {
    console.error('\n❌ Erreur lors de la migration:', error.message)
    console.error(error)
    process.exit(1)
  }
}

// Parser les arguments
const args = process.argv.slice(2)
const env = args[0] || 'dev'
const dryRun = args.includes('--dry-run') || args.includes('-d')

if (!ENV_CONFIG[env]) {
  console.error(`❌ Environnement invalide: ${env}`)
  console.error(`   Usage: npx tsx scripts/migrate-birthdays-fields.ts [dev|preprod|prod] [--dry-run]`)
  process.exit(1)
}

// Exécuter la migration
migrate(env, dryRun)
  .then(() => {
    console.log('👋 Script terminé.')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Erreur fatale:', error)
    process.exit(1)
  })
