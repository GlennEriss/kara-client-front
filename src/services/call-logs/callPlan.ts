/**
 * Planning des appels de recouvrement.
 *
 * Un lot est enregistré sous forme d'une tâche par retardataire. Le `batchId`
 * permet de conserver le lien entre les personnes planifiées ensemble, tandis
 * qu'un identifiant déterministe évite les doublons pour une même personne,
 * un même produit et une même date.
 */

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from '@/firebase/firestore'
import { firebaseCollectionNames } from '@/constantes/firebase-collection-names'

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
}

export interface CreateCallPlanBatchInput {
  scheduledDate: string
  targets: CallPlanTarget[]
  assignee?: CallPlanAssignee
  createdById: string
  createdByEmail?: string
  createdByName: string
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

/** Petit hash stable, suffisant pour fabriquer un identifiant Firestore lisible. */
const stableHash = (value: string): string => {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

const taskIdOf = (scheduledDate: string, target: CallPlanTarget) =>
  `${scheduledDate}_${stableHash(`${target.product}|${target.personKey}`)}`

export async function createCallPlanBatch(input: CreateCallPlanBatchInput): Promise<number> {
  const batchId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

  // Une écriture groupée Firestore accepte au maximum 500 opérations. Des lots
  // de 400 gardent une marge si la transaction évolue plus tard.
  for (let offset = 0; offset < input.targets.length; offset += 400) {
    const batch = writeBatch(db)
    const targets = input.targets.slice(offset, offset + 400)
    for (const target of targets) {
      const ref = doc(db, firebaseCollectionNames.callPlans, taskIdOf(input.scheduledDate, target))
      batch.set(ref, sanitize({
        ...target,
        batchId,
        scheduledDate: input.scheduledDate,
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
  return input.targets.length
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
})

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
