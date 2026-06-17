/**
 * Analyseur d'import Excel — Caisse Imprévue.
 *
 * Lit une feuille du classeur "GESTION MEMBRES KARA" (sous forme de tableau de
 * tableaux) et produit, en UNE seule passe :
 *  - un RÉSUMÉ (pour l'aperçu) ;
 *  - le DÉTAIL prêt à écrire (versements, supports, retrait, contact urgence).
 *
 * Le mapping est positionnel (par index de colonne) car les en-têtes Excel sont
 * dupliqués ("MONTANT", "AGENT", "REMARQUE"...).
 *
 * Feuilles connues :
 *  - "GESTION ENTRAIDE ACTIF"  -> contrats CI ACTIFS (+ versements + supports)
 *  - "ADHESION VOLET ENTRAIDE" -> contrats CI CLÔTURÉS (INACTIF uniquement)
 */

export type ImportSheetType = 'CI_ACTIVE' | 'CI_CLOSED' | 'UNKNOWN'
export type MappedContractStatus = 'ACTIVE' | 'FINISHED' | 'CANCELED'
export type ImportPaymentMode = 'airtel_money' | 'mobicash' | 'cash' | 'bank_transfer' | 'other'

export interface ImportVersement {
  date: string // YYYY-MM-DD
  time: string // HH:mm
  amount: number
  mode: ImportPaymentMode
}

export interface ImportPayment {
  monthIndex: number
  targetAmount: number
  status: 'PAID' | 'DUE'
  versement: ImportVersement | null
}

export interface ImportSupport {
  amount: number
  date: string
  time: string
  mode: ImportPaymentMode
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
}

export interface ImportAnalysis {
  sheetName: string
  sheetType: ImportSheetType
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

export function detectSheetType(sheetName: string): ImportSheetType {
  const n = sheetName.trim().toUpperCase()
  if (n === SHEET_ACTIVE) return 'CI_ACTIVE'
  if (n === SHEET_CLOSED) return 'CI_CLOSED'
  return 'UNKNOWN'
}

function findHeaderRowIndex(aoa: unknown[][]): number {
  for (let i = 0; i < Math.min(aoa.length, 15); i++) {
    const row = aoa[i] ?? []
    if (row.some((c) => str(c).toUpperCase() === 'MATRICULE')) return i
  }
  return 2
}

// ----- GESTION ENTRAIDE ACTIF -----

const ACTIVE_ECHEANCE_STARTS = [17, 24, 31, 38, 53, 68, 83, 98, 113, 128, 143, 158]
const ACTIVE_IMPREVU_STARTS = [45, 60, 75, 90, 105, 120, 135, 150, 165]

function analyzeActiveRow(row: unknown[], rowNumber: number): AnalyzedRow | null {
  const matricule = str(cell(row, 1))
  if (!matricule) return null

  const category = str(cell(row, 10)).toUpperCase()
  const amountPerMonth = num(cell(row, 11)) || CATEGORY_AMOUNT[category] || 0
  const durationMonths = num(cell(row, 12))
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
      })
    }
  })

  const paidCount = payments.filter((p) => p.status === 'PAID').length
  const dueCount = payments.filter((p) => p.status === 'DUE').length

  const issues: string[] = []
  if (!CATEGORY_AMOUNT[category]) issues.push(`Catégorie inconnue ("${category || '∅'}")`)
  if (amountPerMonth <= 0) issues.push('Montant mensuel manquant')
  if (durationMonths <= 0) issues.push('Durée (PERIODE/MOIS) manquante')
  if (!str(cell(row, 3)) && !str(cell(row, 4))) issues.push('Nom/prénom manquant')

  const contacts = contactsOf(cell(row, 5), cell(row, 6))

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

  // Cotisations MOIS 1..12 : montant aux index 25, 27, ... (25 + 2k)
  const payments: ImportPayment[] = []
  for (let k = 0; k < 12; k++) {
    const montant = num(cell(row, 25 + 2 * k))
    if (montant > 0) {
      payments.push({
        monthIndex: k,
        targetAmount: amountPerMonth,
        status: 'PAID',
        versement: { date: startDate || '', time: '00:00', amount: montant, mode: 'cash' },
      })
    }
  }

  const isEarly = observation.includes('RETRAIT ANTICIPE') || observation.includes('RETRAIT ANTICIPÉ')
  const status: MappedContractStatus = isEarly ? 'CANCELED' : 'FINISHED'

  const issues: string[] = []
  if (!CATEGORY_AMOUNT[category]) issues.push(`Catégorie inconnue ("${category || '∅'}")`)
  if (amountPerMonth <= 0) issues.push('Montant mensuel manquant')
  if (!str(cell(row, 3)) && !str(cell(row, 4))) issues.push('Nom/prénom manquant')

  const contacts = contactsOf(cell(row, 5), cell(row, 6))

  return {
    rowNumber,
    matricule,
    lastName: str(cell(row, 3)),
    firstName: str(cell(row, 4)),
    contacts,
    category,
    amountPerMonth,
    durationMonths: 12,
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
      targetCollection: '—',
      totalDataRows: nonEmpty,
      importableRows: 0,
      rows: [],
      totals: { active: 0, finished: 0, canceled: 0, paidVersements: 0, supports: 0, earlyRefunds: 0 },
      howItWillBeImported: [
        "Cette feuille n'est pas reconnue par l'import Caisse Imprévue.",
        'Feuilles supportées : "GESTION ENTRAIDE ACTIF" et "ADHESION VOLET ENTRAIDE".',
      ],
      detectedColumns: header,
    }
  }

  const rows: AnalyzedRow[] = []
  let totalDataRows = 0
  let rowNumber = headerIdx + 1
  for (const r of dataRows) {
    rowNumber++
    if (!r.some((c) => isPresent(c))) continue
    if (!isPresent(cell(r, 1))) continue
    totalDataRows++
    const analyzed =
      sheetType === 'CI_ACTIVE' ? analyzeActiveRow(r, rowNumber) : analyzeClosedRow(r, rowNumber)
    if (analyzed) rows.push(analyzed)
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
    sheetType === 'CI_ACTIVE'
      ? [
          'Chaque ligne → 1 contrat Caisse Imprévue avec statut ACTIVE (collection contractsCI).',
          'Échéances payées → versements dans la sous-collection payments ; échéances non payées → statut DUE.',
          'Imprévus versés (ARGENT REMIS) → entrées dans la sous-collection supports.',
          'Forfait déduit de la catégorie A–E ; durée = colonne PERIODE/MOIS (variable).',
          "Champs obligatoires absents (preuves, pièce du contact d'urgence) → placeholders + marqueur migration.",
        ]
      : [
          'Seules les lignes STATUT = INACTIF sont importées (contrats clôturés).',
          'OBSERVATION contient "RETRAIT ANTICIPE" → statut CANCELED + 1 retrait anticipé (earlyRefunds).',
          'Sinon → statut FINISHED.',
          'Cotisations MOIS 1..12 → versements payés dans la sous-collection payments.',
          'Champs obligatoires absents → placeholders + marqueur migration.',
        ]

  return {
    sheetName,
    sheetType,
    targetCollection: 'contractsCI',
    totalDataRows,
    importableRows: rows.length,
    rows,
    totals,
    howItWillBeImported,
  }
}
