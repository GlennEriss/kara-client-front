/**
 * Écriture de l'import Excel — Caisse Imprévue.
 *
 * À partir des lignes analysées (AnalyzedRow) + des membres résolus + des
 * forfaits A–E, écrit dans Firestore :
 *  - contractsCI/{id}                      (ContractCI)
 *  - contractsCI/{id}/payments/month-N     (PaymentCI + versements)
 *  - contractsCI/{id}/supports/support-mig-i (SupportCI, feuille ACTIVE)
 *  - contractsCI/{id}/earlyRefunds/refund-mig (EarlyRefundCI, clôturés annulés)
 *
 * IDs déterministes => idempotent (relance sans doublon).
 * Chaque document porte un marqueur `migration` + champs plats pour le rollback.
 */

import {
  collection,
  db,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
} from '@/firebase/firestore'
import { auth } from '@/firebase/auth'
import { addCaisseContractToUser } from '@/db/member.db'
import { generateAllDemandSearchableTexts } from '@/utils/demandSearchableText'
import { getActiveSettings } from '@/db/caisse/settings.db'

/** Cache du settingsVersion des réglages actifs par type de caisse (1 fetch/type). */
const csSettingsVersionCache = new Map<string, string | undefined>()
import { firebaseCollectionNames } from '@/constantes/firebase-collection-names'
import type { SubscriptionCI, User } from '@/types/types'
import {
  CATEGORY_AMOUNT,
  type AnalyzedMember,
  type AnalyzedRow,
  type ImportMemberData,
  type ImportPayment,
  type ImportTarget,
  type ImportVersement,
} from './excelImportAnalyzer'
import {
  UNKNOWN_USER_FIRST_NAME,
  UNKNOWN_USER_ID,
  UNKNOWN_USER_LAST_NAME,
  UNKNOWN_USER_MATRICULE,
  buildUnknownUserBase,
} from './unknownUser'

const CONTRACTS = firebaseCollectionNames.contractsCI || 'contractsCI'
const SUBSCRIPTIONS = firebaseCollectionNames.subscriptionsCI || 'subscriptionsCI'
const MEMBER_SUBSCRIPTIONS = firebaseCollectionNames.subscriptions || 'subscriptions'
const USERS = firebaseCollectionNames.users || 'users'
const CAISSE_CONTRACTS = firebaseCollectionNames.caisseContracts || 'caisseContracts'
const MEMBERSHIP_REQUESTS = firebaseCollectionNames.membershipRequests || 'membership-requests'
const PAYMENTS = firebaseCollectionNames.payments || 'payments'
const CI_DEMANDS = firebaseCollectionNames.caisseImprevueDemands || 'caisseImprevueDemands'

/** Mappe le moyen de paiement du fichier vers l'énumération de l'app. */
function mapPaymentMode(raw?: string): string {
  const up = (raw || '').toUpperCase().replace(/[\s_]+/g, '-')
  if (up.includes('AIRTEL')) return 'airtel_money'
  if (up.includes('MOBI') || up.includes('MOOV')) return 'mobicash'
  if (up.includes('ESPECE') || up.includes('CASH') || up.includes('LIQUIDE')) return 'cash'
  if (up.includes('VIREMENT') || up.includes('BANK') || up.includes('BANQUE')) return 'bank_transfer'
  return 'other'
}

/** Récupère les forfaits A–E (subscriptionsCI) pour résoudre subscriptionCIID/Code. */
export async function fetchForfaits(): Promise<SubscriptionCI[]> {
  const snap = await getDocs(collection(db, SUBSCRIPTIONS))
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })) as SubscriptionCI[]
}

/**
 * Crée les forfaits A–E manquants (parmi les catégories réellement utilisées),
 * pour que chaque contrat pointe vers un vrai forfait. Retourne la liste complète.
 */
export async function ensureForfaits(
  neededCategories: Iterable<string>,
  existing: SubscriptionCI[],
  adminId: string,
): Promise<{ forfaits: SubscriptionCI[]; created: string[] }> {
  const byCode = new Map(existing.map((f) => [(f.code || '').trim().toUpperCase(), f]))
  const created: string[] = []
  const added: SubscriptionCI[] = []
  for (const raw of neededCategories) {
    const cat = (raw || '').trim().toUpperCase()
    if (!CATEGORY_AMOUNT[cat]) continue // catégorie inconnue → gérée en placeholder ailleurs
    if (byCode.has(cat)) continue // déjà présent
    const amount = CATEGORY_AMOUNT[cat]
    const duration = 12
    const id = `MIG_FORFAIT_${cat}`
    const data = {
      id,
      code: cat,
      label: `Forfait ${cat}`,
      amountPerMonth: amount,
      nominal: amount * duration,
      durationInMonths: duration,
      penaltyRate: 0,
      penaltyDelayDays: 0,
      supportMin: 0,
      supportMax: amount * duration,
      status: 'ACTIVE',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: adminId,
      isMigrated: true,
    }
    await setDoc(doc(db, SUBSCRIPTIONS, id), data)
    const local = { ...data, createdAt: new Date(), updatedAt: new Date() } as unknown as SubscriptionCI
    byCode.set(cat, local)
    added.push(local)
    created.push(cat)
  }
  return { forfaits: [...existing, ...added], created }
}

export interface ImportContext {
  adminId: string
  sheetName: string
  sourceFile: string
  members: Map<string, User>
  forfaits: SubscriptionCI[]
  /** Données MEMBRES (par matricule) pour enrichir les comptes créés à la volée. */
  memberData: Map<string, ImportMemberData>
  /** Cible : 'CI' (contractsCI, défaut) ou 'CS' (caisseContracts). */
  target?: ImportTarget
}

export interface ImportRowResult {
  rowNumber: number
  matricule: string
  status: 'created' | 'skipped'
  reason?: string
  contractId?: string
  payments?: number
  supports?: number
  earlyRefund?: boolean
  memberCreated?: boolean
  /** Champs laissés en placeholder (à compléter manuellement). */
  placeholders?: string[]
}

export interface ImportReport {
  created: number
  skipped: number
  membersCreated: number
  /** Catégories de forfait créées automatiquement (ex. ['A','C']). */
  forfaitsCreated: string[]
  /** Nombre de contrats avec au moins un champ à compléter. */
  toComplete: number
  results: ImportRowResult[]
}

function safeDate(s: string | undefined | null): Date {
  if (!s) return new Date(0)
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? new Date(0) : d
}

function sanitizeMatricule(m: string): string {
  return m.replace(/[^a-zA-Z0-9]/g, '')
}

let unknownUserEnsured = false
/**
 * Crée le compte « INCONNU INCONNU » s'il n'existe pas (idempotent, une fois par
 * session). Utilisé comme parrain / contact d'urgence par défaut.
 */
