/**
 * Script de test pour vérifier la synchronisation automatique vers Algolia
 * Usage: npx tsx scripts/test-algolia-sync.ts
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { algoliasearch } from 'algoliasearch'
import * as path from 'path'
import * as fs from 'fs'

// Initialiser Firebase Admin
function initializeFirebaseAdmin() {
  if (getApps().length > 0) {
    return getApps()[0]
  }

  const serviceAccountsDir = path.join(process.cwd(), 'service-accounts')
  const files = fs.readdirSync(serviceAccountsDir)
  const serviceAccountFile = files.find(f => f.includes('kara-gabon-dev') && f.endsWith('.json'))

  if (!serviceAccountFile) {
    throw new Error('Fichier service account non trouvé')
  }

  const serviceAccountPath = path.join(serviceAccountsDir, serviceAccountFile)
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'))

  return initializeApp({
    credential: cert(serviceAccount),
    projectId: 'kara-gabon-dev',
  })
}

async function testAlgoliaSync() {
  console.log('🧪 Test de synchronisation Algolia')
  console.log('='.repeat(50))
  
  // 1. Initialiser Firebase et Algolia
  initializeFirebaseAdmin()
  const db = getFirestore()
  const algoliaClient = algoliasearch(
    process.env.ALGOLIA_APP_ID || 'IYE83A0LRH', 
    process.env.ALGOLIA_WRITE_API_KEY || 'f37a6169f18864759940d3a3125625f2'
  )
  const indexName = 'membership-requests-dev'
  
  // 2. Créer un document de test
  const testDocId = `TEST-ALGOLIA-SYNC-${Date.now()}`
  const testData = {
    matricule: testDocId,
    identity: {
      firstName: 'TestAlgolia',
      lastName: 'SyncVerification',
      email: 'test.algolia.sync@example.com',
      contacts: ['+24100000000'],
    },
    status: 'pending',
    isPaid: false,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  }
  
  console.log(`\n📝 Création du document de test: ${testDocId}`)
  await db.collection('membership-requests').doc(testDocId).set(testData)
  console.log('✅ Document créé dans Firestore')
  
  // 3. Attendre que la Cloud Function se déclenche (max 30 secondes)
  console.log('\n⏳ Attente de la synchronisation (max 30s)...')
  
  let found = false
  const maxAttempts = 10
  const delayMs = 3000
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await new Promise(resolve => setTimeout(resolve, delayMs))
    
    try {
      const response = await algoliaClient.searchSingleIndex({
        indexName,
        searchParams: {
          query: testDocId,
          hitsPerPage: 1,
        },
      })
      
      if (response.hits && response.hits.length > 0) {
        found = true
        console.log(`✅ Document trouvé dans Algolia après ${attempt * delayMs / 1000}s !`)
        console.log('📊 Données Algolia:')
        console.log(JSON.stringify(response.hits[0], null, 2))
        break
      } else {
        console.log(`   Tentative ${attempt}/${maxAttempts}: pas encore indexé...`)
      }
    } catch (error) {
      console.log(`   Tentative ${attempt}/${maxAttempts}: erreur de recherche`)
    }
  }
  
  // 4. Nettoyer le document de test
  console.log('\n🧹 Nettoyage du document de test...')
  await db.collection('membership-requests').doc(testDocId).delete()
  console.log('✅ Document supprimé de Firestore')
  
  // Attendre la suppression dans Algolia
  await new Promise(resolve => setTimeout(resolve, 5000))
  
  // 5. Résultat
  console.log('\n' + '='.repeat(50))
  if (found) {
    console.log('🎉 TEST RÉUSSI: La synchronisation automatique fonctionne !')
  } else {
    console.log('❌ TEST ÉCHOUÉ: Le document n\'a pas été synchronisé dans les 30 secondes')
    console.log('   Vérifiez les logs Firebase Functions pour plus de détails.')
  }
  console.log('='.repeat(50))
}

testAlgoliaSync()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Erreur:', error)
    process.exit(1)
  })
