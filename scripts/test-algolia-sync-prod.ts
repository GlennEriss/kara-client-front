import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { algoliasearch } from 'algoliasearch'
import * as path from 'path'
import * as fs from 'fs'

function initializeFirebaseAdmin() {
  if (getApps().length > 0) return getApps()[0]
  const serviceAccountsDir = path.join(process.cwd(), 'service-accounts')
  const files = fs.readdirSync(serviceAccountsDir)
  const serviceAccountFile = files.find(f => 
    f.includes('kara-gabon') && !f.includes('dev') && !f.includes('preprod') && f.endsWith('.json')
  )
  if (!serviceAccountFile) throw new Error('Fichier service account prod non trouvé')
  const serviceAccountPath = path.join(serviceAccountsDir, serviceAccountFile)
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'))
  return initializeApp({ credential: cert(serviceAccount), projectId: 'kara-gabon' })
}

async function testAlgoliaSyncProd() {
  console.log('🧪 Test de synchronisation Algolia PROD')
  console.log('='.repeat(50))
  
  initializeFirebaseAdmin()
  const db = getFirestore()
  const algoliaClient = algoliasearch('IYE83A0LRH', 'f37a6169f18864759940d3a3125625f2')
  const indexName = 'membership-requests-prod'
  
  const testDocId = `TEST-PROD-SYNC-${Date.now()}`
  const testData = {
    matricule: testDocId,
    identity: { firstName: 'TestProd', lastName: 'SyncVerif', email: 'test.prod@example.com', contacts: ['+24100000001'] },
    status: 'pending', isPaid: false,
    createdAt: Timestamp.now(), updatedAt: Timestamp.now(),
  }
  
  console.log(`\n📝 Création du document de test: ${testDocId}`)
  await db.collection('membership-requests').doc(testDocId).set(testData)
  console.log('✅ Document créé dans Firestore PROD')
  
  console.log('\n⏳ Attente de la synchronisation (max 30s)...')
  
  let found = false
  for (let attempt = 1; attempt <= 10; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 3000))
    try {
      const response = await algoliaClient.searchSingleIndex({
        indexName, searchParams: { query: testDocId, hitsPerPage: 1 }
      })
      if (response.hits && response.hits.length > 0) {
        found = true
        console.log(`✅ Document trouvé dans Algolia PROD après ${attempt * 3}s !`)
        break
      } else {
        console.log(`   Tentative ${attempt}/10: pas encore indexé...`)
      }
    } catch (error) {
      console.log(`   Tentative ${attempt}/10: erreur`)
    }
  }
  
  console.log('\n🧹 Nettoyage...')
  await db.collection('membership-requests').doc(testDocId).delete()
  console.log('✅ Document supprimé')
  
  console.log('\n' + '='.repeat(50))
  if (found) {
    console.log('🎉 TEST PROD RÉUSSI: La synchronisation automatique fonctionne !')
  } else {
    console.log('❌ TEST PROD ÉCHOUÉ: Document non synchronisé dans les 30s')
  }
  console.log('='.repeat(50))
}

testAlgoliaSyncProd().then(() => process.exit(0)).catch(e => { console.error('❌', e); process.exit(1) })
