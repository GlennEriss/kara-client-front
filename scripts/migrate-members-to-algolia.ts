/**
 * Script de migration des membres (collection users) vers Algolia
 * 
 * Usage: 
 *   export ALGOLIA_APP_ID=VOTRE_APP_ID
 *   export ALGOLIA_WRITE_API_KEY=votre_admin_key
 *   npx tsx scripts/migrate-members-to-algolia.ts [dev|prod] [--dry-run] [--clear-index]
 * 
 * Options:
 *   --dry-run      : Teste la migration sans indexer dans Algolia
 *   --clear-index  : Vide l'index Algolia avant la migration
 * 
 * Ce script migre tous les membres de Firestore (collection users) vers Algolia.
 * Seuls les membres avec rôles Adherant, Bienfaiteur ou Sympathisant sont indexés.
 * 
 * IMPORTANT: searchableText est généré dynamiquement depuis les données Firestore,
 * il n'existe PAS dans Firestore, seulement dans Algolia.
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { algoliasearch } from 'algoliasearch'
import * as path from 'path'
import * as fs from 'fs'
import { generateMemberSearchableText, extractMemberSearchableData } from '../src/utils/memberSearchableText'

// Configuration par environnement
const ENV_CONFIG: Record<string, { projectId: string; indexName: string }> = {
  dev: {
    projectId: 'kara-gabon-dev',
    indexName: 'members-dev',
  },
  preprod: {
    projectId: 'kara-gabon-preprod',
    indexName: 'members-preprod',
  },
  prod: {
    projectId: 'kara-gabon',
    indexName: 'members-prod',
  },
}

// Rôles considérés comme membres (exclut Admin, SuperAdmin, Secretary)
const MEMBER_ROLES = ['Adherant', 'Bienfaiteur', 'Sympathisant']

/**
 * Vérifie si un document User est un membre (pas un admin)
 */
function isMember(data: any): boolean {
  if (!data.roles || !Array.isArray(data.roles)) {
    return false
  }
  return data.roles.some((role: string) => MEMBER_ROLES.includes(role))
}

/**
 * Convertit un timestamp Firestore en millisecondes de manière sécurisée
 * Gère les Timestamp Firebase Admin SDK, les objets { seconds, nanoseconds }, les Date, etc.
 */
function timestampToMillis(value: any): number {
  if (!value) {
    return Date.now()
  }

  // Timestamp Firebase Admin SDK (avec toMillis)
  if (value && typeof value.toMillis === 'function') {
    try {
      return value.toMillis()
    } catch {
      return Date.now()
    }
  }

  // Timestamp Firebase Admin SDK (avec toDate)
  if (value && typeof value.toDate === 'function') {
    try {
      return value.toDate().getTime()
    } catch {
      return Date.now()
    }
  }

  // Objet brut { seconds, nanoseconds }
  if (typeof value === 'object' && value !== null && typeof value.seconds === 'number') {
    const millis = value.seconds * 1000 + (value.nanoseconds || 0) / 1e6
    return millis
  }

  // Date JavaScript
  if (value instanceof Date) {
    return value.getTime()
  }

  // String ou number
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value)
    if (!isNaN(date.getTime())) {
      return date.getTime()
    }
  }

  // Fallback
  return Date.now()
}

