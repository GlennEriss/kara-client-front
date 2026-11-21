import type { Firestore } from 'firebase-admin/firestore'
import type { MemberCaller, MemberData } from './access'

export function iso(value: any): string {
  const date = value?.toDate?.() ?? value
  if (!date) return ''
  const parsed = new Date(date)
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : ''
}
export async function ownedRows(
  db: Firestore,
  collection: string,
  field: string,
  caller: MemberCaller,
) {
  const ids = [...new Set([caller.matricule, caller.uid])]
  const snapshot = await db.collection(collection).where(field, 'in', ids).get()
  return snapshot.docs.map((d) => ({ ...d.data(), id: d.id }) as MemberData)
}

export const memberIds = (caller: MemberCaller) => [
  ...new Set([caller.uid, caller.matricule]),
]
export const memberIdentifier = (id: unknown): id is string =>
  typeof id === 'string' &&
  id.length > 0 &&
  id.length <= 240 &&
  !/[\\/]/.test(id)
export class MemberError extends Error {
  constructor(
    message: string,
    public status = 400,
    public code = 'INVALID_REQUEST',
  ) {
    super(message)
  }
}
