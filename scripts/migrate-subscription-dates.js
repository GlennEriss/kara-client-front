/**
 * Migration one-shot : cohérence des dates.
 *  1. subscriptions : chaque doc porte les DEUX paires de champs
 *     (dateStart/dateEnd canoniques <=> startDate/endDate hérités) - copie
 *     dans le sens manquant, aucune valeur modifiée.
 *  2. users : birthDate === "" supprimé (affichait "Invalid Date").
 * Usage : node scripts/migrate-subscription-dates.js [--dry-run]
 */
import { readFileSync } from 'node:fs'
import admin from 'firebase-admin'

for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const match = line.match(/^([A-Z_]+)=(.*)$/)
  if (match && !(match[1] in process.env)) {
    process.env[match[1]] = match[2].replace(/^"|"$/g, '')
  }
}

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/gm, '\n'),
  }),
})

const db = admin.firestore()
const DRY = process.argv.includes('--dry-run')

async function main() {
  console.log(`projet: ${process.env.FIREBASE_PROJECT_ID}${DRY ? ' (DRY-RUN)' : ''}`)

  // 1. subscriptions
  const subs = await db.collection('subscriptions').get()
  let fixedSubs = 0
  let batch = db.batch()
  let ops = 0

  const flush = async () => {
    if (ops > 0 && !DRY) await batch.commit()
    batch = db.batch()
    ops = 0
  }

  for (const doc of subs.docs) {
    const data = doc.data()
    const updates = {}

    if (data.dateStart == null && data.startDate != null) updates.dateStart = data.startDate
    if (data.dateEnd == null && data.endDate != null) updates.dateEnd = data.endDate
    if (data.startDate == null && data.dateStart != null) updates.startDate = data.dateStart
    if (data.endDate == null && data.dateEnd != null) updates.endDate = data.dateEnd

    if (Object.keys(updates).length) {
      fixedSubs++
      if (!DRY) {
        batch.update(doc.ref, updates)
        if (++ops >= 400) await flush()
      }
    }
  }

  await flush()
  console.log(`subscriptions : ${subs.size} docs, ${fixedSubs} unifies`)

  // 2. users : birthDate vide
  const users = await db.collection('users').where('birthDate', '==', '').get()
  for (const doc of users.docs) {
    if (!DRY) {
      batch.update(doc.ref, { birthDate: admin.firestore.FieldValue.delete() })
      if (++ops >= 400) await flush()
    }
  }

  await flush()
  console.log(`users : ${users.size} birthDate vides ${DRY ? 'detectes' : 'supprimes'}`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
