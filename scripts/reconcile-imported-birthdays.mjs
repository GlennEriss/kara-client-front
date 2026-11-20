/** Repair only a proven J+1, using concordant dossier and workbook dates.
 * Read-only by default. Private backups/reports must live outside the repository.
 */
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs, parseEnv, isDeepStrictEqual } from 'node:util'

const DAY = 86400000
export function birthdayFields(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(`${value}T00:00:00Z`)
  if (year < 1900 || date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day) return null
  return { birthMonth: month, birthDay: day, birthDayOfYear: (date.getTime() - Date.UTC(year, 0, 0)) / DAY }
}

export function planMember(user, request, reference) {
  const skip = reason => ({ reason })
  if (user.isMigrated !== true) return skip('not-imported')
  if (!user.birthDate) return skip('missing-birthdate')
  if (!user.dateShiftFixedAt) return skip('no-legacy-shift-marker')
  if (!reference) return skip('missing-workbook-reference')
  const fields = birthdayFields(reference.birthDate)
  if (!fields || !Number.isInteger(reference.row) || reference.row < 1) return skip('invalid-workbook-reference')
  if (!request || request.isMigrated !== true || request.matricule !== user.matricule) return skip('unconfirmed-dossier')
  if (request.identity?.birthDate !== reference.birthDate) return skip('dossier-workbook-conflict')
  if (user.birthDate === reference.birthDate) return skip('already-aligned')
  if (!birthdayFields(user.birthDate) || Date.parse(user.birthDate) - Date.parse(reference.birthDate) !== DAY) return skip('not-exactly-one-day-later')
  return { reason: 'repair', birthDate: reference.birthDate, ...fields, sourceRow: reference.row }
}

function serializable(value) {
  if (value === undefined) return { absent: true }
  if (value?.toDate && typeof value.seconds === 'number') return { seconds: value.seconds, nanoseconds: value.nanoseconds }
  if (Array.isArray(value)) return value.map(serializable)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, serializable(v)]))
  return value
}

