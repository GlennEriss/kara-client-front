import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { algoliasearch } from 'algoliasearch'
import * as path from 'path'
import * as fs from 'fs'

const ENV_CONFIG: Record<string, { projectId: string; indexName: string }> = {
  dev: { projectId: 'kara-gabon-dev', indexName: 'members-dev' },
  prod: { projectId: 'kara-gabon', indexName: 'members-prod' },
}

function initializeFirebaseAdmin(projectId: string) {
  if (getApps().length > 0) return getApps()[0]
  const serviceAccountsDir = path.join(process.cwd(), 'service-accounts')
  const files = fs.readdirSync(serviceAccountsDir)
  const serviceAccountFile = files.find(f => {
    if (projectId === 'kara-gabon') {
      return f.includes('kara-gabon') && !f.includes('dev') && !f.includes('preprod') && f.endsWith('.json')
    }
    return f.includes(projectId) && f.endsWith('.json')
  })
  if (!serviceAccountFile) throw new Error(`Service account non trouvé pour ${projectId}`)
  const serviceAccountPath = path.join(serviceAccountsDir, serviceAccountFile)
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'))
  return initializeApp({ credential: cert(serviceAccount), projectId })
}

async function testMembersAlgoliaSync() {
  const env = process.argv[2] || 'dev'
  const config = ENV_CONFIG[env]
  if (!config) { console.error(`Environnement invalide: ${env}`); process.exit(1) }
  
  console.log(`🧪 Test de synchronisation Algolia membres (${env.toUpperCase()})`)
  console.log('='.repeat(50))
  
  initializeFirebaseAdmin(config.projectId)
  const db = getFirestore()
  const algoliaClient = algoliasearch('IYE83A0LRH', 'f37a6169f18864759940d3a3125625f2')
  
  const testDocId = `TEST-MEMBER-SYNC-${Date.now()}`
  const testData = {
    matricule: testDocId,
    firstName: 'TestMember',
    lastName: 'SyncVerification',
    email: 'test.member.sync@example.com',
    contacts: ['+24100000002'],
    roles: ['Adherant'], // Rôle membre pour être indexé
    isActive: true,
    gender: 'M',
    membershipType: 'adherant',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  }
  
  console.log(`\n📝 Création du membre de test: ${testDocId}`)
  await db.collection('users').doc(testDocId).set(testData)
  console.log('✅ Membre créé dans Firestore')
  
  console.log('\n⏳ Attente de la synchronisation (max 30s)...')
  
  let found = false
  for (let attempt = 1; attempt <= 10; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 3000))
    try {
      const response = await algoliaClient.searchSingleIndex({
        indexName: config.indexName,
        searchParams: { query: testDocId, hitsPerPage: 1 }
      })
      if (response.hits && response.hits.length > 0) {
        found = true
        console.log(`✅ Membre trouvé dans Algolia après ${attempt * 3}s !`)
        break
      } else {
        console.log(`   Tentative ${attempt}/10: pas encore indexé...`)
      }
    } catch (error) {
      console.log(`   Tentative ${attempt}/10: erreur`)
    }
  }
  
  console.log('\n🧹 Nettoyage...')
  await db.collection('users').doc(testDocId).delete()
  console.log('✅ Membre supprimé de Firestore')
  
  console.log('\n' + '='.repeat(50))
  if (found) {
    console.log(`🎉 TEST ${env.toUpperCase()} RÉUSSI: La synchronisation automatique fonctionne !`)
  } else {
    console.log(`❌ TEST ${env.toUpperCase()} ÉCHOUÉ: Membre non synchronisé dans les 30s`)
  }
  console.log('='.repeat(50))
}

testMembersAlgoliaSync().then(() => process.exit(0)).catch(e => { console.error('❌', e); process.exit(1) })
