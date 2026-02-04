/**
 * Cloud Function callable : migration des doublons sur les demandes existantes
 * Normalise les champs et crée les groupes duplicate-groups
 * Voir documentation/membership-requests/doublons/functions/README.md
 */

import * as admin from 'firebase-admin'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { normalizeEmail, normalizeDocNumber, normalizePhone } from './duplicates/normalize'
import { findDuplicates } from './duplicates/detection'
import { updateDuplicateGroups, markRequestsAsDuplicates } from './duplicates/groups'

if (admin.apps.length === 0) {
  admin.initializeApp()
}

const db = admin.firestore()
const groupsCollection = db.collection('duplicate-groups')

function getNormalizedFromData(data: admin.firestore.DocumentData) {
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

export const migrateExistingDuplicates = onCall(
  {
    memory: '512MiB',
    timeoutSeconds: 540,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentification requise')
    }
    const role = (request.auth.token as { role?: string })?.role
    if (!role || !['Admin', 'SuperAdmin', 'Secretary', 'Administrateur'].includes(role)) {
      throw new HttpsError('permission-denied', 'Réservé aux administrateurs')
    }

    const requestsRef = db.collection('membership-requests')
    const snapshot = await requestsRef.get()
    let processed = 0
    let duplicatesFound = 0

    for (const doc of snapshot.docs) {
      const data = doc.data()
      const { email: normalizedEmail, docNumber: normalizedDocNumber, contacts: normalizedContacts } =
        getNormalizedFromData(data)

      const updateData: Record<string, unknown> = {
        normalizedEmail: normalizedEmail ?? null,
        normalizedIdentityDocNumber: normalizedDocNumber ?? null,
      }
      if (normalizedContacts.length > 0) {
        updateData['identity.contacts'] = normalizedContacts
      }

      const matches = await findDuplicates(
        doc.id,
        normalizedContacts,
        normalizedEmail,
        normalizedDocNumber
      )
      const hasMatches =
        matches.byPhone.size > 0 || matches.byEmail.length > 0 || matches.byIdentityDoc.length > 0

      if (hasMatches) {
        const groupIds = await updateDuplicateGroups(
          doc.id,
          matches,
          normalizedEmail,
          normalizedDocNumber
        )
        duplicatesFound += 1
        for (const groupId of groupIds) {
          const groupDoc = await groupsCollection.doc(groupId).get()
          const requestIds: string[] = groupDoc.exists ? (groupDoc.data()?.requestIds || []) : []
          if (requestIds.length > 0) {
            await markRequestsAsDuplicates(requestIds, groupId)
          }
        }
      } else {
        updateData.isDuplicate = false
        updateData.duplicateGroupIds = []
      }

      await doc.ref.update(updateData)
      processed += 1
    }

    return { processed, duplicatesFound }
  }
)
