/**
 * Cloud Function pour synchroniser les membres (collection users) vers Algolia
 * 
 * Cette fonction écoute les changements dans la collection 'users'
 * et synchronise automatiquement les membres vers Algolia.
 * 
 * IMPORTANT: 
 * - Seuls les membres (rôles: Adherant, Bienfaiteur, Sympathisant) sont synchronisés
 * - Les admins (Admin, SuperAdmin, Secretary) sont ignorés
 * - searchableText est généré dynamiquement depuis les données Firestore,
 *   il n'existe PAS dans Firestore, seulement dans Algolia.
 * 
 * Voir documentation/memberships/V2/algolia/README.md pour la configuration.
 */

import * as admin from 'firebase-admin'
import { onDocumentWritten } from 'firebase-functions/v2/firestore'
import { algoliasearch } from 'algoliasearch'

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
 * Génère le searchableText pour Algolia pour un membre
 * 
 * IMPORTANT: Cette fonction génère searchableText dynamiquement depuis les données Firestore.
 * searchableText n'existe PAS dans Firestore, seulement dans Algolia.
 * 
 * @param userId - ID du document (= matricule = UID Firebase)
 * @param data - Données du document Firestore (User)
 * @returns Texte normalisé avec tous les champs de recherche
 */
function generateMemberSearchableText(userId: string, data: any): string {
  const parts: string[] = []
  
  // Matricule (identifiant principal)
  const matricule = data.matricule || userId
  if (matricule) {
    parts.push(normalizeText(matricule))
  }
  
  // Prénom
  if (data.firstName) {
    parts.push(normalizeText(data.firstName))
  }
  
  // Nom
  if (data.lastName) {
    parts.push(normalizeText(data.lastName))
  }
  
  // Nom complet (prénom + nom) - permet de chercher "jean dupont"
  if (data.firstName && data.lastName) {
    parts.push(normalizeText(`${data.firstName} ${data.lastName}`))
  }
  
  // Email
  if (data.email) {
    parts.push(normalizeText(data.email))
  }
  
  // Téléphones : normaliser (supprimer espaces, tirets, parenthèses)
  // IMPORTANT : Inclure tous les numéros de téléphone dans searchableText
  if (data.contacts && Array.isArray(data.contacts)) {
    data.contacts.forEach((contact: string) => {
      if (contact && typeof contact === 'string') {
        // Normaliser le téléphone : supprimer espaces, tirets, parenthèses
        const normalizedPhone = contact.replace(/[\s\-\(\)]/g, '').toLowerCase()
        parts.push(normalizedPhone)
      }
    })
  }
  
  // Entreprise
  if (data.companyName) {
    parts.push(normalizeText(data.companyName))
  }
  
  // Profession
  if (data.profession) {
    parts.push(normalizeText(data.profession))
  }
  
  // Province
  if (data.address?.province) {
    parts.push(normalizeText(data.address.province))
  }
  
  // Ville
  if (data.address?.city) {
    parts.push(normalizeText(data.address.city))
  }
  
  // Arrondissement
  if (data.address?.arrondissement) {
    parts.push(normalizeText(data.address.arrondissement))
  }
  
  // Quartier (district)
  if (data.address?.district) {
    parts.push(normalizeText(data.address.district))
  }
  
  return parts.join(' ')
}

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

  // Index members (différent de membership-requests)
  const baseIndexName = functionsConfig.members_index_name || process.env.ALGOLIA_MEMBERS_INDEX_NAME || 'members'
  const indexName = `${baseIndexName}-${env}`

  const config = {
    appId: functionsConfig.app_id || process.env.ALGOLIA_APP_ID || '',
    adminKey: functionsConfig.write_api_key || process.env.ALGOLIA_WRITE_API_KEY || '',
    indexName,
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
    
    console.log(`🔍 Algolia configuré pour membres: ${config.env}`)
    console.log(`📊 Index utilisé: ${config.indexName}`)
  }
  
  return { client: algoliaClient, indexName: algoliaIndexName! }
}

/**
 * Cloud Function qui synchronise les membres Firestore vers Algolia
 * 
 * Écoute les changements dans 'users/{userId}' et :
 * - Crée/met à jour le membre dans Algolia si c'est un membre (pas un admin)
 * - Supprime le membre d'Algolia si le document est supprimé ou si le rôle change vers admin
 */
