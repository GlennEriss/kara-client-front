/**
 * Nettoyage des commissions du garant (Crédit Spéciale).
 *
 * L'ancien code créait une commission à CHAQUE paiement : un mois payé en
 * plusieurs fois, ou d'abord par un paiement de pénalités / à 0 FCFA,
 * produisait plusieurs commissions pleines pour le même mois. Les commissions
 * ne stockaient pas non plus leur cycle, ce qui confondait M1 du cycle initial
 * et M1 après rajout.
 *
 * Pour chaque (crédit, cycle, mois), le script :
 *   - garde la plus ancienne commission déclenchée par un paiement réel (> 0 FCFA) ;
 *   - supprime les autres ;
 *   - supprime tout le groupe si aucun paiement réel ne l'a déclenché ;
 *   - renseigne `cycleNumber` sur la commission conservée.
 *
 * Par défaut, simulation seule (aucune écriture). Ajouter --apply pour écrire.
 *
 * Usage:
 *   pnpm tsx scripts/cleanup-guarantor-remunerations.ts dev
 *   pnpm tsx scripts/cleanup-guarantor-remunerations.ts prod --apply
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, Timestamp, type DocumentReference } from 'firebase-admin/firestore'
import * as path from 'path'
import * as fs from 'fs'

const ENV_CONFIG: Record<string, { projectId: string; description: string }> = {
  dev: { projectId: 'kara-gabon-dev', description: 'Développement' },
  preprod: { projectId: 'kara-gabon-preprod', description: 'Pré-production' },
  prod: { projectId: 'kara-gabon', description: 'Production' },
}

const REMUNERATIONS = 'guarantorRemunerations'
const CONTRACTS = 'creditContracts'
const PAYMENTS = 'creditPayments'

function getServiceAccountPath(env: string): string {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return process.env.GOOGLE_APPLICATION_CREDENTIALS
  }
  const serviceAccountsDir = path.join(process.cwd(), 'service-accounts')
  if (fs.existsSync(serviceAccountsDir)) {
    const files = fs.readdirSync(serviceAccountsDir)
    let serviceAccountFile: string | undefined
    if (env === 'dev') {
      serviceAccountFile = files.find((f) => f.includes('kara-gabon-dev') && f.endsWith('.json'))
    } else if (env === 'preprod') {
      serviceAccountFile = files.find((f) => f.includes('kara-gabon-preprod') && f.endsWith('.json'))
    } else if (env === 'prod') {
      serviceAccountFile = files.find(
        (f) => f.includes('kara-gabon') && !f.includes('dev') && !f.includes('preprod') && f.endsWith('.json')
      )
    }
    if (serviceAccountFile) {
      return path.join(serviceAccountsDir, serviceAccountFile)
    }
  }
  throw new Error(
    `Fichier service account non trouvé pour "${env}". ` +
      `Placez le fichier JSON dans service-accounts/ (ex: kara-gabon-dev-xxx.json pour dev).`
  )
}

const toDate = (value: unknown): Date => {
  if (value instanceof Timestamp) return value.toDate()
  if (value && typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate()
  }
  const date = new Date(value as string | number)
  return Number.isNaN(date.getTime()) ? new Date(0) : date
}

/** Même règle que `getCreditPaymentCycleNumber` : l'id du paiement, sinon la date. */
function resolveCycleNumber(
  remuneration: { cycleNumber?: number; paymentId?: string; createdAt: Date },
  cycles: Array<{ cycleNumber: number; startedAt: Date }>
): number {
  if (remuneration.cycleNumber) return remuneration.cycleNumber
  const cycleMatch = remuneration.paymentId?.match(/^C(\d+)_M\d+_/)
  if (cycleMatch) return parseInt(cycleMatch[1], 10)
  if (remuneration.paymentId?.match(/^M\d+_/)) return 1
  let matched = 1
  for (const cycle of cycles) {
    if (remuneration.createdAt.getTime() >= cycle.startedAt.getTime()) matched = cycle.cycleNumber
  }
  return matched
}

interface RemunerationRow {
  ref: DocumentReference
  id: string
  creditId: string
  paymentId?: string
  month: number
  amount: number
  cycleNumber?: number
  createdAt: Date
}