// Initialiser Firebase Admin
function initializeFirebaseAdmin(env: string) {
  if (getApps().length > 0) {
    return getApps()[0]
  }

  const config = ENV_CONFIG[env]
  if (!config) {
    throw new Error(`Environnement invalide: ${env}. Utilisez: dev ou prod`)
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
  let serviceAccountFile: string | undefined

  if (env === 'dev') {
    serviceAccountFile = files.find(f => f.includes('kara-gabon-dev') && f.endsWith('.json'))
  } else if (env === 'preprod') {
    serviceAccountFile = files.find(f => f.includes('kara-gabon-preprod') && f.endsWith('.json'))
  } else if (env === 'prod') {
    serviceAccountFile = files.find(f => f.includes('kara-gabon') && !f.includes('dev') && !f.includes('preprod') && f.endsWith('.json'))
  }

  if (!serviceAccountFile) {
    throw new Error(`Fichier service account pour ${env} non trouvé dans service-accounts/`)
  }

  const serviceAccountPath = path.join(serviceAccountsDir, serviceAccountFile)
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'))

  return initializeApp({
    credential: cert(serviceAccount),
    projectId: config.projectId,
  })
}

/**
 * Migration principale
 */
async function migrateMembersToAlgolia(env: string, options: { dryRun?: boolean; clearIndex?: boolean } = {}) {
  // Vérifier les variables d'environnement Algolia
  const algoliaAppId = process.env.ALGOLIA_APP_ID
  const algoliaAdminKey = process.env.ALGOLIA_WRITE_API_KEY

  if (!algoliaAppId || !algoliaAdminKey) {
    throw new Error('Variables d\'environnement manquantes. Définissez ALGOLIA_APP_ID et ALGOLIA_WRITE_API_KEY')
  }

  const config = ENV_CONFIG[env]
  if (!config) {
    throw new Error(`Environnement invalide: ${env}. Utilisez: dev ou prod`)
  }

  // Initialiser Firebase Admin
  initializeFirebaseAdmin(env)
  const db = getFirestore()

  // Initialiser Algolia
  const algoliaClient = await algoliasearch(algoliaAppId, algoliaAdminKey)
  const indexName = config.indexName

  console.log('🚀 Démarrage de la migration des membres vers Algolia')
  console.log(`📊 Environnement: ${env}`)
  console.log(`📊 Index Algolia: ${indexName}`)
  console.log(`📊 Collection Firestore: users`)
  console.log(`📊 Rôles membres: ${MEMBER_ROLES.join(', ')}`)
  if (options.dryRun) {
    console.log(`⚠️  MODE DRY-RUN: Aucune donnée ne sera indexée dans Algolia`)
  }
  if (options.clearIndex) {
    console.log(`🗑️  L'index sera vidé avant la migration`)
  }
  console.log('')

  // Vider l'index si demandé
  if (options.clearIndex && !options.dryRun) {
    console.log('🗑️  Vidage de l\'index Algolia...')
    try {
      // Récupérer tous les objectIDs pour les supprimer
      let hasMore = true
      let batchCount = 0
      let page = 0
      
      while (hasMore) {
        const searchResponse = await algoliaClient.search({
          requests: [{
            indexName,
            query: '',
            hitsPerPage: 1000,
            page,
            attributesToRetrieve: ['objectID'],
          }],
        })
        
        const firstResult = searchResponse.results[0]
        if (!firstResult || !('hits' in firstResult) || firstResult.hits.length === 0) {
          hasMore = false
        } else {
          const hits = firstResult.hits as Array<{ objectID: string }>
          const objectIDs = hits.map((hit: { objectID: string }) => hit.objectID)
          
          if (objectIDs.length > 0) {
            await algoliaClient.deleteObjects({ indexName, objectIDs })
            batchCount += objectIDs.length
            console.log(`  ✅ ${objectIDs.length} objets supprimés (total: ${batchCount})`)
          }
          
          // Continuer si on a récupéré 1000 résultats (il y a peut-être plus)
          hasMore = hits.length === 1000
          page++
        }
      }
      
      console.log(`✅ Index vidé: ${batchCount} objets supprimés\n`)
    } catch (error) {
      console.error('❌ Erreur lors du vidage de l\'index:', error)
      throw error
    }
  }

  const batchSize = 1000 // Algolia supporte jusqu'à 1000 objets par batch
  let lastDoc: FirebaseFirestore.DocumentSnapshot | null = null
  let totalProcessed = 0
  let totalIndexed = 0
  let totalSkipped = 0
  let totalErrors = 0
  const errors: Array<{ id: string; error: string }> = []

  // Récupérer le total de documents pour la progression
  const totalSnapshot = await db.collection('users').count().get()
  const totalDocuments = totalSnapshot.data().count
  console.log(`📊 Total de documents dans users: ${totalDocuments}`)
  console.log('')

  while (true) {
    let query = db.collection('users').orderBy('createdAt', 'desc').limit(batchSize)
    
    if (lastDoc) {
      query = query.startAfter(lastDoc)
    }

    const snapshot = await query.get()

    if (snapshot.empty) {
      break
    }

    const objects: any[] = []

    snapshot.forEach((doc) => {
      try {
        const data = doc.data()
        
        // Filtrer uniquement les membres (pas les admins)
        if (!isMember(data)) {
          totalSkipped++
          return
        }

        // Extraire les données de recherche
        const searchableData = extractMemberSearchableData(data)
        
        // Générer searchableText dynamiquement
        const searchableText = generateMemberSearchableText(searchableData)

        // Préparer l'objet pour Algolia
        const algoliaObject = {
          objectID: doc.id, // ID = matricule = UID Firebase
          // Champ principal de recherche (généré dynamiquement)
          searchableText,
          // Champs de recherche secondaires
          matricule: data.matricule || doc.id,
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email || '',
          contacts: data.contacts || [],
          // Informations professionnelles
          companyId: data.companyId || null,
          companyName: data.companyName || '',
          professionId: data.professionId || null,
          profession: data.profession || '',
          // Adresse
          province: data.address?.province || '',
          city: data.address?.city || '',
          district: data.address?.district || '',
          arrondissement: data.address?.arrondissement || '',
          // Attributs filtrables (facets)
          membershipType: data.membershipType || 'adherant',
          roles: data.roles || [],
          isActive: data.isActive !== false, // Par défaut actif
          gender: data.gender || 'M',
          hasCar: data.hasCar || false,
          // Timestamps (pour tri) - conversion sécurisée
          createdAt: timestampToMillis(data.createdAt),
          updatedAt: timestampToMillis(data.updatedAt),
        }

        objects.push(algoliaObject)
        totalProcessed++
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        errors.push({ id: doc.id, error: errorMessage })
        totalErrors++
        console.error(`❌ Erreur lors de la préparation du document ${doc.id}:`, errorMessage)
      }
    })

    // Indexer le batch dans Algolia (sauf en mode dry-run)
    if (objects.length > 0) {
      if (options.dryRun) {
        // Mode dry-run : simuler l'indexation
        totalIndexed += objects.length
        const percentage = Math.round((totalProcessed / totalDocuments) * 100)
        console.log(`🔍 [DRY-RUN] Batch simulé: ${objects.length} membres | Total traité: ${totalProcessed}/${totalDocuments} (${percentage}%) | Simulés: ${totalIndexed}`)
      } else {
        try {
          await algoliaClient.saveObjects({
            indexName,
            objects,
          })
          
          totalIndexed += objects.length
          
          // Afficher la progression
          const percentage = Math.round((totalProcessed / totalDocuments) * 100)
          console.log(`✅ Batch indexé: ${objects.length} membres | Total traité: ${totalProcessed}/${totalDocuments} (${percentage}%) | Indexés: ${totalIndexed}`)
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          console.error(`❌ Erreur lors de l'indexation du batch:`, errorMessage)
          totalErrors += objects.length
          
          // Ajouter les erreurs individuelles
          objects.forEach(obj => {
            errors.push({ id: obj.objectID, error: errorMessage })
          })
        }
      }
    }

    lastDoc = snapshot.docs[snapshot.docs.length - 1]
  }

  // Statistiques finales
  console.log('')
  console.log('='.repeat(60))
  console.log(`📊 STATISTIQUES DE MIGRATION${options.dryRun ? ' (DRY-RUN)' : ''}`)
  console.log('='.repeat(60))
  if (options.dryRun) {
    console.log(`🔍 Membres simulés (non indexés): ${totalIndexed}`)
  } else {
    console.log(`✅ Membres indexés avec succès: ${totalIndexed}`)
  }
  console.log(`⏭️  Documents ignorés (non-membres): ${totalSkipped}`)
  console.log(`❌ Documents en erreur: ${totalErrors}`)
  console.log(`📊 Total traité: ${totalProcessed}`)
  console.log(`📊 Index Algolia: ${indexName}`)
  console.log('='.repeat(60))

  if (errors.length > 0) {
    console.log('')
    console.log('❌ ERREURS DÉTAILLÉES:')
    errors.slice(0, 10).forEach(({ id, error }) => {
      console.log(`  - ${id}: ${error}`)
    })
    if (errors.length > 10) {
      console.log(`  ... et ${errors.length - 10} autres erreurs`)
    }
  }

  if (totalIndexed > 0) {
    console.log('')
    if (options.dryRun) {
      console.log(`🔍 Simulation terminée ! ${totalIndexed} membres seraient indexés dans Algolia.`)
      console.log(`💡 Pour exécuter réellement la migration, relancez sans --dry-run`)
    } else {
      console.log(`🎉 Migration terminée avec succès ! ${totalIndexed} membres indexés dans Algolia.`)
    }
  }

  if (totalErrors > 0) {
    console.log('')
    console.log(`⚠️  ${totalErrors} documents n'ont pas pu être indexés. Vérifiez les erreurs ci-dessus.`)
    if (!options.dryRun) {
      process.exit(1)
    }
  }
}

// Point d'entrée
const args = process.argv.slice(2)
const env = args.find(arg => ['dev', 'preprod', 'prod'].includes(arg)) || 'dev'
const options = {
  dryRun: args.includes('--dry-run'),
  clearIndex: args.includes('--clear-index'),
}

if (!['dev', 'preprod', 'prod'].includes(env)) {
  console.error('❌ Environnement invalide. Utilisez: dev, preprod ou prod')
  process.exit(1)
}

if (options.dryRun && options.clearIndex) {
  console.warn('⚠️  --clear-index est ignoré en mode --dry-run')
  options.clearIndex = false
}

migrateMembersToAlgolia(env, options)
  .then(() => {
    console.log('✅ Script terminé avec succès')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Erreur fatale:', error)
    process.exit(1)
  })
