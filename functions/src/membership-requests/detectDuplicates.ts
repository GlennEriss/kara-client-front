/**
 * Cloud Function : détection des doublons à chaque écriture sur membership-requests
 * Voir documentation/membership-requests/doublons/functions/README.md
 */

import * as admin from 'firebase-admin'
import { onDocumentWritten } from 'firebase-functions/v2/firestore'
import { normalizeEmail, normalizeDocNumber, normalizePhone } from './duplicates/normalize'
import { findDuplicates } from './duplicates/detection'
import {
  updateDuplicateGroups,
  markRequestsAsDuplicates,
  cleanupOldGroups,
} from './duplicates/groups'

if (admin.apps.length === 0) {
  admin.initializeApp()
}

const db = admin.firestore()

function getNormalizedFromData(data: admin.firestore.DocumentData | undefined) {
  if (!data) {
    return { email: null, docNumber: null, contacts: [] as string[] }
  }
  const identity = data.identity || {}
  const contactsRaw: unknown[] = Array.isArray(identity.contacts) ? identity.contacts : []
  const contacts = contactsRaw
    .map((c) => normalizePhone(typeof c === 'string' ? c : String(c)))
    .filter((c): c is string => c != null)
  const email = normalizeEmail(identity.email)
  const documents = data.documents || {}
  const docNumber = normalizeDocNumber(documents.identityDocumentNumber)
  return { email, docNumber, contacts }
}

function detectionKeysEqual(
  before: admin.firestore.DocumentData | undefined,
  after: admin.firestore.DocumentData | undefined
): boolean {
  const b = getNormalizedFromData(before)
  const a = getNormalizedFromData(after)
  if (b.contacts.length !== a.contacts.length) return false
  const bSet = new Set(b.contacts)
  for (const c of a.contacts) {
    if (!bSet.has(c)) return false
  }
  return b.email === a.email && b.docNumber === a.docNumber
}

export const onMembershipRequestWrite = onDocumentWritten(
  {
    document: 'membership-requests/{requestId}',
    memory: '256MiB',
    timeoutSeconds: 120,
  },
  async (event) => {
    const requestId = event.params.requestId
    const before = event.data?.before.exists ? event.data.before.data() : undefined
    const after = event.data?.after.exists ? event.data.after.data() : undefined

    if (!after && before) {
      const oldGroupIds: string[] = before.duplicateGroupIds || []
      await cleanupOldGroups(requestId, oldGroupIds)
      return
    }

    if (after && before && detectionKeysEqual(before, after)) {
      return
    }

    const oldGroupIds: string[] = (before?.duplicateGroupIds as string[]) || []
    await cleanupOldGroups(requestId, oldGroupIds)

    const { email: normalizedEmail, docNumber: normalizedDocNumber, contacts: normalizedContacts } =
      getNormalizedFromData(after)

    const requestRef = db.collection('membership-requests').doc(requestId)
    const updateData: Record<string, unknown> = {
      normalizedEmail: normalizedEmail ?? null,
      normalizedIdentityDocNumber: normalizedDocNumber ?? null,
      isDuplicate: false,
      duplicateGroupIds: [],
    }
    if (normalizedContacts.length > 0) {
      updateData['identity.contacts'] = normalizedContacts
    }
    await requestRef.update(updateData)

    const matches = await findDuplicates(
      requestId,
      normalizedContacts,
      normalizedEmail,
      normalizedDocNumber
    )
    const hasMatches =
      matches.byPhone.size > 0 || matches.byEmail.length > 0 || matches.byIdentityDoc.length > 0

    if (!hasMatches) return

    const groupIds = await updateDuplicateGroups(
      requestId,
      matches,
      normalizedEmail,
      normalizedDocNumber
    )

    const allRequestIdsByGroup = new Map<string, string[]>()
    for (const [, otherIds] of matches.byPhone) {
      const key = [requestId, ...otherIds].sort().join(',')
      const ids = [requestId, ...otherIds]
      if (!allRequestIdsByGroup.has(key)) allRequestIdsByGroup.set(key, ids)
    }
    if (normalizedEmail && matches.byEmail.length > 0) {
      const ids = [requestId, ...matches.byEmail]
      const key = ids.sort().join(',')
      if (!allRequestIdsByGroup.has(key)) allRequestIdsByGroup.set(key, ids)
    }
    if (normalizedDocNumber && matches.byIdentityDoc.length > 0) {
      const ids = [requestId, ...matches.byIdentityDoc]
      const key = ids.sort().join(',')
      if (!allRequestIdsByGroup.has(key)) allRequestIdsByGroup.set(key, ids)
    }

    const groupsCollection = db.collection('duplicate-groups')
    for (const groupId of groupIds) {
      const groupDoc = await groupsCollection.doc(groupId).get()
      const requestIds: string[] = groupDoc.exists ? (groupDoc.data()?.requestIds || []) : []
      if (requestIds.length > 0) {
        await markRequestsAsDuplicates(requestIds, groupId)
      }
    }
  }
)
