import type { FinancialReport } from '../entities/financial-report.types'
import { formatReportNumber, reportFileName, reportPeriodLabel, TOTAL_COLUMN_LABEL } from './report-format'

const BRAND: [number, number, number] = [35, 77, 101]

/** PDF paysage : un chapitre par module, un tableau par bloc. */
export async function exportFinancialReportPdf(report: FinancialReport): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 12
  const columns = report.months.length + 2
  const fontSize = columns <= 8 ? 8 : columns <= 14 ? 6.5 : 5.2
  const generatedOn = new Date(report.generatedAt).toLocaleDateString('fr-FR')

  report.modules.forEach((module, moduleIndex) => {
    if (moduleIndex > 0) doc.addPage()
    doc.setFont('times', 'bold')
    doc.setFontSize(15)
    doc.setTextColor(...BRAND)
    doc.text(`Bilan financier — ${module.title}`, margin, 15)
    doc.setFont('times', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(75, 85, 99)
    doc.text(`Période : ${reportPeriodLabel(report)} · généré le ${generatedOn}`, margin, 21)
    doc.text(module.description, margin, 26)
    let cursorY = 31

    for (const block of module.blocks) {
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
        styles: { font: 'times', fontSize, cellPadding: 1.2, lineColor: [226, 232, 240], lineWidth: 0.15, textColor: [30, 41, 59], halign: 'right' },
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

    if (module.notes.length > 0) {
      if (cursorY > pageHeight - 30) {
        doc.addPage()
        cursorY = 18
      }
      doc.setFont('times', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(30, 41, 59)
      doc.text('Bases de calcul', margin, cursorY)
      doc.setFont('times', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(75, 85, 99)
      cursorY += 4
      for (const note of module.notes) {
        const wrapped = doc.splitTextToSize(`• ${note}`, pageWidth - margin * 2) as string[]
        if (cursorY + wrapped.length * 3.6 > pageHeight - 14) {
          doc.addPage()
          cursorY = 18
        }
        doc.text(wrapped, margin, cursorY)
        cursorY += wrapped.length * 3.6 + 1
      }
    }
  })

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