async function ensureUnknownUser(): Promise<void> {
  if (unknownUserEnsured) return
  const ref = doc(db, USERS, UNKNOWN_USER_ID)
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    await setDoc(ref, {
      ...buildUnknownUserBase(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  }
  unknownUserEnsured = true
}

function safeUserDocIdFromMatricule(matricule: string): string {
  return matricule.trim().replace(/[/\\#?[\]]/g, '-')
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}

function compactDateStamp(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yy = String(d.getFullYear()).slice(-2)
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${dd}${mm}${yy}_${hh}${min}`
}

function makeMembershipSubscriptionId(matricule: string, now = new Date()): string {
  return `MK_SUB_MIG_${sanitizeMatricule(matricule) || 'NA'}_${compactDateStamp(now)}`
}

function calculateBirthdayFields(birthDateStr: string | undefined): {
  birthMonth: number | null
  birthDay: number | null
  birthDayOfYear: number | null
} {
  if (!birthDateStr) return { birthMonth: null, birthDay: null, birthDayOfYear: null }
  const birthDate = new Date(birthDateStr)
  if (Number.isNaN(birthDate.getTime())) return { birthMonth: null, birthDay: null, birthDayOfYear: null }
  const start = new Date(birthDate.getFullYear(), 0, 0)
  const oneDay = 1000 * 60 * 60 * 24
  return {
    birthMonth: birthDate.getMonth() + 1,
    birthDay: birthDate.getDate(),
    birthDayOfYear: Math.floor((birthDate.getTime() - start.getTime()) / oneDay),
  }
}

function missingMemberFields(data: ImportMemberData | undefined): string[] {
  const missing: string[] = []
  if (!data) missing.push('feuille MEMBRES')
  if (!data?.email) missing.push('email')
  if (!data?.gender) missing.push('genre')
  if (!data?.birthDate) missing.push('date de naissance')
  if (!data?.birthPlace) missing.push('lieu de naissance')
  if (!data?.nationality) missing.push('nationalité')
  if (!data?.identityDocument) missing.push('type pièce')
  if (!data?.identityDocumentNumber) missing.push('numéro pièce')
  if (!data?.address) missing.push('adresse')
  missing.push('compte Firebase Auth')
  missing.push('photo membre')
  missing.push('photos pièce identité')
  missing.push('PDF adhésion signé')
  missing.push('dossier membership-request réel')
  return missing
}

/** Hash court déterministe (djb2 → base36) pour discriminer les critères. */
function shortHash(s: string): string {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0
  return h.toString(36)
}

export function makeContractId(
  kind: 'A' | 'C',
  matricule: string,
  startDate: string | null,
  suffix = '',
): string {
  const m = sanitizeMatricule(matricule) || 'NA'
  const d = (startDate || '').replace(/-/g, '') || 'NA'
  return `MK_CI_MIG_${kind}_${m}_${d}${suffix ? `_${suffix}` : ''}`
}

/**
 * ID de contrat pour une ligne analysée (même logique que l'écriture).
 *
 * Critère de doublon = CODE ENTRAIDE (colonne « CODE ENTRAI »). C'est l'identifiant
 * unique d'un contrat : un même code ⇒ un même document (idempotent), y compris
 * lorsqu'il apparaît dans plusieurs feuilles (GESTION …ACTIF vs ADHESION …) ou
 * que le membre possède plusieurs contrats (matricule répété).
 *
 * Repli (lignes sans code) : ancienne clé composite type + matricule + date début
 * + catégorie + montant mensuel + durée + date de fin.
 */
export function contractIdForRow(row: AnalyzedRow, target: ImportTarget = 'CI'): string {
  const prefix = target === 'CS' ? 'MK_CS_MIG' : 'MK_CI_MIG'

  const code = row.entraide?.code ? sanitizeMatricule(row.entraide.code) : ''
  if (code) return `${prefix}_CODE_${code}`

  // Repli : pas de CODE ENTRAIDE sur la ligne → clé composite historique.
  const kind: 'A' | 'C' = row.status === 'ACTIVE' ? 'A' : 'C'
  const cat = sanitizeMatricule(row.category) || 'X'
  const key = `${row.amountPerMonth}|${row.durationMonths}|${row.entraide?.contractEndDate ?? ''}`
  const m = sanitizeMatricule(row.matricule) || 'NA'
  const d = (row.startDate || '').replace(/-/g, '') || 'NA'
  const suffix = `${cat}${shortHash(key)}`
  if (target === 'CS') return `MK_CS_MIG_${kind}_${m}_${d}_${suffix}`
  return makeContractId(kind, row.matricule, row.startDate, suffix)
}

function pickForfait(
  category: string,
  amountPerMonth: number,
  forfaits: SubscriptionCI[],
): SubscriptionCI | undefined {
  return (
    forfaits.find((f) => (f.code || '').trim().toUpperCase() === category) ||
    forfaits.find((f) => f.amountPerMonth === amountPerMonth)
  )
}

/** Retire récursivement les clés `undefined` d'un objet de DONNÉES simple
 *  (sans FieldValue). À n'utiliser que sur des blocs sans serverTimestamp. */
function cleanPlain<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue
    if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
      out[k] = cleanPlain(v as Record<string, unknown>)
    } else {
      out[k] = v
    }
  }
  return out as T
}

const SERVER_TIMESTAMP_TOKEN = '__karaServerTimestamp'
const DATE_TOKEN = '__karaDate'

type AdminImportDoc = {
  path: string[]
  data: Record<string, unknown>
}

function adminServerTimestamp(): Record<string, true> {
  return { [SERVER_TIMESTAMP_TOKEN]: true }
}

function encodeAdminImportValue(value: unknown): unknown {
  if (value === undefined) return undefined
  if (value instanceof Date) return { [DATE_TOKEN]: value.toISOString() }
  if (Array.isArray(value)) return value.map(encodeAdminImportValue)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (val === undefined) continue
      out[key] = encodeAdminImportValue(val)
    }
    return out
  }
  return value
}

function encodeAdminImportData(data: Record<string, unknown>): Record<string, unknown> {
  return encodeAdminImportValue(data) as Record<string, unknown>
}

async function adminImportHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  // Le token ID est un bonus : si son rafraîchissement échoue (réseau,
  // securetoken.googleapis.com injoignable → auth/network-request-failed),
  // on NE plante PAS — la requête reste authentifiée par le cookie de
  // session `__session` (envoyé via credentials: 'include').
  try {
    const token = await auth.currentUser?.getIdToken()
    if (token) headers.Authorization = `Bearer ${token}`
  } catch {
    // On s'appuie sur le cookie de session.
  }
  return headers
}

async function commitAdminImportDocs(docs: AdminImportDoc[]): Promise<void> {
  const response = await fetch('/api/import-caisse-imprevue/import-docs', {
    method: 'POST',
    headers: await adminImportHeaders(),
    credentials: 'include',
    body: JSON.stringify({
      docs: docs.map((d) => ({ path: d.path, data: encodeAdminImportData(d.data) })),
    }),
  })
  if (!response.ok) {
    const details = (await response.json().catch(() => null)) as { error?: string; details?: string } | null
    throw new Error(details?.details || details?.error || response.statusText)
  }
}

/** Migration marker (plat + objet) ajouté à chaque document.
 *  `raw` = ligne Excel brute intégrale (uniquement sur le contrat). */
function marker(
  ctx: ImportContext,
  kind: 'A' | 'C',
  rowNumber: number,
  raw?: Record<string, string>,
) {
  return {
    isMigrated: true,
    migrationSource: ctx.sourceFile,
    migrationSheet: ctx.sheetName,
    migration: {
      source: ctx.sourceFile,
      sheet: ctx.sheetName,
      kind,
      rowNumber,
      importedBy: ctx.adminId,
      importedAt: adminServerTimestamp(),
      ...(raw ? { raw } : {}),
    },
  }
}

type ResolvedMember = { id: string; firstName: string; lastName: string }

/**
 * Retourne le membre existant, sinon le crée (compte adhérent, sans Auth).
 * Enrichit depuis la feuille MEMBRES si dispo, sinon depuis la ligne entraide.
 */
async function ensureMember(
  row: AnalyzedRow,
  ctx: ImportContext,
): Promise<{ member: ResolvedMember; created: boolean; missingFields: string[] }> {
  const key = row.matricule.trim()
  const existing = ctx.members.get(key)
  if (existing) {
    return { member: { id: existing.id, firstName: existing.firstName, lastName: existing.lastName }, created: false, missingFields: [] }
  }

  const userId = safeUserDocIdFromMatricule(key)
  if (!userId) {
    throw new Error(`Matricule invalide pour la création du membre: "${row.matricule}"`)
  }

  const data = ctx.memberData.get(key)
  const lastName = data?.lastName || row.lastName || 'INCONNU'
  const firstName = data?.firstName || row.firstName || ''
  const contacts = data?.contacts?.length ? data.contacts : row.contacts
  const now = new Date()
  const dateEnd = new Date(now)
  dateEnd.setFullYear(dateEnd.getFullYear() + 1)
  const subscriptionId = makeMembershipSubscriptionId(key, now)
  const missingFields = missingMemberFields(data)
  const birthdayFields = calculateBirthdayFields(data?.birthDate)

  const userData: Record<string, unknown> = {
    civility: '',
    lastName,
    firstName,
    birthDate: data?.birthDate ?? '',
    birthMonth: birthdayFields.birthMonth,
    birthDay: birthdayFields.birthDay,
    birthDayOfYear: birthdayFields.birthDayOfYear,
    birthPlace: data?.birthPlace ?? '',
    birthCertificateNumber: data?.birthCertificateNumber ?? '',
    contacts,
    gender: data?.gender ?? '',
    email: data?.email ?? '',
    nationality: data?.nationality ?? '',
    hasCar: data?.hasCar ?? false,
    address: data?.address ?? {
      province: '',
      city: '',
      district: '',
      arrondissement: '',
      additionalInfo: '',
    },
    companyName: data?.companyName ?? '',
    profession: data?.profession ?? '',
    identityDocument: data?.identityDocument ?? '',
    identityDocumentNumber: data?.identityDocumentNumber ?? '',
    maritalStatus: data?.maritalStatus ?? '',
    partnerName: data?.partnerName ?? '',
    partnerPhone: data?.partnerPhone ?? '',
    religion: data?.religion ?? '',
    prayerPlace: data?.prayerPlace ?? '',
    intermediaryCode: data?.intermediaryCode || UNKNOWN_USER_MATRICULE, // parrain manquant → INCONNU
    photoURL: null,
    photoPath: null,
    companyId: null,
    professionId: null,
    subscriptions: [subscriptionId],
    dossier: `MIGRATION:${ctx.sourceFile}:${ctx.sheetName}`,
    membershipType: 'adherant',
    roles: ['Adherant'],
    isActive: true,
    // Marqueur migration (identique aux contrats, pour traçabilité).
    isMigrated: true,
    migrationSource: ctx.sourceFile,
    migrationSheet: ctx.sheetName,
    migrationKind: 'caisse-imprevue-contract-member',
    migration: {
      source: ctx.sourceFile,
      sheet: ctx.sheetName,
      importedBy: ctx.adminId,
      importedAt: new Date(),
      kind: 'caisse-imprevue-contract-member',
      missingFields,
    },
  }

  const subscriptionData = {
    userId,
    memberMatricule: key,
    type: 'adherant',
    dateStart: now.toISOString(),
    dateEnd: dateEnd.toISOString(),
    montant: 10300,
    currency: 'XOF',
    createdBy: ctx.adminId,
    status: 'active',
    isValid: true,
    adhesionPdfURL: '',
    isMigrated: true,
    migrationSource: ctx.sourceFile,
    migrationSheet: ctx.sheetName,
    migrationKind: 'caisse-imprevue-contract-member-subscription',
    migration: {
      source: ctx.sourceFile,
      sheet: ctx.sheetName,
      importedBy: ctx.adminId,
      importedAt: new Date(),
      kind: 'caisse-imprevue-contract-member-subscription',
      missingFields: ['PDF adhésion signé', 'paiement adhésion réel'],
    },
  }

  try {
    const response = await fetch('/api/import-caisse-imprevue/migrated-member', {
      method: 'POST',
      headers: await adminImportHeaders(),
      credentials: 'include',
      body: JSON.stringify({
        matricule: key,
        userId,
        userData: cleanPlain(userData),
        subscriptionId,
        subscriptionData: cleanPlain(subscriptionData),
      }),
    })
    if (!response.ok) {
      const details = (await response.json().catch(() => null)) as { error?: string; details?: string } | null
      throw new Error(details?.details || details?.error || response.statusText)
    }
  } catch (error) {
    throw new Error(`Impossible de creer l'adhesion migree ${key}: ${errorMessage(error)}`)
  }

  const createdUser = {
    ...(userData as Omit<User, 'id' | 'matricule' | 'createdAt' | 'updatedAt'>),
    id: userId,
    matricule: key,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as User
  ctx.members.set(key, createdUser)

  return { member: { id: userId, firstName, lastName }, created: true, missingFields }
}

/**
 * Écrit une ligne (1 contrat + sous-collections) dans son propre batch.
 * Crée le membre si absent. Retourne le résultat.
 */
async function writeRow(row: AnalyzedRow, ctx: ImportContext): Promise<ImportRowResult> {
  const { member, created: memberCreated, missingFields: memberMissingFields } = await ensureMember(row, ctx)

  const kind: 'A' | 'C' = row.status === 'ACTIVE' ? 'A' : 'C'
  const contractId = contractIdForRow(row)
  // Demande CI liée (traçabilité demande → contrat, comme le flux manuel).
  const demandId = `${contractId}_DMD`
  const forfait = pickForfait(row.category, row.amountPerMonth, ctx.forfaits)
  const nominal = forfait?.nominal ?? row.amountPerMonth * Math.max(row.durationMonths, 1)
  const supportMin = forfait?.supportMin ?? 0
  const supportMax = forfait?.supportMax ?? nominal
  const totalMonthsPaid = row.payments.filter((p) => p.status === 'PAID').length

  const placeholders: string[] = []
  if (!forfait) placeholders.push('forfait (catégorie inconnue)')
  if (memberMissingFields.length > 0) {
    placeholders.push(...memberMissingFields.map((field) => `membre: ${field}`))
  }

  // Contact d'urgence : ligne entraide si présent, sinon partenaire du membre,
  // sinon membre INCONNU INCONNU par défaut.
  const memberRow = ctx.memberData.get(row.matricule.trim())
  let emergency = row.emergency
  let emergencyIsUnknown = false
  const emergencyMissing = !emergency.lastName || emergency.lastName === 'INCONNU'
  if (emergencyMissing && memberRow?.partnerName) {
    emergency = {
      lastName: memberRow.partnerName,
      firstName: '',
      phone1: memberRow.partnerPhone ?? '',
      relationship: 'Conjoint(e)',
    }
  } else if (emergencyMissing) {
    // Aucun contact connu → INCONNU INCONNU (rattaché au compte placeholder).
    emergency = {
      lastName: UNKNOWN_USER_LAST_NAME,
      firstName: UNKNOWN_USER_FIRST_NAME,
      phone1: '',
      relationship: 'INCONNU',
    }
    emergencyIsUnknown = true
    placeholders.push("contact d'urgence (INCONNU par défaut)")
  }
  // Le garant (col 20 « MATRICULE GARANT(E) », feuille CLÔTURÉE) est un membre → on
  // lie le contact d'urgence à son compte, comme la recherche intelligente manuelle.
  // ⚠️ Uniquement si ça ressemble à un matricule (…MK…) : sur la feuille ACTIVE la
  // col 20 est une HEURE, pas un matricule.
  const guarantorRaw = row.entraide?.guarantorMatricule?.trim()
  const guarantorMemberId =
    guarantorRaw && /\.?MK\.?/i.test(guarantorRaw) ? safeUserDocIdFromMatricule(guarantorRaw) : undefined
  // Garant identifié → son compte ; sinon (pas de matricule garant exploitable) →
  // rattaché au membre placeholder INCONNU. Le contact d'urgence a TOUJOURS un memberId.
  const emergencyMemberId = guarantorMemberId ?? UNKNOWN_USER_ID
  if (!guarantorMemberId && !emergencyIsUnknown) placeholders.push("contact d'urgence rattaché à INCONNU")
  if (totalMonthsPaid > 0) placeholders.push('preuves de versement')

  const docs: AdminImportDoc[] = []
  const supportIds: string[] = []

  // --- Supports / aides (imprévus) ---
  // ARGENT REMIS = montant de l'aide prise ; CLOTURE IMPREVUE = date de remboursement.
  // Présence de la clôture ⇒ aide REMBOURSÉE ; absence ⇒ aide EN COURS (ACTIVE).
  let outstandingSupportId: string | undefined
  row.supportsDetail.forEach((s, i) => {
    const supportId = `support-mig-${i}`
    supportIds.push(supportId)
    const repaid = !!s.closureDate
    if (!repaid) outstandingSupportId = supportId
    docs.push({
      path: [CONTRACTS, contractId, 'supports', supportId],
      data: {
      id: supportId,
      contractId,
      amount: s.amount,
      motif: 'Import migration Excel',
      status: repaid ? 'REPAID' : 'ACTIVE',
      amountRepaid: repaid ? s.amount : 0,
      amountRemaining: repaid ? 0 : s.amount,
      deductions: [],
      repayments: [],
      requestedAt: safeDate(s.date),
      paymentMode: s.mode,
      ...(repaid ? { repaidAt: safeDate(s.closureDate as string), closureDate: s.closureDate } : {}),
      ...(s.closureTime ? { closureTime: s.closureTime } : {}),
      ...(s.closureAgent ? { closureAgent: s.closureAgent } : {}),
      ...(s.note ? { closureNote: s.note } : {}),
      createdAt: adminServerTimestamp(),
      createdBy: ctx.adminId,
      ...marker(ctx, kind, row.rowNumber),
      },
    })
  })

  // --- Retrait anticipé (clôturé annulé) ---
  let hasEarlyRefund = false
  if (row.earlyRefundDetail) {
    hasEarlyRefund = true
    const refundDate = safeDate(row.earlyRefundDetail.date)
    const deadline = new Date(refundDate.getTime() + 45 * 24 * 60 * 60 * 1000)
    docs.push({
      path: [CONTRACTS, contractId, 'earlyRefunds', 'refund-mig'],
      data: {
      id: 'refund-mig',
      contractId,
      type: 'EARLY',
      reason: row.earlyRefundDetail.reason || 'Retrait anticipé (import migration Excel)',
      withdrawalDate: refundDate,
      withdrawalTime: '00:00',
      withdrawalAmount: row.earlyRefundDetail.amount,
      withdrawalMode: 'cash',
      proofUrl: '',
      proofPath: '',
      documentId: '',
      amountNominal: row.earlyRefundDetail.amount,
      amountBonus: 0,
      status: 'PAID',
      deadlineAt: deadline,
      createdAt: adminServerTimestamp(),
      updatedAt: adminServerTimestamp(),
      createdBy: ctx.adminId,
      updatedBy: ctx.adminId,
      ...marker(ctx, kind, row.rowNumber),
      },
    })
  }

  // --- Contrat ---
  docs.push({
    path: [CONTRACTS, contractId],
    data: {
    id: contractId,
    demandId,
    memberId: member.id,
    memberMatricule: row.matricule.trim(),
    memberFirstName: row.firstName || member.firstName || '',
    memberLastName: row.lastName || member.lastName || '',
    memberContacts: row.contacts,
    // Infos membre dénormalisées (comme la création manuelle depuis la demande).
    memberEmail: memberRow?.email ?? '',
    memberGender: memberRow?.gender ?? '',
    memberBirthDate: memberRow?.birthDate ?? '',
    memberNationality: memberRow?.nationality ?? '',
    memberProfession: memberRow?.profession ?? '',
    memberAddress: memberRow?.address
      ? [
          memberRow.address.province,
          memberRow.address.city,
          memberRow.address.district,
          memberRow.address.arrondissement,
        ]
          .filter(Boolean)
          .join(', ')
      : '',
    subscriptionCIID: forfait?.id ?? `MIG_${row.category || 'NA'}`,
    subscriptionCICode: forfait?.code ?? row.category,
    subscriptionCILabel: forfait?.label ?? `Forfait ${row.category}`,
    subscriptionCIAmountPerMonth: row.amountPerMonth,
    subscriptionCINominal: nominal,
    subscriptionCIDuration: row.durationMonths,
    subscriptionCISupportMin: supportMin,
    subscriptionCISupportMax: supportMax,
    paymentFrequency: 'MONTHLY',
    firstPaymentDate: row.startDate || '',
    emergencyContact: {
      ...(emergencyMemberId ? { memberId: emergencyMemberId } : {}),
      lastName: emergency.lastName,
      firstName: emergency.firstName,
      phone1: emergency.phone1,
      phone2: '',
      relationship: emergency.relationship,
      idNumber: 'MIGRATION',
      typeId: 'MIGRATION',
      documentPhotoUrl: '',
    },
    status: row.status,
    supportHistory: supportIds,
    // Aide non remboursée (pas de CLOTURE IMPREVUE) ⇒ support actif en cours.
    ...(outstandingSupportId ? { currentSupportId: outstandingSupportId } : {}),
    totalMonthsPaid,
    // On ne peut pas obtenir une nouvelle aide tant qu'une aide est en cours.
    isEligibleForSupport: totalMonthsPaid >= 3 && !outstandingSupportId,
    // Colonnes Excel sans champ direct dans le modèle (préservées telles quelles).
    entraide: cleanPlain({ ...row.entraide }),
    createdAt: adminServerTimestamp(),
    updatedAt: adminServerTimestamp(),
    createdBy: ctx.adminId,
    updatedBy: ctx.adminId,
    ...marker(ctx, kind, row.rowNumber, row.raw),
    },
  })

  // --- Demande CI (convertie) — cohérence demande → contrat comme le flux manuel ---
  docs.push({
    path: [CI_DEMANDS, demandId],
    data: cleanPlain({
      id: demandId,
      memberId: member.id,
      memberFirstName: row.firstName || member.firstName || '',
      memberLastName: row.lastName || member.lastName || '',
      memberEmail: memberRow?.email ?? '',
      memberContacts: row.contacts,
      memberMatricule: row.matricule.trim(),
      memberPhone: row.contacts[0] ?? '',
      searchableText: `${row.lastName || member.lastName || ''} ${row.firstName || member.firstName || ''} ${row.matricule.trim()}`
        .toLowerCase()
        .trim(),
      cause: 'Contrat existant importé (migration Excel) — demande générée pour la traçabilité.',
      subscriptionCIID: forfait?.id ?? `MIG_${row.category || 'NA'}`,
      subscriptionCICode: forfait?.code ?? row.category,
      subscriptionCILabel: forfait?.label ?? `Forfait ${row.category}`,
      subscriptionCIAmountPerMonth: row.amountPerMonth,
      subscriptionCINominal: nominal,
      subscriptionCIDuration: row.durationMonths,
      subscriptionCISupportMin: supportMin,
      subscriptionCISupportMax: supportMax,
      paymentFrequency: 'MONTHLY',
      desiredStartDate: row.startDate || '',
      firstPaymentDate: row.startDate || '',
      emergencyContact: {
        ...(emergencyMemberId ? { memberId: emergencyMemberId } : {}),
        lastName: emergency.lastName,
        firstName: emergency.firstName,
        phone1: emergency.phone1,
        phone2: '',
        relationship: emergency.relationship,
        idNumber: 'MIGRATION',
        typeId: 'MIGRATION',
        documentPhotoUrl: '',
      },
      status: 'CONVERTED',
      priority: 4,
      decisionReason: 'Contrat existant importé (migration).',
      contractId,
      convertedDate: adminServerTimestamp(),
      createdBy: ctx.adminId,
      createdAt: adminServerTimestamp(),
      updatedBy: ctx.adminId,
      updatedAt: adminServerTimestamp(),
      acceptedBy: ctx.adminId,
      acceptedAt: adminServerTimestamp(),
      convertedBy: ctx.adminId,
      convertedAt: adminServerTimestamp(),
      ...marker(ctx, kind, row.rowNumber),
    }),
  })

  // --- Versements (payments) ---
  for (const p of row.payments) {
    const versements = p.versement
      ? [
          {
            id: `v_mig_${p.monthIndex}`,
            date: p.versement.date,
            time: p.versement.time,
            amount: p.versement.amount,
            mode: p.versement.mode,
            proofUrl: '',
            proofPath: '',
            createdAt: safeDate(p.versement.date),
            createdBy: ctx.adminId,
            ...(p.versement.agentName ? { agentName: p.versement.agentName } : {}),
            ...(p.versement.note ? { note: p.versement.note } : {}),
            ...(p.versement.monthLabel ? { monthLabel: p.versement.monthLabel } : {}),
          },
        ]
      : []
    docs.push({
      path: [CONTRACTS, contractId, 'payments', `month-${p.monthIndex}`],
      data: {
      id: `month-${p.monthIndex}`,
      contractId,
      monthIndex: p.monthIndex,
      status: p.status,
      targetAmount: p.targetAmount,
      accumulatedAmount: p.versement?.amount ?? 0,
      versements,
      createdAt: adminServerTimestamp(),
      updatedAt: adminServerTimestamp(),
      createdBy: ctx.adminId,
      updatedBy: ctx.adminId,
      },
    })
  }

  await commitAdminImportDocs(docs)

  return {
    rowNumber: row.rowNumber,
    matricule: row.matricule,
    status: 'created',
    contractId,
    payments: row.payments.length,
    supports: row.supportsDetail.length,
    earlyRefund: hasEarlyRefund,
    memberCreated,
    placeholders,
  }
}

function addMonths(d: Date, n: number): Date {
  const x = new Date(d)
  x.setMonth(x.getMonth() + n)
  return x
}

/** Combine une date "YYYY-MM-DD" et une heure "HH:mm" en Date. */
function combineDateTime(dateStr: string, time?: string): Date {
  const d = safeDate(dateStr)
  const m = time?.match(/^(\d{1,2}):(\d{2})/)
  if (m) d.setHours(Number(m[1]), Number(m[2]), 0, 0)
  return d
}

const MS_PER_DAY = 24 * 60 * 60 * 1000
const midnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

/**
 * Regroupement des versements CS par mois (clé = index de bucket) :
 *  - JOURNALIER : mois de 30 jours depuis le début (la feuille JOURNALIERE
 *    n'a pas de structure mensuelle, on découpe par la date réelle).
 *  - LIBRE : index du bloc d'échéance Excel (chaque bloc = 1 mois). Surtout
 *    PAS le mois calendaire de la date de paiement : les versements en avance
 *    (plusieurs mois payés le même jour) s'écraseraient dans un seul mois
 *    (ex. 12 mois payés → 4-5 affichés, cas matricule 6932.MK.070226).
 * Renvoie null si le contrat n'est pas bucketisé (STANDARD, ou sans début).
 */
export function groupCSVersementsByMonth(row: AnalyzedRow): Map<number, ImportPayment[]> | null {
  const caisseType = row.category || 'STANDARD'
  const isDaily = caisseType === 'JOURNALIERE' || caisseType === 'JOURNALIERE_CHARITABLE'
  const isLibre = caisseType === 'LIBRE' || caisseType === 'LIBRE_CHARITABLE'
  if (!(isDaily || isLibre) || !row.startDate) return null
  const startMid = midnight(safeDate(row.startDate))
  const buckets = new Map<number, ImportPayment[]>()
  for (const p of row.payments) {
    if (!p.versement) continue
    const mi = isDaily
      ? Math.max(
          0,
          Math.floor((midnight(safeDate(p.versement.date)).getTime() - startMid.getTime()) / MS_PER_DAY / 30),
        )
      : p.monthIndex
    const list = buckets.get(mi) ?? []
    list.push(p)
    buckets.set(mi, list)
  }
  return buckets
}

/**
 * Mois payés attendus après import — exactement le compteur que l'écriture
 * mettra sur le contrat (`currentMonthIndex` CS / `totalMonthsPaid` CI).
 * Sert à comparer avec la base sans réimporter.
 */
export function expectedMonthsPaid(row: AnalyzedRow, target: ImportTarget = 'CI'): number {
  const paidCount = row.payments.filter((p) => p.status === 'PAID').length
  if (target !== 'CS') return paidCount
  const grouped = groupCSVersementsByMonth(row)
  return grouped ? grouped.size : paidCount
}

export interface ContractDriftRow {
  contractId: string
  /** Le contrat existe déjà en base. */
  exists: boolean
  expectedMonthsPaid: number
  expectedNominalPaid: number
  dbMonthsPaid: number | null
  dbNominalPaid: number | null
  /** Existe en base avec des compteurs différents → à rectifier. */
  drifted: boolean
}

/**
 * Compare chaque ligne analysée avec le contrat déjà en base (ID déterministe) :
 * mois payés (CS `currentMonthIndex` / CI `totalMonthsPaid`) et total versé (CS).
 * Alimente les indicateurs « écart » et la rectification ciblée, sans réimporter.
 */
export async function checkContractsDrift(
  rows: AnalyzedRow[],
  target: ImportTarget = 'CI',
): Promise<Map<string, ContractDriftRow>> {
  const isCS = target === 'CS'
  const collName = isCS ? CAISSE_CONTRACTS : CONTRACTS
  // Une entrée par contrat — les lignes en doublon fusionnent comme à l'import.
  const byId = new Map<string, AnalyzedRow>()
  for (const row of rows) {
    const id = contractIdForRow(row, target)
    if (!byId.has(id)) byId.set(id, row)
  }
  const result = new Map<string, ContractDriftRow>()
  const entries = Array.from(byId.entries())
  const CHUNK = 20
  for (let i = 0; i < entries.length; i += CHUNK) {
    await Promise.all(
      entries.slice(i, i + CHUNK).map(async ([id, row]) => {
        const expectedMonths = expectedMonthsPaid(row, target)
        const expectedNominal = row.payments.reduce((s, p) => s + (p.versement?.amount ?? 0), 0)
        let exists = false
        let dbMonths: number | null = null
        let dbNominal: number | null = null
        const snap = await getDoc(doc(db, collName, id))
        if (snap.exists()) {
          exists = true
          const data = snap.data() as Record<string, unknown>
          dbMonths = Number(isCS ? data.currentMonthIndex : data.totalMonthsPaid) || 0
          dbNominal = isCS ? Number(data.nominalPaid) || 0 : null
        }
        const drifted =
          exists && (dbMonths !== expectedMonths || (isCS && dbNominal !== expectedNominal))
        result.set(id, {
          contractId: id,
          exists,
          expectedMonthsPaid: expectedMonths,
          expectedNominalPaid: expectedNominal,
          dbMonthsPaid: dbMonths,
          dbNominalPaid: dbNominal,
          drifted,
        })
      }),
    )
  }
  return result
}

/** Construit une contribution (contrib) migrée à partir d'un versement. */
function buildMigContrib(v: ImportVersement, mi: number, idx: number): Record<string, unknown> {
  const paidAt = combineDateTime(v.date, v.time)
  return {
    id: `MK_CS_C_MIG_${mi}_${idx}`,
    amount: v.amount,
    paidAt,
    time: v.time,
    mode: v.mode,
    ...(v.agentName ? { agent: v.agentName } : {}),
    ...(v.note ? { remarque: v.note } : {}),
    createdAt: paidAt,
  }
}

/**
 * Écrit une ligne en contrat Caisse Spéciale (caisseContracts + payments).
 * Crée le membre si absent.
 */
async function writeCSRow(row: AnalyzedRow, ctx: ImportContext): Promise<ImportRowResult> {
  const { member, created: memberCreated } = await ensureMember(row, ctx)

  const contractId = contractIdForRow(row, 'CS')
  const caisseType = row.category || 'STANDARD' // STANDARD | LIBRE | JOURNALIERE
  const monthlyAmount = row.amountPerMonth
  const monthsPlanned = row.durationMonths
  const paidCount = row.payments.filter((p) => p.status === 'PAID').length
  const nominalPaid = row.payments.reduce((s, p) => s + (p.versement?.amount ?? 0), 0)
  const startDateObj = row.startDate ? safeDate(row.startDate) : undefined

  // Statut CS : ACTIVE, ou contrat clôturé (RESCINDED = retrait anticipé, CLOSED = clôture normale).
  const csStatus = row.status === 'RESCINDED' || row.status === 'CLOSED' ? row.status : 'ACTIVE'
  const isClosed = csStatus !== 'ACTIVE'

  // Contact d'urgence (feuille clôturée : NOM URGENT / garant ; sinon INCONNU).
  const memberRow = ctx.memberData.get(row.matricule.trim())
  let emergency = row.emergency
  let emergencyIsUnknown = !emergency.lastName || emergency.lastName === 'INCONNU'
  if (emergencyIsUnknown && memberRow?.partnerName) {
    emergency = { lastName: memberRow.partnerName, firstName: '', phone1: memberRow.partnerPhone ?? '', relationship: 'Conjoint' }
    emergencyIsUnknown = false
  } else if (emergencyIsUnknown) {
    emergency = { lastName: UNKNOWN_USER_LAST_NAME, firstName: UNKNOWN_USER_FIRST_NAME, phone1: '', relationship: 'Autre' }
  }
  const csGuarantorRaw = row.entraide?.guarantorMatricule?.trim()
  const csGuarantorMemberId =
    csGuarantorRaw && /\.?MK\.?/i.test(csGuarantorRaw) ? safeUserDocIdFromMatricule(csGuarantorRaw) : undefined
  const csEmergencyMemberId = csGuarantorMemberId ?? UNKNOWN_USER_ID

  // settingsVersion (réglages actifs) — comme la création manuelle. Caché par type.
  let settingsVersion: string | undefined
  try {
    if (!csSettingsVersionCache.has(caisseType)) {
      const s = await getActiveSettings(caisseType as never)
      csSettingsVersionCache.set(caisseType, (s as { id?: string } | null)?.id)
    }
    settingsVersion = csSettingsVersionCache.get(caisseType)
  } catch {
    // réglages indisponibles → on continue sans
  }

  // Regroupement par mois, avec contribs[] (structure attendue par le détail
  // contrat) — logique partagée avec la vérification des écarts.
  const isDaily = caisseType === 'JOURNALIERE' || caisseType === 'JOURNALIERE_CHARITABLE'
  const grouped = groupCSVersementsByMonth(row)
  const useBuckets = grouped !== null
  const buckets = new Map<number, Array<Record<string, unknown>>>()
  if (grouped) {
    for (const [mi, ps] of grouped) {
      buckets.set(
        mi,
        ps.flatMap((p, idx) => (p.versement ? [buildMigContrib(p.versement, mi, idx)] : [])),
      )
    }
  }
  const currentMonthIndex = useBuckets ? buckets.size : paidCount

  const docs: AdminImportDoc[] = []

  docs.push({
    path: [CAISSE_CONTRACTS, contractId],
    data: {
      id: contractId,
      contractType: 'INDIVIDUAL',
      memberId: member.id,
      memberMatricule: row.matricule.trim(),
      memberLastName: row.lastName,
      memberFirstName: row.firstName,
      // Attributs de recherche (comme la création manuelle) → contrat retrouvable.
      ...generateAllDemandSearchableTexts(
        row.lastName || member.lastName || '',
        row.firstName || member.firstName || '',
        row.matricule.trim(),
      ),
      monthlyAmount,
      monthsPlanned,
      caisseType,
      firstPaymentDate: row.startDate || '',
      ...(startDateObj ? { contractStartAt: startDateObj, nextDueAt: startDateObj } : {}),
      status: csStatus,
      currentMonthIndex,
      withdrawLockedUntilM: 4,
      nominalPaid,
      bonusAccrued: 0,
      penaltiesTotal: 0,
      // Contact d'urgence (rattaché au garant si présent, sinon INCONNU ; relationship
      // « Autre » pour rester conforme au schéma CS).
      emergencyContact: {
        ...(csEmergencyMemberId ? { memberId: csEmergencyMemberId } : {}),
        lastName: emergency.lastName,
        firstName: emergency.firstName || '',
        phone1: emergency.phone1 || '',
        phone2: '',
        relationship: 'Autre',
        typeId: 'MIGRATION',
        idNumber: 'MIGRATION',
        documentPhotoUrl: '',
      },
      ...(settingsVersion ? { settingsVersion } : {}),
      entraide: cleanPlain({ ...row.entraide }),
      createdAt: adminServerTimestamp(),
      updatedAt: adminServerTimestamp(),
      createdBy: ctx.adminId,
      ...marker(ctx, isClosed ? 'C' : 'A', row.rowNumber, row.raw),
    },
  })

  if (useBuckets && startDateObj) {
    // 1 doc paiement par mois, détail des versements dans contribs[].
    const startMid = midnight(startDateObj)
    for (const [mi, contribs] of buckets) {
      const accumulated = contribs.reduce((s, c) => s + (Number(c.amount) || 0), 0)
      const dueAt = isDaily
        ? new Date(startMid.getTime() + mi * 30 * MS_PER_DAY)
        : addMonths(startMid, mi)
      const paymentId = `MK_CS_P_MIG_${mi}`
      // paidAt/time de premier niveau (dernière contribution) : parité avec le
      // flux manuel — les écrans lisent p.paidAt avant de retomber sur contribs.
      const lastContrib = contribs[contribs.length - 1] as { paidAt?: Date; time?: string } | undefined
      docs.push({
        path: [CAISSE_CONTRACTS, contractId, 'payments', paymentId],
        data: {
          id: paymentId,
          dueMonthIndex: mi,
          status: 'PAID',
          amount: accumulated,
          accumulatedAmount: accumulated,
          targetAmount: monthlyAmount,
          contribs,
          dueAt,
          ...(lastContrib?.paidAt ? { paidAt: lastContrib.paidAt } : {}),
          ...(lastContrib?.time ? { time: lastContrib.time } : {}),
          createdAt: adminServerTimestamp(),
          updatedAt: adminServerTimestamp(),
          createdBy: ctx.adminId,
        },
      })
    }
  } else {
    // STANDARD : 1 échéance = 1 mois. On renseigne accumulatedAmount + contrib
    // pour que le « Total du mois » et la date du versement s'affichent.
    for (const p of row.payments) {
      const dueAt = p.dueDate ? safeDate(p.dueDate) : startDateObj ? addMonths(startDateObj, p.monthIndex) : undefined
      const paid = p.status === 'PAID'
      const paymentId = `MK_CS_P_MIG_${p.monthIndex}`
      const data: Record<string, unknown> = {
        id: paymentId,
        dueMonthIndex: p.monthIndex,
        amount: p.versement?.amount ?? p.targetAmount ?? monthlyAmount,
        accumulatedAmount: paid ? (p.versement?.amount ?? 0) : 0,
        status: paid ? 'PAID' : 'DUE',
        ...(dueAt ? { dueAt } : {}),
        createdAt: adminServerTimestamp(),
      }
      if (paid && p.versement) {
        data.paidAt = safeDate(p.versement.date)
        data.time = p.versement.time
        data.mode = p.versement.mode
        if (p.versement.agentName) data.agent = p.versement.agentName
        if (p.versement.note) data.remarque = p.versement.note
        data.contribs = [buildMigContrib(p.versement, p.monthIndex, 0)]
      }
      docs.push({ path: [CAISSE_CONTRACTS, contractId, 'payments', paymentId], data })
    }
  }

  // Contrat clôturé → remboursement (caisseContracts/{id}/refunds).
  let hasRefund = false
  if (isClosed && row.earlyRefundDetail) {
    hasRefund = true
    const isRescinded = csStatus === 'RESCINDED'
    const refundDate = safeDate(row.earlyRefundDetail.date)
    const deadline = new Date(refundDate.getTime() + 30 * 24 * 60 * 60 * 1000)
    const amount = row.earlyRefundDetail.amount || nominalPaid
    docs.push({
      path: [CAISSE_CONTRACTS, contractId, 'refunds', 'refund-mig'],
      data: {
        id: 'refund-mig',
        type: isRescinded ? 'EARLY' : 'FINAL',
        status: 'PAID',
        amountNominal: amount,
        amountBonus: 0,
        reason:
          row.earlyRefundDetail.reason ||
          (isRescinded
            ? 'Retrait anticipé (import migration Excel)'
            : 'Clôture normale (import migration Excel)'),
        withdrawalAmount: amount,
        withdrawalMode: 'cash',
        withdrawalDate: refundDate,
        deadlineAt: deadline,
        processedAt: refundDate,
        processedBy: ctx.adminId,
        createdAt: adminServerTimestamp(),
        // Marqueur migration (pour le rollback ciblé par fichier+feuille).
        isMigrated: true,
        migrationSource: ctx.sourceFile,
        migrationSheet: ctx.sheetName,
      },
    })
  }

  await commitAdminImportDocs(docs)

  // Ramification : back-référence du contrat sur la fiche membre (comme la
  // création normale d'un contrat CS). Non bloquant si l'update échoue.
  try {
    await addCaisseContractToUser(member.id, contractId)
  } catch {
    // ignore — le contrat reste retrouvable via memberId
  }

  return {
    rowNumber: row.rowNumber,
    matricule: row.matricule,
    status: 'created',
    contractId,
    payments: row.payments.length,
    supports: 0,
    earlyRefund: hasRefund,
    memberCreated,
    placeholders: [],
  }
}

/** Importe toutes les lignes (un batch par contrat). */
export async function writeImport(
  rows: AnalyzedRow[],
  ctx: ImportContext,
  onProgress?: (done: number, total: number) => void,
): Promise<ImportReport> {
  const isCS = ctx.target === 'CS'

  // Compte INCONNU (parrain / contact d'urgence par défaut) prêt avant l'écriture.
  await ensureUnknownUser()

  // Forfaits A–E : uniquement pour la Caisse Imprévue.
  let forfaitsCreated: string[] = []
  let forfaits = ctx.forfaits
  if (!isCS) {
    const neededCats = new Set(rows.map((r) => r.category).filter(Boolean))
    try {
      const res = await ensureForfaits(neededCats, ctx.forfaits, ctx.adminId)
      forfaits = res.forfaits
      forfaitsCreated = res.created
    } catch {
      // si échec, on continue avec les forfaits existants (placeholders gérés par ligne)
    }
  }
  const ctx2: ImportContext = { ...ctx, forfaits }

  const results: ImportRowResult[] = []
  const seen = new Set<string>()
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const id = contractIdForRow(row, ctx.target ?? 'CI')
    // Doublon : un contrat avec cet ID a déjà été importé dans ce lot → on saute.
    if (seen.has(id)) {
      results.push({
        rowNumber: row.rowNumber,
        matricule: row.matricule,
        status: 'skipped',
        reason: 'Doublon (même contrat déjà importé)',
        contractId: id,
      })
      onProgress?.(i + 1, rows.length)
      continue
    }
    seen.add(id)
    try {
      results.push(await (isCS ? writeCSRow(row, ctx2) : writeRow(row, ctx2)))
    } catch (e) {
      results.push({
        rowNumber: row.rowNumber,
        matricule: row.matricule,
        status: 'skipped',
        reason: e instanceof Error ? e.message : 'Erreur écriture',
      })
    }
    onProgress?.(i + 1, rows.length)
  }
  return {
    created: results.filter((r) => r.status === 'created').length,
    skipped: results.filter((r) => r.status === 'skipped').length,
    membersCreated: results.filter((r) => r.memberCreated).length,
    forfaitsCreated,
    toComplete: results.filter((r) => (r.placeholders?.length ?? 0) > 0).length,
    results,
  }
}

/**
 * Annule un import : supprime tous les contrats (et leurs sous-collections)
 * portant le marqueur de migration pour cette feuille + ce fichier source.
 */
export interface RollbackResult {
  contractsDeleted: number
  usersDeleted: number
  subscriptionsDeleted: number
  requestsDeleted?: number
}

/**
 * Supprime tout ce qu'un import a créé (contrats + sous-collections + membres +
 * adhésions migrés) pour `sourceFile` + `sheetName`, via une route serveur
 * (Admin SDK) pour contourner les règles Firestore côté client.
 */
export async function rollbackImport(ctx: {
  sheetName: string
  sourceFile: string
}): Promise<RollbackResult> {
  const response = await fetch('/api/import-caisse-imprevue/rollback', {
    method: 'POST',
    headers: await adminImportHeaders(),
    credentials: 'include',
    body: JSON.stringify({ sourceFile: ctx.sourceFile, sheetName: ctx.sheetName }),
  })
  if (!response.ok) {
    const details = (await response.json().catch(() => null)) as { error?: string; details?: string } | null
    throw new Error(details?.details || details?.error || response.statusText)
  }
  return (await response.json()) as RollbackResult
}

export interface FixImportDatesResult {
  dryRun: boolean
  sourceFile: string
  caisseImprevue: { scanned: number; fixed: number; alreadyFixed: number }
  caisseSpeciale: { scanned: number; fixed: number; alreadyFixed: number }
  membres: { scanned: number; fixed: number; alreadyFixed: number }
  message: string
}

/**
 * Corrige le décalage J-1 des dates des documents importés (Caisse Imprévue,
 * Caisse Spéciale, membres). `dryRun` = simulation (aucune écriture).
 * `sourceFile` limite la correction à un fichier ; absent = tous les imports.
 */
export async function fixImportDates(ctx: {
  dryRun: boolean
  sourceFile?: string
}): Promise<FixImportDatesResult> {
  const response = await fetch('/api/import-caisse-imprevue/fix-dates', {
    method: 'POST',
    headers: await adminImportHeaders(),
    credentials: 'include',
    body: JSON.stringify({ dryRun: ctx.dryRun, sourceFile: ctx.sourceFile }),
  })
  if (!response.ok) {
    const details = (await response.json().catch(() => null)) as { error?: string; details?: string } | null
    throw new Error(details?.details || details?.error || response.statusText)
  }
  return (await response.json()) as FixImportDatesResult
}

export interface ChangeAdminUidResult {
  success: boolean
  oldUid: string
  newUid: string
  email: string
  migratedDocs: string[]
  claimsCopied: string[]
}

/**
 * Migre l'UID d'un compte admin (Auth + Firestore) vers `newUid`.
 * Recrée le compte avec le même email + le mot de passe fourni (conservé).
 */
export async function changeAdminUid(ctx: {
  email: string
  newUid: string
  password: string
}): Promise<ChangeAdminUidResult> {
  const response = await fetch('/api/admin/change-uid', {
    method: 'POST',
    headers: await adminImportHeaders(),
    credentials: 'include',
    body: JSON.stringify(ctx),
  })
  if (!response.ok) {
    const details = (await response.json().catch(() => null)) as { error?: string; details?: string } | null
    throw new Error(details?.details || details?.error || response.statusText)
  }
  return (await response.json()) as ChangeAdminUidResult
}

export interface LinkUnknownResult {
  unknownCreated: boolean
  membersLinked: number
  contractsLinked: number
}

/**
 * Rattache rétroactivement les membres sans parrain et les contrats CI sans
 * contact d'urgence au compte INCONNU INCONNU (créé si absent).
 */
export async function linkUnknownMembers(): Promise<LinkUnknownResult> {
  const response = await fetch('/api/import-caisse-imprevue/link-unknown', {
    method: 'POST',
    headers: await adminImportHeaders(),
    credentials: 'include',
    body: JSON.stringify({}),
  })
  if (!response.ok) {
    const details = (await response.json().catch(() => null)) as { error?: string; details?: string } | null
    throw new Error(details?.details || details?.error || response.statusText)
  }
  return (await response.json()) as LinkUnknownResult
}

// ===================== IMPORT DES MEMBRES (ADHESION MEMBRES) =====================

export interface WriteMembersResult {
  rowNumber: number
  matricule: string
  status: 'created' | 'skipped'
  reason?: string
  membershipType?: string
}

export interface WriteMembersReport {
  created: number
  skipped: number
  /** Abonnements créés depuis ADHESION MEMBRES (croisement). */
  subscriptionsCreated: number
  byType: Record<string, number>
  results: WriteMembersResult[]
}

export interface MembersImportContext {
  adminId: string
  sheetName: string
  sourceFile: string
  /** Membres déjà présents (par matricule). */
  existing: Map<string, User>
  /** Données MEMBRES (par matricule) pour enrichir l'identité + abonnement. */
  enrich: Map<string, ImportMemberData>
}

/**
 * Crée/maj l'abonnement d'un membre depuis la feuille MEMBRES (DATE INSCRIPTION →
 * 1 an). Idempotent (id déterministe). Renvoie true si un abonnement a été écrit.
 */
async function writeMemberSubscriptionIfAny(
  userId: string,
  data: ImportMemberData | undefined,
  membershipType: string,
  ctx: MembersImportContext,
): Promise<boolean> {
  if (!data?.membershipPaymentDate) return false
  const start = new Date(data.membershipPaymentDate)
  const end = new Date(start)
  end.setFullYear(end.getFullYear() + 1)
  const subId = `MK_MEMBER_SUB_${userId}`
  const subData: Record<string, unknown> = {
    userId,
    dateStart: start,
    dateEnd: end,
    montant: data.membershipPaymentAmount,
    currency: 'XAF',
    type: membershipType,
    paymentDate: data.membershipPaymentDate,
    paymentTime: data.membershipPaymentTime,
    paymentMode: data.membershipPaymentMode,
    agent: data.membershipPaymentAgent,
    createdBy: ctx.adminId,
    isMigrated: true,
    migrationSource: ctx.sourceFile,
    migrationSheet: ctx.sheetName,
  }
  await setDoc(doc(db, MEMBER_SUBSCRIPTIONS, subId), {
    ...cleanPlain(subData),
    id: subId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return true
}

/**
 * Enregistre le paiement d'adhésion dans la collection centralisée `payments`
 * (lue par l'« Historique des paiements », filtrée sur `beneficiaryId == requestId`).
 * Écrit via l'Admin SDK (contourne les règles). Idempotent (id déterministe).
 */
async function writeMemberAdhesionPayment(opts: {
  matricule: string
  requestId: string
  beneficiaryName: string
  data: ImportMemberData | undefined
  ctx: MembersImportContext
}): Promise<void> {
  const { matricule, requestId, beneficiaryName, data, ctx } = opts
  if (!data?.membershipPaymentDate) return
  const rawMode = data.membershipPaymentMode || ''
  const mode = mapPaymentMode(rawMode)
  await commitAdminImportDocs([
    {
      path: [PAYMENTS, `MK_PYMT_MIG_${sanitizeMatricule(matricule) || 'NA'}`],
      data: cleanPlain({
        sourceType: 'membership-request',
        sourceId: requestId,
        beneficiaryId: requestId, // l'historique filtre sur ce champ
        beneficiaryName,
        date: new Date(data.membershipPaymentDate),
        time: data.membershipPaymentTime || '',
        mode,
        paymentMethodOther: mode === 'other' ? rawMode : '',
        amount: data.membershipPaymentAmount ?? 0,
        paymentType: 'Membership',
        acceptedBy: data.membershipPaymentAgent || ctx.adminId,
        recordedBy: ctx.adminId,
        recordedByName: data.membershipPaymentAgent || '',
        recordedAt: new Date(),
        isMigrated: true,
        migrationSource: ctx.sourceFile,
        migrationSheet: ctx.sheetName,
      }),
    },
  ])
}

/** Crée les membres absents (compte sans Auth, id = matricule, type depuis T.MEMBRES). */
export async function writeMembers(
  members: AnalyzedMember[],
  ctx: MembersImportContext,
  onProgress?: (done: number, total: number) => void,
): Promise<WriteMembersReport> {
  // Compte INCONNU (parrain par défaut) prêt avant la création des membres.
  await ensureUnknownUser()

  const results: WriteMembersResult[] = []
  let subscriptionsCreated = 0
  for (let i = 0; i < members.length; i++) {
    const m = members[i]
    const key = m.matricule.trim()
    const existing = ctx.existing.get(key)
    if (existing) {
      // Membre déjà présent : on ne le recrée pas, mais on (ré)assure son
      // abonnement depuis MEMBRES (sinon un réimport sans rollback laisserait le
      // membre sans abonnement).
      let reason = 'Déjà présent'
      try {
        const data = ctx.enrich.get(key)
        if (await writeMemberSubscriptionIfAny(existing.id as string, data, m.membershipType, ctx)) {
          subscriptionsCreated++
          reason = 'Déjà présent (abonnement mis à jour)'
        }
        // Paiement d'adhésion dans l'historique (idempotent).
        await writeMemberAdhesionPayment({
          matricule: key,
          requestId: `MK_MEMBER_REQ_MIG_${sanitizeMatricule(key) || 'NA'}`,
          beneficiaryName: `${m.firstName || ''} ${m.lastName || ''}`.trim(),
          data,
          ctx,
        })
      } catch {
        // non bloquant
      }
      results.push({ rowNumber: m.rowNumber, matricule: m.matricule, status: 'skipped', reason })
      onProgress?.(i + 1, members.length)
      continue
    }
    try {
      const data = ctx.enrich.get(key)
      const userId = safeUserDocIdFromMatricule(key)
      if (!userId) {
        throw new Error(`Matricule invalide pour la création du membre: "${m.matricule}"`)
      }
      // Firestore refuse `undefined` : on stocke des champs VIDES ('' / null) plutôt
      // que de les omettre, pour que la fiche membre ait un schéma complet et
      // éditable (champs prêts à être renseignés depuis l'UI).
      const birthdayFields = calculateBirthdayFields(data?.birthDate)
      // Demande d'adhésion approuvée liée (cohérence stats/demandes/filleuls).
      const requestId = `MK_MEMBER_REQ_MIG_${sanitizeMatricule(key) || 'NA'}`
      const userData: Record<string, unknown> = {
        civility: '', // absent du fichier
        lastName: m.lastName || data?.lastName || 'INCONNU',
        firstName: m.firstName || data?.firstName || '',
        birthDate: data?.birthDate ?? '',
        birthMonth: birthdayFields.birthMonth,
        birthDay: birthdayFields.birthDay,
        birthDayOfYear: birthdayFields.birthDayOfYear,
        birthPlace: data?.birthPlace ?? '',
        birthCertificateNumber: data?.birthCertificateNumber ?? '',
        contacts: m.contacts.length ? m.contacts : (data?.contacts ?? []),
        // Pas de colonne WhatsApp dans le fichier → on prend le 1er contact.
        whatsappNumber: (m.contacts.length ? m.contacts : (data?.contacts ?? []))[0] ?? '',
        gender: data?.gender ?? '',
        email: data?.email ?? '', // factice (VIDE@…) déjà filtré → ''
        nationality: data?.nationality ?? '',
        hasCar: data?.hasCar ?? false,
        address: data?.address ?? {
          province: '',
          city: '',
          district: '',
          arrondissement: '',
          additionalInfo: '',
        },
        companyName: data?.companyName ?? '',
        companyId: null,
        // Adresse entreprise lisible (Province, Ville, détail) sur la fiche membre.
        companyAddress: [data?.companyProvince, data?.companyCity, data?.companyAddress]
          .filter(Boolean)
          .join(', '),
        profession: data?.profession ?? '',
        professionId: null,
        seniority: data?.seniority ?? '',
        identityDocument: data?.identityDocument ?? '',
        identityDocumentNumber: data?.identityDocumentNumber ?? '',
        identityDocumentIssuingPlace: data?.identityIssuingPlace ?? '',
        identityDocumentExpiration: data?.identityExpirationDate ?? '',
        maritalStatus: data?.maritalStatus ?? '',
        partnerName: data?.partnerName ?? '',
        partnerPhone: data?.partnerPhone ?? '',
        religion: data?.religion ?? '',
        prayerPlace: data?.prayerPlace ?? '',
        intermediaryCode: data?.intermediaryCode || UNKNOWN_USER_MATRICULE, // parrain manquant → INCONNU
        photoURL: null, // absent du fichier
        photoPath: null,
        subscriptions: [],
        dossier: requestId,
        membershipType: m.membershipType,
        roles: [m.role],
        isActive: true,
        isMigrated: true,
        migrationSource: ctx.sourceFile,
        migrationSheet: ctx.sheetName,
        migration: {
          source: ctx.sourceFile,
          sheet: ctx.sheetName,
          importedBy: ctx.adminId,
          importedAt: new Date(),
        },
      }
      await setDoc(
        doc(db, USERS, userId),
        {
          ...cleanPlain(userData),
          id: userId,
          matricule: key,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
      )

      // Abonnement (collection `subscriptions`) EN PREMIER — UNIQUEMENT depuis
      // MEMBRES : DATE INSCRIPTION ⇒ abonnement d'1 an ; absente ⇒ aucun abonnement.
      // (Écrit avant la demande pour ne jamais être bloqué par celle-ci.)
      if (await writeMemberSubscriptionIfAny(userId, data, m.membershipType, ctx)) {
        subscriptionsCreated++
      }

      // Demande d'adhésion APPROUVÉE liée (cohérence Demandes / dashboard / filleuls /
      // lien « Voir le dossier »). Best-effort : si les règles Firestore refusent la
      // création (demande migrée approuvée), on n'interrompt NI le membre NI l'abonnement.
      try {
      const requestData: Record<string, unknown> = {
        id: requestId,
        matricule: key,
        status: 'approved',
        // Adhésion payée ⇔ présence d'une DATE INSCRIPTION (sinon non payée).
        // Champ requis pour les stats « payées / non payées » des Demandes.
        isPaid: !!data?.membershipPaymentDate,
        // Paiement d'adhésion porté par le dossier (lu par l'export / l'historique).
        payments: data?.membershipPaymentDate
          ? [
              {
                date: new Date(data.membershipPaymentDate),
                time: data.membershipPaymentTime || '',
                mode: mapPaymentMode(data.membershipPaymentMode),
                amount: data.membershipPaymentAmount ?? 0,
                acceptedBy: data.membershipPaymentAgent || ctx.adminId,
                paymentType: 'Membership',
                recordedBy: ctx.adminId,
                recordedByName: data.membershipPaymentAgent || '',
                recordedAt: new Date(),
              },
            ]
          : [],
        membershipType: m.membershipType,
        memberNumber: key,
        identity: {
          civility: '',
          lastName: userData.lastName,
          firstName: userData.firstName,
          birthDate: userData.birthDate,
          birthPlace: userData.birthPlace,
          birthCertificateNumber: userData.birthCertificateNumber,
          prayerPlace: userData.prayerPlace,
          religion: userData.religion,
          contacts: userData.contacts,
          whatsappNumber: userData.whatsappNumber,
          email: userData.email,
          gender: userData.gender,
          nationality: userData.nationality,
          maritalStatus: userData.maritalStatus,
          spouseLastName: '',
          spouseFirstName: '',
          spousePhone: userData.partnerPhone,
          intermediaryCode: userData.intermediaryCode,
          hasCar: userData.hasCar,
          photoURL: null,
          photoPath: null,
        },
        address: userData.address,
        company: {
          isEmployed: !!data?.companyName,
          companyName: userData.companyName,
          // Adresse entreprise structurée (PROVINCE ENTRE / VILLE ENTRE / détail).
          companyAddress: {
            province: data?.companyProvince ?? '',
            city: data?.companyCity ?? '',
            district: data?.companyAddress ?? '',
          },
          profession: userData.profession,
          seniority: data?.seniority ?? '',
        },
        documents: {
          identityDocument: userData.identityDocument,
          identityDocumentNumber: userData.identityDocumentNumber,
          issuingPlace: data?.identityIssuingPlace ?? '',
          expirationDate: data?.identityExpirationDate ?? '',
          termsAccepted: true,
        },
        approvedBy: ctx.adminId,
        approvedAt: adminServerTimestamp(),
        processedAt: adminServerTimestamp(),
        processedBy: ctx.adminId,
        isMigrated: true,
        migrationSource: ctx.sourceFile,
        migrationSheet: ctx.sheetName,
      }
      // Écrite via l'Admin SDK (route import-docs) pour CONTOURNER les règles
      // Firestore qui refusent la création d'une demande migrée approuvée côté
      // client. ⇒ la demande existe vraiment → « Voir le dossier » fonctionne.
      await commitAdminImportDocs([
        {
          path: [MEMBERSHIP_REQUESTS, requestId],
          data: {
            ...cleanPlain(requestData),
            createdAt: adminServerTimestamp(),
            updatedAt: adminServerTimestamp(),
          },
        },
      ])
      } catch {
        // Échec d'écriture de la demande → non bloquant (membre + abonnement déjà créés).
      }

      // Paiement d'adhésion dans l'historique des paiements (non bloquant).
      try {
        await writeMemberAdhesionPayment({
          matricule: key,
          requestId,
          beneficiaryName: `${userData.firstName} ${userData.lastName}`.trim(),
          data,
          ctx,
        })
      } catch {
        // non bloquant
      }
      results.push({ rowNumber: m.rowNumber, matricule: m.matricule, status: 'created', membershipType: m.membershipType })
    } catch (e) {
      results.push({
        rowNumber: m.rowNumber,
        matricule: m.matricule,
        status: 'skipped',
        reason: e instanceof Error ? e.message : 'Erreur création membre',
      })
    }
    onProgress?.(i + 1, members.length)
  }
  const byType: Record<string, number> = {}
  for (const r of results) {
    if (r.status === 'created' && r.membershipType) byType[r.membershipType] = (byType[r.membershipType] ?? 0) + 1
  }
  return {
    created: results.filter((r) => r.status === 'created').length,
    skipped: results.filter((r) => r.status === 'skipped').length,
    subscriptionsCreated,
    byType,
    results,
  }
}

/** Annule l'import de membres : supprime les membres migrés pour ce fichier/feuille. */
export async function rollbackMembers(ctx: { sheetName: string; sourceFile: string }): Promise<{ deleted: number }> {
  const res = await rollbackImport(ctx)
  return { deleted: res.usersDeleted }
}
