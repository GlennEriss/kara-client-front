/**
 * Planning des appels de recouvrement.
 *
 * Un lot est enregistré sous forme d'une tâche par retardataire. Le `batchId`
 * permet de conserver le lien entre les personnes planifiées ensemble.
 * Les reports conservent la tâche, son attribution et son historique.
 */

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from '@/firebase/firestore'
import { firebaseCollectionNames } from '@/constantes/firebase-collection-names'
import { callPlanToday, isValidCallPlanDate } from '@/utils/call-plan-dates'

export type CallPlanStatus = 'planned' | 'completed'

export interface CallPlanTarget {
  personKey: string
  memberId?: string
  groupId?: string
  matricule?: string
  name: string
  isGroup: boolean
  product: string
  phone?: string
  whatsappNumber?: string
  totalOverdue: number
  overdueCount: number
  maxDaysOverdue: number
}

export interface CallPlanAssignee {
  adminId: string
  email: string
  name: string
}

export interface CallPlanReschedule {
  from: string
  to: string
  at: Date
  byId: string
  byName: string
  reason?: string
}

export interface CallPlanItem extends CallPlanTarget {
  id: string
  batchId: string
  scheduledDate: string
  assignee?: CallPlanAssignee
  status: CallPlanStatus
  createdById: string
  createdByEmail?: string
  createdByName: string
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
  completedById?: string
  completedByName?: string
  callLogId?: string
  originalScheduledDate?: string
  rescheduleHistory?: CallPlanReschedule[]
  sourceCallLogId?: string
}

export interface CreateCallPlanBatchInput {
  scheduledDate: string
  targets: CallPlanTarget[]
  assignee?: CallPlanAssignee
  createdById: string
  createdByEmail?: string
  createdByName: string
  sourceCallLogId?: string
}

const toDate = (value: unknown): Date => {
  if (value instanceof Date) return value
  if (value && typeof (value as any).toDate === 'function') return (value as any).toDate()
  if (typeof value === 'string' || typeof value === 'number') return new Date(value)
  return new Date(0)
}

const optionalDate = (value: unknown): Date | undefined => {
  if (value == null) return undefined
  const date = toDate(value)
  return Number.isNaN(date.getTime()) || date.getTime() === 0 ? undefined : date
}

const sanitize = <T extends Record<string, unknown>>(value: T): T =>
  Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T

export async function createCallPlanBatch(input: CreateCallPlanBatchInput): Promise<number> {
  if (!isValidCallPlanDate(input.scheduledDate)) throw new Error('Choisissez une date à partir d’aujourd’hui.')
  const batchId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  // Un report conserve son ID : ne jamais écraser une ancienne tâche ni son historique.
  const existing = await getDocs(query(collection(db, firebaseCollectionNames.callPlans), where('scheduledDate', '==', input.scheduledDate)))
  const planned = new Set(existing.docs.map((item) => `${item.data().product}|${item.data().personKey}`))
  const targetsToCreate = input.targets.filter((target) => {
    const key = `${target.product}|${target.personKey}`
    if (planned.has(key)) return false
    planned.add(key)
    return true
  })

  // Une écriture groupée Firestore accepte au maximum 500 opérations. Des lots
  // de 400 gardent une marge si la transaction évolue plus tard.
  for (let offset = 0; offset < targetsToCreate.length; offset += 400) {
    const batch = writeBatch(db)
    const targets = targetsToCreate.slice(offset, offset + 400)
    for (const target of targets) {
      const ref = doc(collection(db, firebaseCollectionNames.callPlans))
      batch.set(ref, sanitize({
        ...target,
        batchId,
        scheduledDate: input.scheduledDate,
        originalScheduledDate: input.scheduledDate,
        sourceCallLogId: input.sourceCallLogId,
        assignee: input.assignee,
        status: 'planned' as const,
        createdById: input.createdById,
        createdByEmail: input.createdByEmail,
        createdByName: input.createdByName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }))
    }
    await batch.commit()
  }
  return targetsToCreate.length
}

