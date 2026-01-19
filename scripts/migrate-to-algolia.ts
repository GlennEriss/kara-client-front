/**
 * Script de migration des demandes d'adhésion vers Algolia
 * 
 * Usage: 
 *   export ALGOLIA_APP_ID=IYE83A0LRH
 *   export ALGOLIA_WRITE_API_KEY=f37a6169f18864759940d3a3125625f2
 *   npx tsx scripts/migrate-to-algolia.ts [dev|preprod|prod]
 * 
 * Ce script migre toutes les demandes d'adhésion de Firestore vers Algolia.
 * 
 * IMPORTANT: searchableText est généré dynamiquement depuis les données Firestore,
 * il n'existe PAS dans Firestore, seulement dans Algolia.
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
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
 * 
 * IMPORTANT: Cette fonction génère searchableText dynamiquement depuis les données Firestore.
 * searchableText n'existe PAS dans Firestore, seulement dans Algolia.
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
  // IMPORTANT : Inclure tous les numéros de téléphone dans searchableText
  if (data.identity?.contacts && Array.isArray(data.identity.contacts)) {
    data.identity.contacts.forEach((contact: string) => {
      if (contact && typeof contact === 'string') {
        // Normaliser le téléphone : supprimer espaces, tirets, parenthèses
        const normalizedPhone = contact.replace(/[\s\-\(\)]/g, '').toLowerCase()
        parts.push(normalizedPhone)
      }
    })
  }
  
  return parts.join(' ')
}

/**
 * Migration principale
 */
async function migrateToAlgolia(env: string) {
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

  console.log(`🚀 Démarrage de la migration vers Algolia`)
  console.log(`📊 Environnement: ${env}`)
  console.log(`📊 Index Algolia: ${indexName}`)
  console.log(`📊 Collection Firestore: membership-requests`)
  console.log('')

  const batchSize = 100 // Traiter par batch de 100
  let lastDoc: FirebaseFirestore.DocumentSnapshot | null = null
  let totalProcessed = 0
  let totalSuccess = 0
  let totalErrors = 0
  const errors: Array<{ id: string; error: string }> = []

  // Récupérer le total de documents pour la progression
  const totalSnapshot = await db.collection('membership-requests').count().get()
  const totalDocuments = totalSnapshot.data().count
  console.log(`📊 Total de documents à migrer: ${totalDocuments}`)
  console.log('')

  while (true) {
    let query = db.collection('membership-requests').orderBy('createdAt', 'desc').limit(batchSize)
    
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
        
        // Générer searchableText dynamiquement
        const searchableText = generateSearchableText(doc.id, data)

        // Préparer l'objet pour Algolia
        objects.push({
          objectID: doc.id,
          // Champ principal de recherche (généré dynamiquement)
          searchableText,
          // Champs individuels (pour affichage, filtres, recherche secondaire)
          matricule: data.matricule || '',
          firstName: data.identity?.firstName || '',
          lastName: data.identity?.lastName || '',
          email: data.identity?.email || '',
          contacts: data.identity?.contacts || [],
          // Facets pour filtres
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
        
        totalSuccess += objects.length
        totalProcessed += objects.length
        
        // Afficher la progression
        const percentage = Math.round((totalProcessed / totalDocuments) * 100)
        console.log(`✅ Batch indexé: ${objects.length} documents | Total: ${totalProcessed}/${totalDocuments} (${percentage}%)`)
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

    lastDoc = snapshot.docs[snapshot.docs.length - 1]
  }

  // Statistiques finales
  console.log('')
  console.log('='.repeat(60))
  console.log('📊 STATISTIQUES DE MIGRATION')
  console.log('='.repeat(60))
  console.log(`✅ Documents indexés avec succès: ${totalSuccess}`)
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

  if (totalSuccess > 0) {
    console.log('')
    console.log(`🎉 Migration terminée avec succès ! ${totalSuccess} documents indexés dans Algolia.`)
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

migrateToAlgolia(env)
  .then(() => {
    console.log('✅ Script terminé avec succès')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Erreur fatale:', error)
    process.exit(1)
  })
