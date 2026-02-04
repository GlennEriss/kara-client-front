/**
 * Repository pour la collection duplicate-groups
 * Voir documentation/membership-requests/doublons/README.md
 */

import {
  db,
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
  limit,
} from '@/firebase/firestore'
import type { DuplicateGroup, DuplicateGroupType } from '../entities/DuplicateGroup'

const COLLECTION = 'duplicate-groups'

function toDuplicateGroup(id: string, data: Record<string, unknown>): DuplicateGroup {
  return {
    id,
    type: (data.type as DuplicateGroupType) ?? 'phone',
    value: (data.value as string) ?? '',
    requestIds: Array.isArray(data.requestIds) ? (data.requestIds as string[]) : [],
    requestCount: typeof data.requestCount === 'number' ? data.requestCount : 0,
    detectedAt: (data.detectedAt as DuplicateGroup['detectedAt']) ?? new Date(),
    updatedAt: (data.updatedAt as DuplicateGroup['updatedAt']) ?? new Date(),
    resolvedAt: (data.resolvedAt as DuplicateGroup['resolvedAt']) ?? null,
    resolvedBy: (data.resolvedBy as string) ?? null,
  }
}

export class DuplicateGroupsRepository {
  private static instance: DuplicateGroupsRepository

  static getInstance(): DuplicateGroupsRepository {
    if (!DuplicateGroupsRepository.instance) {
      DuplicateGroupsRepository.instance = new DuplicateGroupsRepository()
    }
    return DuplicateGroupsRepository.instance
  }

  async hasUnresolvedGroups(): Promise<boolean> {
    const col = collection(db, COLLECTION)
    const q = query(col, where('resolvedAt', '==', null), limit(1))
    const snapshot = await getDocs(q)
    return !snapshot.empty
  }

  async getUnresolvedGroups(): Promise<DuplicateGroup[]> {
    const col = collection(db, COLLECTION)
    const q = query(col, where('resolvedAt', '==', null))
    const snapshot = await getDocs(q)
    const groups = snapshot.docs.map((d) => toDuplicateGroup(d.id, d.data() as Record<string, unknown>))
    // Tri en mémoire (évite l'index composite Firestore)
    const typeOrder = { phone: 0, email: 1, identityDocument: 2 } as const
    const toTime = (v: DuplicateGroup['detectedAt']) =>
      v && typeof (v as { toMillis?: () => number }).toMillis === 'function'
        ? (v as { toMillis: () => number }).toMillis()
        : v instanceof Date
          ? v.getTime()
          : 0
    groups.sort((a, b) => {
      const typeDiff = (typeOrder[a.type] ?? 0) - (typeOrder[b.type] ?? 0)
      if (typeDiff !== 0) return typeDiff
      return toTime(b.detectedAt) - toTime(a.detectedAt)
    })
    return groups
  }

  async resolveGroup(groupId: string, adminId: string): Promise<void> {
    const ref = doc(db, COLLECTION, groupId)
    await updateDoc(ref, {
      resolvedAt: serverTimestamp(),
      resolvedBy: adminId,
    })
  }
}
