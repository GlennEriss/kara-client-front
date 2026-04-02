/**
 * Génération du PDF "VERSEMENT" (facture) Crédit Spéciale.
 * - Page 1 : identique au PDF caisse imprévue (logo, titre, infos membre, contact urgence).
 * - Page 2 : tableau VERSEMENT (blanc + bleu léger, même style que la page 1).
 */
import type { FactureCreditSpecialPDFData } from '@/components/credit-speciale/FactureCreditSpecialPDF'
import jsPDF from 'jspdf'

/** Données pour la page 1 (infos membre + contact urgence), comme le PDF caisse imprévue */
export interface FactureCreditSpecialPage1Data {
  contractId: string
  /** Matricule ou id client */
  memberMatricule: string
  memberLastName: string
  memberFirstName: string
  memberBirthPlace: string
  memberBirthDateFormatted: string
  memberNationality: string
  memberIdDocument: string
  memberPhone1: string
  memberPhone2: string
  memberGender: string
  memberAge: string
  memberQuarter: string
  memberProfession: string
  emergencyName: string
  emergencyRelation: string
  emergencyPhone1: string
  emergencyPhone2: string
  emergencyId: string
}

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

const BASE_ROW_CONFIG: Array<{
  key: keyof FactureCreditSpecialPDFData
  label: string
  format?: (v: number | string | boolean) => string
}> = [
  { key: 'capital', label: 'CAPITAL', format: formatAmount },
  { key: 'taux', label: 'TAUX', format: formatTaux },
  { key: 'interets', label: 'INTERETS', format: formatAmount },
  { key: 'montantGlobal', label: 'MONTANT GLOBAL', format: formatAmount },
  { key: 'dateEcheance', label: 'DATE ECHEANCE' },
  { key: 'dateRemise', label: 'DATE REMISE' },
  { key: 'heureRemise', label: 'HEURE REMISE' },
  { key: 'moyen', label: 'MOYEN' },
  { key: 'frais', label: 'FRAIS', format: formatFrais },
  { key: 'montantRemis', label: 'MONTANT REMIS', format: formatAmount },
  { key: 'penalite', label: 'PENALITE', format: formatAmount },
  { key: 'remarque', label: 'REMARQUE' },
  { key: 'note', label: 'NOTE' },
  { key: 'nouveauCapital2', label: 'NOUVEAU CAPITAL', format: formatAmount },
  { key: 'capitalMoisProchain', label: 'CAPITAL MOIS PROCHAIN', format: formatAmount },
]

const getRowConfig = (data: FactureCreditSpecialPDFData) =>
  BASE_ROW_CONFIG.filter((row) => {
    if (!data.isFixedExtensionMonth) return true
    return !['capital', 'taux', 'interets'].includes(String(row.key))
  })

const ROW_HEIGHT_MM = 11
const BORDER_LINE_WIDTH = 0.25
const BORDER_COLOR = [180, 180, 180] as const
const MARGIN = 15
const MARGIN_X = 14
const FONT_LABEL = 'times'
const FONT_VALUE = 'helvetica'

/** Bleu léger pour les en-têtes et labels (aligné page 1 caisse imprévue) */
const HEADER_FILL = [236, 242, 248] as [number, number, number]
const LABEL_FILL = [236, 242, 248] as [number, number, number]
const LINE_COLOR = [24, 24, 24] as [number, number, number]
const NAVY = [21, 62, 96] as [number, number, number]
const PAGE_FILL = [247, 249, 252] as [number, number, number]

async function loadLogoDataUrl(): Promise<{ dataUrl: string; width: number; height: number } | null> {
  try {
    const response = await fetch('/assets/caisse-imprevue/image1.png')
    if (!response.ok) return null
    const blob = await response.blob()
    const dataUrl = await new Promise<string | null>((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null)
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(blob)
    })
    if (!dataUrl) return null
    const dimensions = await new Promise<{ width: number; height: number } | null>((resolve) => {
      const img = new window.Image()
      img.onload = () =>
        img.naturalWidth && img.naturalHeight ? resolve({ width: img.naturalWidth, height: img.naturalHeight }) : resolve(null)
      img.onerror = () => resolve(null)
      img.src = dataUrl
    })
    if (!dimensions) return null
    return { dataUrl, width: dimensions.width, height: dimensions.height }
  } catch {
    return null
  }
}

