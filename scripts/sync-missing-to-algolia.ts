/**
 * Script pour synchroniser uniquement les documents manquants vers Algolia
 * 
 * Ce script compare Firestore et Algolia pour identifier les documents manquants
 * et les indexe dans Algolia.
 * 
 * Usage: 
 *   export ALGOLIA_APP_ID=IYE83A0LRH
 *   export ALGOLIA_WRITE_API_KEY=votre_admin_key
 *   npx tsx scripts/sync-missing-to-algolia.ts [dev|preprod|prod]
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { algoliasearch } from 'algoliasearch'
import * as path from 'path'
import * as fs from 'fs'

// Configuration par environnement
const ENV_CONFIG: Record<string, { projectId: string; indexName: string }> = {
  dev: {
    projectId: 'kara-gabon-dev',
    indexName: 'membership-requests-dev',
  },
  preprod: {
    projectId: 'kara-gabon-preprod',
    indexName: 'membership-requests-preprod',
  },
  prod: {
    projectId: 'kara-gabon',
    indexName: 'membership-requests-prod',
  },
}

// Initialiser Firebase Admin
function initializeFirebaseAdmin(env: string) {
  if (getApps().length > 0) {
    return getApps()[0]
  }

  const config = ENV_CONFIG[env]
  if (!config) {
    throw new Error(`Environnement invalide: ${env}. Utilisez: dev, preprod ou prod`)
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
 * Normalise un texte pour la recherche
 */
function normalizeText(text: string): string {
  if (!text || typeof text !== 'string') {
    return ''
  }
  
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
    .trim()
}

/**
 * Génère le searchableText pour Algolia
 */
function generateSearchableText(requestId: string, data: any): string {
  const parts: string[] = []
  
  // ID du document
  if (requestId) {
    parts.push(normalizeText(requestId))
  }
  
  // Matricule
  if (data.matricule) {
    parts.push(normalizeText(data.matricule))
  }
  
  // Prénom
  if (data.identity?.firstName) {
    parts.push(normalizeText(data.identity.firstName))
  }
  
  // Nom
  if (data.identity?.lastName) {
    parts.push(normalizeText(data.identity.lastName))
  }
  
  // Nom complet (prénom + nom)
  if (data.identity?.firstName && data.identity?.lastName) {
    parts.push(normalizeText(`${data.identity.firstName} ${data.identity.lastName}`))
  }
  
  // Email
  if (data.identity?.email) {
    parts.push(normalizeText(data.identity.email))
  }
  
  // Téléphones : normaliser (supprimer espaces, tirets, parenthèses)
  if (data.identity?.contacts && Array.isArray(data.identity.contacts)) {
    data.identity.contacts.forEach((contact: string) => {
      if (contact && typeof contact === 'string') {
        const normalizedPhone = contact.replace(/[\s\-\(\)]/g, '').toLowerCase()
        parts.push(normalizedPhone)
      }
    })
  }
  
  return parts.join(' ')
}

/**
 * Récupère tous les objectIDs depuis Algolia
 */
async function getAllAlgoliaObjectIDs(client: any, indexName: string): Promise<Set<string>> {
  const objectIDs = new Set<string>()
  let page = 0
  const hitsPerPage = 1000

  console.log(`📊 Récupération des objectIDs depuis Algolia (index: ${indexName})...`)

  while (true) {
    try {
      const response = await client.searchSingleIndex({
        indexName,
        searchParams: {
          query: '',
          hitsPerPage,
          page,
          attributesToRetrieve: ['objectID'],
        },
      })

      if (!response.hits || response.hits.length === 0) {
        break
      }

      response.hits.forEach((hit: any) => {
        if (hit.objectID) {
          objectIDs.add(hit.objectID)
        }
      })

      console.log(`  ✅ Page ${page + 1}: ${response.hits.length} documents | Total: ${objectIDs.size}`)

      if (response.hits.length < hitsPerPage) {
        break
      }

      page++
    } catch (error) {
      // Si l'index est vide ou n'existe pas, on continue
      if (error instanceof Error && error.message.includes('Index does not exist')) {
        console.log(`  ⚠️  L'index ${indexName} n'existe pas encore (sera créé automatiquement)`)
        break
      }
      throw error
    }
  }

  return objectIDs
}

/**
 * Synchronisation principale
 */
