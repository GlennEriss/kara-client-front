/**
 * Analyseur d'import Excel — Caisse Imprévue.
 *
 * Lit une feuille du classeur "GESTION MEMBRES KARA" (tableau de tableaux) et
 * produit, en UNE seule passe :
 *  - un RÉSUMÉ (aperçu) ;
 *  - le DÉTAIL prêt à écrire (versements, supports, retrait, contact urgence) ;
 *  - un bloc `entraide` (colonnes sans champ modèle) + la ligne BRUTE intégrale.
 *
 * Mapping positionnel (par index de colonne) car les en-têtes Excel sont
 * dupliqués ("MONTANT", "AGENT", "REMARQUE"...).
 *
 * Feuilles connues :
 *  - "GESTION ENTRAIDE ACTIF"  -> contrats CI ACTIFS (+ versements + supports)
 *  - "ADHESION VOLET ENTRAIDE" -> contrats CI CLÔTURÉS (INACTIF uniquement)
 */

export type ImportSheetType = 'CI_ACTIVE' | 'CI_CLOSED' | 'CS_ACTIVE' | 'CS_CLOSED' | 'MEMBERS' | 'UNKNOWN'
export type MembershipTypeValue = 'adherant' | 'bienfaiteur' | 'sympathisant'
/** Collection cible d'un import de contrats. */
export type ImportTarget = 'CI' | 'CS'
export type MappedContractStatus = 'ACTIVE' | 'FINISHED' | 'CANCELED' | 'RESCINDED' | 'CLOSED'
export type ImportPaymentMode = 'airtel_money' | 'mobicash' | 'cash' | 'bank_transfer' | 'other'

export interface ImportVersement {
  date: string // YYYY-MM-DD
  time: string // HH:mm
  amount: number
  mode: ImportPaymentMode
  agentName?: string
  note?: string
  monthLabel?: string
}

export interface ImportPayment {
  monthIndex: number
  targetAmount: number
  status: 'PAID' | 'DUE'
  versement: ImportVersement | null
  /** Date d'échéance planifiée (YYYY-MM-DD) — utilisée pour la Caisse Spéciale. */
  dueDate?: string
  /** Index de la PERIODE (0-based) — versements journaliers issus de JOURNALIERE. */
  periodIndex?: number
}

export interface ImportSupport {
  amount: number
  date: string
  time: string
  mode: ImportPaymentMode
  closureDate?: string
  closureTime?: string
  closureAgent?: string
  note?: string
}

export interface ImportEarlyRefund {
  amount: number
  date: string
  /** Motif du retrait (AUTRES REMARQUE, sinon OBSERVATION). */
  reason?: string
}

export interface ImportEmergencyContact {
  lastName: string
  firstName: string
  phone1: string
  relationship: string
}

/** Colonnes sans champ direct dans le modèle CI — préservées telles quelles. */
export interface EntraideMeta {
  code?: string
  contractEndDate?: string
  receptionDate?: string
  contractSigned?: string
  yearRegistered?: string
  closureDocs?: string
  guarantorMatricule?: string
  observation?: string
  otherRemarks?: string
  summary?: {
    versementsCount?: number
    monthsUnpaid?: number
    imprevusCount?: number
    montantTotal?: number
  }
}

export interface AnalyzedRow {
  rowNumber: number
  matricule: string
  lastName: string
  firstName: string
  contacts: string[]
  category: string
  amountPerMonth: number
  durationMonths: number
  startDate: string | null
  status: MappedContractStatus
  paidCount: number
  dueCount: number
  supportsCount: number
  supportsAmount: number
  hasEarlyRefund: boolean
  earlyRefundAmount: number
  issues: string[]
  // Détail prêt à écrire
  payments: ImportPayment[]
  supportsDetail: ImportSupport[]
  earlyRefundDetail: ImportEarlyRefund | null
  emergency: ImportEmergencyContact
  entraide: EntraideMeta
  /** Ligne brute intégrale (clé = lettre de colonne) — zéro perte. */
  raw: Record<string, string>
}

export interface ImportAnalysis {
  sheetName: string
  sheetType: ImportSheetType
  /** Cible : Caisse Imprévue (contractsCI) ou Caisse Spéciale (caisseContracts). */
  target: ImportTarget
  targetCollection: string
  totalDataRows: number
  importableRows: number
  rows: AnalyzedRow[]
  totals: {
    active: number
    finished: number
    canceled: number
    paidVersements: number
    supports: number
    earlyRefunds: number
  }
  howItWillBeImported: string[]
  detectedColumns?: string[]
}

const SHEET_ACTIVE = 'GESTION ENTRAIDE ACTIF'
const SHEET_CLOSED = 'ADHESION VOLET ENTRAIDE'
const SHEET_MEMBERS = 'MEMBRES' // feuille source des membres (état civil complet)
// La feuille « ADHESION MEMBRES » (abonnements) est lue côté page via parseAdhesionMembersSheet.
const SHEET_CS_ACTIVE = 'GESTION TONTINE ACTIF' // contrats Caisse Spéciale (actifs)
const SHEET_CS_CLOSED = 'ADHESION TONTINE' // contrats Caisse Spéciale clôturés (INACTIF)

/** Type de caisse spéciale (caisseType) déduit de la colonne CATEGORIE. */
export type CaisseTypeValue = 'STANDARD' | 'JOURNALIERE' | 'LIBRE'
function mapCaisseType(raw: unknown): CaisseTypeValue {
  const s = str(raw).toUpperCase()
  if (s.includes('LIBRE')) return 'LIBRE'
  if (s.includes('JOURNAL')) return 'JOURNALIERE'
  return 'STANDARD' // MENSUEL / STANDARD / autres → STANDARD
}

export const CATEGORY_AMOUNT: Record<string, number> = {
  A: 10000,
  B: 20000,
  C: 30000,
  D: 40000,
  E: 50000,
}

// ----- helpers de cellule -----

function cell(row: unknown[], idx: number): unknown {
  return idx >= 0 && idx < row.length ? row[idx] : undefined
}

function isPresent(v: unknown): boolean {
  if (v === null || v === undefined) return false
  if (typeof v === 'string') return v.trim() !== ''
  return true
}

function str(v: unknown): string {
  if (v === null || v === undefined) return ''
  return String(v).replace(/\s+/g, ' ').trim()
}

