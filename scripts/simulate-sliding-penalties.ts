/**
 * Simulation de l'échéance glissante des pénalités (Crédit Spéciale en mois).
 *
 * Nouvelle règle : un retard déjà constaté reste acquis. Si un mois a été
 * versé avec 9 jours de retard, les mois suivants sont attendus 9 jours après
 * leur date prévue ; seul un retard plus grand augmente ce décalage.
 * Pénalité = intérêts du mois × jours de retard ÷ 30, au-delà de 3 jours de
 * tolérance.
 *
 * Pour chaque échéance déjà versée, le script compare la pénalité enregistrée
 * à celle que donnerait la nouvelle règle, et écrit un bilan.
 *
 * LECTURE SEULE : le script n'écrit rien dans Firestore.
 * Bilan : affiché, et écrit dans scripts/reports/ (contrats + échéances, CSV).
 * --contract <id> limite le traitement à un contrat.
 *
 * Usage:
 *   pnpm tsx scripts/simulate-sliding-penalties.ts dev
 *   pnpm tsx scripts/simulate-sliding-penalties.ts prod --contract MK_CSP_0013_221026_1143
 *   pnpm tsx scripts/simulate-sliding-penalties.ts prod
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import * as path from 'path'
import * as fs from 'fs'
import type { CreditContract, CreditPayment, CreditPenalty } from '../src/types/types'
import {
  buildCreditSpecialeTimelineHistory,
  getCreditContractCycles,
  getCreditPaymentCycleNumber,
} from '../src/utils/credit-speciale-history'
import { getMonthFirstPaymentDate, getMonthPenaltyReferenceDate } from '../src/utils/credit-penalty-due-date'
import { isFlatCredit } from '../src/utils/credit-weekly'

const ENV_CONFIG: Record<string, { projectId: string; description: string }> = {
  dev: { projectId: 'kara-gabon-dev', description: 'Développement' },
  preprod: { projectId: 'kara-gabon-preprod', description: 'Pré-production' },
  prod: { projectId: 'kara-gabon', description: 'Production' },
}

const CONTRACTS = 'creditContracts'
const PAYMENTS = 'creditPayments'
const PENALTIES = 'creditPenalties'
const LATE_TOLERANCE_DAYS = 3
const MS_PER_DAY = 1000 * 60 * 60 * 24

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

/** Les utilitaires de calcul attendent des `Date`, pas des `Timestamp` Firestore. */
function withDates(value: unknown): unknown {
  if (value instanceof Timestamp) return value.toDate()
  if (Array.isArray(value)) return value.map(withDates)
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, withDates(entry)]))
  }
  return value
}

/** Même instantané de cycle que `CreditSpecialeService.buildContractSnapshotForCycle`. */
function snapshotForCycle(contract: CreditContract, cycleNumber: number): CreditContract {
  const cycle = getCreditContractCycles(contract).find((entry) => entry.cycleNumber === cycleNumber)
  if (!cycle) return contract
  return {
    ...contract,
    amount: cycle.amount,
    interestRate: cycle.interestRate,
    monthlyPaymentAmount: cycle.monthlyPaymentAmount,
    totalAmount: cycle.totalAmount,
    duration: cycle.duration,
    firstPaymentDate: cycle.firstPaymentDate,
    restMonths: cycle.restMonths ?? [],
    customSchedule: cycle.customSchedule,
    fixedTransitionMode: cycle.fixedTransitionMode,
    fixedTransitionAt: cycle.fixedTransitionAt,
    fixedTransitionBy: cycle.fixedTransitionBy,
    fixedTransitionReason: cycle.fixedTransitionReason,
    fixedTransitionStartMonth: cycle.fixedTransitionStartMonth,
    createdAt: cycle.startedAt ?? contract.createdAt,
    creditCycles: undefined,
  }
}

const startOfDay = (value: Date | string) => {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}
const daysBetween = (from: Date, to: Date) => Math.floor((startOfDay(to).getTime() - startOfDay(from).getTime()) / MS_PER_DAY)
const penaltyFor = (interest: number, daysLate: number) =>
  daysLate > LATE_TOLERANCE_DAYS ? Math.round((interest * daysLate) / 30) : 0

const fcfa = (value: number) => `${Math.round(value).toLocaleString('fr-FR')} FCFA`
const frDate = (value: Date) => value.toLocaleDateString('fr-FR')
const csvCell = (value: string | number) => {
  const text = String(value)
  return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}