async function syncMissingToAlgolia(env: string) {
  // Vérifier les variables d'environnement Algolia
  const algoliaAppId = process.env.ALGOLIA_APP_ID
  const algoliaAdminKey = process.env.ALGOLIA_WRITE_API_KEY

  if (!algoliaAppId || !algoliaAdminKey) {
    throw new Error('Variables d\'environnement manquantes. Définissez ALGOLIA_APP_ID et ALGOLIA_WRITE_API_KEY')
  }

  const config = ENV_CONFIG[env]
  if (!config) {
    throw new Error(`Environnement invalide: ${env}. Utilisez: dev, preprod ou prod`)
  }

  // Initialiser Firebase Admin
  initializeFirebaseAdmin(env)
  const db = getFirestore()

  // Initialiser Algolia
  const algoliaClient = await algoliasearch(algoliaAppId, algoliaAdminKey)
  const indexName = config.indexName

  console.log(`🚀 Démarrage de la synchronisation des documents manquants`)
  console.log(`📊 Environnement: ${env}`)
  console.log(`📊 Index Algolia: ${indexName}`)
  console.log(`📊 Collection Firestore: membership-requests`)
  console.log('')

  // Étape 1: Récupérer tous les objectIDs depuis Algolia
  const algoliaObjectIDs = await getAllAlgoliaObjectIDs(algoliaClient, indexName)
  console.log(`📊 Total de documents dans Algolia: ${algoliaObjectIDs.size}`)
  console.log('')

  // Étape 2: Récupérer tous les documents depuis Firestore
  console.log(`📊 Récupération des documents depuis Firestore...`)
  const firestoreSnapshot = await db.collection('membership-requests').get()
  const firestoreDocs = new Map<string, FirebaseFirestore.DocumentSnapshot>()
  
  firestoreSnapshot.forEach((doc) => {
    firestoreDocs.set(doc.id, doc)
  })
  
  console.log(`📊 Total de documents dans Firestore: ${firestoreDocs.size}`)
  console.log('')

  // Étape 3: Identifier les documents manquants
  const missingDocs: FirebaseFirestore.DocumentSnapshot[] = []
  
  firestoreDocs.forEach((doc, docId) => {
    if (!algoliaObjectIDs.has(docId)) {
      missingDocs.push(doc)
    }
  })

  console.log(`📊 Documents manquants dans Algolia: ${missingDocs.length}`)
  console.log('')

  if (missingDocs.length === 0) {
    console.log('✅ Tous les documents sont déjà synchronisés dans Algolia !')
    return
  }

  // Étape 4: Indexer les documents manquants
  const batchSize = 100
  let totalIndexed = 0
  let totalErrors = 0
  const errors: Array<{ id: string; error: string }> = []

  for (let i = 0; i < missingDocs.length; i += batchSize) {
    const batch = missingDocs.slice(i, i + batchSize)
    const objects: any[] = []

    batch.forEach((doc) => {
      try {
        const data = doc.data()
        if (!data) {
          // Très rare, mais doc.data() peut être undefined selon le type de snapshot
          throw new Error('Document Firestore vide (data undefined)')
        }
        
        // Générer searchableText dynamiquement
        const searchableText = generateSearchableText(doc.id, data)

        // Préparer l'objet pour Algolia
        objects.push({
          objectID: doc.id,
          searchableText,
          matricule: data.matricule || '',
          firstName: data.identity?.firstName || '',
          lastName: data.identity?.lastName || '',
          email: data.identity?.email || '',
          contacts: data.identity?.contacts || [],
          isPaid: data.isPaid || false,
          status: data.status || 'pending',
          createdAt: data.createdAt?.toMillis?.() || (data.createdAt ? new Date(data.createdAt).getTime() : Date.now()),
          updatedAt: data.updatedAt?.toMillis?.() || (data.updatedAt ? new Date(data.updatedAt).getTime() : Date.now()),
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        errors.push({ id: doc.id, error: errorMessage })
        totalErrors++
        console.error(`❌ Erreur lors de la préparation du document ${doc.id}:`, errorMessage)
      }
    })

    // Indexer le batch dans Algolia
    if (objects.length > 0) {
      try {
        await algoliaClient.saveObjects({
          indexName,
          objects,
        })
        
        totalIndexed += objects.length
        const percentage = Math.round((totalIndexed / missingDocs.length) * 100)
        console.log(`✅ Batch indexé: ${objects.length} documents | Total: ${totalIndexed}/${missingDocs.length} (${percentage}%)`)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.error(`❌ Erreur lors de l'indexation du batch:`, errorMessage)
        totalErrors += objects.length
        
        objects.forEach(obj => {
          errors.push({ id: obj.objectID, error: errorMessage })
        })
      }
    }
  }

  // Statistiques finales
  console.log('')
  console.log('='.repeat(60))
  console.log('📊 STATISTIQUES DE SYNCHRONISATION')
  console.log('='.repeat(60))
  console.log(`📊 Documents dans Firestore: ${firestoreDocs.size}`)
  console.log(`📊 Documents dans Algolia (avant): ${algoliaObjectIDs.size}`)
  console.log(`📊 Documents manquants identifiés: ${missingDocs.length}`)
  console.log(`✅ Documents indexés avec succès: ${totalIndexed}`)
  console.log(`❌ Documents en erreur: ${totalErrors}`)
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
    console.log(`🎉 Synchronisation terminée ! ${totalIndexed} documents manquants ont été indexés dans Algolia.`)
  }

  if (totalErrors > 0) {
    console.log('')
    console.log(`⚠️  ${totalErrors} documents n'ont pas pu être indexés. Vérifiez les erreurs ci-dessus.`)
    process.exit(1)
  }
}

// Point d'entrée
const env = process.argv[2] || 'dev'

if (!['dev', 'preprod', 'prod'].includes(env)) {
  console.error('❌ Environnement invalide. Utilisez: dev, preprod ou prod')
  process.exit(1)
}

syncMissingToAlgolia(env)
  .then(() => {
    console.log('✅ Script terminé avec succès')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Erreur fatale:', error)
    process.exit(1)
  })
