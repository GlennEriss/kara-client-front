/**
 * Cloud Function : post-traitement quand un groupe de doublons est marqué résolu
 * Retire le groupId des demandes et recalcule isDuplicate
 * Voir documentation/membership-requests/doublons/functions/README.md
 */

import * as admin from 'firebase-admin'
import { onDocumentUpdated } from 'firebase-functions/v2/firestore'

if (admin.apps.length === 0) {
  admin.initializeApp()
}

const db = admin.firestore()
const FieldValue = admin.firestore.FieldValue

export const onDuplicateGroupResolved = onDocumentUpdated(
  {
    document: 'duplicate-groups/{groupId}',
    memory: '256MiB',
    timeoutSeconds: 60,
  },
  async (event) => {
    const before = event.data?.before.data()
    const after = event.data?.after.data()
    const groupId = event.params.groupId

    const resolvedBefore = before?.resolvedAt != null || before?.resolvedBy != null
    const resolvedAfter = after?.resolvedAt != null || after?.resolvedBy != null
    if (resolvedBefore === resolvedAfter) return
    if (!resolvedAfter) return

    const requestIds: string[] = after?.requestIds || []
    if (requestIds.length === 0) return

    const groupsRef = db.collection('duplicate-groups')
    const requestsRef = db.collection('membership-requests')

    for (const requestId of requestIds) {
      const requestRef = requestsRef.doc(requestId)
      const requestSnap = await requestRef.get()
      if (!requestSnap.exists) continue

      const currentGroupIds: string[] = requestSnap.data()?.duplicateGroupIds || []
      const remaining = currentGroupIds.filter((id) => id !== groupId)
      let hasUnresolved = false
      for (const gid of remaining) {
        const gSnap = await groupsRef.doc(gid).get()
        if (!gSnap.exists) continue
        const g = gSnap.data()
        if (g?.resolvedAt == null && g?.resolvedBy == null) {
          hasUnresolved = true
          break
        }
      }
      await requestRef.update({
        duplicateGroupIds: FieldValue.arrayRemove(groupId),
        isDuplicate: hasUnresolved,
      })
    }
  }
)