async function run() {
  const env = process.argv[2] || 'dev'
  const apply = process.argv.includes('--apply')
  const config = ENV_CONFIG[env]

  if (!config) {
    console.error(`❌ Environnement invalide: "${env}"`)
    console.log('   Usage: pnpm tsx scripts/cleanup-guarantor-remunerations.ts [dev|preprod|prod] [--apply]')
    process.exit(1)
  }

  console.log(`🚀 Nettoyage des commissions du garant - ${config.description} (${config.projectId})`)
  console.log(apply ? '⚠️  Mode ÉCRITURE (--apply)\n' : '🔎 Mode SIMULATION (ajouter --apply pour écrire)\n')

  if (getApps().length === 0) {
    const serviceAccount = JSON.parse(fs.readFileSync(getServiceAccountPath(env), 'utf8'))
    initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id || config.projectId,
    })
  }

  const db = getFirestore()
  const snapshot = await db.collection(REMUNERATIONS).get()
  const byCredit = new Map<string, RemunerationRow[]>()

  for (const doc of snapshot.docs) {
    const data = doc.data()
    const row: RemunerationRow = {
      ref: doc.ref,
      id: doc.id,
      creditId: data.creditId,
      paymentId: data.paymentId,
      month: Number(data.month),
      amount: Number(data.amount) || 0,
      cycleNumber: data.cycleNumber,
      createdAt: toDate(data.createdAt),
    }
    byCredit.set(row.creditId, [...(byCredit.get(row.creditId) ?? []), row])
  }

  console.log(`📂 ${snapshot.size} commission(s) sur ${byCredit.size} crédit(s)\n`)

  const toDelete: RemunerationRow[] = []
  const toBackfill: Array<{ row: RemunerationRow; cycleNumber: number }> = []

  for (const [creditId, rows] of byCredit) {
    const contractSnap = await db.collection(CONTRACTS).doc(creditId).get()
    const contract = contractSnap.data() ?? {}
    const cycles = ((contract.creditCycles as Array<Record<string, unknown>> | undefined) ?? []).map(
      (cycle, index) => ({
        cycleNumber: Number(cycle.cycleNumber) || index + 1,
        startedAt: toDate(cycle.startedAt ?? cycle.firstPaymentDate),
      })
    )

    const paymentIds = [...new Set(rows.map((row) => row.paymentId).filter((id): id is string => !!id))]
    const paymentAmounts = new Map<string, number>()
    for (const paymentId of paymentIds) {
      const paymentSnap = await db.collection(PAYMENTS).doc(paymentId).get()
      paymentAmounts.set(paymentId, paymentSnap.exists ? Number(paymentSnap.data()?.amount) || 0 : 0)
    }

    const groups = new Map<string, Array<RemunerationRow & { resolvedCycle: number }>>()
    for (const row of rows) {
      const resolvedCycle = resolveCycleNumber(row, cycles)
      const key = `C${resolvedCycle}_M${row.month}`
      groups.set(key, [...(groups.get(key) ?? []), { ...row, resolvedCycle }])
    }

    for (const [key, group] of groups) {
      const ordered = [...group].sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
      const kept = ordered.find((row) => (paymentAmounts.get(row.paymentId ?? '') ?? 0) > 0)
      const removed = ordered.filter((row) => row !== kept)

      if (removed.length > 0) {
        const removedTotal = removed.reduce((sum, row) => sum + row.amount, 0)
        console.log(
          `  ${creditId} ${key} : ${removed.length} à supprimer (${removedTotal.toLocaleString('fr-FR')} FCFA)` +
            (kept ? `, conservée ${kept.id}` : ', aucun paiement réel : groupe entièrement supprimé')
        )
        toDelete.push(...removed)
      }
      if (kept && kept.cycleNumber !== kept.resolvedCycle) {
        toBackfill.push({ row: kept, cycleNumber: kept.resolvedCycle })
      }
    }
  }

  const deletedAmount = toDelete.reduce((sum, row) => sum + row.amount, 0)
  console.log(`\n📊 ${toDelete.length} commission(s) à supprimer, ${deletedAmount.toLocaleString('fr-FR')} FCFA au total`)
  console.log(`📊 ${toBackfill.length} commission(s) à compléter avec cycleNumber`)

  if (!apply) {
    console.log('\nSimulation terminée. Relancer avec --apply pour appliquer.')
    return
  }

  const MAX_BATCH_SIZE = 500
  let batch = db.batch()
  let batchCount = 0
  const flush = async () => {
    if (batchCount === 0) return
    await batch.commit()
    batch = db.batch()
    batchCount = 0
  }

  for (const row of toDelete) {
    batch.delete(row.ref)
    if (++batchCount >= MAX_BATCH_SIZE) await flush()
  }
  for (const { row, cycleNumber } of toBackfill) {
    batch.update(row.ref, { cycleNumber, updatedAt: Timestamp.now() })
    if (++batchCount >= MAX_BATCH_SIZE) await flush()
  }
  await flush()

  console.log('\n✅ Nettoyage appliqué')
}

run().catch((error) => {
  console.error('❌ Erreur:', error)
  process.exit(1)
})