/** Placeholders « vides » saisis dans l'Excel (à ne PAS stocker). */
const PLACEHOLDER_VALUES = new Set(['NC', 'VIDE', 'N/A', 'NA', '-', '--', '?', '??', '...', 'NEANT', 'NÉANT'])
function isPlaceholderText(s: string): boolean {
  const u = s.trim().toUpperCase()
  if (PLACEHOLDER_VALUES.has(u)) return true
  if (/^x+$/i.test(u)) return true // X, XX, XXX, XXXX…
  if (/^\.+$/.test(u)) return true // . , .. , …
  return false
}

/** Variante qui renvoie undefined si vide OU si c'est un placeholder (XXX, NC, …). */
function strOpt(v: unknown): string | undefined {
  const s = str(v)
  return s === '' || isPlaceholderText(s) ? undefined : s
}

function num(v: unknown): number {
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const n = Number(v.replace(/[^\d.-]/g, ''))
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

function dateStr(v: unknown): string | null {
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    const y = v.getFullYear()
    const m = String(v.getMonth() + 1).padStart(2, '0')
    const d = String(v.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  // Numéro de série Excel (ex. 39231) → date. Base : 1899-12-30 (jour 0).
  if (typeof v === 'number' && Number.isFinite(v) && v > 0 && v < 2958466) {
    const d = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86400000)
    if (!Number.isNaN(d.getTime())) {
      const y = d.getUTCFullYear()
      const m = String(d.getUTCMonth() + 1).padStart(2, '0')
      const day = String(d.getUTCDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    }
  }
  return null
}

function contactsOf(...vals: unknown[]): string[] {
  return vals.map((v) => str(v)).filter((s) => s.length > 0)
}

function mapMode(v: unknown): ImportPaymentMode {
  const s = str(v).toUpperCase()
  if (s.includes('AIRTEL')) return 'airtel_money'
  if (s.includes('MOBI')) return 'mobicash'
  if (s.includes('CASH') || s.includes('ESPECE') || s.includes('ESPÈCE')) return 'cash'
  if (s.includes('VIREMENT') || s.includes('BANK') || s.includes('BANQUE')) return 'bank_transfer'
  return 'other'
}

/** "10H00", "9H35", "21H00" -> "10:00", "09:35", "21:00". */
function parseHeure(v: unknown): string {
  const s = str(v).toUpperCase().replace(/\s/g, '')
  const m = s.match(/^(\d{1,2})[H:](\d{0,2})/)
  if (!m) return '00:00'
  const hh = m[1].padStart(2, '0')
  const mm = (m[2] || '0').padStart(2, '0')
  return `${hh}:${mm}`
}

/** Index 0-based -> lettre de colonne Excel (0 -> A, 26 -> AA). */
function colLetter(idx: number): string {
  let n = idx + 1
  let s = ''
  while (n > 0) {
    const m = (n - 1) % 26
    s = String.fromCharCode(65 + m) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

export function detectSheetType(sheetName: string): ImportSheetType {
  const n = sheetName.trim().toUpperCase()
  if (n === SHEET_ACTIVE) return 'CI_ACTIVE'
  if (n === SHEET_CLOSED) return 'CI_CLOSED'
  if (n === SHEET_CS_ACTIVE) return 'CS_ACTIVE'
  if (n === SHEET_CS_CLOSED) return 'CS_CLOSED'
  if (n === SHEET_MEMBERS) return 'MEMBERS'
  return 'UNKNOWN'
}

const MEMBERSHIP_TYPE_MAP: Record<string, { type: MembershipTypeValue; role: string }> = {
  ADHERENT: { type: 'adherant', role: 'Adherant' },
  ADHERANT: { type: 'adherant', role: 'Adherant' },
  'ADHÉRENT': { type: 'adherant', role: 'Adherant' },
  BIENFAITEUR: { type: 'bienfaiteur', role: 'Bienfaiteur' },
  SYMPATHISANT: { type: 'sympathisant', role: 'Sympathisant' },
}

function mapMembership(raw: unknown): { type: MembershipTypeValue; role: string; label: string } {
  const k = str(raw).toUpperCase()
  const m = MEMBERSHIP_TYPE_MAP[k] ?? { type: 'adherant' as MembershipTypeValue, role: 'Adherant' }
  return { ...m, label: str(raw) || 'Adhérent' }
}

function findHeaderRowIndex(aoa: unknown[][]): number {
  for (let i = 0; i < Math.min(aoa.length, 15); i++) {
    const row = aoa[i] ?? []
    if (row.some((c) => str(c).toUpperCase() === 'MATRICULE')) return i
  }
  return 2
}

function buildRaw(row: unknown[]): Record<string, string> {
  const raw: Record<string, string> = {}
  for (let i = 0; i < row.length; i++) {
    const v = row[i]
    if (!isPresent(v)) continue
    raw[colLetter(i)] = v instanceof Date ? dateStr(v) || String(v) : str(v)
  }
  return raw
}

// ----- GESTION ENTRAIDE ACTIF -----

const ACTIVE_ECHEANCE_STARTS = [17, 24, 31, 38, 53, 68, 83, 98, 113, 128, 143, 158]
const ACTIVE_IMPREVU_STARTS = [45, 60, 75, 90, 105, 120, 135, 150, 165]

function analyzeActiveRow(row: unknown[], rowNumber: number): AnalyzedRow | null {
  const matricule = str(cell(row, 1))
  if (!matricule) return null

  const category = str(cell(row, 10)).toUpperCase()
  const amountPerMonth = num(cell(row, 11)) || CATEGORY_AMOUNT[category] || 0
  const startDate = dateStr(cell(row, 7))

  const payments: ImportPayment[] = []
  ACTIVE_ECHEANCE_STARTS.forEach((start, monthIndex) => {
    const echeance = cell(row, start)
    const dateRemise = cell(row, start + 1)
    const montant = num(cell(row, start + 2))
    const exists = isPresent(echeance) || isPresent(dateRemise) || montant > 0
    if (!exists) return
    const paid = montant > 0 && isPresent(dateRemise)
    payments.push({
      monthIndex,
      targetAmount: amountPerMonth,
      status: paid ? 'PAID' : 'DUE',
      versement: paid
        ? {
            date: dateStr(dateRemise) || dateStr(echeance) || startDate || '',
            time: parseHeure(cell(row, start + 3)),
            amount: montant,
            mode: mapMode(cell(row, start + 4)),
            agentName: strOpt(cell(row, start + 5)),
            note: strOpt(cell(row, start + 6)),
          }
        : null,
    })
  })

  const supportsDetail: ImportSupport[] = []
  ACTIVE_IMPREVU_STARTS.forEach((start) => {
    const argent = num(cell(row, start + 2))
    const dateImp = cell(row, start)
    if (argent > 0 || isPresent(dateImp)) {
      supportsDetail.push({
        amount: argent,
        date: dateStr(dateImp) || startDate || '',
        time: parseHeure(cell(row, start + 1)),
        mode: mapMode(cell(row, start + 3)),
        closureDate: dateStr(cell(row, start + 4)) || undefined,
        closureTime: isPresent(cell(row, start + 5)) ? parseHeure(cell(row, start + 5)) : undefined,
        closureAgent: strOpt(cell(row, start + 6)),
        note: strOpt(cell(row, start + 7)),
      })
    }
  })

  const paidCount = payments.filter((p) => p.status === 'PAID').length
  const dueCount = payments.filter((p) => p.status === 'DUE').length

  // Durée RÉELLE de l'échéancier = nb de mois planifiés (payés + impayés).
  // ⚠️ Ne PAS utiliser la colonne PERIODE/MOIS (M) : elle ne correspond pas au
  // nombre de mois (ex. M=13 alors que N°VERSEMENT + MOIS/IMPAYE = 12).
  // L'affichage des contrats actifs rend `subscriptionCIDuration` mois.
  const summaryMonths = num(cell(row, 13)) + num(cell(row, 14)) // N° VERSEMENT + MOIS/IMPAYE
  const durationMonths = payments.length || summaryMonths || 12

  const issues: string[] = []
  if (!CATEGORY_AMOUNT[category]) issues.push(`Catégorie inconnue ("${category || '∅'}")`)
  if (amountPerMonth <= 0) issues.push('Montant mensuel manquant')
  if (payments.length === 0) issues.push('Aucune échéance détectée')
  if (!str(cell(row, 3)) && !str(cell(row, 4))) issues.push('Nom/prénom manquant')

  const contacts = contactsOf(cell(row, 5), cell(row, 6))

  const entraide: EntraideMeta = {
    code: strOpt(cell(row, 2)),
    contractEndDate: dateStr(cell(row, 8)) || undefined,
    receptionDate: dateStr(cell(row, 9)) || undefined,
    summary: {
      versementsCount: num(cell(row, 13)),
      monthsUnpaid: num(cell(row, 14)),
      imprevusCount: num(cell(row, 15)),
      montantTotal: num(cell(row, 16)),
    },
  }

  return {
    rowNumber,
    matricule,
    lastName: str(cell(row, 3)),
    firstName: str(cell(row, 4)),
    contacts,
    category,
    amountPerMonth,
    durationMonths,
    startDate,
    status: 'ACTIVE',
    paidCount,
    dueCount,
    supportsCount: supportsDetail.length,
    supportsAmount: supportsDetail.reduce((s, x) => s + x.amount, 0),
    hasEarlyRefund: false,
    earlyRefundAmount: 0,
    issues,
    payments,
    supportsDetail,
    earlyRefundDetail: null,
    emergency: { lastName: 'INCONNU', firstName: '', phone1: contacts[0] ?? '', relationship: 'INCONNU' },
    entraide,
    raw: {},
  }
}

// ----- GESTION TONTINE ACTIF (contrats Caisse Spéciale) -----

// 12 blocs d'échéance de 7 colonnes : ECHEANCE, DATE REMISE, MONTANT, HEURE, MOYEN, AGENT, REMARQUE.
const CS_ECHEANCE_STARTS = [16, 23, 30, 37, 44, 51, 58, 65, 72, 79, 86, 93]

/** Détail quotidien d'un contrat journalier, issu de la feuille JOURNALIERE. */
export interface JournaliereDetail {
  matricule: string
  startDate: string
  periodsCount: number
  payments: ImportPayment[]
  totalPaid: number
}

/**
 * Feuille JOURNALIERE : fiches disposées en 3 colonnes (bases 0, 6, 12).
 * Chaque fiche = entête (MATRICULE/NOM/PRENOM/DATE DEBUT) + blocs « PERIODE N »
 * de ~31 lignes [PERIODE, DATE, HEURE, MONTANT, MOYEN]. On retient les jours
 * réellement versés (MONTANT > 0). Clé de croisement : matricule.
 */
export function parseJournaliereSheet(aoa: unknown[][]): Map<string, JournaliereDetail> {
  const map = new Map<string, JournaliereDetail>()
  const BASES = [0, 6, 12]
  for (const base of BASES) {
    let matricule = ''
    let startDate = ''
    let periodsCount = 0
    let currentPeriod = -1
    const payments: ImportPayment[] = []
    let index = 0
    for (const row of aoa) {
      const label = str(cell(row, base)).toUpperCase()
      if (label === 'MATRICULE') {
        matricule = str(cell(row, base + 1))
      } else if (label === 'DATE DEBUT') {
        startDate = dateStr(cell(row, base + 1)) || startDate
      } else if (label.startsWith('PERIODE') && label !== 'PERIODE') {
        periodsCount++
        currentPeriod++
      }
      // Lignes "jour" : col base = numéro de jour, col base+3 = montant versé.
      const day = cell(row, base)
      const montant = num(cell(row, base + 3))
      if (typeof day === 'number' && montant > 0) {
        const date = dateStr(cell(row, base + 1)) || startDate || ''
        payments.push({
          monthIndex: index++,
          targetAmount: montant,
          status: 'PAID',
          dueDate: date || undefined,
          periodIndex: Math.max(0, currentPeriod),
          versement: {
            date,
            time: parseHeure(cell(row, base + 2)),
            amount: montant,
            mode: mapMode(cell(row, base + 4)),
          },
        })
      }
    }
    if (matricule.trim() && payments.length > 0) {
      map.set(matricule.trim(), {
        matricule: matricule.trim(),
        startDate,
        periodsCount,
        payments,
        totalPaid: payments.reduce((s, p) => s + (p.versement?.amount ?? 0), 0),
      })
    }
  }
  return map
}

function analyzeCaisseActiveRow(
  row: unknown[],
  rowNumber: number,
  journaliere?: Map<string, JournaliereDetail>,
): AnalyzedRow | null {
  const matricule = str(cell(row, 1))
  if (!matricule) return null

  const caisseType = mapCaisseType(cell(row, 10)) // K CATEGORIE
  // Montant mensuel : STANDARD/JOURNALIERE = MONTANT CAT (L) ; LIBRE = 0 (montants variables).
  const amountPerMonth = caisseType === 'LIBRE' ? 0 : num(cell(row, 11))
  let startDate = dateStr(cell(row, 7)) // H DEBUT VERSEMENT

  const payments: ImportPayment[] = []
  // AGENT (start+5) et REMARQUE (start+6) par période — réutilisés pour rattacher
  // l'agent/remarque aux versements quotidiens (JOURNALIERE n'a pas ces colonnes).
  const periodMeta: Array<{ agent?: string; note?: string }> = []
  CS_ECHEANCE_STARTS.forEach((start, monthIndex) => {
    periodMeta[monthIndex] = {
      agent: strOpt(cell(row, start + 5)),
      note: strOpt(cell(row, start + 6)),
    }
    const echeance = cell(row, start)
    const dateRemise = cell(row, start + 1)
    const montant = num(cell(row, start + 2))
    const exists = isPresent(echeance) || isPresent(dateRemise) || montant > 0
    if (!exists) return
    const paid = montant > 0 && isPresent(dateRemise)
    payments.push({
      monthIndex,
      targetAmount: amountPerMonth || montant,
      status: paid ? 'PAID' : 'DUE',
      dueDate: dateStr(echeance) || undefined,
      versement: paid
        ? {
            date: dateStr(dateRemise) || dateStr(echeance) || startDate || '',
            time: parseHeure(cell(row, start + 3)),
            amount: montant,
            mode: mapMode(cell(row, start + 4)),
            agentName: strOpt(cell(row, start + 5)),
            note: strOpt(cell(row, start + 6)),
          }
        : null,
    })
  })

  // Croisement JOURNALIERE : pour un contrat journalier, on remplace les
  // échéances (peu détaillées dans GESTION TONTINE ACTIF) par le suivi
  // quotidien réel de la feuille JOURNALIERE (dates, heures, montants, moyens).
  const journaliereDetail =
    caisseType === 'JOURNALIERE' ? journaliere?.get(matricule.trim()) : undefined
  if (journaliereDetail && journaliereDetail.payments.length > 0) {
    payments.length = 0
    for (const p of journaliereDetail.payments) {
      // Rattache l'AGENT / la REMARQUE de la période (GESTION TONTINE ACTIF) au
      // versement quotidien, que la feuille JOURNALIERE ne fournit pas.
      const meta = periodMeta[p.periodIndex ?? 0]
      if (p.versement && meta) {
        if (!p.versement.agentName && meta.agent) p.versement.agentName = meta.agent
        if (!p.versement.note && meta.note) p.versement.note = meta.note
      }
      payments.push(p)
    }
    if (!startDate && journaliereDetail.startDate) startDate = journaliereDetail.startDate
  }

  const paidCount = payments.filter((p) => p.status === 'PAID').length
  const dueCount = payments.filter((p) => p.status === 'DUE').length
  const durationMonths = journaliereDetail
    ? journaliereDetail.periodsCount || payments.length || 12
    : payments.length || num(cell(row, 13)) + num(cell(row, 14)) || 12

  const contacts = contactsOf(cell(row, 5), cell(row, 6))

  const issues: string[] = []
  if (caisseType !== 'LIBRE' && amountPerMonth <= 0) issues.push('Montant mensuel manquant')
  if (payments.length === 0) issues.push('Aucune échéance détectée')
  if (caisseType === 'JOURNALIERE' && !journaliereDetail)
    issues.push('Contrat journalier sans fiche JOURNALIERE (croisement impossible)')
  if (!str(cell(row, 3)) && !str(cell(row, 4))) issues.push('Nom/prénom manquant')

  const entraide: EntraideMeta = {
    code: strOpt(cell(row, 2)),
    contractEndDate: dateStr(cell(row, 8)) || undefined,
    receptionDate: dateStr(cell(row, 9)) || undefined,
    summary: {
      versementsCount: journaliereDetail ? paidCount : num(cell(row, 13)),
      monthsUnpaid: num(cell(row, 14)),
      montantTotal: journaliereDetail ? journaliereDetail.totalPaid : num(cell(row, 15)),
    },
  }

  return {
    rowNumber,
    matricule,
    lastName: str(cell(row, 3)),
    firstName: str(cell(row, 4)),
    contacts,
    category: caisseType, // pour la CS, `category` porte le caisseType
    amountPerMonth,
    durationMonths,
    startDate,
    status: 'ACTIVE',
    paidCount,
    dueCount,
    supportsCount: 0,
    supportsAmount: 0,
    hasEarlyRefund: false,
    earlyRefundAmount: 0,
    issues,
    payments,
    supportsDetail: [],
    earlyRefundDetail: null,
    emergency: { lastName: 'INCONNU', firstName: '', phone1: contacts[0] ?? '', relationship: 'INCONNU' },
    entraide,
    raw: {},
  }
}

// ----- ADHESION TONTINE (INACTIF uniquement) : contrats Caisse Spéciale clôturés -----

/** Nombre de mois entre deux dates ISO (b - a). */
function monthsBetweenIso(a: string | null, b: string | null): number {
  if (!a || !b) return 0
  const da = new Date(a)
  const db = new Date(b)
  if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return 0
  return (db.getFullYear() - da.getFullYear()) * 12 + (db.getMonth() - da.getMonth())
}

// Échéancier simplifié : 12 paires MOIS (nom du mois) / MONTANT à partir de la colonne 24.
const CS_CLOSED_MONTH_STARTS = [24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46]

/**
 * Une ligne INACTIF d'ADHESION TONTINE → 1 contrat Caisse Spéciale clôturé.
 * OBSERVATION « RETRAIT ANTICIPE » → RESCINDED (retrait anticipé), sinon CLOSED
 * (clôture normale). Les lignes ACTIF sont ignorées (importées via GESTION TONTINE ACTIF).
 */
function analyzeCaisseClosedRow(row: unknown[], rowNumber: number): AnalyzedRow | null {
  const matricule = str(cell(row, 1))
  if (!matricule) return null
  const statut = str(cell(row, 7)).toUpperCase()
  if (!statut.includes('INACT')) return null // on ne traite que les INACTIF

  const caisseType = mapCaisseType(cell(row, 11)) // TYPE TONTINE
  const amountPerMonth = caisseType === 'LIBRE' ? 0 : num(cell(row, 12)) // MONTANT/M
  const startDate = dateStr(cell(row, 9)) // DATE DEBUT
  const finDate = dateStr(cell(row, 10)) // FIN ENTRAIDE

  const observationRaw = strOpt(cell(row, 17))
  const observation = (observationRaw || '').toUpperCase()
  const otherRemarks = strOpt(cell(row, 18))
  const isEarly = observation.includes('RETRAIT ANTICIP')
  const status: MappedContractStatus = isEarly ? 'RESCINDED' : 'CLOSED'

  // Échéancier : paires MOIS (nom) / MONTANT. Montant > 0 → versement payé.
  const payments: ImportPayment[] = []
  CS_CLOSED_MONTH_STARTS.forEach((start, monthIndex) => {
    const monthLabel = strOpt(cell(row, start))
    const montant = num(cell(row, start + 1))
    if (montant <= 0 && !monthLabel) return
    if (montant <= 0) return
    const date = addMonthsIso(startDate, monthIndex) || startDate || ''
    payments.push({
      monthIndex,
      targetAmount: amountPerMonth || montant,
      status: 'PAID',
      dueDate: date || undefined,
      versement: {
        date,
        time: '00:00',
        amount: montant,
        mode: 'cash',
        note: monthLabel, // nom du mois (JANVIER, FEVRIER…)
      },
    })
  })

  const paidCount = payments.length
  const montantCotisation = num(cell(row, 16)) // MONTANT COTISATION (total remis)
  const dateRemise = dateStr(cell(row, 15)) // DATE REMISE
  // Durée planifiée du contrat = DEBUT → FIN ENTRAIDE (sinon échéances, sinon 12).
  const durationMonths = monthsBetweenIso(startDate, finDate) || payments.length || 12

  const contacts = contactsOf(cell(row, 5), cell(row, 6))
  const totalPaid = payments.reduce((s, p) => s + (p.versement?.amount ?? 0), 0)

  const issues: string[] = []
  if (caisseType !== 'LIBRE' && amountPerMonth <= 0) issues.push('Montant mensuel manquant')
  if (!str(cell(row, 3)) && !str(cell(row, 4))) issues.push('Nom/prénom manquant')

  const entraide: EntraideMeta = {
    code: strOpt(cell(row, 2)),
    contractEndDate: finDate || undefined,
    contractSigned: strOpt(cell(row, 8)),
    yearRegistered: strOpt(cell(row, 13)),
    observation: observationRaw,
    otherRemarks,
    closureDocs: strOpt(cell(row, 19)),
    guarantorMatricule: strOpt(cell(row, 20)),
    summary: {
      versementsCount: paidCount,
      monthsUnpaid: num(cell(row, 14)), // DUREE PERIODE
      montantTotal: totalPaid,
    },
  }

  return {
    rowNumber,
    matricule,
    lastName: str(cell(row, 3)),
    firstName: str(cell(row, 4)),
    contacts,
    category: caisseType,
    amountPerMonth,
    durationMonths,
    startDate,
    status,
    paidCount,
    dueCount: 0,
    supportsCount: 0,
    supportsAmount: 0,
    hasEarlyRefund: true,
    earlyRefundAmount: montantCotisation,
    issues,
    payments,
    supportsDetail: [],
    earlyRefundDetail: {
      amount: montantCotisation,
      date: dateRemise || startDate || '',
      reason: otherRemarks || observationRaw || undefined,
    },
    emergency: {
      lastName: str(cell(row, 21)) || 'INCONNU',
      firstName: str(cell(row, 22)),
      phone1: contacts[0] ?? '',
      relationship: str(cell(row, 23)) || 'INCONNU',
    },
    entraide,
    raw: {},
  }
}

// ----- ADHESION VOLET ENTRAIDE (INACTIF uniquement) -----

// Feuille ADHESION VOLET ENTRAIDE restructurée comme la feuille ACTIVE :
// blocs d'échéance (7 col) + blocs imprévu (8 col), à partir de la colonne 24.
const CLOSED_ECHEANCE_STARTS = [24, 31, 38, 45, 60, 75, 90, 105, 120, 135, 150, 165]
const CLOSED_IMPREVU_STARTS = [52, 67, 82, 97, 112, 127, 142, 157, 172]

/** Ajoute n mois à une date ISO (YYYY-MM-DD). */
function addMonthsIso(iso: string | null, n: number): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  d.setMonth(d.getMonth() + n)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function analyzeClosedRow(row: unknown[], rowNumber: number): AnalyzedRow | null {
  const matricule = str(cell(row, 1))
  if (!matricule) return null

  const statut = str(cell(row, 7)).toUpperCase()
  if (statut !== 'INACTIF') return null

  const category = str(cell(row, 11)).toUpperCase()
  const amountPerMonth = num(cell(row, 12)) || CATEGORY_AMOUNT[category] || 0
  const startDate = dateStr(cell(row, 9))
  const observationRaw = strOpt(cell(row, 17)) // R OBSERVATION (texte conservé)
  const observation = (observationRaw || '').toUpperCase()
  const otherRemarks = strOpt(cell(row, 18)) // S AUTRES REMARQUE = motif réel
  const montantCotisation = num(cell(row, 16))
  const dateRemise = dateStr(cell(row, 15))

  // Cotisations payées : un bloc d'échéance par mois (ECHEANCE = libellé mois,
  // MONTANT à +2). On ne garde que les mois réellement versés (montant > 0).
  const payments: ImportPayment[] = []
  CLOSED_ECHEANCE_STARTS.forEach((start, monthIndex) => {
    const montant = num(cell(row, start + 2))
    if (montant <= 0) return
    const dr = dateStr(cell(row, start + 1))
    payments.push({
      monthIndex,
      targetAmount: amountPerMonth || montant,
      status: 'PAID',
      dueDate: addMonthsIso(startDate, monthIndex) || undefined,
      versement: {
        date: dr || addMonthsIso(startDate, monthIndex) || startDate || '',
        time: parseHeure(cell(row, start + 3)),
        amount: montant,
        mode: mapMode(cell(row, start + 4)),
        agentName: strOpt(cell(row, start + 5)),
        note: strOpt(cell(row, start + 6)),
        monthLabel: strOpt(cell(row, start)), // nom du mois (OCTOBRE, …)
      },
    })
  })

  // Imprévus éventuels (mêmes blocs que la feuille active).
  const supportsDetail: ImportSupport[] = []
  CLOSED_IMPREVU_STARTS.forEach((start) => {
    const argent = num(cell(row, start + 2))
    const dateImp = cell(row, start)
    if (argent > 0 || isPresent(dateImp)) {
      supportsDetail.push({
        amount: argent,
        date: dateStr(dateImp) || startDate || '',
        time: parseHeure(cell(row, start + 1)),
        mode: mapMode(cell(row, start + 3)),
        closureDate: dateStr(cell(row, start + 4)) || undefined,
        closureTime: isPresent(cell(row, start + 5)) ? parseHeure(cell(row, start + 5)) : undefined,
        closureAgent: strOpt(cell(row, start + 6)),
        note: strOpt(cell(row, start + 7)),
      })
    }
  })

  // ⚠️ Tous les contrats résiliés ont un contrat sur 12 mois.
  const durationMonths = 12

  const isEarly = observation.includes('RETRAIT ANTICIP') // RETRAIT ANTICIPE / ANTICIPÉ
  const status: MappedContractStatus = isEarly ? 'CANCELED' : 'FINISHED'

  const issues: string[] = []
  if (!CATEGORY_AMOUNT[category]) issues.push(`Catégorie inconnue ("${category || '∅'}")`)
  if (amountPerMonth <= 0) issues.push('Montant mensuel manquant')
  if (!str(cell(row, 3)) && !str(cell(row, 4))) issues.push('Nom/prénom manquant')

  const contacts = contactsOf(cell(row, 5), cell(row, 6))

  const entraide: EntraideMeta = {
    code: strOpt(cell(row, 2)),
    contractEndDate: dateStr(cell(row, 10)) || undefined,
    contractSigned: strOpt(cell(row, 8)),
    yearRegistered: strOpt(cell(row, 13)),
    observation: observationRaw, // R OBSERVATION
    otherRemarks, // S AUTRES REMARQUE
    closureDocs: strOpt(cell(row, 19)),
    guarantorMatricule: strOpt(cell(row, 20)),
    summary: {
      versementsCount: payments.length,
      monthsUnpaid: num(cell(row, 14)), // DUREE PERIODE (réf. : nb de mois cotisés)
      montantTotal: payments.reduce((s, p) => s + (p.versement?.amount ?? 0), 0),
    },
  }

  return {
    rowNumber,
    matricule,
    lastName: str(cell(row, 3)),
    firstName: str(cell(row, 4)),
    contacts,
    category,
    amountPerMonth,
    durationMonths,
    startDate,
    status,
    paidCount: payments.length,
    dueCount: 0,
    supportsCount: supportsDetail.length,
    supportsAmount: supportsDetail.reduce((s, x) => s + x.amount, 0),
    hasEarlyRefund: isEarly,
    earlyRefundAmount: isEarly ? montantCotisation : 0,
    issues,
    payments,
    supportsDetail,
    earlyRefundDetail: isEarly
      ? {
          amount: montantCotisation,
          date: dateRemise || startDate || '',
          reason: otherRemarks || observationRaw || undefined,
        }
      : null,
    emergency: {
      lastName: str(cell(row, 21)) || 'INCONNU', // V NOM URGENT
      firstName: str(cell(row, 22)), // W PRENOM URGENT
      phone1: contacts[0] ?? '',
      relationship: str(cell(row, 23)) || 'INCONNU', // X LIENS
    },
    entraide,
    raw: {},
  }
}

export function analyzeSheet(
  sheetName: string,
  aoa: unknown[][],
  opts?: { journaliere?: Map<string, JournaliereDetail> },
): ImportAnalysis {
  const sheetType = detectSheetType(sheetName)
  const headerIdx = findHeaderRowIndex(aoa)
  const dataRows = aoa.slice(headerIdx + 1)

  if (sheetType === 'UNKNOWN') {
    const header = (aoa[headerIdx] ?? []).map((c) => str(c)).filter(Boolean)
    const nonEmpty = dataRows.filter((r) => r.some((c) => isPresent(c))).length
    return {
      sheetName,
      sheetType,
      target: 'CI',
      targetCollection: '—',
      totalDataRows: nonEmpty,
      importableRows: 0,
      rows: [],
      totals: { active: 0, finished: 0, canceled: 0, paidVersements: 0, supports: 0, earlyRefunds: 0 },
      howItWillBeImported: [
        "Cette feuille n'est pas reconnue par l'import.",
        'Feuilles supportées : "GESTION ENTRAIDE ACTIF", "ADHESION VOLET ENTRAIDE", "GESTION TONTINE ACTIF".',
      ],
      detectedColumns: header,
    }
  }

  const target: ImportTarget =
    sheetType === 'CS_ACTIVE' || sheetType === 'CS_CLOSED' ? 'CS' : 'CI'

  const rows: AnalyzedRow[] = []
  let totalDataRows = 0
  let rowNumber = headerIdx + 1
  for (const r of dataRows) {
    rowNumber++
    if (!r.some((c) => isPresent(c))) continue
    if (!isPresent(cell(r, 1))) continue
    totalDataRows++
    const analyzed =
      sheetType === 'CI_ACTIVE'
        ? analyzeActiveRow(r, rowNumber)
        : sheetType === 'CS_ACTIVE'
          ? analyzeCaisseActiveRow(r, rowNumber, opts?.journaliere)
          : sheetType === 'CS_CLOSED'
            ? analyzeCaisseClosedRow(r, rowNumber)
            : analyzeClosedRow(r, rowNumber)
    if (analyzed) {
      analyzed.raw = buildRaw(r)
      rows.push(analyzed)
    }
  }

  const totals = {
    active: rows.filter((x) => x.status === 'ACTIVE').length,
    // CLOSED (clôture normale CS) compté avec les "terminés".
    finished: rows.filter((x) => x.status === 'FINISHED' || x.status === 'CLOSED').length,
    // RESCINDED (retrait anticipé CS) compté avec les "annulés/résiliés".
    canceled: rows.filter((x) => x.status === 'CANCELED' || x.status === 'RESCINDED').length,
    paidVersements: rows.reduce((s, x) => s + x.paidCount, 0),
    supports: rows.reduce((s, x) => s + x.supportsCount, 0),
    earlyRefunds: rows.filter((x) => x.hasEarlyRefund).length,
  }

  const howItWillBeImported =
    sheetType === 'CS_CLOSED'
      ? [
          'Lignes INACTIF uniquement → 1 contrat Caisse Spéciale clôturé (collection caisseContracts). Les ACTIF sont ignorés (voir GESTION TONTINE ACTIF).',
          'OBSERVATION « RETRAIT ANTICIPE » → statut RESCINDED ; sinon CLOSED (clôture normale).',
          'TYPE TONTINE : MENSUEL → STANDARD, LIBRE → LIBRE, JOURNALIER → JOURNALIERE.',
          'MOIS 1..12 / MONTANT → paiements PAID (montant + nom du mois) ; durée = DÉBUT → FIN ENTRAIDE.',
          'DATE REMISE / MONTANT COTISATION → remboursement (caisseContracts/{id}/refunds) : RESCINDED → EARLY, CLOSED → FINAL ; motif = AUTRES REMARQUE.',
          'OBSERVATION, garant, contrat signé, fin, docs clôture → bloc `entraide`. Membre créé s’il n’existe pas. Ligne brute conservée (migration.raw).',
        ]
      : sheetType === 'CS_ACTIVE'
      ? [
          'Chaque ligne → 1 contrat Caisse Spéciale ACTIVE (collection caisseContracts).',
          'CATEGORIE : MENSUEL → STANDARD, LIBRE → LIBRE, JOURNALIER → JOURNALIERE.',
          'Montant mensuel = MONTANT CAT (0 pour LIBRE) ; durée = nb d’échéances (payées + dues).',
          'Échéances → paiements (caisseContracts/{id}/payments) : payé → PAID (date, heure, montant, moyen), sinon DUE.',
          'JOURNALIER : croisement par matricule avec la feuille JOURNALIERE → versements quotidiens réels (dates, heures, montants, moyens).',
          'Membre créé s’il n’existe pas (compte adhérent). Ligne brute conservée (migration.raw).',
        ]
      : sheetType === 'CI_ACTIVE'
        ? [
            'Chaque ligne → 1 contrat Caisse Imprévue avec statut ACTIVE (collection contractsCI).',
            'Échéances payées → versements (date, heure, montant, moyen, AGENT, REMARQUE) ; non payées → DUE.',
            'Imprévus → supports (montant, date, moyen + clôture : date/heure/agent/remarque).',
            'Forfait déduit de la catégorie A–E ; durée = échéancier réel.',
            'Colonnes sans champ modèle (code entraide, fin/réception, récap N/O/P/Q) → bloc `entraide`.',
            "Champs obligatoires absents (preuves, pièce du contact d'urgence) → placeholders.",
            'Ligne brute intégrale conservée (migration.raw) — aucune perte.',
          ]
        : [
            'Seules les lignes STATUT = INACTIF sont importées (contrats clôturés).',
            'OBSERVATION contient "RETRAIT ANTICIPE" → CANCELED + retrait anticipé ; sinon → FINISHED.',
            'Durée = DUREE PERIODE (O) ; cotisations MOIS 1..12 → versements (avec libellé du mois).',
            'Colonnes sans champ modèle (code, contrat signé, fin, année, docs clôture, garant) → bloc `entraide`.',
            'Champs obligatoires absents → placeholders.',
            'Ligne brute intégrale conservée (migration.raw) — aucune perte.',
          ]

  return {
    sheetName,
    sheetType,
    target,
    targetCollection: target === 'CS' ? 'caisseContracts' : 'contractsCI',
    totalDataRows,
    importableRows: rows.length,
    rows,
    totals,
    howItWillBeImported,
  }
}

// ----- Feuille MEMBRES (enrichissement des comptes membres créés) -----

const MEMBER_PLACEHOLDERS = new Set(['NC', 'VIDE', 'N/A', 'NA', '-', 'VIDE@GMAIL.COM'])

function mval(v: unknown): string | undefined {
  const s = str(v)
  if (!s) return undefined
  if (MEMBER_PLACEHOLDERS.has(s.toUpperCase())) return undefined
  return s
}

export interface ImportMemberData {
  matricule: string
  lastName: string
  firstName: string
  contacts: string[]
  email?: string
  gender?: string
  hasCar?: boolean
  birthDate?: string
  birthCertificateNumber?: string
  birthPlace?: string
  nationality?: string
  profession?: string
  companyName?: string
  identityDocument?: string
  identityDocumentNumber?: string
  maritalStatus?: string
  partnerName?: string
  partnerPhone?: string
  religion?: string
  prayerPlace?: string
  /** Matricule du parrain / entremetteur (colonne CODE ENTRE). */
  intermediaryCode?: string
  /** Paiement d'adhésion porté directement sur la ligne MEMBRES (le plus récent). */
  membershipPaymentDate?: string // DATE INSCRIPTION
  membershipPaymentAmount?: number // MONTANT (10 000)
  membershipPaymentMode?: string // MOYEN/PAIE
  membershipPaymentAgent?: string // AGENT PAIE
  address?: {
    province: string
    city: string
    district: string
    arrondissement: string
    additionalInfo?: string
  }
}

/** Parse la feuille MEMBRES → Map matricule -> données membre (pour créer des comptes). */
export function parseMembersSheet(aoa: unknown[][]): Map<string, ImportMemberData> {
  const map = new Map<string, ImportMemberData>()
  const headerIdx = findHeaderRowIndex(aoa)
  for (const r of aoa.slice(headerIdx + 1)) {
    const matricule = str(cell(r, 1))
    if (!matricule) continue
    const contacts = [mval(cell(r, 4)), mval(cell(r, 5))].filter((x): x is string => !!x)
    // Adresse du domicile : PROVINCE(21) / COMMUNE-VILLE(23) / QUARTIER(25) /
    // ARRONDISSEMENT(24) / INFO COMPLEMENTAIRE(26).
    const province = mval(cell(r, 21))
    const city = mval(cell(r, 23))
    const district = mval(cell(r, 25))
    const arrondissement = mval(cell(r, 24))
    const additionalInfo = mval(cell(r, 26))
    const address =
      province || city || district || arrondissement
        ? {
            province: province ?? '',
            city: city ?? '',
            district: district ?? '',
            arrondissement: arrondissement ?? '',
            additionalInfo,
          }
        : undefined
    map.set(matricule.trim(), {
      matricule: matricule.trim(),
      lastName: str(cell(r, 2)), // NOM
      firstName: str(cell(r, 3)), // PRENOM
      contacts, // TELEPHONE 1 / 2
      email: mval(cell(r, 6)), // E-MAIL
      gender: mval(cell(r, 7)), // SEXE
      hasCar: str(cell(r, 8)).trim().toUpperCase().startsWith('OUI'), // VOITURE (OUI/NON)
      birthDate: dateStr(cell(r, 9)) || undefined, // DATE DE NAISSANCE
      birthCertificateNumber: mval(cell(r, 12)), // NUMERO D'ACTE DE NAISSANCE
      birthPlace: mval(cell(r, 11)), // LIEU DE NAISSANCE
      nationality: mval(cell(r, 20)), // NATIONALITE
      profession: mval(cell(r, 27)), // PROFESSION
      companyName: mval(cell(r, 29)), // ENTREPRISE
      identityDocument: mval(cell(r, 16)), // TYPE DE PIECE
      identityDocumentNumber: mval(cell(r, 17)), // NUMERO PIECE
      maritalStatus: mval(cell(r, 31)), // S.MATRIMONIALE
      partnerName: mval(cell(r, 32)), // NOM PARTENAIRE
      partnerPhone: mval(cell(r, 33)), // TELEPHONE PARTENAIRE
      religion: mval(cell(r, 13)), // RELIGION
      prayerPlace: mval(cell(r, 14)), // LIEU DE PRIERE
      intermediaryCode: mval(cell(r, 34)), // CODE ENTRE (matricule du parrain)
      membershipPaymentDate: dateStr(cell(r, 37)) || undefined, // DATE INSCRIPTION
      membershipPaymentAmount: isPresent(cell(r, 39)) ? num(cell(r, 39)) || undefined : undefined, // MONTANT
      membershipPaymentMode: mval(cell(r, 41)), // MOYEN/PAIE
      membershipPaymentAgent: mval(cell(r, 42)), // AGENT PAIE
      address,
    })
  }
  return map
}

/** Adhésion (abonnement) d'un membre — une par année, issue de ADHESION MEMBRES. */
export interface ImportAdhesion {
  dateStart?: string
  dateEnd?: string
  montant?: number
  type: MembershipTypeValue
  year?: number
  paymentDate?: string
  mode?: string
  agent?: string
}

/**
 * Parse la feuille ADHESION MEMBRES → Map matricule -> liste d'adhésions.
 * Un membre peut avoir plusieurs adhésions (renouvellements par année).
 * Colonnes : MATRICULE(1) T.MEMBRES(6) DEBUT AD(7) FIN AD(8) DATE PAIEMENT(10)
 *            MONTANT(12) MOYEN(14) AGENT PAIE(15) ANNEE(17).
 */
export function parseAdhesionMembersSheet(aoa: unknown[][]): Map<string, ImportAdhesion[]> {
  const map = new Map<string, ImportAdhesion[]>()
  const headerIdx = findHeaderRowIndex(aoa)
  for (const r of aoa.slice(headerIdx + 1)) {
    const matricule = str(cell(r, 1)).trim()
    if (!matricule) continue
    const dateStart = dateStr(cell(r, 7)) || undefined
    const dateEnd = dateStr(cell(r, 8)) || undefined
    if (!dateStart && !dateEnd) continue // ligne sans période d'adhésion exploitable
    const adhesion: ImportAdhesion = {
      dateStart,
      dateEnd,
      montant: isPresent(cell(r, 12)) ? num(cell(r, 12)) : undefined,
      type: mapMembership(cell(r, 6)).type,
      year: isPresent(cell(r, 17)) ? num(cell(r, 17)) || undefined : undefined,
      paymentDate: dateStr(cell(r, 10)) || undefined,
      mode: mval(cell(r, 14)),
      agent: mval(cell(r, 15)),
    }
    const list = map.get(matricule) ?? []
    list.push(adhesion)
    map.set(matricule, list)
  }
  return map
}

// ----- Import de MEMBRES (feuille MEMBRES) -----

export interface AnalyzedMember {
  rowNumber: number
  matricule: string
  lastName: string
  firstName: string
  contacts: string[]
  membershipType: MembershipTypeValue
  role: string
  membershipLabel: string
  issues: string[]
}

export interface MembersAnalysis {
  sheetName: string
  totalRows: number
  uniqueMembers: number
  members: AnalyzedMember[]
  byType: Record<string, number>
}

/**
 * Analyse la feuille MEMBRES → liste de membres dédoublonnée par matricule.
 * Le type de compte est lu dans la colonne T.MEMBRES (col 36) :
 * ADHERENT / SYMPATHISANT / BIENFAITEUR (adhérent par défaut si vide).
 * L'état civil complet (naissance, e-mail, pièce, adresse…) est repris à
 * l'écriture via parseMembersSheet (même feuille).
 */
export function analyzeMembersSheet(sheetName: string, aoa: unknown[][]): MembersAnalysis {
  const headerIdx = findHeaderRowIndex(aoa)
  const seen = new Set<string>()
  const members: AnalyzedMember[] = []
  let totalRows = 0
  let rowNumber = headerIdx + 1
  for (const r of aoa.slice(headerIdx + 1)) {
    rowNumber++
    const matricule = str(cell(r, 1))
    if (!matricule) continue
    totalRows++
    if (seen.has(matricule.trim())) continue // dédoublonnage par matricule
    seen.add(matricule.trim())

    // Type de compte lu dans T.MEMBRES (col 36) ; adhérent par défaut si vide.
    const mt = mapMembership(cell(r, 36))
    const contacts = [mval(cell(r, 4)), mval(cell(r, 5))].filter((x): x is string => !!x)
    const issues: string[] = []
    if (!str(cell(r, 2)) && !str(cell(r, 3))) issues.push('Nom/prénom manquant')

    members.push({
      rowNumber,
      matricule,
      lastName: str(cell(r, 2)),
      firstName: str(cell(r, 3)),
      contacts,
      membershipType: mt.type,
      role: mt.role,
      membershipLabel: mt.label,
      issues,
    })
  }

  const byType: Record<string, number> = {}
  for (const m of members) byType[m.membershipType] = (byType[m.membershipType] ?? 0) + 1

  return { sheetName, totalRows, uniqueMembers: members.length, members, byType }
}
