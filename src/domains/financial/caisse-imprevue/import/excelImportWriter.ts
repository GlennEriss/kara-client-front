/**
 * Écriture de l'import Excel — Caisse Imprévue.
 *
 * À partir des lignes analysées (AnalyzedRow) + des membres résolus + des
 * forfaits A–E, écrit dans Firestore :
 *  - contractsCI/{id}                      (ContractCI)
 *  - contractsCI/{id}/payments/month-N     (PaymentCI + versements)
 *  - contractsCI/{id}/supports/support-mig-i (SupportCI, feuille ACTIVE)
 *  - contractsCI/{id}/earlyRefunds/refund-mig (EarlyRefundCI, clôturés annulés)
 *
 * IDs déterministes => idempotent (relance sans doublon).
 * Chaque document porte un marqueur `migration` + champs plats pour le rollback.
 */

import {
  collection,
  db,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from '@/firebase/firestore'
import { firebaseCollectionNames } from '@/constantes/firebase-collection-names'
import type { SubscriptionCI, User } from '@/types/types'
import type { AnalyzedRow } from './excelImportAnalyzer'

const CONTRACTS = firebaseCollectionNames.contractsCI || 'contractsCI'
const SUBSCRIPTIONS = firebaseCollectionNames.subscriptionsCI || 'subscriptionsCI'

/** Récupère les forfaits A–E (subscriptionsCI) pour résoudre subscriptionCIID/Code. */
export async function fetchForfaits(): Promise<SubscriptionCI[]> {
  const snap = await getDocs(collection(db, SUBSCRIPTIONS))
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })) as SubscriptionCI[]
}

export interface ImportContext {
  adminId: string
  sheetName: string
  sourceFile: string
  members: Map<string, User>
  forfaits: SubscriptionCI[]
}

export interface ImportRowResult {
  rowNumber: number
  matricule: string
  status: 'created' | 'skipped'
  reason?: string
  contractId?: string
  payments?: number
  supports?: number
  earlyRefund?: boolean
}

export interface ImportReport {
  created: number
  skipped: number
  results: ImportRowResult[]
}

function safeDate(s: string | undefined | null): Date {
  if (!s) return new Date(0)
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? new Date(0) : d
}

function sanitizeMatricule(m: string): string {
  return m.replace(/[^a-zA-Z0-9]/g, '')
}

function makeContractId(kind: 'A' | 'C', matricule: string, startDate: string | null): string {
  const m = sanitizeMatricule(matricule) || 'NA'
  const d = (startDate || '').replace(/-/g, '') || 'NA'
  return `MK_CI_MIG_${kind}_${m}_${d}`
}

function pickForfait(
  category: string,
  amountPerMonth: number,
  forfaits: SubscriptionCI[],
): SubscriptionCI | undefined {
  return (
    forfaits.find((f) => (f.code || '').trim().toUpperCase() === category) ||
    forfaits.find((f) => f.amountPerMonth === amountPerMonth)
  )
}

/** Migration marker (plat + objet) ajouté à chaque document. */
function marker(ctx: ImportContext, kind: 'A' | 'C', rowNumber: number) {
  return {
    isMigrated: true,
    migrationSource: ctx.sourceFile,
    migrationSheet: ctx.sheetName,
    migration: {
      source: ctx.sourceFile,
      sheet: ctx.sheetName,
      kind,
      rowNumber,
      importedBy: ctx.adminId,
      importedAt: serverTimestamp(),
    },
  }
}

/**
 * Écrit une ligne (1 contrat + sous-collections) dans son propre batch.
 * Retourne le résultat (créé / ignoré).
 */
