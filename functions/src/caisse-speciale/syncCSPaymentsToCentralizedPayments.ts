import * as admin from 'firebase-admin'
import { onDocumentWritten } from 'firebase-functions/v2/firestore'

if (admin.apps.length === 0) {
  admin.initializeApp()
}

const db = admin.firestore()

const CONTRACTS_COLLECTION = 'caisseContracts'
const ADMINS_COLLECTION = 'admins'
const USERS_COLLECTION = 'users'
const GROUPS_COLLECTION = 'groups'
const CENTRALIZED_PAYMENTS_COLLECTION = 'payments'

type TimestampLike = {
  toDate?: () => Date
  seconds?: number
  nanoseconds?: number
  _seconds?: number
  _nanoseconds?: number
}

type ContributionKind = 'individual' | 'group' | 'legacy'

type NormalizedContribution = {
  key: string
  contributionId: string
  kind: ContributionKind
  amount: number
  paidAt: Date | null
  createdAt: Date | null
  updatedAt: Date | null
  time?: string
  mode?: string
  withFees?: boolean
  paymentMethodOther?: string
  proofUrl?: string
  proofPath?: string
  memberId?: string
  memberName?: string
  memberMatricule?: string
  penalty?: number
  penaltyDays?: number
  agentRecouvrementId?: string
}

type Beneficiary = {
  id: string
  name: string
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

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined
}

function sanitizeForId(value: string): string {
  const cleaned = value.replace(/[^A-Za-z0-9_.-]/g, '_').trim()
  return cleaned.length > 0 ? cleaned : 'unknown'
}

function buildCSPaymentId(contractId: string, paymentDocId: string, contributionKey: string): string {
  return `MK_PYMT_CS_${sanitizeForId(contractId)}_${sanitizeForId(paymentDocId)}_${sanitizeForId(contributionKey)}`
}

function formatTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

function cleanUndefined(input: Record<string, unknown>): Record<string, unknown> {
  const output: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) output[key] = value
  }
  return output
}

function normalizeName(firstName: unknown, lastName: unknown): string | undefined {
  const first = asString(firstName) || ''
  const last = asString(lastName) || ''
  const fullName = `${first} ${last}`.trim()
  return fullName.length > 0 ? fullName : undefined
}

function createContributionKey(kind: ContributionKind, contributionId: string): string {
  return `${kind}:${contributionId}`
}

function getContributionsMap(
  paymentData: admin.firestore.DocumentData | undefined
): Map<string, NormalizedContribution> {
  const map = new Map<string, NormalizedContribution>()

  const contribs = Array.isArray(paymentData?.contribs) ? paymentData.contribs : []
  for (let index = 0; index < contribs.length; index += 1) {
    const contrib = contribs[index] as admin.firestore.DocumentData
    const contributionId = asString(contrib?.id) || `individual_${index + 1}`
    const key = createContributionKey('individual', contributionId)

    map.set(key, {
      key,
      contributionId,
      kind: 'individual',
      amount: asNumber(contrib?.amount),
      paidAt: toDate(contrib?.paidAt),
      createdAt: toDate(contrib?.createdAt),
      updatedAt: toDate(contrib?.updatedAt),
      time: asString(contrib?.time),
      mode: asString(contrib?.mode),
      withFees: asBoolean(contrib?.withFees),
      paymentMethodOther: asString(contrib?.paymentMethodOther),
      proofUrl: asString(contrib?.proofUrl),
      proofPath: asString(contrib?.proofPath),
      memberId: asString(contrib?.memberId),
      memberName: asString(contrib?.memberName),
      memberMatricule: asString(contrib?.memberMatricule),
      penalty: asNumber(contrib?.penalty),
      penaltyDays: asNumber(contrib?.penaltyDays),
      agentRecouvrementId: asString(contrib?.agentRecouvrementId),
    })
  }

  const groupContribs = Array.isArray(paymentData?.groupContributions) ? paymentData.groupContributions : []
  for (let index = 0; index < groupContribs.length; index += 1) {
    const contrib = groupContribs[index] as admin.firestore.DocumentData
    const contributionId = asString(contrib?.id) || `group_${index + 1}`
    const key = createContributionKey('group', contributionId)

    map.set(key, {
      key,
      contributionId,
      kind: 'group',
      amount: asNumber(contrib?.amount),
      paidAt: toDate(contrib?.paidAt) || toDate(contrib?.createdAt),
      createdAt: toDate(contrib?.createdAt),
      updatedAt: toDate(contrib?.updatedAt),
      time: asString(contrib?.time),
      mode: asString(contrib?.mode),
      withFees: asBoolean(contrib?.withFees),
      paymentMethodOther: asString(contrib?.paymentMethodOther),
      proofUrl: asString(contrib?.proofUrl),
      proofPath: asString(contrib?.proofPath),
      memberId: asString(contrib?.memberId),
      memberName:
        asString(contrib?.memberName) ||
        normalizeName(contrib?.memberFirstName, contrib?.memberLastName),
      memberMatricule: asString(contrib?.memberMatricule),
      penalty: asNumber(contrib?.penalty),
      penaltyDays: asNumber(contrib?.penaltyDays),
      agentRecouvrementId: asString(contrib?.agentRecouvrementId),
    })
  }

  // Fallback pour anciens paiements déjà marqués PAID sans tableau de contributions
  if (map.size === 0) {
    const status = asString(paymentData?.status)
    const fallbackAmount = asNumber(paymentData?.accumulatedAmount ?? paymentData?.amount)
    if (status === 'PAID' && fallbackAmount > 0) {
      const contributionId = '__single__'
      const key = createContributionKey('legacy', contributionId)

      map.set(key, {
        key,
        contributionId,
        kind: 'legacy',
        amount: fallbackAmount,
        paidAt: toDate(paymentData?.paidAt),
        createdAt: toDate(paymentData?.createdAt),
        updatedAt: toDate(paymentData?.updatedAt),
        time: asString(paymentData?.time),
        mode: asString(paymentData?.mode),
        withFees: asBoolean(paymentData?.withFees),
        paymentMethodOther: asString(paymentData?.paymentMethodOther),
        proofUrl: asString(paymentData?.proofUrl),
        proofPath: asString(paymentData?.proofPath),
        memberId: asString(paymentData?.memberId),
        memberName: asString(paymentData?.memberName),
        penalty: asNumber(paymentData?.penaltyApplied),
        penaltyDays: asNumber(paymentData?.penaltyDays),
        agentRecouvrementId: asString(paymentData?.agentRecouvrementId),
      })
    }
  }

  return map
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
    const fullName = normalizeName(data?.firstName, data?.lastName) || adminId
    cache.set(adminId, fullName)
    return fullName
  } catch {
    cache.set(adminId, adminId)
    return adminId
  }
}

