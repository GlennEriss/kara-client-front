/**
 * Script de migration pour transférer les contacts d'urgence des demandes Caisse Spéciale vers les contrats
 *
 * Ce script :
 * 1. Récupère toutes les demandes converties (avec contractId) qui ont un emergencyContact
 * 2. Met à jour les contrats correspondants avec le emergencyContact de la demande
 *
 * Usage:
 *   pnpm tsx scripts/migrate-emergency-contacts-to-contracts.ts dev      # Base DEV
 *   pnpm tsx scripts/migrate-emergency-contacts-to-contracts.ts preprod  # Base préprod
 *   pnpm tsx scripts/migrate-emergency-contacts-to-contracts.ts prod     # Base PROD
 *
 * Options:
 *   --dry-run : Affiche ce qui serait fait sans modifier la base
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import * as path from 'path'
import * as fs from 'fs'

const ENV_CONFIG: Record<string, { projectId: string; description: string }> = {
  dev: { projectId: 'kara-gabon-dev', description: 'Développement' },
  preprod: { projectId: 'kara-gabon-preprod', description: 'Pré-production' },
  prod: { projectId: 'kara-gabon', description: 'Production' },
}

const DEMANDS_COLLECTION = 'caisseSpecialeDemands'
const CONTRACTS_COLLECTION = 'caisseContracts'

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
  const args = process.argv.slice(2)
  const env = args.find((a) => !a.startsWith('--')) || 'dev'
  const dryRun = args.includes('--dry-run')
  const config = ENV_CONFIG[env]

  if (!config) {
    console.error(`❌ Environnement invalide: "${env}"`)
    console.log('   Usage: pnpm tsx scripts/migrate-emergency-contacts-to-contracts.ts [dev|preprod|prod] [--dry-run]')
    process.exit(1)
  }

  console.log(`\n${'='.repeat(70)}`)
  console.log(`🚀 Migration Contacts d'Urgence → Contrats Caisse Spéciale`)
  console.log(`   Environnement: ${config.description} (${config.projectId})`)
  if (dryRun) {
    console.log(`   ⚠️  MODE DRY-RUN : Aucune modification ne sera effectuée`)
  }
  console.log(`${'='.repeat(70)}\n`)

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
  console.log(`📂 Collection demandes: ${DEMANDS_COLLECTION}`)
  console.log(`📂 Collection contrats: ${CONTRACTS_COLLECTION}\n`)

  try {
    // 1. Récupérer toutes les demandes converties (avec contractId)
    console.log('🔍 Recherche des demandes converties avec contact d\'urgence...\n')
    
    const demandsSnapshot = await db.collection(DEMANDS_COLLECTION)
      .where('status', '==', 'CONVERTED')
      .get()

    console.log(`   📋 ${demandsSnapshot.size} demande(s) convertie(s) trouvée(s)\n`)

    // 2. Filtrer celles qui ont un emergencyContact et un contractId
    const demandsWithEmergencyContact = demandsSnapshot.docs.filter((doc) => {
      const data = doc.data()
      return data.emergencyContact && data.contractId
    })

    console.log(`   📋 ${demandsWithEmergencyContact.length} demande(s) avec contact d'urgence et contractId\n`)

    if (demandsWithEmergencyContact.length === 0) {
      console.log('ℹ️  Aucune demande à migrer.')
      console.log('\n' + '='.repeat(70))
      console.log('🎉 Migration terminée (rien à faire).')
      return
    }

    // 3. Pour chaque demande, vérifier si le contrat existe et n'a pas déjà un emergencyContact
    let updated = 0
    let skipped = 0
    let contractNotFound = 0
    let alreadyHasEmergencyContact = 0
    let errors = 0

    let batch = db.batch()
    let batchCount = 0
    const MAX_BATCH_SIZE = 500

    for (const demandDoc of demandsWithEmergencyContact) {
      const demandData = demandDoc.data()
      const contractId = demandData.contractId
      const emergencyContact = demandData.emergencyContact

      try {
        // Vérifier si le contrat existe
        const contractRef = db.collection(CONTRACTS_COLLECTION).doc(contractId)
        const contractDoc = await contractRef.get()

        if (!contractDoc.exists) {
          console.log(`   ⚠️  Contrat ${contractId} non trouvé (demande: ${demandDoc.id})`)
          contractNotFound++
          continue
        }

        const contractData = contractDoc.data()

        // Vérifier si le contrat a déjà un emergencyContact
        if (contractData?.emergencyContact) {
          console.log(`   ⏭️  Contrat ${contractId} a déjà un contact d'urgence`)
          alreadyHasEmergencyContact++
          skipped++
          continue
        }

        // Préparer les infos du contact d'urgence pour l'affichage
        const contactInfo = `${emergencyContact.lastName || ''} ${emergencyContact.firstName || ''} (${emergencyContact.phone1 || 'N/A'})`.trim()

        if (dryRun) {
          console.log(`   🔄 [DRY-RUN] Contrat ${contractId} ← Contact: ${contactInfo}`)
          updated++
        } else {
          // Mettre à jour le contrat avec le emergencyContact
          batch.update(contractRef, { emergencyContact })
          batchCount++
          updated++
          console.log(`   ✅ Contrat ${contractId} ← Contact: ${contactInfo}`)

          // Commiter le batch si on atteint la limite
          if (batchCount >= MAX_BATCH_SIZE) {
            await batch.commit()
            console.log(`\n   📦 Batch de ${batchCount} documents committé\n`)
            batch = db.batch()
            batchCount = 0
          }
        }
      } catch (err) {
        console.error(`   ❌ Erreur pour demande ${demandDoc.id} / contrat ${contractId}:`, err)
        errors++
      }
    }

    // Commiter le dernier batch
    if (!dryRun && batchCount > 0) {
      await batch.commit()
      console.log(`\n   📦 Batch final de ${batchCount} documents committé`)
    }

    // Résumé
    console.log('\n' + '='.repeat(70))
    console.log('📊 RÉSUMÉ DE LA MIGRATION')
    console.log('='.repeat(70))
    console.log(`   ✅ Contrats mis à jour:                    ${updated}`)
    console.log(`   ⏭️  Contrats ignorés (déjà un contact):    ${alreadyHasEmergencyContact}`)
    console.log(`   ⚠️  Contrats non trouvés:                  ${contractNotFound}`)
    if (errors > 0) {
      console.log(`   ❌ Erreurs:                                ${errors}`)
    }
    console.log('='.repeat(70))
    
    if (dryRun) {
      console.log('\n⚠️  MODE DRY-RUN : Aucune modification effectuée.')
      console.log('   Relancez sans --dry-run pour appliquer les changements.')
    } else {
      console.log('\n🎉 Migration terminée avec succès!')
      console.log('   Les contacts d\'urgence ont été transférés vers les contrats.')
    }
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error)
    process.exit(1)
  }
}

migrate().catch(console.error)
