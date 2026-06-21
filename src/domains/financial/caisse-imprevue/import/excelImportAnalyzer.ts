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

export type ImportSheetType = 'CI_ACTIVE' | 'CI_CLOSED' | 'CS_ACTIVE' | 'MEMBERS' | 'UNKNOWN'
export type MembershipTypeValue = 'adherant' | 'bienfaiteur' | 'sympathisant'
/** Collection cible d'un import de contrats. */
export type ImportTarget = 'CI' | 'CS'
export type MappedContractStatus = 'ACTIVE' | 'FINISHED' | 'CANCELED'
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
const SHEET_MEMBERS = 'ADHESION MEMBRES'
const SHEET_CS_ACTIVE = 'GESTION TONTINE ACTIF' // contrats Caisse Spéciale

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

/** Variante qui renvoie undefined si vide (pratique pour les champs optionnels). */
function strOpt(v: unknown): string | undefined {
  const s = str(v)
  return s === '' ? undefined : s
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

function analyzeCaisseActiveRow(row: unknown[], rowNumber: number): AnalyzedRow | null {
  const matricule = str(cell(row, 1))
  if (!matricule) return null

  const caisseType = mapCaisseType(cell(row, 10)) // K CATEGORIE
  // Montant mensuel : STANDARD/JOURNALIERE = MONTANT CAT (L) ; LIBRE = 0 (montants variables).
  const amountPerMonth = caisseType === 'LIBRE' ? 0 : num(cell(row, 11))
  const startDate = dateStr(cell(row, 7)) // H DEBUT VERSEMENT

  const payments: ImportPayment[] = []
  CS_ECHEANCE_STARTS.forEach((start, monthIndex) => {
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

  const paidCount = payments.filter((p) => p.status === 'PAID').length
  const dueCount = payments.filter((p) => p.status === 'DUE').length
  const durationMonths = payments.length || num(cell(row, 13)) + num(cell(row, 14)) || 12

  const contacts = contactsOf(cell(row, 5), cell(row, 6))

  const issues: string[] = []
  if (caisseType !== 'LIBRE' && amountPerMonth <= 0) issues.push('Montant mensuel manquant')
  if (payments.length === 0) issues.push('Aucune échéance détectée')
  if (!str(cell(row, 3)) && !str(cell(row, 4))) issues.push('Nom/prénom manquant')

  const entraide: EntraideMeta = {
    code: strOpt(cell(row, 2)),
    contractEndDate: dateStr(cell(row, 8)) || undefined,
    receptionDate: dateStr(cell(row, 9)) || undefined,
    summary: {
      versementsCount: num(cell(row, 13)),
      monthsUnpaid: num(cell(row, 14)),
      montantTotal: num(cell(row, 15)),
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

// ----- ADHESION VOLET ENTRAIDE (INACTIF uniquement) -----

function analyzeClosedRow(row: unknown[], rowNumber: number): AnalyzedRow | null {
  const matricule = str(cell(row, 1))
  if (!matricule) return null

  const statut = str(cell(row, 7)).toUpperCase()
  if (statut !== 'INACTIF') return null

  const category = str(cell(row, 11)).toUpperCase()
  const amountPerMonth = num(cell(row, 12)) || CATEGORY_AMOUNT[category] || 0
  const startDate = dateStr(cell(row, 9))
  const observation = str(cell(row, 17)).toUpperCase()
  const montantCotisation = num(cell(row, 16))
  const dateRemise = dateStr(cell(row, 15))

  // Cotisations MOIS 1..12 : libellé mois (24 + 2k) / montant (25 + 2k)
  const payments: ImportPayment[] = []
  for (let k = 0; k < 12; k++) {
    const montant = num(cell(row, 25 + 2 * k))
    if (montant > 0) {
      payments.push({
        monthIndex: k,
        targetAmount: amountPerMonth,
        status: 'PAID',
        versement: {
          date: startDate || '',
          time: '00:00',
          amount: montant,
          mode: 'cash',
          monthLabel: strOpt(cell(row, 24 + 2 * k)),
        },
      })
    }
  }

  // Durée réelle = DUREE PERIODE (O), sinon nb de cotisations, sinon 12.
  const durationMonths = num(cell(row, 14)) || payments.length || 12

  const isEarly = observation.includes('RETRAIT ANTICIPE') || observation.includes('RETRAIT ANTICIPÉ')
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
    otherRemarks: strOpt(cell(row, 18)),
    closureDocs: strOpt(cell(row, 19)),
    guarantorMatricule: strOpt(cell(row, 20)),
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
    supportsCount: 0,
    supportsAmount: 0,
    hasEarlyRefund: isEarly,
    earlyRefundAmount: isEarly ? montantCotisation : 0,
    issues,
    payments,
    supportsDetail: [],
    earlyRefundDetail: isEarly ? { amount: montantCotisation, date: dateRemise || startDate || '' } : null,
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

export function analyzeSheet(sheetName: string, aoa: unknown[][]): ImportAnalysis {
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

  const target: ImportTarget = sheetType === 'CS_ACTIVE' ? 'CS' : 'CI'

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
          ? analyzeCaisseActiveRow(r, rowNumber)
          : analyzeClosedRow(r, rowNumber)
    if (analyzed) {
      analyzed.raw = buildRaw(r)
      rows.push(analyzed)
    }
  }

  const totals = {
    active: rows.filter((x) => x.status === 'ACTIVE').length,
    finished: rows.filter((x) => x.status === 'FINISHED').length,
    canceled: rows.filter((x) => x.status === 'CANCELED').length,
    paidVersements: rows.reduce((s, x) => s + x.paidCount, 0),
    supports: rows.reduce((s, x) => s + x.supportsCount, 0),
    earlyRefunds: rows.filter((x) => x.hasEarlyRefund).length,
  }

  const howItWillBeImported =
    sheetType === 'CS_ACTIVE'
      ? [
          'Chaque ligne → 1 contrat Caisse Spéciale ACTIVE (collection caisseContracts).',
          'CATEGORIE : MENSUEL → STANDARD, LIBRE → LIBRE, JOURNALIER → JOURNALIERE.',
          'Montant mensuel = MONTANT CAT (0 pour LIBRE) ; durée = nb d’échéances (payées + dues).',
          'Échéances → paiements (caisseContracts/{id}/payments) : payé → PAID (date, heure, montant, moyen), sinon DUE.',
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
  birthDate?: string
  birthPlace?: string
  nationality?: string
  profession?: string
  companyName?: string
  identityDocument?: string
  identityDocumentNumber?: string
  partnerName?: string
  partnerPhone?: string
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
    const province = mval(cell(r, 15))
    const city = mval(cell(r, 17))
    const district = mval(cell(r, 19))
    const arrondissement = mval(cell(r, 18))
    const additionalInfo = mval(cell(r, 16))
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
      lastName: str(cell(r, 2)),
      firstName: str(cell(r, 3)),
      contacts,
      email: mval(cell(r, 6)),
      gender: mval(cell(r, 7)),
      birthDate: dateStr(cell(r, 8)) || undefined,
      birthPlace: mval(cell(r, 10)),
      nationality: mval(cell(r, 14)),
      profession: mval(cell(r, 21)),
      companyName: mval(cell(r, 22)),
      identityDocument: mval(cell(r, 12)),
      identityDocumentNumber: mval(cell(r, 13)),
      partnerName: mval(cell(r, 25)),
      partnerPhone: mval(cell(r, 26)),
      address,
    })
  }
  return map
}

// ----- Import de MEMBRES (feuille ADHESION MEMBRES) -----

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
 * Analyse la feuille ADHESION MEMBRES → liste de membres dédoublonnée par
 * matricule (plusieurs lignes = plusieurs adhésions du même membre).
 * Colonne G `T.MEMBRES` → type de compte.
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

    const mt = mapMembership(cell(r, 6))
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
