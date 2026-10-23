import { FINANCIAL_REPORT_GUIDE } from '../entities/financial-report-guide'
import type { FinancialReport } from '../entities/financial-report.types'
import { formatReportNumber, reportFileName, reportPeriodLabel, TOTAL_COLUMN_LABEL } from './report-format'

const BRAND: [number, number, number] = [35, 77, 101]
const TEXT: [number, number, number] = [30, 41, 59]
const MUTED: [number, number, number] = [75, 85, 99]

/**
 * PDF paysage : une page « Comment lire ce bilan », puis un chapitre par
 * module (un tableau par partie, l'explication des lignes, les bases de calcul).
 */
export async function exportFinancialReportPdf(report: FinancialReport): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 12
  const textWidth = pageWidth - margin * 2
  const columns = report.months.length + 2
  const fontSize = columns <= 8 ? 8 : columns <= 14 ? 6.5 : 5.2
  const generatedOn = new Date(report.generatedAt).toLocaleDateString('fr-FR')
  let cursorY = 0

  /** Paragraphe replié sur la largeur de la page, avec saut de page si besoin. */
  const paragraph = (text: string, options: { size?: number; bold?: boolean; italic?: boolean; color?: [number, number, number]; gap?: number } = {}) => {
    const size = options.size ?? 9
    doc.setFont('times', options.bold ? 'bold' : options.italic ? 'italic' : 'normal')
    doc.setFontSize(size)
    doc.setTextColor(...(options.color ?? MUTED))
    const lineHeight = size * 0.42
    const lines = doc.splitTextToSize(text, textWidth) as string[]
    if (cursorY + lines.length * lineHeight > pageHeight - 14) {
      doc.addPage()
      cursorY = 16
    }
    doc.text(lines, margin, cursorY)
    cursorY += lines.length * lineHeight + (options.gap ?? 1.5)
  }

  const title = (text: string) => {
    doc.setFont('times', 'bold')
    doc.setFontSize(15)
    doc.setTextColor(...BRAND)
    doc.text(text, margin, 15)
    cursorY = 21
  }

  // Page de lecture.
  title('Bilan financier — Comment lire ce bilan')
  paragraph(`Période : ${reportPeriodLabel(report)} · généré le ${generatedOn}`, { gap: 4 })
  for (const entry of FINANCIAL_REPORT_GUIDE) {
    paragraph(entry.title, { size: 10, bold: true, color: TEXT, gap: 0.5 })
    paragraph(entry.text, { gap: 3 })
  }
  paragraph('Onglets du bilan', { size: 10, bold: true, color: TEXT, gap: 0.5 })
  for (const module of report.modules) paragraph(`• ${module.title} : ${module.description}`, { gap: 1 })

  for (const module of report.modules) {
    doc.addPage()
    title(`Bilan financier — ${module.title}`)
    paragraph(`Période : ${reportPeriodLabel(report)} · généré le ${generatedOn}`, { gap: 0.5 })
    paragraph(module.description, { gap: 4 })

    for (const block of module.blocks) {
      paragraph(block.description, { italic: true, gap: 1 })
      autoTable(doc, {
        startY: cursorY,
        head: [[block.title, ...report.monthLabels, TOTAL_COLUMN_LABEL]],
        body: block.lines.map((line) => [
          line.kind === 'stock' && line.level !== 'info' ? `${line.label} (fin de mois)` : line.label,
          ...line.values.map(formatReportNumber),
          formatReportNumber(line.total),
        ]),
        theme: 'grid',
        margin: { left: margin, right: margin, bottom: 14 },
        styles: { font: 'times', fontSize, cellPadding: 1.2, lineColor: [226, 232, 240], lineWidth: 0.15, textColor: TEXT, halign: 'right' },
        headStyles: { fillColor: BRAND, textColor: 255, fontStyle: 'bold', halign: 'center' },
        columnStyles: { 0: { halign: 'left', cellWidth: columns <= 8 ? 70 : 52 } },
        didParseCell: (data) => {
          if (data.section !== 'body') return
          const line = block.lines[data.row.index]
          if (line.level === 'subtotal') {
            data.cell.styles.fontStyle = 'bold'
            data.cell.styles.fillColor = [241, 245, 249]
          } else if (line.level === 'total') {
            data.cell.styles.fontStyle = 'bold'
            data.cell.styles.fillColor = [226, 232, 240]
          } else if (line.level === 'info') {
            data.cell.styles.fontStyle = 'italic'
            data.cell.styles.textColor = [100, 116, 139]
          }
          const raw = data.column.index === 0 ? null : data.column.index <= line.values.length ? line.values[data.column.index - 1] : line.total
          if (raw !== null && raw < 0) data.cell.styles.textColor = [185, 28, 28]
        },
      })
      cursorY = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? cursorY) + 6
    }

    // Une même ligne peut figurer dans deux parties (pénalités…) : expliquée une fois.
    const explained = new Map<string, string>()
    for (const line of module.blocks.flatMap((block) => block.lines)) {
      if (!explained.has(line.label)) explained.set(line.label, line.description)
    }
    paragraph('Explication des lignes', { size: 10, bold: true, color: TEXT, gap: 1 })
    for (const [label, description] of explained) paragraph(`• ${label} : ${description}`, { size: 8, gap: 0.8 })

    if (module.notes.length > 0) {
      cursorY += 2
      paragraph('Bases de calcul', { size: 10, bold: true, color: TEXT, gap: 1 })
      for (const note of module.notes) paragraph(`• ${note}`, { size: 8, gap: 0.8 })
    }
  }

  const totalPages = doc.getNumberOfPages()
  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page)
    doc.setFont('times', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(120, 120, 120)
    doc.text(`Page ${page} / ${totalPages}`, pageWidth - margin, pageHeight - 6, { align: 'right' })
  }

  doc.save(reportFileName(report, 'pdf'))
}
