/**
 * Cloud Function pour synchroniser les demandes d'adhésion vers Algolia
 * 
 * Cette fonction écoute les changements dans la collection 'membership-requests'
 * et synchronise automatiquement les documents vers Algolia.
 * 
 * IMPORTANT: searchableText est généré dynamiquement depuis les données Firestore,
 * il n'existe PAS dans Firestore, seulement dans Algolia.
 * 
 * Voir MULTI_ENVIRONNEMENTS_ALGOLIA.md pour la configuration des environnements.
 */

import * as admin from 'firebase-admin'
import { onDocumentWritten } from 'firebase-functions/v2/firestore'
import { algoliasearch } from 'algoliasearch'

// Détection de l'environnement depuis le projet Firebase
function getAlgoliaConfig() {
  const projectId = admin.app().options.projectId
  
  // Mapping projet Firebase → environnement
  const envMap: Record<string, string> = {
    'kara-gabon-dev': 'dev',
    'kara-gabon-preprod': 'preprod',
    'kara-gabon': 'prod',
  }
  
  const env = envMap[projectId || ''] || 'dev'
  
  // Récupérer la config depuis Firebase Functions Config ou process.env
  // Priorité: functions.config() (si disponible) > process.env
  let functionsConfig: any = {}
  try {
    // Essayer d'utiliser functions.config() (compatible v1 et v2)
    const functions = require('firebase-functions')
    if (functions.config && functions.config().algolia) {
      functionsConfig = functions.config().algolia
    }
  } catch (error) {
    // functions.config() non disponible, utiliser process.env
  }

  const config = {
    appId: functionsConfig.app_id || process.env.ALGOLIA_APP_ID || '',
    adminKey: functionsConfig.write_api_key || process.env.ALGOLIA_WRITE_API_KEY || '',
    indexName: functionsConfig.index_name || process.env.ALGOLIA_INDEX_NAME || `membership-requests-${env}`,
    env,
  }
  
  if (!config.appId || !config.adminKey) {
    throw new Error(`Algolia n'est pas configuré pour l'environnement ${env}. Vérifiez ALGOLIA_APP_ID et ALGOLIA_WRITE_API_KEY`)
  }
  
  return config
}

// Initialiser Algolia (une seule fois)
let algoliaClient: Awaited<ReturnType<typeof algoliasearch>> | null = null
let algoliaIndexName: string | null = null

async function getAlgoliaClient() {
  if (!algoliaClient) {
    const config = getAlgoliaConfig()
    algoliaClient = await algoliasearch(config.appId, config.adminKey)
    algoliaIndexName = config.indexName
    
    console.log(`🔍 Algolia configuré pour: ${config.env}`)
    console.log(`📊 Index utilisé: ${config.indexName}`)
  }
  
  return { client: algoliaClient, indexName: algoliaIndexName! }
}

/**
 * Normalise un texte pour la recherche
 * - Convertit en minuscules
 * - Supprime les accents
 * - Trim les espaces
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
 * 
 * @param requestId - ID du document
 * @param data - Données du document Firestore
 * @returns Texte normalisé avec tous les champs de recherche
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
 * Cloud Function qui synchronise les documents Firestore vers Algolia
 * 
 * Écoute les changements dans 'membership-requests/{requestId}' et :
 * - Crée/met à jour le document dans Algolia si le document existe
 * - Supprime le document d'Algolia si le document est supprimé
 */
export const syncToAlgolia = onDocumentWritten(
  {
    document: 'membership-requests/{requestId}',
    // Ne pas spécifier de région : utiliser la région par défaut (us-central1)
    // Firebase gère automatiquement le trigger Firestore
    memory: '256MiB',
    timeoutSeconds: 60,
  },
  async (event) => {
    const requestId = event.params.requestId
    const beforeData = event.data?.before.exists ? event.data.before.data() : null
    const afterData = event.data?.after.exists ? event.data.after.data() : null

    try {
      const { client, indexName } = await getAlgoliaClient()

      // Cas 1 : Document supprimé → supprimer d'Algolia
      if (!afterData && beforeData) {
        await client.deleteObject({
          indexName,
          objectID: requestId,
        })
        console.log(`✅ Document ${requestId} supprimé d'Algolia`)
        return
      }

      // Cas 2 : Document créé ou mis à jour → synchroniser vers Algolia
      if (afterData) {
        // Ignorer si le document n'a pas changé (éviter les boucles)
        if (beforeData) {
          // Comparer les champs pertinents pour la recherche
          const beforeRelevant = {
            matricule: beforeData.matricule,
            identity: beforeData.identity,
            isPaid: beforeData.isPaid,
            status: beforeData.status,
          }
          const afterRelevant = {
            matricule: afterData.matricule,
            identity: afterData.identity,
            isPaid: afterData.isPaid,
            status: afterData.status,
          }
          
          if (JSON.stringify(beforeRelevant) === JSON.stringify(afterRelevant)) {
            console.log(`⏭️ Document ${requestId} inchangé, ignoré`)
            return
          }
        }

        // Générer searchableText dynamiquement depuis les données Firestore
        // IMPORTANT: searchableText n'existe PAS dans Firestore, il est généré ici
        const searchableText = generateSearchableText(requestId, afterData)

        // Préparer l'objet pour Algolia
        const algoliaObject = {
          objectID: requestId,
          // Champ principal de recherche (généré dynamiquement)
          searchableText,
          // Champs individuels (pour affichage, filtres, recherche secondaire)
          matricule: afterData.matricule || '',
          firstName: afterData.identity?.firstName || '',
          lastName: afterData.identity?.lastName || '',
          email: afterData.identity?.email || '',
          contacts: afterData.identity?.contacts || [],
          // Facets pour filtres
          isPaid: afterData.isPaid || false,
          status: afterData.status || 'pending',
          createdAt: afterData.createdAt?.toMillis?.() || (afterData.createdAt ? new Date(afterData.createdAt).getTime() : Date.now()),
          updatedAt: afterData.updatedAt?.toMillis?.() || (afterData.updatedAt ? new Date(afterData.updatedAt).getTime() : Date.now()),
        }

        await client.saveObject({
          indexName,
          body: algoliaObject,
        })
        console.log(`✅ Document ${requestId} synchronisé vers Algolia`)
      }
    } catch (error) {
      console.error(`❌ Erreur lors de la synchronisation vers Algolia pour ${requestId}:`, error)
      // Ne pas throw pour éviter de bloquer les autres opérations
      // L'erreur sera loggée dans Firebase Functions
    }
  }
)
