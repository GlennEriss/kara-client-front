/**
 * Journalisation des actions administrateurs (audit trail).
 *
 * Écriture « best-effort » : `logAdminAction` n'échoue jamais bruyamment pour ne
 * pas casser l'action métier qu'elle accompagne. Les logs sont append-only côté
 * règles Firestore (création seule, pas de modification/suppression).
 */

import {
  addDoc,
  collection,
  getDocs,
  limit as fbLimit,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/firebase/firestore'
import { firebaseCollectionNames } from '@/constantes/firebase-collection-names'

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'validate'
  | 'reject'
  | 'payment'
  | 'export'
  | 'login'
  | 'other'

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  create: 'Création',
  update: 'Modification',
  delete: 'Suppression',
  validate: 'Validation',
  reject: 'Rejet',
  payment: 'Paiement',
  export: 'Export',
  login: 'Connexion',
  other: 'Autre',
}

export interface AuditLog {
  id: string
  /** Matricule/UID de l'admin auteur de l'action. */
  adminId: string
  adminName: string
  adminEmail?: string
  action: AuditAction
  /** Clé de module (members, caisseSpeciale, admins, ...). */
  module: string
  moduleLabel?: string
  /** Type d'entité concernée (ex: "contrat", "membre", "administrateur"). */
  targetType?: string
  /** Identifiant de l'entité concernée. */
  targetId?: string
  /** Description lisible de l'action. */
  description: string
  /** Données additionnelles (avant/après, montant, etc.). */
  metadata?: Record<string, unknown>
  createdAt: Date
}

export type AuditLogInput = Omit<AuditLog, 'id' | 'createdAt'>

/** Retire les valeurs `undefined` (Firestore les refuse). */
function sanitize<T extends Record<string, any>>(obj: T): T {
  const out: Record<string, any> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v
  }
  return out as T
}

/**
 * Enregistre une action administrateur. Ne lève jamais d'erreur (best-effort).
 */
export async function logAdminAction(entry: AuditLogInput): Promise<void> {
  try {
    await addDoc(collection(db, firebaseCollectionNames.auditLogs), {
      ...sanitize(entry),
      createdAt: serverTimestamp(),
    })
  } catch (error) {
    // La journalisation ne doit jamais bloquer l'action métier.
    console.error('[audit] Échec de la journalisation:', error)
  }
}

function toDate(value: unknown): Date {
  if (value instanceof Date) return value
  if (value && typeof (value as any).toDate === 'function') return (value as any).toDate()
  if (typeof value === 'string' || typeof value === 'number') return new Date(value)
  return new Date(0)
}

/**
 * Récupère les derniers logs (triés du plus récent au plus ancien).
 * Le filtrage fin (module, action, admin, date, recherche) est effectué côté
 * client sur cette fenêtre — suffisant pour un journal, et sans index composite.
 */
export async function listAuditLogs(max = 500): Promise<AuditLog[]> {
  const q = query(
    collection(db, firebaseCollectionNames.auditLogs),
    orderBy('createdAt', 'desc'),
    fbLimit(max),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => {
    const data = d.data() as Record<string, any>
    return {
      id: d.id,
      adminId: String(data.adminId ?? ''),
      adminName: String(data.adminName ?? '—'),
      adminEmail: data.adminEmail ? String(data.adminEmail) : undefined,
      action: (data.action as AuditAction) ?? 'other',
      module: String(data.module ?? ''),
      moduleLabel: data.moduleLabel ? String(data.moduleLabel) : undefined,
      targetType: data.targetType ? String(data.targetType) : undefined,
      targetId: data.targetId ? String(data.targetId) : undefined,
      description: String(data.description ?? ''),
      metadata: data.metadata && typeof data.metadata === 'object' ? data.metadata : undefined,
      createdAt: toDate(data.createdAt),
    }
  })
}
