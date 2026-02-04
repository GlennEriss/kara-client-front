/**
 * Gestion des groupes duplicate-groups (création, mise à jour, marquage des demandes)
 * Voir documentation/membership-requests/doublons/functions/README.md
 */

import * as admin from 'firebase-admin'
import type { DuplicateMatches } from './detection'

const db = admin.firestore()
const FieldValue = admin.firestore.FieldValue

export async function updateDuplicateGroups(
  requestId: string,
  matches: DuplicateMatches,
  normalizedEmail: string | null,
  normalizedDocNumber: string | null
): Promise<string[]> {
  const groupsCollection = db.collection('duplicate-groups')
  const groupIds: string[] = []

  for (const [phone, otherIds] of matches.byPhone) {
    const groupId = await upsertGroup(groupsCollection, {
      type: 'phone',
      value: phone,
      requestIds: [requestId, ...otherIds],
    })
    groupIds.push(groupId)
  }

  if (normalizedEmail && matches.byEmail.length > 0) {
    const groupId = await upsertGroup(groupsCollection, {
      type: 'email',
      value: normalizedEmail,
      requestIds: [requestId, ...matches.byEmail],
    })
    groupIds.push(groupId)
  }

  if (normalizedDocNumber && matches.byIdentityDoc.length > 0) {
    const groupId = await upsertGroup(groupsCollection, {
      type: 'identityDocument',
      value: normalizedDocNumber,
      requestIds: [requestId, ...matches.byIdentityDoc],
    })
    groupIds.push(groupId)
  }

  return groupIds
}

async function upsertGroup(
  collection: admin.firestore.CollectionReference,
  data: { type: string; value: string; requestIds: string[] }
): Promise<string> {
  const existing = await collection
    .where('type', '==', data.type)
    .where('value', '==', data.value)
    .limit(1)
    .get()

  if (!existing.empty) {
    const doc = existing.docs[0]
    const currentIds: string[] = doc.data().requestIds || []
    const mergedIds = [...new Set([...currentIds, ...data.requestIds])]
    await doc.ref.update({
      requestIds: mergedIds,
      requestCount: mergedIds.length,
      updatedAt: FieldValue.serverTimestamp(),
    })
    return doc.id
  }

  const newDoc = await collection.add({
    type: data.type,
    value: data.value,
    requestIds: data.requestIds,
    requestCount: data.requestIds.length,
    detectedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    resolvedAt: null,
    resolvedBy: null,
  })
  return newDoc.id
}

export async function markRequestsAsDuplicates(
  requestIds: string[],
  groupId: string
): Promise<void> {
  const batch = db.batch()
  for (const requestId of requestIds) {
    const ref = db.collection('membership-requests').doc(requestId)
    batch.update(ref, {
      isDuplicate: true,
      duplicateGroupIds: FieldValue.arrayUnion(groupId),
    })
  }
  await batch.commit()
}

export async function cleanupOldGroups(
  requestId: string,
  oldGroupIds: string[]
): Promise<void> {
  const groupsCollection = db.collection('duplicate-groups')
  const requestsRef = db.collection('membership-requests')

  for (const groupId of oldGroupIds) {
    const groupRef = groupsCollection.doc(groupId)
    const groupDoc = await groupRef.get()
    if (!groupDoc.exists) continue

    const data = groupDoc.data()
    const requestIds: string[] = data?.requestIds || []
    const newRequestIds = requestIds.filter((id) => id !== requestId)

    if (newRequestIds.length <= 1) {
      await groupRef.delete()
      if (newRequestIds.length === 1) {
        await requestsRef.doc(newRequestIds[0]).update({
          isDuplicate: false,
          duplicateGroupIds: FieldValue.arrayRemove(groupId),
        })
      }
    } else {
      await groupRef.update({
        requestIds: newRequestIds,
        requestCount: newRequestIds.length,
        updatedAt: FieldValue.serverTimestamp(),
      })
    }
  }
}
