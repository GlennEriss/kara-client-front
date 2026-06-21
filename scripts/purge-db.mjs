/**
 * ⚠️ PURGE TOTALE DE LA BASE — IRRÉVERSIBLE.
 *
 * Supprime TOUT (Firestore + Firebase Auth + Storage) SAUF le superAdmin
 * (par défaut phil@gmail.com), conservé dans Auth + sa fiche users/admins.
 *
 * Sécurités :
 *  - DRY-RUN par défaut (n'efface rien). Ajoute `--confirm` pour supprimer.
 *  - S'arrête si le compte à conserver est introuvable (anti-verrouillage).
 *
 * Utilisation (Node >= 20.6) :
 *   # aperçu (ne supprime rien) :
 *   node --env-file=.env.local scripts/purge-db.mjs
 *   # suppression réelle :
 *   node --env-file=.env.local scripts/purge-db.mjs --confirm
 *
 * Variables d'env requises : FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL,
 * FIREBASE_PRIVATE_KEY (et éventuellement FIREBASE_STORAGE_BUCKET).
 */
import admin from 'firebase-admin'
import { algoliasearch } from 'algoliasearch'

const KEEP_EMAIL = (process.env.PURGE_KEEP_EMAIL || 'phil@gmail.com').toLowerCase()
const CONFIRM = process.argv.includes('--confirm')

const projectId = process.env.FIREBASE_PROJECT_ID
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/gm, '\n')
const bucketName =
  process.env.FIREBASE_STORAGE_BUCKET ||
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
  `${projectId}.appspot.com`

if (!projectId || !clientEmail || !privateKey) {
  console.error('❌ Credentials Admin manquants (FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY).')
  process.exit(1)
}

admin.initializeApp({
  credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  projectId,
  storageBucket: bucketName,
})

const db = admin.firestore()
const auth = admin.auth()
const log = (...a) => console.log(...a)

// Conserver la fiche Firestore du superAdmin (match large : id du doc, champ id/uid,
// ou champ email — insensible à la casse). On préfère trop garder que verrouiller.
function shouldKeepDoc(colId, doc, keepUid) {
  if (colId !== 'users' && colId !== 'admins') return false
  const data = doc.data() || {}
  const email = String(data.email || '').trim().toLowerCase()
  return (
    doc.id === keepUid ||
    data.id === keepUid ||
    data.uid === keepUid ||
    email === KEEP_EMAIL
  )
}

async function purgeFirestore(keepUid) {
  const collections = await db.listCollections()
  let deleted = 0
  let kept = 0
  for (const col of collections) {
    const snap = await col.get()
    let colDeleted = 0
    for (const d of snap.docs) {
      if (shouldKeepDoc(col.id, d, keepUid)) {
        kept++
        continue
      }
      if (CONFIRM) await db.recursiveDelete(d.ref)
      colDeleted++
      deleted++
    }
    log(`  • ${col.id}: ${snap.size} docs → ${CONFIRM ? 'supprimés' : 'à supprimer'} ${colDeleted}`)
  }
  log(`Firestore → total ${CONFIRM ? 'supprimés' : 'à supprimer'}: ${deleted} | conservés: ${kept}`)
}

async function purgeAuth(keepUid) {
  const toDelete = []
  let pageToken
  do {
    const res = await auth.listUsers(1000, pageToken)
    for (const u of res.users) {
      if (u.uid === keepUid || (u.email || '').toLowerCase() === KEEP_EMAIL) continue
      toDelete.push(u.uid)
    }
    pageToken = res.pageToken
  } while (pageToken)

  if (CONFIRM) {
    for (let i = 0; i < toDelete.length; i += 1000) {
      await auth.deleteUsers(toDelete.slice(i, i + 1000))
    }
  }
  log(`Auth → ${CONFIRM ? 'supprimés' : 'à supprimer'}: ${toDelete.length}`)
}

async function purgeStorage() {
  const bucket = admin.storage().bucket()
  const [files] = await bucket.getFiles()
  if (CONFIRM) await bucket.deleteFiles({ force: true })
  log(`Storage (${bucket.name}) → ${CONFIRM ? 'supprimés' : 'à supprimer'}: ${files.length} fichiers`)
}

async function purgeAlgolia() {
  const appId = process.env.ALGOLIA_APP_ID || process.env.NEXT_PUBLIC_ALGOLIA_APP_ID
  const writeKey = process.env.ALGOLIA_WRITE_API_KEY
  if (!appId || !writeKey) {
    log('Algolia → ignoré (ALGOLIA_APP_ID / ALGOLIA_WRITE_API_KEY manquants).')
    return
  }
  const client = algoliasearch(appId, writeKey)
  let indices = []
  try {
    const res = await client.listIndices()
    indices = res.items || []
  } catch (e) {
    log('Algolia → impossible de lister les index:', e?.message || e)
    return
  }
  // On vide tous les index (records), en conservant leurs réglages/replicas.
  let cleared = 0
  for (const idx of indices) {
    log(`  • index "${idx.name}": ${idx.entries ?? '?'} records`)
    if (CONFIRM) {
      try {
        await client.clearObjects({ indexName: idx.name })
        cleared++
      } catch (e) {
        log(`    ⚠️ échec vidage "${idx.name}":`, e?.message || e)
      }
    }
  }
  log(`Algolia → ${CONFIRM ? `index vidés: ${cleared}` : `index à vider: ${indices.length}`}`)
}

async function main() {
  log('================ PURGE BD ================')
  log('Mode            :', CONFIRM ? '🔴 SUPPRESSION RÉELLE' : '🟡 DRY-RUN (aucune suppression)')
  log('Projet          :', projectId)
  log('Compte conservé :', KEEP_EMAIL)
  log('Bucket Storage  :', bucketName)

  let keep
  try {
    keep = await auth.getUserByEmail(KEEP_EMAIL)
  } catch {
    keep = null
  }
  if (!keep) {
    console.error(`❌ ABORT : ${KEEP_EMAIL} introuvable dans Firebase Auth. Rien n'a été supprimé (anti-verrouillage).`)
    process.exit(1)
  }
  log('UID conservé    :', keep.uid)
  log('-----------------------------------------')

  await purgeFirestore(keep.uid)
  await purgeAuth(keep.uid)
  await purgeStorage()
  await purgeAlgolia()

  // Vérification finale : le compte superAdmin doit toujours exister.
  if (CONFIRM) {
    try {
      const still = await auth.getUserByEmail(KEEP_EMAIL)
      log(`🔒 Vérification : compte ${KEEP_EMAIL} toujours présent (uid ${still.uid}).`)
    } catch {
      console.error(`⚠️ ALERTE : ${KEEP_EMAIL} introuvable APRÈS purge ! Vérifie immédiatement.`)
    }
  }

  log('-----------------------------------------')
  log(CONFIRM ? '✅ Purge terminée.' : 'ℹ️ Dry-run terminé. Relance avec --confirm pour supprimer RÉELLEMENT.')
  process.exit(0)
}

main().catch((e) => {
  console.error('Erreur:', e)
  process.exit(1)
})
