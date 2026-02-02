/**
 * Script de migration pour corriger le champ createdAt des agents de recouvrement
 * qui ont été créés avec le bug serverTimestamp().
 * 
 * Usage: npx tsx scripts/migrate-agent-createdAt.ts
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import * as path from 'path'

// Initialiser Firebase Admin
const serviceAccountPath = path.join(__dirname, '../service-accounts/firebase-admin.json')

try {
  initializeApp({
    credential: cert(serviceAccountPath),
  })
} catch (e) {
  console.error('Erreur initialisation Firebase Admin:', e)
  console.log('Assurez-vous que le fichier firebase-admin.json existe dans service-accounts/')
  process.exit(1)
}

const db = getFirestore()
const COLLECTION = 'agentsRecouvrement'

async function migrateAgents() {
  console.log('Démarrage de la migration des agents de recouvrement...')
  
  const agentsRef = db.collection(COLLECTION)
  const snapshot = await agentsRef.get()
  
  let fixed = 0
  let skipped = 0
  let errors = 0
  
  for (const doc of snapshot.docs) {
    const data = doc.data()
    const createdAt = data.createdAt
    const updatedAt = data.updatedAt
    
    // Vérifier si createdAt est corrompu (contient _methodName au lieu d'un Timestamp)
    const isCorrupted = createdAt && 
      typeof createdAt === 'object' && 
      '_methodName' in createdAt && 
      createdAt._methodName === 'serverTimestamp'
    
    if (isCorrupted) {
      try {
        // Utiliser updatedAt comme fallback, sinon la date actuelle
        let newCreatedAt: Timestamp
        if (updatedAt instanceof Timestamp) {
          newCreatedAt = updatedAt
        } else if (updatedAt && typeof updatedAt === 'object' && 'seconds' in updatedAt) {
          newCreatedAt = new Timestamp(updatedAt.seconds, updatedAt.nanoseconds || 0)
        } else {
          newCreatedAt = Timestamp.now()
        }
        
        await doc.ref.update({ createdAt: newCreatedAt })
        console.log(`✅ Agent ${doc.id} (${data.nom} ${data.prenom}): createdAt corrigé`)
        fixed++
      } catch (e) {
        console.error(`❌ Erreur pour agent ${doc.id}:`, e)
        errors++
      }
    } else {
      skipped++
    }
  }
  
  console.log('\n--- Résumé de la migration ---')
  console.log(`Total agents: ${snapshot.docs.length}`)
  console.log(`Corrigés: ${fixed}`)
  console.log(`Déjà OK: ${skipped}`)
  console.log(`Erreurs: ${errors}`)
}

migrateAgents()
  .then(() => {
    console.log('\nMigration terminée.')
    process.exit(0)
  })
  .catch((e) => {
    console.error('Erreur migration:', e)
    process.exit(1)
  })