async function writeRow(row: AnalyzedRow, ctx: ImportContext): Promise<ImportRowResult> {
  const member = ctx.members.get(row.matricule.trim())
  if (!member) {
    return { rowNumber: row.rowNumber, matricule: row.matricule, status: 'skipped', reason: 'Membre introuvable' }
  }

  const kind: 'A' | 'C' = row.status === 'ACTIVE' ? 'A' : 'C'
  const contractId = makeContractId(kind, row.matricule, row.startDate)
  const forfait = pickForfait(row.category, row.amountPerMonth, ctx.forfaits)
  const nominal = forfait?.nominal ?? row.amountPerMonth * Math.max(row.durationMonths, 1)
  const supportMin = forfait?.supportMin ?? 0
  const supportMax = forfait?.supportMax ?? nominal
  const totalMonthsPaid = row.payments.filter((p) => p.status === 'PAID').length

  const batch = writeBatch(db)
  const supportIds: string[] = []

  // --- Supports (feuille ACTIVE) ---
  row.supportsDetail.forEach((s, i) => {
    const supportId = `support-mig-${i}`
    supportIds.push(supportId)
    batch.set(doc(db, CONTRACTS, contractId, 'supports', supportId), {
      id: supportId,
      contractId,
      amount: s.amount,
      motif: 'Import migration Excel',
      status: 'REPAID',
      amountRepaid: s.amount,
      amountRemaining: 0,
      deductions: [],
      repayments: [],
      requestedAt: safeDate(s.date),
      createdAt: serverTimestamp(),
      createdBy: ctx.adminId,
      ...marker(ctx, kind, row.rowNumber),
    })
  })

  // --- Retrait anticipé (clôturé annulé) ---
  let hasEarlyRefund = false
  if (row.earlyRefundDetail) {
    hasEarlyRefund = true
    const refundDate = safeDate(row.earlyRefundDetail.date)
    const deadline = new Date(refundDate.getTime() + 45 * 24 * 60 * 60 * 1000)
    batch.set(doc(db, CONTRACTS, contractId, 'earlyRefunds', 'refund-mig'), {
      id: 'refund-mig',
      contractId,
      type: 'EARLY',
      reason: 'Import migration Excel — retrait anticipé',
      withdrawalDate: refundDate,
      withdrawalTime: '00:00',
      withdrawalAmount: row.earlyRefundDetail.amount,
      withdrawalMode: 'cash',
      proofUrl: '',
      proofPath: '',
      documentId: '',
      amountNominal: row.earlyRefundDetail.amount,
      amountBonus: 0,
      status: 'PAID',
      deadlineAt: deadline,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: ctx.adminId,
      updatedBy: ctx.adminId,
      ...marker(ctx, kind, row.rowNumber),
    })
  }

  // --- Contrat ---
  batch.set(doc(db, CONTRACTS, contractId), {
    id: contractId,
    memberId: member.id,
    memberMatricule: row.matricule.trim(),
    memberFirstName: row.firstName || member.firstName || '',
    memberLastName: row.lastName || member.lastName || '',
    memberContacts: row.contacts,
    subscriptionCIID: forfait?.id ?? `MIG_${row.category || 'NA'}`,
    subscriptionCICode: forfait?.code ?? row.category,
    subscriptionCILabel: forfait?.label ?? `Forfait ${row.category}`,
    subscriptionCIAmountPerMonth: row.amountPerMonth,
    subscriptionCINominal: nominal,
    subscriptionCIDuration: row.durationMonths,
    subscriptionCISupportMin: supportMin,
    subscriptionCISupportMax: supportMax,
    paymentFrequency: 'MONTHLY',
    firstPaymentDate: row.startDate || '',
    emergencyContact: {
      lastName: row.emergency.lastName,
      firstName: row.emergency.firstName,
      phone1: row.emergency.phone1,
      phone2: '',
      relationship: row.emergency.relationship,
      idNumber: 'MIGRATION',
      typeId: 'MIGRATION',
      documentPhotoUrl: '',
    },
    status: row.status,
    supportHistory: supportIds,
    totalMonthsPaid,
    isEligibleForSupport: totalMonthsPaid >= 3,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: ctx.adminId,
    updatedBy: ctx.adminId,
    ...marker(ctx, kind, row.rowNumber),
  })

  // --- Versements (payments) ---
  for (const p of row.payments) {
    const versements = p.versement
      ? [
          {
            id: `v_mig_${p.monthIndex}`,
            date: p.versement.date,
            time: p.versement.time,
            amount: p.versement.amount,
            mode: p.versement.mode,
            proofUrl: '',
            proofPath: '',
            createdAt: safeDate(p.versement.date),
            createdBy: ctx.adminId,
          },
        ]
      : []
    batch.set(doc(db, CONTRACTS, contractId, 'payments', `month-${p.monthIndex}`), {
      id: `month-${p.monthIndex}`,
      contractId,
      monthIndex: p.monthIndex,
      status: p.status,
      targetAmount: p.targetAmount,
      accumulatedAmount: p.versement?.amount ?? 0,
      versements,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: ctx.adminId,
      updatedBy: ctx.adminId,
    })
  }

  await batch.commit()

  return {
    rowNumber: row.rowNumber,
    matricule: row.matricule,
    status: 'created',
    contractId,
    payments: row.payments.length,
    supports: row.supportsDetail.length,
    earlyRefund: hasEarlyRefund,
  }
}

/** Importe toutes les lignes (un batch par contrat). */
export async function writeImport(
  rows: AnalyzedRow[],
  ctx: ImportContext,
  onProgress?: (done: number, total: number) => void,
): Promise<ImportReport> {
  const results: ImportRowResult[] = []
  for (let i = 0; i < rows.length; i++) {
    try {
      results.push(await writeRow(rows[i], ctx))
    } catch (e) {
      results.push({
        rowNumber: rows[i].rowNumber,
        matricule: rows[i].matricule,
        status: 'skipped',
        reason: e instanceof Error ? e.message : 'Erreur écriture',
      })
    }
    onProgress?.(i + 1, rows.length)
  }
  return {
    created: results.filter((r) => r.status === 'created').length,
    skipped: results.filter((r) => r.status === 'skipped').length,
    results,
  }
}

/**
 * Annule un import : supprime tous les contrats (et leurs sous-collections)
 * portant le marqueur de migration pour cette feuille + ce fichier source.
 */
export async function rollbackImport(ctx: {
  sheetName: string
  sourceFile: string
}): Promise<{ deleted: number }> {
  // Un seul filtre d'égalité (pas d'index composite requis) ; on affine en mémoire.
  const q = query(collection(db, CONTRACTS), where('migrationSource', '==', ctx.sourceFile))
  const snap = await getDocs(q)
  let deleted = 0
  for (const contractDoc of snap.docs) {
    if ((contractDoc.data() as { migrationSheet?: string }).migrationSheet !== ctx.sheetName) continue
    const id = contractDoc.id
    for (const sub of ['payments', 'supports', 'earlyRefunds']) {
      const subSnap = await getDocs(collection(db, CONTRACTS, id, sub))
      for (const d of subSnap.docs) {
        await deleteDoc(doc(db, CONTRACTS, id, sub, d.id))
      }
    }
    await deleteDoc(doc(db, CONTRACTS, id))
    deleted++
  }
  return { deleted }
}