const toCsv = (rows: Array<Array<string | number>>) => rows.map((row) => row.map(csvCell).join(';')).join('\n') + '\n'

interface InstallmentReport {
  contractId: string
  client: string
  installment: string
  plannedDate: Date
  referenceDate: Date
  paymentDate: Date
  daysLateBefore: number
  daysLateAfter: number
  recordedPenalty: number
  recordedPaid: boolean
  newPenalty: number
}

interface ContractReport {
  contractId: string
  client: string
  recordedTotal: number
  recordedUnpaid: number
  newTotal: number
  changedInstallments: number
}

async function run() {
  const env = process.argv[2] || 'dev'
  const contractArgIndex = process.argv.indexOf('--contract')
  const onlyContractId = contractArgIndex > 0 ? process.argv[contractArgIndex + 1] : undefined
  const config = ENV_CONFIG[env]

  if (!config) {
    console.error(`❌ Environnement invalide: "${env}"`)
    console.log('   Usage: pnpm tsx scripts/simulate-sliding-penalties.ts [dev|preprod|prod] [--contract <id>]')
    process.exit(1)
  }

  console.log(`🚀 Simulation de l'échéance glissante des pénalités - ${config.description} (${config.projectId})`)
  console.log('🔎 Lecture seule : rien n\'est écrit dans Firestore\n')

  if (getApps().length === 0) {
    const serviceAccount = JSON.parse(fs.readFileSync(getServiceAccountPath(env), 'utf8'))
    initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id || config.projectId,
    })
  }

  const db = getFirestore()
  const contractDocs = onlyContractId
    ? [await db.collection(CONTRACTS).doc(onlyContractId).get()].filter((doc) => doc.exists)
    : (await db.collection(CONTRACTS).where('creditType', '==', 'SPECIALE').get()).docs

  console.log(`📂 ${contractDocs.length} contrat(s) de crédit spéciale\n`)

  const contractReports: ContractReport[] = []
  const installmentReports: InstallmentReport[] = []

  for (const contractDoc of contractDocs) {
    const contract = { id: contractDoc.id, ...(withDates(contractDoc.data()) as object) } as CreditContract
    if (contract.creditType !== 'SPECIALE' || isFlatCredit(contract)) continue

    const [paymentSnap, penaltySnap] = await Promise.all([
      db.collection(PAYMENTS).where('creditId', '==', contract.id).get(),
      db.collection(PENALTIES).where('creditId', '==', contract.id).get(),
    ])
    if (paymentSnap.empty) continue
    const payments = paymentSnap.docs.map((doc) => ({ id: doc.id, ...(withDates(doc.data()) as object) }) as CreditPayment)
    const penalties = penaltySnap.docs.map((doc) => ({ id: doc.id, ...(withDates(doc.data()) as object) }) as CreditPenalty)
    const client = `${contract.clientFirstName ?? ''} ${contract.clientLastName ?? ''}`.trim() || '—'

    const report: ContractReport = {
      contractId: contract.id,
      client,
      recordedTotal: penalties.reduce((sum, penalty) => sum + (Number(penalty.amount) || 0), 0),
      recordedUnpaid: penalties.filter((penalty) => !penalty.paid).reduce((sum, penalty) => sum + (Number(penalty.amount) || 0), 0),
      newTotal: 0,
      changedInstallments: 0,
    }
    const matchedPenaltyIds = new Set<string>()

    for (const row of buildCreditSpecialeTimelineHistory(contract, payments)) {
      if (row.isRest) continue
      const cycleContract = snapshotForCycle(contract, row.cycleNumber)
      const cyclePayments = payments.filter((payment) => getCreditPaymentCycleNumber(contract, payment) === row.cycleNumber)
      const paymentDate = getMonthFirstPaymentDate(cycleContract, cyclePayments, row.month)
      if (!paymentDate) continue

      const plannedDate = startOfDay(row.date)
      const referenceDate = getMonthPenaltyReferenceDate(cycleContract, cyclePayments, row.month)
      const daysLateBefore = daysBetween(plannedDate, paymentDate)
      const daysLateAfter = daysBetween(referenceDate, paymentDate)
      const newPenalty = penaltyFor(row.interest, daysLateAfter)
      report.newTotal += newPenalty

      // Même rattachement que le service : la clé d'échéance, sinon la date prévue.
      const installmentKey = `C${row.cycleNumber}_M${row.month}`
      const recorded = penalties.filter(
        (penalty) =>
          !matchedPenaltyIds.has(penalty.id) &&
          (penalty.installmentId?.trim() === installmentKey ||
            (!penalty.installmentId?.trim() && startOfDay(penalty.dueDate).getTime() === plannedDate.getTime()))
      )
      recorded.forEach((penalty) => matchedPenaltyIds.add(penalty.id))
      const recordedPenalty = recorded.reduce((sum, penalty) => sum + (Number(penalty.amount) || 0), 0)

      if (recordedPenalty === newPenalty && daysLateBefore === daysLateAfter) continue
      if (recordedPenalty !== newPenalty) report.changedInstallments++
      installmentReports.push({
        contractId: contract.id,
        client,
        installment: `C${row.cycleNumber} M${row.month}`,
        plannedDate,
        referenceDate,
        paymentDate,
        daysLateBefore,
        daysLateAfter,
        recordedPenalty,
        recordedPaid: recorded.length > 0 && recorded.every((penalty) => penalty.paid),
        newPenalty,
      })
    }

    if (report.changedInstallments > 0) {
      contractReports.push(report)
      console.log(
        `  ${report.contractId} (${client}) : ${report.changedInstallments} échéance(s) changent, ` +
          `pénalités ${fcfa(report.recordedTotal)} → ${fcfa(report.newTotal)}`
      )
    }
  }

  const recordedTotal = contractReports.reduce((sum, report) => sum + report.recordedTotal, 0)
  const newTotal = contractReports.reduce((sum, report) => sum + report.newTotal, 0)
  const paidAffected = installmentReports.filter((row) => row.recordedPaid && row.recordedPenalty !== row.newPenalty)
  console.log(`\n📊 ${contractReports.length} contrat(s) concerné(s)`)
  console.log(`📊 Pénalités de ces contrats : ${fcfa(recordedTotal)} → ${fcfa(newTotal)}`)
  if (paidAffected.length > 0) {
    console.log(`ℹ️  ${paidAffected.length} échéance(s) concernée(s) ont une pénalité déjà payée`)
  }

  const reportsDir = path.join(process.cwd(), 'scripts', 'reports')
  fs.mkdirSync(reportsDir, { recursive: true })
  const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '')
  const contractsFile = path.join(reportsDir, `simulation-penalites-glissantes-${env}-${stamp}-contrats.csv`)
  const installmentsFile = path.join(reportsDir, `simulation-penalites-glissantes-${env}-${stamp}-echeances.csv`)
  fs.writeFileSync(
    contractsFile,
    toCsv([
      ['Contrat', 'Client', 'Échéances qui changent', 'Pénalités enregistrées (FCFA)', 'Dont impayées (FCFA)', 'Pénalités nouvelle règle (FCFA)', 'Écart (FCFA)'],
      ...contractReports.map((report) => [
        report.contractId,
        report.client,
        report.changedInstallments,
        Math.round(report.recordedTotal),
        Math.round(report.recordedUnpaid),
        Math.round(report.newTotal),
        Math.round(report.newTotal - report.recordedTotal),
      ]),
    ])
  )
  fs.writeFileSync(
    installmentsFile,
    toCsv([
      ['Contrat', 'Client', 'Échéance', 'Date prévue', 'Date de référence', 'Versé le', 'Retard actuel (j)', 'Retard nouvelle règle (j)', 'Pénalité enregistrée (FCFA)', 'Déjà payée', 'Pénalité nouvelle règle (FCFA)'],
      ...installmentReports.map((row) => [
        row.contractId,
        row.client,
        row.installment,
        frDate(row.plannedDate),
        frDate(row.referenceDate),
        frDate(row.paymentDate),
        row.daysLateBefore,
        row.daysLateAfter,
        Math.round(row.recordedPenalty),
        row.recordedPaid ? 'Oui' : 'Non',
        row.newPenalty,
      ]),
    ])
  )
  console.log(`\n📝 Bilan des contrats : ${contractsFile}`)
  console.log(`📝 Détail des échéances : ${installmentsFile}`)
  console.log('\nSimulation terminée. Rien n\'a été modifié.')
}

run().catch((error) => {
  console.error('❌ Erreur:', error)
  process.exit(1)
})