const mapCallPlan = (id: string, data: Record<string, any>): CallPlanItem => ({
  id,
  batchId: String(data.batchId ?? ''),
  scheduledDate: String(data.scheduledDate ?? ''),
  personKey: String(data.personKey ?? ''),
  memberId: data.memberId ? String(data.memberId) : undefined,
  groupId: data.groupId ? String(data.groupId) : undefined,
  matricule: data.matricule ? String(data.matricule) : undefined,
  name: String(data.name ?? '—'),
  isGroup: Boolean(data.isGroup),
  product: String(data.product ?? ''),
  phone: data.phone ? String(data.phone) : undefined,
  whatsappNumber: data.whatsappNumber ? String(data.whatsappNumber) : undefined,
  totalOverdue: Number(data.totalOverdue ?? 0),
  overdueCount: Number(data.overdueCount ?? 0),
  maxDaysOverdue: Number(data.maxDaysOverdue ?? 0),
  assignee: data.assignee?.email
    ? {
        adminId: String(data.assignee.adminId ?? ''),
        email: String(data.assignee.email),
        name: String(data.assignee.name ?? data.assignee.email),
      }
    : undefined,
  status: data.status === 'completed' ? 'completed' : 'planned',
  createdById: String(data.createdById ?? ''),
  createdByEmail: data.createdByEmail ? String(data.createdByEmail) : undefined,
  createdByName: String(data.createdByName ?? '—'),
  createdAt: toDate(data.createdAt),
  updatedAt: toDate(data.updatedAt),
  completedAt: optionalDate(data.completedAt),
  completedById: data.completedById ? String(data.completedById) : undefined,
  completedByName: data.completedByName ? String(data.completedByName) : undefined,
  callLogId: data.callLogId ? String(data.callLogId) : undefined,
  originalScheduledDate: data.originalScheduledDate || data.scheduledDate,
  sourceCallLogId: data.sourceCallLogId,
  rescheduleHistory: Array.isArray(data.rescheduleHistory) ? data.rescheduleHistory.map((entry: Record<string, any>) => ({
    from: String(entry.from), to: String(entry.to), at: toDate(entry.at),
    byId: String(entry.byId), byName: String(entry.byName), reason: entry.reason,
  })) : [],
})

/** Une seule égalité : aucun nouvel index composite nécessaire. */
export async function listOverdueCallPlans(today = callPlanToday()): Promise<CallPlanItem[]> {
  const snap = await getDocs(query(collection(db, firebaseCollectionNames.callPlans), where('status', '==', 'planned')))
  return snap.docs.map((item) => mapCallPlan(item.id, item.data()))
    .filter((item) => item.scheduledDate < today)
    .sort((left, right) => left.scheduledDate.localeCompare(right.scheduledDate))
}

export type RescheduleCallPlanRequest = ({ id: string; batchId?: never } | { batchId: string; id?: never }) & {
  scheduledDate: string
  reason?: string
}

export type RescheduleCallPlanInput = RescheduleCallPlanRequest & {
  byId: string
  byName: string
}

export async function rescheduleCallPlan(input: RescheduleCallPlanInput): Promise<number> {
  if (!isValidCallPlanDate(input.scheduledDate)) throw new Error('Choisissez une date à partir d’aujourd’hui.')
  const refs = input.id
    ? [doc(db, firebaseCollectionNames.callPlans, input.id)]
    : (await getDocs(query(collection(db, firebaseCollectionNames.callPlans), where('batchId', '==', input.batchId)))).docs.map((item) => item.ref)
  let count = 0
  // Lire avant d'écrire dans chaque transaction : un appel réalisé entre-temps reste terminé.
  for (let offset = 0; offset < refs.length; offset += 400) {
    count += await runTransaction(db, async (transaction) => {
      const snapshots = await Promise.all(refs.slice(offset, offset + 400).map((ref) => transaction.get(ref)))
      let updated = 0
      for (const snapshot of snapshots) {
        if (!snapshot.exists()) continue
        const data = snapshot.data()
        if (data.status !== 'planned' || data.scheduledDate === input.scheduledDate) continue
        const entry = sanitize({
          from: data.scheduledDate, to: input.scheduledDate, at: Timestamp.now(),
          byId: input.byId, byName: input.byName, reason: input.reason?.trim() || undefined,
        })
        transaction.update(snapshot.ref, {
          scheduledDate: input.scheduledDate,
          originalScheduledDate: data.originalScheduledDate ?? data.scheduledDate,
          rescheduleHistory: [...(data.rescheduleHistory ?? []), entry],
          updatedAt: serverTimestamp(),
        })
        updated++
      }
      return updated
    })
  }
  return count
}

export async function listCallPlans(startDate: string, endDate: string): Promise<CallPlanItem[]> {
  const q = query(
    collection(db, firebaseCollectionNames.callPlans),
    where('scheduledDate', '>=', startDate),
    where('scheduledDate', '<=', endDate),
    orderBy('scheduledDate', 'asc'),
  )
  const snap = await getDocs(q)
  return snap.docs.map((item) => mapCallPlan(item.id, item.data() as Record<string, any>))
}

export async function completeCallPlan(
  id: string,
  input: { completedById: string; completedByName: string; callLogId: string },
): Promise<void> {
  await updateDoc(doc(db, firebaseCollectionNames.callPlans, id), {
    status: 'completed',
    completedAt: serverTimestamp(),
    completedById: input.completedById,
    completedByName: input.completedByName,
    callLogId: input.callLogId,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteCallPlan(id: string): Promise<void> {
  await deleteDoc(doc(db, firebaseCollectionNames.callPlans, id))
}
