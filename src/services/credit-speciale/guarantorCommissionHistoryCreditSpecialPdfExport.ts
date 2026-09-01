import type jsPDF from 'jspdf'
import {
  FactureCreditSpecialPage1Data,
  drawFactureCreditSpecialPage1,
  loadFactureCreditSpecialLogoDataUrl,
} from './factureCreditSpecialPdfExport'

export interface CreditSpecialGuarantorCommissionHistoryRow {
  monthLabel: string
  remainingAmount: number
  commissionPercentage: number
  commissionAmount: number
}

export interface GenerateCreditSpecialGuarantorCommissionHistoryPDFOptions {
  contractId: string
  page1Data: FactureCreditSpecialPage1Data
  rows: CreditSpecialGuarantorCommissionHistoryRow[]
  totalCommissions: number
  outputMode?: 'save' | 'open'
  filename?: string
  targetWindow?: Window | null
}

const NAVY = [21, 62, 96] as const
const PAGE_FILL = [247, 249, 252] as const
const HEADER_FILL = [236, 242, 248] as const

const formatAmount = (value: number) =>
  Math.round(value)
    .toLocaleString('fr-FR')
    .replace(/\s/g, ' ')

const drawCommissionTablePage = (
  doc: jsPDF,
  contractId: string,
  rows: CreditSpecialGuarantorCommissionHistoryRow[],
  totalCommissions: number,
  pageNumber: number,
  totalPages: number,
  isLastPage: boolean
) => {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const marginX = 12
  const contentWidth = pageWidth - marginX * 2
  const col1Width = contentWidth * 0.2
  const col2Width = contentWidth * 0.28
  const col3Width = contentWidth * 0.2
  const col4Width = contentWidth * 0.32
  const rowHeight = 9

  doc.setFillColor(...PAGE_FILL)
  doc.rect(0, 0, pageWidth, pageHeight, 'F')
  doc.setDrawColor(...NAVY)
  doc.setLineWidth(0.7)
  doc.rect(8, 8, pageWidth - 16, pageHeight - 16)

  doc.setFont('times', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...NAVY)
  doc.text('COMMISSIONS DU GARANT', pageWidth / 2, 18, { align: 'center' })
  doc.setFontSize(10)
  doc.setTextColor(45, 45, 45)
  doc.text(`Contrat : ${contractId}`, pageWidth / 2, 23, { align: 'center' })

  let y = 32

  doc.setFont('times', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(60, 60, 60)
  doc.text(
    'Ce tableau récapitule les commissions dues au garant pour les échéances éligibles.',
    marginX,
    y
  )
  y += 8

  doc.setFillColor(...HEADER_FILL)
  doc.setDrawColor(...NAVY)
  doc.setLineWidth(0.25)
  doc.rect(marginX, y, col1Width, rowHeight, 'FD')
  doc.rect(marginX + col1Width, y, col2Width, rowHeight, 'FD')
  doc.rect(marginX + col1Width + col2Width, y, col3Width, rowHeight, 'FD')
  doc.rect(marginX + col1Width + col2Width + col3Width, y, col4Width, rowHeight, 'FD')
  doc.setFont('times', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(...NAVY)
  doc.text('MOIS', marginX + col1Width / 2, y + 5.8, { align: 'center' })
  doc.text('RESTE DU (FCFA)', marginX + col1Width + col2Width / 2, y + 5.8, { align: 'center' })
  doc.text('% COMM.', marginX + col1Width + col2Width + col3Width / 2, y + 5.8, { align: 'center' })
  doc.text('SOMME DUE (FCFA)', marginX + col1Width + col2Width + col3Width + col4Width / 2, y + 5.8, { align: 'center' })
  y += rowHeight

  rows.forEach((row) => {
    doc.setDrawColor(...NAVY)
    doc.setLineWidth(0.2)
    doc.rect(marginX, y, col1Width, rowHeight)
    doc.rect(marginX + col1Width, y, col2Width, rowHeight)
    doc.rect(marginX + col1Width + col2Width, y, col3Width, rowHeight)
    doc.rect(marginX + col1Width + col2Width + col3Width, y, col4Width, rowHeight)

    doc.setFont('times', 'normal')
    doc.setFontSize(9.2)
    doc.setTextColor(20, 20, 20)
    doc.text(row.monthLabel, marginX + 2, y + 5.8)
    doc.text(formatAmount(row.remainingAmount), marginX + col1Width + col2Width - 2, y + 5.8, { align: 'right' })
    doc.text(`${row.commissionPercentage}%`, marginX + col1Width + col2Width + col3Width - 2, y + 5.8, { align: 'right' })
    doc.text(formatAmount(row.commissionAmount), marginX + col1Width + col2Width + col3Width + col4Width - 2, y + 5.8, { align: 'right' })
    y += rowHeight
  })

  if (isLastPage) {
    y += 3
    const totalLabelWidth = col1Width + col2Width + col3Width
    doc.setFillColor(230, 239, 246)
    doc.rect(marginX, y, totalLabelWidth, rowHeight + 1, 'FD')
    doc.rect(marginX + totalLabelWidth, y, col4Width, rowHeight + 1, 'FD')
    doc.setDrawColor(...NAVY)
    doc.rect(marginX, y, totalLabelWidth, rowHeight + 1)
    doc.rect(marginX + totalLabelWidth, y, col4Width, rowHeight + 1)
    doc.setFont('times', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...NAVY)
    doc.text('TOTAL DES COMMISSIONS', marginX + 3, y + 6.2)
    doc.text(formatAmount(totalCommissions), marginX + totalLabelWidth + col4Width - 2, y + 6.2, { align: 'right' })
  }

  doc.setFont('times', 'italic')
  doc.setFontSize(8.5)
  doc.setTextColor(90, 90, 90)
  doc.text(
    `Page ${pageNumber} sur ${totalPages} - Généré le ${new Date().toLocaleDateString('fr-FR')}`,
    pageWidth / 2,
    pageHeight - 9,
    { align: 'center' }
  )
}

export async function generateCreditSpecialGuarantorCommissionHistoryPDF(
  options: GenerateCreditSpecialGuarantorCommissionHistoryPDFOptions
): Promise<void> {
  const {
    contractId,
    page1Data,
    rows,
    totalCommissions,
    outputMode = 'open',
    filename,
    targetWindow,
  } = options

  if (!rows.length) {
    throw new Error('Aucune commission du garant à exporter')
  }

  const rowsPerPage = 20
  const chunks = Array.from({ length: Math.ceil(rows.length / rowsPerPage) }, (_, index) =>
    rows.slice(index * rowsPerPage, (index + 1) * rowsPerPage)
  )

  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF('p', 'mm', 'a4')
  const totalPages = 1 + chunks.length
  const logoDataUrl = await loadFactureCreditSpecialLogoDataUrl()

  drawFactureCreditSpecialPage1(
    doc,
    page1Data,
    logoDataUrl,
    1,
    totalPages,
    'HISTORIQUE DES COMMISSIONS DU GARANT'
  )

  chunks.forEach((chunk, index) => {
    doc.addPage()
    drawCommissionTablePage(
      doc,
      contractId,
      chunk,
      totalCommissions,
      index + 2,
      totalPages,
      index === chunks.length - 1
    )
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
  doc.save(filename || `commissions_garant_${contractId}_${dateStr}.pdf`)
}
