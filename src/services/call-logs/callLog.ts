/**
 * Comptes rendus d'appels et de relances (traçabilité du recouvrement).
 *
 * Chaque contact avec un retardataire — appel téléphonique, message WhatsApp,
 * visite — produit un document ici. Le journal est append-only côté règles
 * Firestore : on ne réécrit pas l'historique d'une relance.
 *
 * Contrairement à `auditLog`, l'écriture N'EST PAS best-effort : si
 * l'enregistrement échoue, l'admin doit le savoir et recommencer, sinon
 * l'appel qu'il vient de passer disparaît.
 */

import {
  addDoc,
  collection,
  getDocs,
  limit as fbLimit,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/firebase/firestore'
import { firebaseCollectionNames } from '@/constantes/firebase-collection-names'

/** Canal par lequel le contact a eu lieu. */
export type ContactChannel = 'call' | 'whatsapp' | 'sms' | 'visite'

export const CONTACT_CHANNEL_LABELS: Record<ContactChannel, string> = {
  call: 'Appel',
  whatsapp: 'WhatsApp',
  sms: 'SMS',
  visite: 'Visite',
}

/** Issue de l'échange. Liste fermée : c'est ce qui rend les statistiques exploitables. */
export type CallOutcome =
  | 'promesse_paiement'
  | 'paiement_effectue'
  | 'injoignable'
  | 'numero_invalide'
  | 'refus'
  | 'a_rappeler'
  /** Message parti sans échange (rappel WhatsApp) — journalisé automatiquement. */
  | 'message_envoye'
  | 'autre'

export const CALL_OUTCOME_LABELS: Record<CallOutcome, string> = {
  promesse_paiement: 'A promis de payer',
  paiement_effectue: 'A déjà payé',
  injoignable: 'Injoignable',
  numero_invalide: 'Numéro invalide',
  refus: 'Refus de payer',
  a_rappeler: 'À rappeler plus tard',
  message_envoye: 'Message envoyé',
  autre: 'Autre',
}

/** Couleur de pastille par issue (Tailwind), partagée par le tableau et le journal. */
export const CALL_OUTCOME_COLORS: Record<CallOutcome, string> = {
  promesse_paiement: 'bg-amber-100 text-amber-800',
  paiement_effectue: 'bg-green-100 text-green-700',
  injoignable: 'bg-gray-100 text-gray-600',
  numero_invalide: 'bg-orange-100 text-orange-700',
  refus: 'bg-red-100 text-red-700',
  a_rappeler: 'bg-blue-100 text-blue-700',
  message_envoye: 'bg-emerald-50 text-emerald-700',
  autre: 'bg-gray-100 text-gray-600',
}

/** Issues considérées comme « contact établi » (pour le taux de joignabilité). */
export const REACHED_OUTCOMES: CallOutcome[] = [
  'promesse_paiement',
  'paiement_effectue',
  'refus',
  'a_rappeler',
]

export interface CallLog {
  id: string
  /**
   * Clé d'identité du retardataire, identique à `personKeyOf` côté calendrier.
   * Dénormalisée pour pouvoir rattacher un compte rendu sans index composite.
   */
  personKey: string
  /** Identifiants stables quand ils existent (membre ou groupe). */
  memberId?: string
  groupId?: string
  matricule?: string
  name: string
  isGroup: boolean
  product: string
  channel: ContactChannel
  outcome: CallOutcome
  /** Compte rendu libre — obligatoire à la saisie. */
  summary: string
  /** Photo de la situation au moment du contact (le retard évolue ensuite). */
  totalOverdue: number
  overdueCount: number
  maxDaysOverdue: number
  /** Renseigné si `outcome === 'promesse_paiement'`. */
  promiseToPayAt?: Date
  promiseAmount?: number
  /** Auteur de l'appel et du compte rendu : l'admin connecté. */
  adminId: string
  adminName: string
  createdAt: Date
}

export type CallLogInput = Omit<CallLog, 'id' | 'createdAt'>

/** Retire les valeurs `undefined` (Firestore les refuse). */
function sanitize<T extends Record<string, any>>(obj: T): T {
  const out: Record<string, any> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v
  }
  return out as T
}

function toDate(value: unknown): Date {
  if (value instanceof Date) return value
  if (value && typeof (value as any).toDate === 'function') return (value as any).toDate()
  if (typeof value === 'string' || typeof value === 'number') return new Date(value)
  return new Date(0)
}

function toOptionalDate(value: unknown): Date | undefined {
  if (value === null || value === undefined) return undefined
  const d = toDate(value)
  return Number.isNaN(d.getTime()) || d.getTime() === 0 ? undefined : d
}

/**
 * Enregistre un compte rendu de contact. Lève en cas d'échec : l'appelant
 * doit prévenir l'utilisateur pour qu'il ressaisisse.
 */
export async function createCallLog(entry: CallLogInput): Promise<string> {
  const payload = sanitize({
    ...entry,
    summary: entry.summary.trim(),
    // Firestore stocke des Timestamp : la conversion explicite évite de
    // dépendre de la sérialisation implicite de `Date`.
    promiseToPayAt: entry.promiseToPayAt ? Timestamp.fromDate(entry.promiseToPayAt) : undefined,
  })
  const ref = await addDoc(collection(db, firebaseCollectionNames.callLogs), {
    ...payload,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

function mapCallLog(id: string, data: Record<string, any>): CallLog {
  return {
    id,
    personKey: String(data.personKey ?? ''),
    memberId: data.memberId ? String(data.memberId) : undefined,
    groupId: data.groupId ? String(data.groupId) : undefined,
    matricule: data.matricule ? String(data.matricule) : undefined,
    name: String(data.name ?? '—'),
    isGroup: Boolean(data.isGroup),
    product: String(data.product ?? ''),
    channel: (data.channel as ContactChannel) ?? 'call',
    outcome: (data.outcome as CallOutcome) ?? 'autre',
    summary: String(data.summary ?? ''),
    totalOverdue: Number(data.totalOverdue ?? 0),
    overdueCount: Number(data.overdueCount ?? 0),
    maxDaysOverdue: Number(data.maxDaysOverdue ?? 0),
    promiseToPayAt: toOptionalDate(data.promiseToPayAt),
    promiseAmount: data.promiseAmount !== undefined ? Number(data.promiseAmount) : undefined,
    adminId: String(data.adminId ?? ''),
    adminName: String(data.adminName ?? '—'),
    createdAt: toDate(data.createdAt),
  }
}

/**
 * Récupère les derniers comptes rendus (du plus récent au plus ancien).
 *
 * Fenêtre glissante volontairement large plutôt qu'une requête par retardataire :
 * une seule lecture sert tout le tableau des retards, et le filtrage fin
 * (produit, admin, issue, période) se fait côté client — sans index composite.
 * Un contact plus ancien que la fenêtre n'est plus affiché comme « dernier
 * contact », ce qui est le comportement voulu : une relance d'il y a un an
 * n'informe plus sur la situation courante.
 */
export async function listCallLogs(max = 1000): Promise<CallLog[]> {
  const q = query(
    collection(db, firebaseCollectionNames.callLogs),
    orderBy('createdAt', 'desc'),
    fbLimit(max),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => mapCallLog(d.id, d.data() as Record<string, any>))
}
