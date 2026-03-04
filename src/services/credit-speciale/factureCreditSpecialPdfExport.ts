/**
 * Génération du PDF "VERSEMENT" (facture) Crédit Spéciale.
 * Layout : en-tête "VERSEMENT DU: YYYY-MM-DD" + tableau 2 colonnes (labels 38%, valeurs 62%)
 * avec couleurs de fond des labels comme dans resume-cs.png.
 */
import type { FactureCreditSpecialPDFData } from '@/components/credit-speciale/FactureCreditSpecialPDF'
import jsPDF from 'jspdf'

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace(/^#/, '').match(/^(..)(..)(..)$/)
  if (!m) return [0, 0, 0]
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)]
}

/** Ex: 6000 -> "6 000", 10000 -> "10 000" (espace insécable comme séparateur de milliers). */
function formatNumberWithSpaces(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

function formatAmount(value: number | string | boolean): string {
  if (typeof value === 'boolean') return value ? '1 FCFA' : '0 FCFA'
  if (typeof value === 'number') return formatNumberWithSpaces(value) + ' FCFA'
  const s = String(value).trim()
  if (s === '') return '0 FCFA'
  const num = parseInt(s.replace(/\s/g, ''), 10)
  if (!isNaN(num)) return formatNumberWithSpaces(num) + ' FCFA'
  return s.includes('FCFA') ? s : s + ' FCFA'
}

function formatTaux(value: number | string | boolean): string {
  const s = String(value).trim()
  if (s === '') return '0 %'
  return s.includes('%') ? s : s + ' %'
}

function formatFrais(value: string | number | boolean): string {
  if (typeof value === 'boolean') return value ? 'OUI' : 'NON'
  if (typeof value === 'number') return value ? 'OUI' : 'NON'
  const s = String(value).toLowerCase()
  if (s === 'true' || s === 'oui' || s === '1') return 'OUI'
  return 'NON'
}

const ROW_CONFIG: Array<{
  key: keyof FactureCreditSpecialPDFData
  label: string
  bgHex: string
  format?: (v: number | string | boolean) => string
}> = [
  { key: 'capital', label: 'CAPITAL', bgHex: '#22B14C', format: formatAmount },
  { key: 'taux', label: 'TAUX', bgHex: '#1E6FE8', format: formatTaux },
  { key: 'interets', label: 'INTERETS', bgHex: '#1E6FE8', format: formatAmount },
  { key: 'montantGlobal', label: 'MONTANT GLOBAL', bgHex: '#FFF200', format: formatAmount },
  { key: 'dateEcheance', label: 'DATE ECHEANCE', bgHex: '#1E6FE8' },
  { key: 'dateRemise', label: 'DATE REMISE', bgHex: '#1E6FE8' },
  { key: 'heureRemise', label: 'HEURE REMISE', bgHex: '#1E6FE8' },
  { key: 'moyen', label: 'MOYEN', bgHex: '#1E6FE8' },
  { key: 'frais', label: 'FRAIS', bgHex: '#1E6FE8', format: formatFrais },
  { key: 'montantRemis', label: 'MONTANT REMIS', bgHex: '#E31B23', format: formatAmount },
  { key: 'penalite', label: 'PENALITE', bgHex: '#1E6FE8', format: formatAmount },
  { key: 'remarque', label: 'REMARQUE', bgHex: '#1E6FE8' },
  { key: 'note', label: 'NOTE', bgHex: '#1E6FE8' },
  { key: 'nouveauCapital2', label: 'NOUVEAU CAPITAL', bgHex: '#E31B23', format: formatAmount },
]

const ROW_HEIGHT_MM = 11
const BORDER_LINE_WIDTH = 0.25
const BORDER_COLOR = [180, 180, 180] as const
const MARGIN = 15
const FONT_LABEL = 'times'
const FONT_VALUE = 'helvetica'

/** Génère et télécharge le PDF facture "VERSEMENT" au format de l’image de référence. */
export async function generateFactureCreditSpecialPDF(data: FactureCreditSpecialPDFData): Promise<void> {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const contentWidth = pageWidth - 2 * MARGIN
  const colLabelWidth = contentWidth * 0.38
  const colValueWidth = contentWidth * 0.62

  let y = MARGIN

  // En-tête aligné à gauche
  doc.setFont(FONT_VALUE, 'normal')
  doc.setFontSize(11)
  doc.setTextColor(0, 0, 0)
  doc.text('VERSEMENT DU: ' + data.paymentDate, MARGIN, y)
  y += 10

  const tableTop = y

  for (let i = 0; i < ROW_CONFIG.length; i++) {
    const row = ROW_CONFIG[i]
    const raw = data[row.key]
    const value = row.format
      ? row.format(raw as number | string | boolean)
      : String(raw ?? '')

    const rowY = tableTop + i * ROW_HEIGHT_MM

    // Bordure et fond colonne label
    doc.setFillColor(...hexToRgb(row.bgHex))
    doc.rect(MARGIN, rowY, colLabelWidth, ROW_HEIGHT_MM, 'FD')
    doc.setDrawColor(...BORDER_COLOR)
    doc.setLineWidth(BORDER_LINE_WIDTH)
    doc.rect(MARGIN, rowY, colLabelWidth, ROW_HEIGHT_MM, 'S')

    // Bordure et fond colonne valeur (blanc)
    doc.setFillColor(255, 255, 255)
    doc.rect(MARGIN + colLabelWidth, rowY, colValueWidth, ROW_HEIGHT_MM, 'FD')
    doc.rect(MARGIN + colLabelWidth, rowY, colValueWidth, ROW_HEIGHT_MM, 'S')

    // Texte label (MAJUSCULES, italique, serif, semi-bold, centré)
    doc.setFont(FONT_LABEL, 'italic')
    doc.setFontSize(9)
    doc.setTextColor(0, 0, 0)
    doc.text(row.label, MARGIN + colLabelWidth / 2, rowY + ROW_HEIGHT_MM / 2 + 1.5, { align: 'center' })

    // Texte valeur (gris #777, centré)
    doc.setFont(FONT_VALUE, 'normal')
    doc.setFontSize(9)
    doc.setTextColor(119, 119, 119)
    const valueStr = String(value)
    doc.text(valueStr.length > 35 ? valueStr.slice(0, 32) + '…' : valueStr, MARGIN + colLabelWidth + colValueWidth / 2, rowY + ROW_HEIGHT_MM / 2 + 1.5, { align: 'center' })
  }

  // Bordure externe du tableau
  const tableHeight = ROW_CONFIG.length * ROW_HEIGHT_MM
  doc.setDrawColor(...BORDER_COLOR)
  doc.setLineWidth(BORDER_LINE_WIDTH)
  doc.rect(MARGIN, tableTop, contentWidth, tableHeight, 'S')

  const dateStr = new Date().toISOString().split('T')[0]
  doc.save(`versement_facture_${data.paymentDate.replace(/-/g, '')}_${dateStr}.pdf`)
}