async function getUserDisplayName(userId: string, cache: Map<string, string>): Promise<string> {
  if (cache.has(userId)) {
    return cache.get(userId)!
  }

  try {
    const userSnap = await db.collection(USERS_COLLECTION).doc(userId).get()
    if (!userSnap.exists) {
      cache.set(userId, userId)
      return userId
    }

    const data = userSnap.data()
    const fullName =
      normalizeName(data?.firstName, data?.lastName) ||
      asString(data?.displayName) ||
      userId
    cache.set(userId, fullName)
    return fullName
  } catch {
    cache.set(userId, userId)
    return userId
  }
}

async function getGroupDisplayName(groupId: string, cache: Map<string, string>): Promise<string> {
  if (cache.has(groupId)) {
    return cache.get(groupId)!
  }

  try {
    const groupSnap = await db.collection(GROUPS_COLLECTION).doc(groupId).get()
    if (!groupSnap.exists) {
      cache.set(groupId, groupId)
      return groupId
    }

    const data = groupSnap.data()
    const groupName = asString(data?.name) || asString(data?.label) || groupId
    cache.set(groupId, groupName)
    return groupName
  } catch {
    cache.set(groupId, groupId)
    return groupId
  }
}

async function resolveDefaultBeneficiary(
  contractId: string,
  contractData: admin.firestore.DocumentData | undefined,
  userNameCache: Map<string, string>,
  groupNameCache: Map<string, string>
): Promise<Beneficiary> {
  const groupId = asString(contractData?.groupeId)
  if (groupId) {
    return {
      id: groupId,
      name: await getGroupDisplayName(groupId, groupNameCache),
    }
  }

  const memberId = asString(contractData?.memberId)
  if (memberId) {
    const contractFullName =
      normalizeName(contractData?.memberFirstName, contractData?.memberLastName) ||
      asString(contractData?.memberName)
    const memberName = contractFullName || (await getUserDisplayName(memberId, userNameCache))
    return { id: memberId, name: memberName }
  }

  return { id: contractId, name: `Contrat ${contractId}` }
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
    console.warn(`[syncCSPaymentsToCentralizedPayments] suppression ignorée pour ${paymentId}`, error)
  }
}