function drawPage1(
  doc: jsPDF,
  page1Data: FactureCreditSpecialPage1Data,
  logoDataUrl: { dataUrl: string; width: number; height: number } | null,
  pageNumber: number = 1,
  totalPages: number = 2
): void {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const contentWidth = pageWidth - MARGIN_X * 2

  doc.setFillColor(...PAGE_FILL)
  doc.rect(0, 0, pageWidth, pageHeight, 'F')
  doc.setDrawColor(...NAVY)
  doc.setLineWidth(0.7)
  doc.rect(8, 8, pageWidth - 16, pageHeight - 16)

  if (logoDataUrl) {
    const maxLogoWidth = 34
    const maxLogoHeight = 18
    const ratio = logoDataUrl.width / logoDataUrl.height
    let logoWidth = maxLogoWidth
    let logoHeight = logoWidth / ratio
    if (logoHeight > maxLogoHeight) {
      logoHeight = maxLogoHeight
      logoWidth = logoHeight * ratio
    }
    const logoY = 10 + (maxLogoHeight - logoHeight) / 2
    doc.addImage(logoDataUrl.dataUrl, 'PNG', MARGIN_X, logoY, logoWidth, logoHeight)
  }

  doc.setFont(FONT_LABEL, 'bold')
  doc.setFontSize(15)
  doc.setTextColor(...NAVY)
  doc.text('HISTORIQUE VERSEMENT CREDIT SPECIALE', pageWidth / 2, 18, { align: 'center' })
  doc.setFontSize(10)
  doc.setTextColor(45, 45, 45)
  doc.text(`Contrat : ${page1Data.contractId}`, pageWidth / 2, 23, { align: 'center' })

  const drawSectionTitle = (title: string, y: number) => {
    doc.setFillColor(...HEADER_FILL)
    doc.setDrawColor(...LINE_COLOR)
    doc.setLineWidth(0.2)
    doc.rect(MARGIN_X, y, contentWidth, 8, 'FD')
    doc.setFont(FONT_LABEL, 'bold')
    doc.setFontSize(10.5)
    doc.setTextColor(...NAVY)
    doc.text(title, pageWidth / 2, y + 5.6, { align: 'center' })
  }

  const drawGridRows = (
    rows: Array<{ leftLabel: string; leftValue: string; rightLabel: string; rightValue: string }>,
    startY: number,
    opts?: { leftLabelWidth?: number; rightLabelWidth?: number }
  ) => {
    const rowHeight = 8
    const halfWidth = contentWidth / 2
    const leftLabelWidth = opts?.leftLabelWidth ?? 33
    const rightLabelWidth = opts?.rightLabelWidth ?? 33
    const totalHeight = rows.length * rowHeight
    doc.setDrawColor(...LINE_COLOR)
    doc.setLineWidth(0.2)
    doc.rect(MARGIN_X, startY, contentWidth, totalHeight)
    doc.line(MARGIN_X + halfWidth, startY, MARGIN_X + halfWidth, startY + totalHeight)
    doc.line(MARGIN_X + leftLabelWidth, startY, MARGIN_X + leftLabelWidth, startY + totalHeight)
    doc.line(MARGIN_X + halfWidth + rightLabelWidth, startY, MARGIN_X + halfWidth + rightLabelWidth, startY + totalHeight)
    rows.forEach((row, index) => {
      const y = startY + index * rowHeight
      if (index > 0) doc.line(MARGIN_X, y, MARGIN_X + contentWidth, y)
      doc.setFont(FONT_LABEL, 'bold')
      doc.setFontSize(9.2)
      doc.setTextColor(35, 35, 35)
      doc.text(row.leftLabel, MARGIN_X + 2, y + 5.3)
      doc.text(row.rightLabel, MARGIN_X + halfWidth + 2, y + 5.3)
      doc.setFont(FONT_LABEL, 'normal')
      doc.setFontSize(9.2)
      doc.setTextColor(15, 15, 15)
      doc.text(row.leftValue, MARGIN_X + leftLabelWidth + 2, y + 5.3)
      doc.text(row.rightValue, MARGIN_X + halfWidth + rightLabelWidth + 2, y + 5.3)
    })
    return startY + totalHeight
  }

  drawSectionTitle('Informations Personnelles du Membre', 30)
  let yCursor = 38.2
  yCursor = drawGridRows(
    [
      { leftLabel: 'MATRICULE', leftValue: page1Data.memberMatricule, rightLabel: 'ANNEE', rightValue: String(new Date().getFullYear()) },
      { leftLabel: 'MEMBRE', leftValue: 'INDIVIDUEL', rightLabel: 'CODE', rightValue: page1Data.contractId.slice(0, 16) },
      { leftLabel: 'NOM', leftValue: page1Data.memberLastName, rightLabel: 'PRENOM', rightValue: page1Data.memberFirstName },
      { leftLabel: 'LIEU / NAISSANCE', leftValue: page1Data.memberBirthPlace, rightLabel: 'D.NAISS', rightValue: page1Data.memberBirthDateFormatted },
      { leftLabel: 'NATIONALITE', leftValue: page1Data.memberNationality, rightLabel: 'N°CNI / PASS / CS', rightValue: page1Data.memberIdDocument },
      { leftLabel: 'TELEPHONE 1', leftValue: page1Data.memberPhone1, rightLabel: 'TELEPHONE 2', rightValue: page1Data.memberPhone2 },
      { leftLabel: 'SEXE', leftValue: page1Data.memberGender, rightLabel: 'AGE', rightValue: page1Data.memberAge },
      { leftLabel: 'QUARTIER', leftValue: page1Data.memberQuarter, rightLabel: 'PROFESSION', rightValue: page1Data.memberProfession },
    ],
    yCursor
  )
  drawSectionTitle('Informations Concernant Le Contact Urgent', yCursor + 9)
  drawGridRows(
    [
      { leftLabel: 'NOM', leftValue: page1Data.emergencyName, rightLabel: 'LIEN', rightValue: page1Data.emergencyRelation },
      { leftLabel: 'TELEPHONE 1', leftValue: page1Data.emergencyPhone1, rightLabel: 'TELEPHONE 2', rightValue: page1Data.emergencyPhone2 },
      { leftLabel: 'N°CNI / PASS / CS', leftValue: page1Data.emergencyId, rightLabel: '', rightValue: '' },
    ],
    yCursor + 17.2
  )

  doc.setFont(FONT_LABEL, 'italic')
  doc.setFontSize(8.5)
  doc.setTextColor(90, 90, 90)
  doc.text(
    `Page ${pageNumber} sur ${totalPages} - Généré le ${new Date().toLocaleDateString('fr-FR')}`,
    pageWidth / 2,
    pageHeight - 9,
    { align: 'center' }
  )
}

