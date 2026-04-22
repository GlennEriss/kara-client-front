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

async function upsertCentralizedPayment(paymentId: string, payload: Record<string, unknown>): Promise<void> {
  const ref = db.collection(CENTRALIZED_PAYMENTS_COLLECTION).doc(paymentId)
  const existingSnap = await ref.get()

  if (existingSnap.exists) {
    await ref.set(
      cleanUndefined({
        ...payload,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }),
      { merge: true }
    )
    return
  }

  await ref.set(
    cleanUndefined({
      ...payload,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }),
    { merge: true }
  )
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
          modificationReason,
        })
      )
    }

    console.log(
      `[syncCIPaymentsToCentralizedPayments] synchronisation terminée pour ${CONTRACTS_COLLECTION}/${contractId}/payments/${paymentDocId} (${afterVersements.size} versement(s))`
    )
  }
)
