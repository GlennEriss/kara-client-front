/**
 * Script pour synchroniser les membres manquants vers Algolia
 * 
 * Usage: npx tsx scripts/sync-members-to-algolia.ts [dev|preprod|prod]
 * 
 * Ce script :
 * 1. Récupère tous les membres (users avec rôles Adherant/Bienfaiteur/Sympathisant) depuis Firestore
 * 2. Récupère tous les objectIDs depuis Algolia
 * 3. Identifie les documents manquants
 * 4. Indexe les documents manquants dans Algolia
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { algoliasearch } from 'algoliasearch'
import * as path from 'path'
import * as fs from 'fs'

// Rôles considérés comme membres (exclut Admin, SuperAdmin, Secretary)
const MEMBER_ROLES = ['Adherant', 'Bienfaiteur', 'Sympathisant']

// Configuration par environnement
const ENV_CONFIG: Record<string, { projectId: string; indexName: string }> = {
  dev: { projectId: 'kara-gabon-dev', indexName: 'members-dev' },
  preprod: { projectId: 'kara-gabon-preprod', indexName: 'members-preprod' },
  prod: { projectId: 'kara-gabon', indexName: 'members-prod' },
}

function normalizeText(text: string): string {
  if (!text || typeof text !== 'string') return ''
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function generateMemberSearchableText(userId: string, data: any): string {
  const parts: string[] = []
  
  const matricule = data.matricule || userId
  if (matricule) parts.push(normalizeText(matricule))
  if (data.firstName) parts.push(normalizeText(data.firstName))
  if (data.lastName) parts.push(normalizeText(data.lastName))
  if (data.firstName && data.lastName) {
    parts.push(normalizeText(`${data.firstName} ${data.lastName}`))
  }
  if (data.email) parts.push(normalizeText(data.email))
  
  if (data.contacts && Array.isArray(data.contacts)) {
    data.contacts.forEach((contact: string) => {
      if (contact && typeof contact === 'string') {
        const normalizedPhone = contact.replace(/[\s\-\(\)]/g, '').toLowerCase()
        parts.push(normalizedPhone)
      }
    })
  }
  
  if (data.companyName) parts.push(normalizeText(data.companyName))
  if (data.profession) parts.push(normalizeText(data.profession))
  if (data.address?.province) parts.push(normalizeText(data.address.province))
  if (data.address?.city) parts.push(normalizeText(data.address.city))
  if (data.address?.arrondissement) parts.push(normalizeText(data.address.arrondissement))
  if (data.address?.district) parts.push(normalizeText(data.address.district))
  
  return parts.join(' ')
}

function isMember(data: any): boolean {
  if (!data.roles || !Array.isArray(data.roles)) return false
  return data.roles.some((role: string) => MEMBER_ROLES.includes(role))
}

function initializeFirebaseAdmin(projectId: string) {
  if (getApps().length > 0) return getApps()[0]
  
  const serviceAccountsDir = path.join(process.cwd(), 'service-accounts')
  const files = fs.readdirSync(serviceAccountsDir)
  
  // Trouver le fichier service account correspondant au projet
  const serviceAccountFile = files.find(f => {
    if (projectId === 'kara-gabon') {
      // Pour prod: fichier qui contient "kara-gabon" mais pas "dev" ni "preprod"
      return f.includes('kara-gabon') && !f.includes('dev') && !f.includes('preprod') && f.endsWith('.json')
    }
    return f.includes(projectId) && f.endsWith('.json')
  })
  
  if (!serviceAccountFile) {
    throw new Error(`Fichier service account non trouvé pour ${projectId}`)
  }
  
  const serviceAccountPath = path.join(serviceAccountsDir, serviceAccountFile)
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'))
  
  return initializeApp({
    credential: cert(serviceAccount),
    projectId,
  })
}

async function getAllAlgoliaObjectIDs(
  client: Awaited<ReturnType<typeof algoliasearch>>,
  indexName: string
): Promise<Set<string>> {
  const objectIDs = new Set<string>()
  let page = 0
  let hasMore = true
  
  console.log(`📊 Récupération des objectIDs depuis Algolia (index: ${indexName})...`)
  
  while (hasMore) {
    try {
      const response = await client.searchSingleIndex({
        indexName,
        searchParams: {
          query: '',
          attributesToRetrieve: [],
          hitsPerPage: 1000,
          page,
        },
      })
      
      if (response.hits && response.hits.length > 0) {
        response.hits.forEach((hit: any) => {
          if (hit.objectID) objectIDs.add(hit.objectID)
        })
        console.log(`  ✅ Page ${page + 1}: ${response.hits.length} documents | Total: ${objectIDs.size}`)
        page++
        hasMore = response.hits.length === 1000
      } else {
        hasMore = false
      }
    } catch (error: any) {
      if (error.status === 404) {
        console.log(`  ⚠️ Index ${indexName} n'existe pas encore, il sera créé`)
        hasMore = false
      } else {
        throw error
      }
    }
  }
  
  console.log(`📊 Total de documents dans Algolia: ${objectIDs.size}`)
  return objectIDs
}

async function main() {
  const env = process.argv[2] || 'dev'
  
  if (!ENV_CONFIG[env]) {
    console.error(`❌ Environnement invalide: ${env}`)
    console.error('Usage: npx tsx scripts/sync-members-to-algolia.ts [dev|preprod|prod]')
    process.exit(1)
  }
  
  const config = ENV_CONFIG[env]
  
  console.log('🚀 Démarrage de la synchronisation des membres manquants')
  console.log(`📊 Environnement: ${env}`)
  console.log(`📊 Index Algolia: ${config.indexName}`)
  console.log(`📊 Collection Firestore: users (membres uniquement)`)
  console.log('')
  
  // Initialiser Firebase Admin
  initializeFirebaseAdmin(config.projectId)
  const db = getFirestore()
  
  // Initialiser Algolia
  const algoliaAppId = process.env.ALGOLIA_APP_ID || 'IYE83A0LRH'
  const algoliaWriteKey = process.env.ALGOLIA_WRITE_API_KEY || 'f37a6169f18864759940d3a3125625f2'
  const algoliaClient = algoliasearch(algoliaAppId, algoliaWriteKey)
  
  // Récupérer tous les objectIDs depuis Algolia
  const algoliaObjectIDs = await getAllAlgoliaObjectIDs(algoliaClient, config.indexName)
  
  // Récupérer tous les membres depuis Firestore
  console.log('\n📊 Récupération des membres depuis Firestore...')
  const usersSnapshot = await db.collection('users').get()
  
  const members: { id: string; data: any }[] = []
  usersSnapshot.docs.forEach(doc => {
    const data = doc.data()
    if (isMember(data)) {
      members.push({ id: doc.id, data })
    }
  })
  
  console.log(`📊 Total de membres dans Firestore: ${members.length}`)
  
  // Identifier les documents manquants
  const missingMembers = members.filter(m => !algoliaObjectIDs.has(m.id))
  console.log(`\n📊 Membres manquants dans Algolia: ${missingMembers.length}`)
  
  if (missingMembers.length === 0) {
    console.log('\n✅ Tous les membres sont déjà synchronisés dans Algolia!')
    return
  }
  
  // Indexer les documents manquants par batch de 100
  const BATCH_SIZE = 100
  let indexed = 0
  let errors = 0
  
  for (let i = 0; i < missingMembers.length; i += BATCH_SIZE) {
    const batch = missingMembers.slice(i, i + BATCH_SIZE)
    
    const objects = batch.map(({ id, data }) => {
      const searchableText = generateMemberSearchableText(id, data)
      
      return {
        objectID: id,
        searchableText,
        matricule: data.matricule || id,
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        email: data.email || '',
        contacts: data.contacts || [],
        companyId: data.companyId || null,
        companyName: data.companyName || '',
        professionId: data.professionId || null,
        profession: data.profession || '',
        province: data.address?.province || '',
        city: data.address?.city || '',
        district: data.address?.district || '',
        arrondissement: data.address?.arrondissement || '',
        birthDate: data.birthDate || null,
        birthMonth: data.birthMonth || null,
        birthDay: data.birthDay || null,
        birthDayOfYear: data.birthDayOfYear || null,
        photoURL: data.photoURL || null,
        membershipType: data.membershipType || 'adherant',
        roles: data.roles || [],
        isActive: data.isActive !== false,
        gender: data.gender || 'M',
        hasCar: data.hasCar || false,
        createdAt: data.createdAt?.toMillis?.() || (data.createdAt ? new Date(data.createdAt).getTime() : Date.now()),
        updatedAt: data.updatedAt?.toMillis?.() || (data.updatedAt ? new Date(data.updatedAt).getTime() : Date.now()),
      }
    })
    
    try {
      await algoliaClient.saveObjects({
        indexName: config.indexName,
        objects,
      })
      indexed += batch.length
      const progress = Math.round((indexed / missingMembers.length) * 100)
      console.log(`✅ Batch indexé: ${batch.length} membres | Total: ${indexed}/${missingMembers.length} (${progress}%)`)
    } catch (error) {
      errors += batch.length
      console.error(`❌ Erreur lors de l'indexation du batch:`, error)
    }
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('📊 STATISTIQUES DE SYNCHRONISATION')
  console.log('='.repeat(60))
  console.log(`📊 Membres dans Firestore: ${members.length}`)
  console.log(`📊 Membres dans Algolia (avant): ${algoliaObjectIDs.size}`)
  console.log(`📊 Membres manquants identifiés: ${missingMembers.length}`)
  console.log(`✅ Membres indexés avec succès: ${indexed}`)
  console.log(`❌ Membres en erreur: ${errors}`)
  console.log(`📊 Index Algolia: ${config.indexName}`)
  console.log('='.repeat(60))
  
  if (indexed > 0) {
    console.log(`\n🎉 Synchronisation terminée ! ${indexed} membres manquants ont été indexés dans Algolia.`)
  }
}

main()
  .then(() => {
    console.log('✅ Script terminé avec succès')
    process.exit(0)
  })
  .catch(error => {
    console.error('❌ Erreur:', error)
    process.exit(1)
  })