function drawPage2(
  doc: jsPDF,
  data: FactureCreditSpecialPDFData,
  titleText?: string,
  pageNumber: number = 2,
  totalPages: number = 2
): void {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const contentWidth = pageWidth - 2 * MARGIN
  const colLabelWidth = contentWidth * 0.38
  const colValueWidth = contentWidth * 0.62

  doc.setFillColor(...PAGE_FILL)
  doc.rect(0, 0, pageWidth, pageHeight, 'F')
  doc.setDrawColor(...NAVY)
  doc.setLineWidth(0.7)
  doc.rect(8, 8, pageWidth - 16, pageHeight - 16)

  let y = MARGIN
  const rowConfig = getRowConfig(data)

  doc.setFont(FONT_LABEL, 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...NAVY)
  doc.text('VERSEMENT DU: ' + (titleText ?? data.paymentDate), MARGIN, y)
  y += 10

  const tableTop = y

  for (let i = 0; i < rowConfig.length; i++) {
    const row = rowConfig[i]
    const raw = data[row.key]
    const effectiveRaw = (row.key === 'capitalMoisProchain' && (raw === undefined || raw === null)) ? 0 : raw
    const value = row.format
      ? row.format(effectiveRaw as number | string | boolean)
      : String(effectiveRaw ?? '')

    const rowY = tableTop + i * ROW_HEIGHT_MM

    doc.setFillColor(...LABEL_FILL)
    doc.rect(MARGIN, rowY, colLabelWidth, ROW_HEIGHT_MM, 'FD')
    doc.setDrawColor(...NAVY)
    doc.setLineWidth(BORDER_LINE_WIDTH)
    doc.rect(MARGIN, rowY, colLabelWidth, ROW_HEIGHT_MM, 'S')

    doc.setFillColor(255, 255, 255)
    doc.rect(MARGIN + colLabelWidth, rowY, colValueWidth, ROW_HEIGHT_MM, 'FD')
    doc.setDrawColor(...NAVY)
    doc.rect(MARGIN + colLabelWidth, rowY, colValueWidth, ROW_HEIGHT_MM, 'S')

    doc.setFont(FONT_LABEL, 'bolditalic')
    doc.setFontSize(9)
    doc.setTextColor(0, 0, 0)
    doc.text(row.label, MARGIN + colLabelWidth / 2, rowY + ROW_HEIGHT_MM / 2 + 1.5, { align: 'center' })

    doc.setFont(FONT_VALUE, 'normal')
    doc.setFontSize(9)
    doc.setTextColor(0, 0, 0)
    const valueStr = String(value)
    doc.text(valueStr.length > 35 ? valueStr.slice(0, 32) + '…' : valueStr, MARGIN + colLabelWidth + colValueWidth / 2, rowY + ROW_HEIGHT_MM / 2 + 1.5, { align: 'center' })
  }

  const tableHeight = rowConfig.length * ROW_HEIGHT_MM
  doc.setDrawColor(...NAVY)
  doc.setLineWidth(BORDER_LINE_WIDTH)
  doc.rect(MARGIN, tableTop, contentWidth, tableHeight, 'S')

  doc.setFont(FONT_LABEL, 'italic')
  doc.setFontSize(8.5)
  doc.setTextColor(90, 90, 90)
  doc.text(
    `Page ${pageNumber} sur ${totalPages} - Généré le ${new Date().toLocaleDateString('fr-FR')}`,
    pageWidth / 2,
    pageHeight - 9,
    { align: 'center' }
  )
}