async function main() {
  const { values: args } = parseArgs({ options: { project: { type: 'string' }, source: { type: 'string' }, workbook: { type: 'string' }, 'report-dir': { type: 'string' }, expected: { type: 'string' }, apply: { type: 'boolean', default: false } } })
  if (!['kara-gabon', 'kara-gabon-dev'].includes(args.project) || !args.source || !args.workbook || !args['report-dir']) throw Error('Required: --project --source --workbook --report-dir [--apply --expected N]')
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  const reportDir = resolve(args['report-dir'])
  if (reportDir === root || reportDir.startsWith(root + '/')) throw Error('Reports must stay outside the repository')
  const source = JSON.parse(await readFile(args.source, 'utf8'))
  const workbookHash = createHash('sha256').update(await readFile(args.workbook)).digest('hex')
  if (source.sha256 !== workbookHash || source.sheet !== 'MEMBRES' || !source.records) throw Error('Workbook reference integrity check failed')
  const env = parseEnv(await readFile(resolve(root, args.project === 'kara-gabon' ? '.env.production.local' : '.env.local'), 'utf8'))
  if (env.FIREBASE_PROJECT_ID !== args.project) throw Error('Firebase project mismatch')
  const { initializeApp, cert, deleteApp } = await import('firebase-admin/app')
  const { getFirestore, FieldValue } = await import('firebase-admin/firestore')
  const app = initializeApp({ credential: cert({ projectId: args.project, clientEmail: env.FIREBASE_CLIENT_EMAIL, privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') }) }, 'reconcile-birthdays')
  try {
    const db = getFirestore(app)
    const userKeys = ['matricule', 'birthDate', 'birthMonth', 'birthDay', 'birthDayOfYear', 'dossier', 'isMigrated', 'dateShiftFixedAt', 'birthDateReconciliation', 'updatedAt']
    const requestKeys = ['matricule', 'identity.birthDate', 'isMigrated']
    const users = await db.collection('users').select(...userKeys).get()
    const dossierIds = [...new Set(users.docs.map(doc => doc.get('dossier')).filter(id => typeof id === 'string' && id && !id.includes('/')))]
    const dossierDocs = dossierIds.length ? await db.getAll(...dossierIds.map(id => db.collection('membership-requests').doc(id)), { fieldMask: requestKeys }) : []
    const dossiers = new Map(dossierDocs.map(doc => [doc.id, doc]))
    const counts = {}
    const repairs = []
    for (const doc of users.docs) {
      const user = doc.data(), requestDoc = dossiers.get(user.dossier)
      const plan = planMember(user, requestDoc?.data(), source.records[user.matricule || doc.id])
      counts[plan.reason] = (counts[plan.reason] || 0) + 1
      if (plan.reason === 'repair') repairs.push({ doc, requestDoc, plan })
    }
    const expected = args.expected === undefined ? null : Number(args.expected)
    if (expected !== null && (!Number.isInteger(expected) || expected < 0 || repairs.length !== expected)) throw Error(`Repair count changed: expected ${expected}, found ${repairs.length}`)
    if (args.apply && expected === null) throw Error('--apply requires --expected')
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    await mkdir(reportDir, { recursive: true, mode: 0o700 })
    const base = resolve(reportDir, `${args.project}-${stamp}-${args.apply ? 'apply' : 'dry-run'}`)
    const backupPath = `${base}-before.json`
    const backup = {
      project: args.project, createdAt: new Date().toISOString(), source: source.source, sha256: workbookHash,
      users: users.docs.map(doc => ({ path: doc.ref.path, updateTime: serializable(doc.updateTime), data: serializable(doc.data()) })),
      dossiers: dossierDocs.map(doc => ({ path: doc.ref.path, exists: doc.exists, updateTime: serializable(doc.updateTime), data: serializable(doc.data()) })),
      repairs: repairs.map(({ doc, requestDoc, plan }) => ({ path: doc.ref.path, dossier: requestDoc.ref.path, plan })),
    }
    // Must finish persisting the backup before the transaction can write anything.
    await writeFile(backupPath, JSON.stringify(backup, null, 2), { mode: 0o600, flag: 'wx' })
    const summary = { project: args.project, apply: args.apply, totalUsers: users.size, counts, corrected: 0, verified: false }
    console.log(JSON.stringify({ phase: 'preflight', ...summary }))
    if (args.apply && repairs.length) {
      await db.runTransaction(async transaction => {
        const references = [...new Map(repairs.flatMap(({ doc, requestDoc }) => [doc.ref, requestDoc.ref]).map(ref => [ref.path, ref])).values()]
        const current = new Map((await transaction.getAll(...references)).map(doc => [doc.ref.path, doc]))
        for (const { doc, requestDoc, plan } of repairs) {
          const liveUser = current.get(doc.ref.path), liveRequest = current.get(requestDoc.ref.path)
          if (!liveUser?.updateTime?.isEqual(doc.updateTime) || !liveRequest?.updateTime?.isEqual(requestDoc.updateTime)) throw Error('Concurrent member/dossier change; aborted without writes')
          const livePlan = planMember(liveUser.data(), liveRequest.data(), source.records[liveUser.get('matricule') || doc.id])
          if (!isDeepStrictEqual(plan, livePlan)) throw Error('Evidence changed; aborted without writes')
        }
        for (const { doc, plan } of repairs) {
          transaction.update(doc.ref, {
            birthDate: plan.birthDate, birthMonth: plan.birthMonth, birthDay: plan.birthDay, birthDayOfYear: plan.birthDayOfYear,
            birthDateReconciliation: { version: 1, source: source.source, sha256: workbookHash, sourceRow: plan.sourceRow, correctedAt: FieldValue.serverTimestamp() },
            updatedAt: FieldValue.serverTimestamp(),
          })
        }
      })
      summary.corrected = repairs.length
    }
    const after = await db.getAll(...users.docs.map(doc => doc.ref), { fieldMask: userKeys })
    const correctedPaths = new Set(repairs.map(({ doc }) => doc.ref.path))
    let verified = 0, unchanged = 0
    for (let i = 0; i < users.docs.length; i++) {
      const before = users.docs[i], next = after[i]
      if (args.apply && correctedPaths.has(before.ref.path)) {
        const repair = repairs.find(({ doc }) => doc.ref.path === before.ref.path).plan
        if (next.get('birthDate') !== repair.birthDate || !isDeepStrictEqual(birthdayFields(next.get('birthDate')), { birthMonth: next.get('birthMonth'), birthDay: next.get('birthDay'), birthDayOfYear: next.get('birthDayOfYear') })) throw Error('Post-write date verification failed; backup retained')
        if (next.get('isMigrated') !== true || !isDeepStrictEqual(serializable(before.get('dateShiftFixedAt')), serializable(next.get('dateShiftFixedAt')))) throw Error('Migration markers changed unexpectedly')
        verified++
      } else {
        if (!isDeepStrictEqual(serializable(before.data()), serializable(next.data()))) throw Error('Unrelated member changed during verification')
        unchanged++
      }
    }
    const requestsAfter = dossierDocs.length ? await db.getAll(...dossierDocs.map(doc => doc.ref), { fieldMask: requestKeys }) : []
    if (requestsAfter.some((doc, i) => !isDeepStrictEqual(serializable(doc.data()), serializable(dossierDocs[i].data())))) throw Error('Dossier dates changed during verification')
    Object.assign(summary, { verified: true, verifiedCorrections: verified, unchangedUsers: unchanged, unchangedDossiers: dossierDocs.length })
    await writeFile(`${base}-result.json`, JSON.stringify(summary, null, 2), { mode: 0o600, flag: 'wx' })
    console.log(JSON.stringify({ phase: 'result', ...summary, backupPath }))
  } finally {
    await deleteApp(app)
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(() => {
    // Firebase errors may contain sensitive request details; never dump them.
    console.error('Reconciliation failed. No credentials or member data logged. Inspect the private backup and perform a fresh audit before retrying.')
    process.exitCode = 1
  })
}
