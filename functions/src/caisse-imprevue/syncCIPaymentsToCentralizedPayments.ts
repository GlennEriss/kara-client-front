import * as admin from 'firebase-admin'
import { onDocumentWritten } from 'firebase-functions/v2/firestore'

if (admin.apps.length === 0) {
  admin.initializeApp()
}

const db = admin.firestore()

const CONTRACTS_COLLECTION = 'contractsCI'
const ADMINS_COLLECTION = 'admins'
const CENTRALIZED_PAYMENTS_COLLECTION = 'payments'

type TimestampLike = {
  toDate?: () => Date
  seconds?: number
  nanoseconds?: number
  _seconds?: number
  _nanoseconds?: number
}

function toDate(value: unknown): Date | null {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value

  const ts = value as TimestampLike
  if (typeof ts.toDate === 'function') {
    const d = ts.toDate()
    return Number.isNaN(d.getTime()) ? null : d
  }

  if (typeof ts.seconds === 'number') {
    return new Date(ts.seconds * 1000 + Math.floor((ts.nanoseconds || 0) / 1000000))
  }

  if (typeof ts._seconds === 'number') {
    return new Date(ts._seconds * 1000 + Math.floor((ts._nanoseconds || 0) / 1000000))
  }

  if (typeof value === 'string') {
    const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (dateOnlyMatch) {
      const d = new Date(`${value}T00:00:00`)
      return Number.isNaN(d.getTime()) ? null : d
    }
  }

  try {
    const d = new Date(value as string | number)
    return Number.isNaN(d.getTime()) ? null : d
  } catch {
    return null
  }
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

function asNumber(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function asOptionalNumber(value: unknown): number | undefined {
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

function asInteger(value: unknown): number | undefined {
  const n = Number(value)
  if (!Number.isFinite(n)) return undefined
  return Math.trunc(n)
}

function parseMonthIndex(paymentDocId: string, paymentData: admin.firestore.DocumentData | undefined): number {
  if (typeof paymentData?.monthIndex === 'number' && Number.isFinite(paymentData.monthIndex)) {
    return paymentData.monthIndex
  }

  const match = paymentDocId.match(/^month-(\d+)$/)
  if (match) {
    const parsed = Number(match[1])
    if (Number.isFinite(parsed)) return parsed
  }

  return 0
}

function sanitizeForId(value: string): string {
  const cleaned = value.replace(/[^A-Za-z0-9_.-]/g, '_').trim()
  return cleaned.length > 0 ? cleaned : 'unknown'
}

function buildCIPaymentId(contractId: string, monthIndex: number, versementId: string): string {
  return `MK_PYMT_CI_${sanitizeForId(contractId)}_M${monthIndex + 1}_${sanitizeForId(versementId)}`
}

function buildCISupportPaymentId(contractId: string, supportId: string): string {
  return `MK_PYMT_CI_SUPPORT_${sanitizeForId(contractId)}_${sanitizeForId(supportId)}`
}

function formatTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

function getVersementsMap(
  paymentData: admin.firestore.DocumentData | undefined
): Map<string, admin.firestore.DocumentData> {
  const map = new Map<string, admin.firestore.DocumentData>()
  const versements = Array.isArray(paymentData?.versements) ? paymentData.versements : []

  for (const versement of versements) {
    const id = asString(versement?.id)
    if (!id) continue
    map.set(id, versement as admin.firestore.DocumentData)
  }

  return map
}

function buildBeneficiaryName(contractData: admin.firestore.DocumentData | undefined): string {
  const firstName = asString(contractData?.memberFirstName) || ''
  const lastName = asString(contractData?.memberLastName) || ''
  const fullName = `${firstName} ${lastName}`.trim()
  if (fullName.length > 0) return fullName
  return asString(contractData?.memberId) || 'Bénéficiaire inconnu'
}

async function getAdminDisplayName(adminId: string, cache: Map<string, string>): Promise<string> {
  if (cache.has(adminId)) {
    return cache.get(adminId)!
  }

  try {
    const adminSnap = await db.collection(ADMINS_COLLECTION).doc(adminId).get()
    if (!adminSnap.exists) {
      cache.set(adminId, adminId)
      return adminId
    }

    const data = adminSnap.data()
    const firstName = asString(data?.firstName) || ''
    const lastName = asString(data?.lastName) || ''
    const fullName = `${firstName} ${lastName}`.trim() || adminId
    cache.set(adminId, fullName)
    return fullName
  } catch {
    cache.set(adminId, adminId)
    return adminId
  }
}

function cleanUndefined(input: Record<string, unknown>): Record<string, unknown> {
  const output: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) output[key] = value
  }
  return output
}

type SupportRepaymentNormalized = {
  id: string
  amount: number
  date?: string
  time?: string
  monthIndex?: number
  versementId?: string
  createdBy?: string
  createdAt: Date
}

function normalizeSupportRepayments(repaymentsRaw: unknown): {
  repayments: Array<Record<string, unknown>>
  repaymentCount: number
  repaymentTotal: number
  lastRepaymentAt: Date | null
  lastRepaymentAmount?: number
  lastRepaymentId?: string
  lastRepaymentVersementId?: string
  lastRepaymentMonthIndex?: number
} {
  const rawRepayments = Array.isArray(repaymentsRaw) ? repaymentsRaw : []
  const normalized: SupportRepaymentNormalized[] = []

  for (const [index, repaymentRaw] of rawRepayments.entries()) {
    const repayment = repaymentRaw as admin.firestore.DocumentData | undefined
    const amount = asNumber(repayment?.amount)
    if (amount <= 0) continue

    const id = asString(repayment?.id) || `repayment_${index + 1}`
    const date = asString(repayment?.date)
    const createdAt = toDate(repayment?.createdAt) || toDate(date) || new Date()

    normalized.push({
      id,
      amount,
      date,
      time: asString(repayment?.time),
      monthIndex: asInteger(repayment?.monthIndex),
      versementId: asString(repayment?.versementId),
      createdBy: asString(repayment?.createdBy),
      createdAt,
    })
  }

  normalized.sort((a, b) => {
    const diff = a.createdAt.getTime() - b.createdAt.getTime()
    if (diff !== 0) return diff
    return a.id.localeCompare(b.id)
  })

  const repayments = normalized.map((repayment) =>
    cleanUndefined({
      id: repayment.id,
      amount: repayment.amount,
      date: repayment.date,
      time: repayment.time,
      monthIndex: repayment.monthIndex,
      versementId: repayment.versementId,
      createdBy: repayment.createdBy,
      createdAt: admin.firestore.Timestamp.fromDate(repayment.createdAt),
    })
  )

  const repaymentTotal = normalized.reduce((sum, repayment) => sum + repayment.amount, 0)
  const lastRepayment = normalized[normalized.length - 1]

  return {
    repayments,
    repaymentCount: repayments.length,
    repaymentTotal,
    lastRepaymentAt: lastRepayment?.createdAt || null,
    lastRepaymentAmount: lastRepayment?.amount,
    lastRepaymentId: lastRepayment?.id,
    lastRepaymentVersementId: lastRepayment?.versementId,
    lastRepaymentMonthIndex: lastRepayment?.monthIndex,
  }
}

async function upsertCentralizedPayment(paymentId: string, payload: Record<string, unknown>): Promise<void> {
  const ref = db.collection(CENTRALIZED_PAYMENTS_COLLECTION).doc(paymentId)
  await db.runTransaction(async (transaction) => {
    const existingSnap = await transaction.get(ref)
    const existingData = existingSnap.exists ? existingSnap.data() : undefined

    const incomingSourceUpdatedAt = toDate(payload.sourceUpdatedAt)
    const existingSourceUpdatedAt = toDate(existingData?.sourceUpdatedAt)
    if (
      existingSnap.exists &&
      incomingSourceUpdatedAt &&
      existingSourceUpdatedAt &&
      incomingSourceUpdatedAt.getTime() < existingSourceUpdatedAt.getTime()
    ) {
      console.log(
        `[syncCIPaymentsToCentralizedPayments] event ignoré (plus ancien) pour ${paymentId}`
      )
      return
    }

    if (existingSnap.exists) {
      transaction.set(
        ref,
        cleanUndefined({
          ...payload,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }),
        { merge: true }
      )
      return
    }

    transaction.set(
      ref,
      cleanUndefined({
        ...payload,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }),
      { merge: true }
    )
  })
}

async function deleteCentralizedPayment(paymentId: string): Promise<void> {
  try {
    await db.collection(CENTRALIZED_PAYMENTS_COLLECTION).doc(paymentId).delete()
  } catch (error) {
    console.warn(`[syncCIPaymentsToCentralizedPayments] suppression ignorée pour ${paymentId}`, error)
  }
}

export const syncCIPaymentsToCentralizedPayments = onDocumentWritten(
  {
    document: 'contractsCI/{contractId}/payments/{paymentDocId}',
    memory: '256MiB',
    timeoutSeconds: 60,
  },
  async (event) => {
    const contractId = event.params.contractId as string
    const paymentDocId = event.params.paymentDocId as string

    const beforeData = event.data?.before?.exists ? event.data.before.data() : undefined
    const afterData = event.data?.after?.exists ? event.data.after.data() : undefined

    const beforeMonthIndex = parseMonthIndex(paymentDocId, beforeData)
    const afterMonthIndex = parseMonthIndex(paymentDocId, afterData)

    const beforeVersements = getVersementsMap(beforeData)
    const afterVersements = getVersementsMap(afterData)

    // 1) Supprimer les docs centralisés devenus obsolètes (versement supprimé ou changement de mois)
    for (const [versementId] of beforeVersements) {
      const existedAfter = afterVersements.has(versementId)

      if (!afterData || !existedAfter) {
        const oldPaymentId = buildCIPaymentId(contractId, beforeMonthIndex, versementId)
        await deleteCentralizedPayment(oldPaymentId)
        continue
      }

      if (beforeMonthIndex !== afterMonthIndex) {
        const oldPaymentId = buildCIPaymentId(contractId, beforeMonthIndex, versementId)
        const newPaymentId = buildCIPaymentId(contractId, afterMonthIndex, versementId)
        if (oldPaymentId !== newPaymentId) {
          await deleteCentralizedPayment(oldPaymentId)
        }
      }
    }

    // Si le document source est supprimé, on a terminé après le nettoyage
    if (!afterData) {
      console.log(
        `[syncCIPaymentsToCentralizedPayments] source supprimée: ${CONTRACTS_COLLECTION}/${contractId}/payments/${paymentDocId}`
      )
      return
    }

    // 2) Charger le contrat parent (source de vérité pour bénéficiaire et acceptedBy)
    const contractSnap = await db.collection(CONTRACTS_COLLECTION).doc(contractId).get()
    if (!contractSnap.exists) {
      console.warn(
        `[syncCIPaymentsToCentralizedPayments] contrat introuvable: ${CONTRACTS_COLLECTION}/${contractId}`
      )
      return
    }

    const contractData = contractSnap.data()
    const beneficiaryId = asString(contractData?.memberId) || contractId
    const beneficiaryName = buildBeneficiaryName(contractData)
    const acceptedBy = asString(contractData?.createdBy) || asString(afterData.updatedBy) || asString(afterData.createdBy) || 'system'
    const paymentStatus = asString(afterData.status) || 'DUE'
    const sourcePath = `${CONTRACTS_COLLECTION}/${contractId}/payments/${paymentDocId}`
    const modificationReason = asString(afterData.modificationReason)

    const adminNameCache = new Map<string, string>()

    // 3) Upsert de chaque versement dans la collection centralisée
    for (const [versementId, versement] of afterVersements) {
      const monthContributionAmount = asNumber(versement.amount)
      const supportRepaymentAmount = asNumber(versement.supportRepaymentAmount)
      const amount = monthContributionAmount + supportRepaymentAmount

      if (amount <= 0) {
        console.warn(
          `[syncCIPaymentsToCentralizedPayments] montant ignoré (<=0) pour versement ${versementId} du contrat ${contractId}`
        )
        continue
      }

      const recordedBy =
        asString(afterData.updatedBy) ||
        asString(versement.createdBy) ||
        asString(afterData.createdBy) ||
        acceptedBy
      const recordedByName = await getAdminDisplayName(recordedBy, adminNameCache)

      const paymentDate = toDate(versement.date) || toDate(versement.createdAt) || new Date()
      const recordedAt = toDate(versement.createdAt) || toDate(afterData.updatedAt) || new Date()
      const sourceUpdatedAt =
        toDate(afterData.updatedAt) ||
        toDate(versement.createdAt) ||
        toDate(afterData.createdAt) ||
        paymentDate
      const paymentId = buildCIPaymentId(contractId, afterMonthIndex, versementId)

      await upsertCentralizedPayment(
        paymentId,
        cleanUndefined({
          sourceType: 'caisse-imprevue',
          sourceId: contractId,
          contractId,
          contractRef: contractId,
          monthIndex: afterMonthIndex,
          versementId,
          sourcePath,
          paymentStatus,
          monthContributionAmount,
          supportRepaymentAmount: supportRepaymentAmount > 0 ? supportRepaymentAmount : undefined,
          beneficiaryId,
          beneficiaryName,
          date: admin.firestore.Timestamp.fromDate(paymentDate),
          time: asString(versement.time) || '00:00',
          mode: asString(versement.mode) || 'cash',
          amount,
          acceptedBy,
          paymentType: 'UnexpectedFund',
          withFees: typeof versement.withFees === 'boolean' ? versement.withFees : undefined,
          paymentMethodOther: asString(versement.paymentMethodOther),
          proofUrl: asString(versement.proofUrl),
          proofPath: asString(versement.proofPath),
          recordedBy,
          recordedByName,
          recordedAt: admin.firestore.Timestamp.fromDate(recordedAt),
          sourceUpdatedAt: admin.firestore.Timestamp.fromDate(sourceUpdatedAt),
          modificationReason,
        })
      )
    }

    console.log(
      `[syncCIPaymentsToCentralizedPayments] synchronisation terminée pour ${CONTRACTS_COLLECTION}/${contractId}/payments/${paymentDocId} (${afterVersements.size} versement(s))`
    )
  }
)

export const syncCISupportsToCentralizedPayments = onDocumentWritten(
  {
    document: 'contractsCI/{contractId}/supports/{supportId}',
    memory: '256MiB',
    timeoutSeconds: 60,
  },
  async (event) => {
    const contractId = event.params.contractId as string
    const supportId = event.params.supportId as string
    const centralizedPaymentId = buildCISupportPaymentId(contractId, supportId)

    const afterData = event.data?.after?.exists ? event.data.after.data() : undefined

    // Si le support est supprimé, supprimer la trace centralisée
    if (!afterData) {
      await deleteCentralizedPayment(centralizedPaymentId)
      console.log(
        `[syncCISupportsToCentralizedPayments] source supprimée: ${CONTRACTS_COLLECTION}/${contractId}/supports/${supportId}`
      )
      return
    }

    // Charger le contrat parent (source de vérité pour bénéficiaire)
    const contractSnap = await db.collection(CONTRACTS_COLLECTION).doc(contractId).get()
    if (!contractSnap.exists) {
      console.warn(
        `[syncCISupportsToCentralizedPayments] contrat introuvable: ${CONTRACTS_COLLECTION}/${contractId}`
      )
      return
    }

    const contractData = contractSnap.data()
    const beneficiaryId = asString(contractData?.memberId) || contractId
    const beneficiaryName = buildBeneficiaryName(contractData)

    const amount = asNumber(afterData.amount)
    if (amount <= 0) {
      await deleteCentralizedPayment(centralizedPaymentId)
      console.warn(
        `[syncCISupportsToCentralizedPayments] montant ignoré (<=0) pour support ${supportId} du contrat ${contractId}`
      )
      return
    }

    const supportStatus = asString(afterData.status) || 'ACTIVE'
    const acceptedBy =
      asString(afterData.approvedBy) ||
      asString(contractData?.createdBy) ||
      asString(afterData.updatedBy) ||
      asString(afterData.createdBy) ||
      'system'
    const recordedBy =
      asString(afterData.updatedBy) ||
      asString(afterData.createdBy) ||
      acceptedBy
    const adminNameCache = new Map<string, string>()
    const recordedByName = await getAdminDisplayName(recordedBy, adminNameCache)

    const paymentDate =
      toDate(afterData.approvedAt) ||
      toDate(afterData.requestedAt) ||
      toDate(afterData.createdAt) ||
      new Date()
    const recordedAt =
      toDate(afterData.updatedAt) ||
      toDate(afterData.createdAt) ||
      paymentDate
    const requestedAtDate = toDate(afterData.requestedAt)
    const approvedAtDate = toDate(afterData.approvedAt)
    const repaidAtDate = toDate(afterData.repaidAt)

    const sourcePath = `${CONTRACTS_COLLECTION}/${contractId}/supports/${supportId}`
    const normalizedRepayments = normalizeSupportRepayments(afterData.repayments)
    const amountRepaidFromDoc = asOptionalNumber(afterData.amountRepaid)
    const amountRemainingFromDoc = asOptionalNumber(afterData.amountRemaining)
    const amountRepaid = Math.max(amountRepaidFromDoc ?? 0, normalizedRepayments.repaymentTotal)
    const computedRemainingAmount = Math.max(0, amount - amountRepaid)
    const amountRemaining = Math.max(0, amountRemainingFromDoc ?? computedRemainingAmount)
    const isFullyRepaid = supportStatus === 'REPAID' || amountRemaining <= 0 || amountRepaid >= amount
    const sourceUpdatedAt =
      toDate(afterData.updatedAt) ||
      repaidAtDate ||
      approvedAtDate ||
      toDate(afterData.createdAt) ||
      paymentDate

    await upsertCentralizedPayment(
      centralizedPaymentId,
      cleanUndefined({
        sourceType: 'caisse-imprevue',
        sourceId: contractId,
        contractId,
        contractRef: contractId,
        supportId,
        sourcePath,
        supportStatus,
        paymentStatus: isFullyRepaid ? 'REPAID' : supportStatus,
        beneficiaryId,
        beneficiaryName,
        date: admin.firestore.Timestamp.fromDate(paymentDate),
        time: formatTime(paymentDate),
        mode: 'other',
        amount,
        acceptedBy,
        paymentType: 'UnexpectedFund',
        paymentMethodOther: 'support-financier',
        proofUrl: asString(afterData.documentUrl),
        proofPath: asString(afterData.documentPath),
        documentId: asString(afterData.documentId),
        amountRepaid,
        amountRemaining,
        isFullyRepaid,
        repayments: normalizedRepayments.repayments,
        repaymentCount: normalizedRepayments.repaymentCount,
        repaymentTotalAmount: normalizedRepayments.repaymentTotal,
        lastRepaymentAt: normalizedRepayments.lastRepaymentAt
          ? admin.firestore.Timestamp.fromDate(normalizedRepayments.lastRepaymentAt)
          : undefined,
        lastRepaymentAmount: normalizedRepayments.lastRepaymentAmount,
        lastRepaymentId: normalizedRepayments.lastRepaymentId,
        lastRepaymentVersementId: normalizedRepayments.lastRepaymentVersementId,
        lastRepaymentMonthIndex: normalizedRepayments.lastRepaymentMonthIndex,
        requestedAt: requestedAtDate
          ? admin.firestore.Timestamp.fromDate(requestedAtDate)
          : undefined,
        approvedAt: approvedAtDate
          ? admin.firestore.Timestamp.fromDate(approvedAtDate)
          : undefined,
        repaidAt: repaidAtDate
          ? admin.firestore.Timestamp.fromDate(repaidAtDate)
          : undefined,
        recordedBy,
        recordedByName,
        recordedAt: admin.firestore.Timestamp.fromDate(recordedAt),
        sourceUpdatedAt: admin.firestore.Timestamp.fromDate(sourceUpdatedAt),
      })
    )

    console.log(
      `[syncCISupportsToCentralizedPayments] synchronisation terminée pour ${sourcePath}`
    )
  }
)