export type GenerateFactureCreditSpecialPDFOptions = {
  /** Données du tableau VERSEMENT (page 2) */
  factureData: FactureCreditSpecialPDFData
  /** Données pour la page 1 (membre + contact urgence). Si fourni, le PDF fait 2 pages. */
  page1Data?: FactureCreditSpecialPage1Data | null
  /** Titre affiché en haut de la page VERSEMENT. */
  titleText?: string
}

export type GenerateGlobalFactureCreditSpecialPDFOptions = {
  page1Data: FactureCreditSpecialPage1Data | null
  factures: Array<{
    factureData: FactureCreditSpecialPDFData
    /** Titre de la page "VERSEMENT DU:" ; par défaut dateEcheance puis paymentDate */
    titleDate?: string
  }>
  outputMode?: 'save' | 'open'
  filename?: string
  targetWindow?: Window | null
}

/**
 * Génère et télécharge le PDF facture Crédit Spéciale.
 * - Si page1Data est fourni : page 1 = infos membre + contact urgence (style caisse imprévue), page 2 = tableau VERSEMENT (blanc + bleu léger).
 * - Sinon : une seule page avec le tableau VERSEMENT (blanc + bleu léger).
 */
export async function generateFactureCreditSpecialPDF(
  options: GenerateFactureCreditSpecialPDFOptions | FactureCreditSpecialPDFData
): Promise<void> {
  const isLegacyCall = 'paymentDate' in options && 'capital' in options
  const factureData: FactureCreditSpecialPDFData = isLegacyCall
    ? (options as FactureCreditSpecialPDFData)
    : (options as GenerateFactureCreditSpecialPDFOptions).factureData
  const page1Data = !isLegacyCall ? (options as GenerateFactureCreditSpecialPDFOptions).page1Data : null
  const titleText = !isLegacyCall ? (options as GenerateFactureCreditSpecialPDFOptions).titleText : undefined

  const doc = new jsPDF('p', 'mm', 'a4')

  if (page1Data) {
    const logoDataUrl = await loadLogoDataUrl()
    drawPage1(doc, page1Data, logoDataUrl)
    doc.addPage()
  }

  drawPage2(doc, factureData, titleText)

  const dateStr = new Date().toISOString().split('T')[0]
  doc.save(`versement_facture_${factureData.paymentDate.replace(/-/g, '')}_${dateStr}.pdf`)
}

export async function generateGlobalFactureCreditSpecialPDF(
  options: GenerateGlobalFactureCreditSpecialPDFOptions
): Promise<void> {
  const { page1Data, factures, outputMode = 'open', filename, targetWindow } = options
  if (!factures.length) {
    throw new Error('Aucune facture à générer')
  }

  const doc = new jsPDF('p', 'mm', 'a4')
  const totalPages = (page1Data ? 1 : 0) + factures.length
  const logoDataUrl = page1Data ? await loadLogoDataUrl() : null

  if (page1Data) {
    drawPage1(doc, page1Data, logoDataUrl, 1, totalPages)
  }

  factures.forEach((entry, index) => {
    if (page1Data || index > 0) {
      doc.addPage()
    }
    const titleDate = entry.titleDate ?? entry.factureData.dateEcheance ?? entry.factureData.paymentDate
    drawPage2(doc, entry.factureData, titleDate, (page1Data ? 2 : 1) + index, totalPages)
  })

  if (outputMode === 'open' && typeof window !== 'undefined') {
    const blobUrl = String(doc.output('bloburl'))
    if (targetWindow && !targetWindow.closed) {
      targetWindow.location.href = blobUrl
      return
    }
    const opened = window.open(blobUrl, '_blank', 'noopener,noreferrer')
    if (opened) {
      return
    }
  }

  const dateStr = new Date().toISOString().split('T')[0]
  const outputFilename = filename || `facture_globale_credit_speciale_${dateStr}.pdf`
  doc.save(outputFilename)
}