export const syncCSPaymentsToCentralizedPayments = onDocumentWritten(
  {
    document: 'caisseContracts/{contractId}/payments/{paymentDocId}',
    memory: '256MiB',
    timeoutSeconds: 60,
  },
  async (event) => {
    const contractId = event.params.contractId as string
    const paymentDocId = event.params.paymentDocId as string

    const beforeData = event.data?.before?.exists ? event.data.before.data() : undefined
    const afterData = event.data?.after?.exists ? event.data.after.data() : undefined

    const beforeContribs = getContributionsMap(beforeData)
    const afterContribs = getContributionsMap(afterData)

    // 1) Supprimer les docs centralisés devenus obsolètes (contribution supprimée)
    for (const [contributionKey] of beforeContribs) {
      if (!afterData || !afterContribs.has(contributionKey)) {
        const oldPaymentId = buildCSPaymentId(contractId, paymentDocId, contributionKey)
        await deleteCentralizedPayment(oldPaymentId)
      }
    }

    // Si le document source est supprimé, on a terminé après le nettoyage
    if (!afterData) {
      console.log(
        `[syncCSPaymentsToCentralizedPayments] source supprimée: ${CONTRACTS_COLLECTION}/${contractId}/payments/${paymentDocId}`
      )
      return
    }

    // 2) Charger le contrat parent (source de vérité pour bénéficiaire et acceptedBy)
    const contractSnap = await db.collection(CONTRACTS_COLLECTION).doc(contractId).get()
    if (!contractSnap.exists) {
      console.warn(
        `[syncCSPaymentsToCentralizedPayments] contrat introuvable: ${CONTRACTS_COLLECTION}/${contractId}`
      )
      return
    }

    const contractData = contractSnap.data()
    const acceptedBy =
      asString(contractData?.createdBy) ||
      asString(afterData.updatedBy) ||
      asString(afterData.createdBy) ||
      'system'
    const paymentStatus = asString(afterData.status) || 'DUE'
    const dueMonthIndex =
      typeof afterData.dueMonthIndex === 'number' && Number.isFinite(afterData.dueMonthIndex)
        ? afterData.dueMonthIndex
        : undefined
    const sourcePath = `${CONTRACTS_COLLECTION}/${contractId}/payments/${paymentDocId}`
    const modificationReason = asString(afterData.modificationReason)
    const contractType =
      asString(contractData?.contractType) ||
      (asString(contractData?.groupeId) ? 'GROUP' : 'INDIVIDUAL')

    const adminNameCache = new Map<string, string>()
    const userNameCache = new Map<string, string>()
    const groupNameCache = new Map<string, string>()

    const defaultBeneficiary = await resolveDefaultBeneficiary(
      contractId,
      contractData,
      userNameCache,
      groupNameCache
    )

    // 3) Upsert des contributions dans la collection centralisée
    for (const [contributionKey, contribution] of afterContribs) {
      const amount = asNumber(contribution.amount)
      const centralizedPaymentId = buildCSPaymentId(contractId, paymentDocId, contributionKey)

      // Si montant nul/négatif, on supprime l'éventuel doc centralisé
      if (amount <= 0) {
        await deleteCentralizedPayment(centralizedPaymentId)
        continue
      }

      const paymentDate =
        contribution.paidAt ||
        toDate(afterData.paidAt) ||
        contribution.createdAt ||
        toDate(afterData.updatedAt) ||
        new Date()
      const recordedAt =
        contribution.updatedAt ||
        contribution.createdAt ||
        toDate(afterData.updatedAt) ||
        toDate(afterData.createdAt) ||
        paymentDate
      const recordedBy =
        asString(afterData.updatedBy) ||
        asString(afterData.createdBy) ||
        acceptedBy
      const recordedByName = await getAdminDisplayName(recordedBy, adminNameCache)

      const contributionMemberId = asString(contribution.memberId)
      const contributionMemberNameRaw = asString(contribution.memberName)
      const contributionMemberName =
        contributionMemberNameRaw ||
        (contributionMemberId
          ? await getUserDisplayName(contributionMemberId, userNameCache)
          : undefined)

      const beneficiaryId = contributionMemberId || defaultBeneficiary.id
      const beneficiaryName = contributionMemberName || defaultBeneficiary.name
      const withFees = contribution.withFees ?? asBoolean(afterData.withFees)
      const paymentMethodOther =
        asString(contribution.paymentMethodOther) || asString(afterData.paymentMethodOther)

      await upsertCentralizedPayment(
        centralizedPaymentId,
        cleanUndefined({
          sourceType: 'caisse-speciale',
          sourceId: contractId,
          sourcePath,
          contractId,
          contractRef: contractId,
          contractType,
          paymentDocId,
          dueMonthIndex,
          contributionId: contribution.contributionId,
          contributionType: contribution.kind,
          paymentStatus,
          beneficiaryId,
          beneficiaryName,
          contributionMemberId,
          contributionMemberName,
          contributionMemberMatricule: contribution.memberMatricule,
          date: admin.firestore.Timestamp.fromDate(paymentDate),
          time: asString(contribution.time) || asString(afterData.time) || formatTime(paymentDate),
          mode: asString(contribution.mode) || asString(afterData.mode) || 'cash',
          amount,
          acceptedBy,
          paymentType: 'SpecialFund',
          withFees,
          paymentMethodOther,
          proofUrl: contribution.proofUrl,
          proofPath: contribution.proofPath,
          penaltyAmount: asNumber(contribution.penalty) > 0 ? asNumber(contribution.penalty) : undefined,
          penaltyDays: asNumber(contribution.penaltyDays) > 0 ? asNumber(contribution.penaltyDays) : undefined,
          agentRecouvrementId: contribution.agentRecouvrementId,
          recordedBy,
          recordedByName,
          recordedAt: admin.firestore.Timestamp.fromDate(recordedAt),
          modificationReason,
        })
      )
    }

    console.log(
      `[syncCSPaymentsToCentralizedPayments] synchronisation terminée pour ${CONTRACTS_COLLECTION}/${contractId}/payments/${paymentDocId} (${afterContribs.size} contribution(s))`
    )
  }
)