export const syncMembersToAlgolia = onDocumentWritten(
  {
    document: 'users/{userId}',
    // Ne pas spécifier de région : utiliser la région par défaut (us-central1)
    // Firebase gère automatiquement le trigger Firestore
    memory: '256MiB',
    timeoutSeconds: 60,
  },
  async (event) => {
    const userId = event.params.userId
    const beforeData = event.data?.before.exists ? event.data.before.data() : null
    const afterData = event.data?.after.exists ? event.data.after.data() : null

    try {
      const { client, indexName } = await getAlgoliaClient()

      const wasMember = beforeData ? isMember(beforeData) : false
      const isMemberNow = afterData ? isMember(afterData) : false

      // Cas 1 : Document supprimé OU membre devenu admin → supprimer d'Algolia
      if ((!afterData && wasMember) || (afterData && wasMember && !isMemberNow)) {
        await client.deleteObject({
          indexName,
          objectID: userId,
        })
        console.log(`✅ Membre ${userId} supprimé d'Algolia (${!afterData ? 'document supprimé' : 'devenu admin'})`)
        return
      }

      // Cas 2 : Document créé ou mis à jour ET c'est un membre → synchroniser vers Algolia
      if (afterData && isMemberNow) {
        // Ignorer si le document n'a pas changé (éviter les boucles)
        if (beforeData && wasMember) {
          // Comparer les champs pertinents pour la recherche
          const beforeRelevant = {
            matricule: beforeData.matricule,
            firstName: beforeData.firstName,
            lastName: beforeData.lastName,
            email: beforeData.email,
            contacts: beforeData.contacts,
            companyName: beforeData.companyName,
            profession: beforeData.profession,
            address: beforeData.address,
            membershipType: beforeData.membershipType,
            roles: beforeData.roles,
            isActive: beforeData.isActive,
            gender: beforeData.gender,
            hasCar: beforeData.hasCar,
            birthDate: beforeData.birthDate,
            birthMonth: beforeData.birthMonth,
            birthDay: beforeData.birthDay,
            birthDayOfYear: beforeData.birthDayOfYear,
          }
          const afterRelevant = {
            matricule: afterData.matricule,
            firstName: afterData.firstName,
            lastName: afterData.lastName,
            email: afterData.email,
            contacts: afterData.contacts,
            companyName: afterData.companyName,
            profession: afterData.profession,
            address: afterData.address,
            membershipType: afterData.membershipType,
            roles: afterData.roles,
            isActive: afterData.isActive,
            gender: afterData.gender,
            hasCar: afterData.hasCar,
            birthDate: afterData.birthDate,
            birthMonth: afterData.birthMonth,
            birthDay: afterData.birthDay,
            birthDayOfYear: afterData.birthDayOfYear,
          }
          
          if (JSON.stringify(beforeRelevant) === JSON.stringify(afterRelevant)) {
            console.log(`⏭️ Membre ${userId} inchangé, ignoré`)
            return
          }
        }

        // Ignorer si ce n'est pas un membre (admin créé/mis à jour)
        if (!isMemberNow) {
          console.log(`⏭️ Document ${userId} n'est pas un membre, ignoré`)
          return
        }

        // Générer searchableText dynamiquement depuis les données Firestore
        // IMPORTANT: searchableText n'existe PAS dans Firestore, il est généré ici
        const searchableText = generateMemberSearchableText(userId, afterData)

        // Préparer l'objet pour Algolia
        const algoliaObject = {
          objectID: userId, // ID = matricule = UID Firebase
          // Champ principal de recherche (généré dynamiquement)
          searchableText,
          // Champs de recherche secondaires
          matricule: afterData.matricule || userId,
          firstName: afterData.firstName || '',
          lastName: afterData.lastName || '',
          email: afterData.email || '',
          contacts: afterData.contacts || [],
          // Informations professionnelles
          companyId: afterData.companyId || null,
          companyName: afterData.companyName || '',
          professionId: afterData.professionId || null,
          profession: afterData.profession || '',
          // Adresse
          province: afterData.address?.province || '',
          city: afterData.address?.city || '',
          district: afterData.address?.district || '',
          arrondissement: afterData.address?.arrondissement || '',
          // Anniversaires (pour fonctionnalité anniversaires)
          birthDate: afterData.birthDate || null,
          birthMonth: afterData.birthMonth || null,
          birthDay: afterData.birthDay || null,
          birthDayOfYear: afterData.birthDayOfYear || null,
          photoURL: afterData.photoURL || null,
          // Attributs filtrables (facets)
          membershipType: afterData.membershipType || 'adherant',
          roles: afterData.roles || [],
          isActive: afterData.isActive !== false, // Par défaut actif
          gender: afterData.gender || 'M',
          hasCar: afterData.hasCar || false,
          // Timestamps (pour tri)
          createdAt: afterData.createdAt?.toMillis?.() || (afterData.createdAt ? new Date(afterData.createdAt).getTime() : Date.now()),
          updatedAt: afterData.updatedAt?.toMillis?.() || (afterData.updatedAt ? new Date(afterData.updatedAt).getTime() : Date.now()),
        }

        await client.saveObject({
          indexName,
          body: algoliaObject,
        })
        console.log(`✅ Membre ${userId} synchronisé vers Algolia`)
      } else if (afterData && !isMemberNow) {
        // Cas 3 : Document créé/mis à jour mais ce n'est pas un membre (admin) → ignorer
        console.log(`⏭️ Document ${userId} n'est pas un membre (admin), ignoré`)
      }
    } catch (error) {
      console.error(`❌ Erreur lors de la synchronisation vers Algolia pour ${userId}:`, error)
      // Ne pas throw pour éviter de bloquer les autres opérations
      // L'erreur sera loggée dans Firebase Functions
    }
  }
)
