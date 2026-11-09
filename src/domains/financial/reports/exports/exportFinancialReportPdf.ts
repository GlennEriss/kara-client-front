import type { jsPDF as PdfDocument } from 'jspdf'
import type { FinancialContractReport } from '../entities/financial-report-details.types'
import { financialStatusLabel } from '../utils/contract-report'
import { FINANCIAL_REPORT_GUIDE } from '../entities/financial-report-guide'
import type { FinancialReport } from '../entities/financial-report.types'
import { REPORT_MINIMAL_LEGEND, type ReportTextLevel } from './export-options'
import {
  formatReportNumber,
  reportFileName,
  reportPeriodLabel,
  reportTitle,
  TOTAL_COLUMN_LABEL,
} from './report-format'

const BRAND: [number, number, number] = [35, 77, 101]
const TEXT: [number, number, number] = [30, 41, 59]
const MUTED: [number, number, number] = [75, 85, 99]

/**
 * PDF paysage : un chapitre par module, un tableau par partie. Le niveau
 * d'explication ajoute la page « Comment lire ce bilan », la description des
 * parties, l'explication des lignes et les bases de calcul.
 */
export async function buildFinancialReportPdf(
  report: FinancialReport,
  textLevel: ReportTextLevel = 'full',
  contracts: FinancialContractReport[] = [],
): Promise<PdfDocument> {
  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 12
  const textWidth = pageWidth - margin * 2
  // At most six months per table: long reports stay readable on paper.
  const monthChunks = Array.from(
    { length: Math.ceil(report.months.length / 6) },
    (_, chunk) =>
      Array.from(
        { length: Math.min(6, report.months.length - chunk * 6) },
        (_, i) => chunk * 6 + i,
      ),
  )
  const fontSize = 8
  const generatedOn = new Date(report.generatedAt).toLocaleDateString('fr-FR')
  const withExplanations = textLevel === 'full'
  const withDescriptions = textLevel !== 'none'
  let cursorY = 0

  /** Paragraphe replié sur la largeur de la page, avec saut de page si besoin. */
  const paragraph = (
    text: string,
    options: {
      size?: number
      bold?: boolean
      italic?: boolean
      color?: [number, number, number]
      gap?: number
    } = {},
  ) => {
    text = text.replace(/[\u00a0\u202f]/g, ' ').replace(/[—–‑]/g, '-')
    const size = options.size ?? 9
    doc.setFont(
      'times',
      options.bold ? 'bold' : options.italic ? 'italic' : 'normal',
    )
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
    const lines = doc.splitTextToSize(
      text.replace(/[—–‑]/g, '-'),
      textWidth,
    ) as string[]
    doc.text(lines, margin, 15)
    cursorY = 15 + lines.length * 6.3
  }

  if (withExplanations) {
    title(`${reportTitle(report)} — Comment lire ce bilan`)
    paragraph(
      `Période : ${reportPeriodLabel(report)} · généré le ${generatedOn}`,
      { gap: 4 },
    )
    for (const entry of FINANCIAL_REPORT_GUIDE) {
      paragraph(entry.title, { size: 10, bold: true, color: TEXT, gap: 0.5 })
      paragraph(entry.text, { gap: 3 })
    }
    paragraph('Onglets du bilan', {
      size: 10,
      bold: true,
      color: TEXT,
      gap: 0.5,
    })
    for (const module of report.modules)
      paragraph(`• ${module.title} : ${module.description}`, { gap: 1 })
  }

  report.modules.forEach((module, moduleIndex) => {
    if (withExplanations || moduleIndex > 0) doc.addPage()
    title(`${reportTitle(report)} — ${module.title}`)
    paragraph(
      `Période : ${reportPeriodLabel(report)} · généré le ${generatedOn}`,
      { gap: withDescriptions ? 0.5 : 4 },
    )
    if (withDescriptions)
      paragraph(module.description, { gap: textLevel === 'minimal' ? 0.5 : 4 })
    if (textLevel === 'minimal')
      paragraph(REPORT_MINIMAL_LEGEND, { size: 8, italic: true, gap: 4 })

    for (const block of module.blocks) {
      if (withDescriptions)
        paragraph(block.description, { italic: true, gap: 1 })
      for (const monthIndexes of monthChunks) {
        autoTable(doc, {
          startY: cursorY,
          head: [
            [
              monthChunks.length > 1
                ? `${block.title}\n${report.monthLabels[monthIndexes[0]]} - ${report.monthLabels[monthIndexes[monthIndexes.length - 1]]}`
                : block.title,
              ...monthIndexes.map((i) => report.monthLabels[i]),
              monthChunks.length > 1
                ? 'Total / fin\nPériode entière'
                : TOTAL_COLUMN_LABEL,
            ],
          ],
          body: block.lines.map((line) => [
            line.kind === 'stock' && line.level !== 'info'
              ? `${line.label} (fin de mois)`
              : line.label,
            ...monthIndexes.map((i) => formatReportNumber(line.values[i])),
            formatReportNumber(line.total),
          ]),
          theme: 'grid',
          margin: { left: margin, right: margin, bottom: 14 },
          styles: {
            font: 'times',
            fontSize,
            cellPadding: 1.2,
            lineColor: [226, 232, 240],
            lineWidth: 0.15,
            textColor: TEXT,
            halign: 'right',
          },
          headStyles: {
            fillColor: BRAND,
            textColor: 255,
            fontStyle: 'bold',
            halign: 'center',
          },
          columnStyles: {
            0: { halign: 'left', cellWidth: 70 },
          },
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
            const raw =
              data.column.index === 0
                ? null
                : data.column.index <= monthIndexes.length
                  ? line.values[monthIndexes[data.column.index - 1]]
                  : line.total
            if (raw !== null && raw < 0)
              data.cell.styles.textColor = [185, 28, 28]
          },
        })
        cursorY =
          ((doc as unknown as { lastAutoTable?: { finalY: number } })
            .lastAutoTable?.finalY ?? cursorY) + 6
      }
    }

    if (!withExplanations) return
    // Une même ligne peut figurer dans deux parties (pénalités…) : expliquée une fois.
    const explained = new Map<string, string>()
    for (const line of module.blocks.flatMap((block) => block.lines)) {
      if (!explained.has(line.label))
        explained.set(line.label, line.description)
    }
    paragraph('Explication des lignes', {
      size: 10,
      bold: true,
      color: TEXT,
      gap: 1,
    })
    for (const [label, description] of explained)
      paragraph(`• ${label} : ${description}`, { size: 8, gap: 0.8 })

    if (module.notes.length > 0) {
      cursorY += 2
      paragraph('Bases de calcul', {
        size: 10,
        bold: true,
        color: TEXT,
        gap: 1,
      })
      for (const note of module.notes)
        paragraph(`• ${note}`, { size: 8, gap: 0.8 })
    }
  })

  for (const contract of contracts) {
    if (cursorY > 0 || doc.getNumberOfPages() > 1) doc.addPage()
    const firstContractPage = doc.getCurrentPageInfo().pageNumber
    title(`Détail des contrats — ${contract.moduleTitle}`)
    paragraph(
      `${contract.party.name}${contract.party.matricule ? ` · ${contract.party.matricule}` : ''}`,
      { size: 11, bold: true, color: TEXT },
    )
    paragraph(`${contract.sourceKind} : ${contract.sourceLabel}`, {
      bold: true,
      color: TEXT,
    })
    paragraph(
      `${reportPeriodLabel(report)} · Statut actuel : ${financialStatusLabel(contract.status)}`,
    )
    if (contract.relatedParties.length)
      paragraph(
        `Personnes / groupes associés : ${contract.relatedParties.map((p) => p.name).join(', ')}`,
      )
    if (contract.facts.length)
      paragraph(
        contract.facts.map((f) => `${f.label} : ${f.value}`).join(' · '),
        { size: 8 },
      )
    paragraph(
      'Flux : somme des mois. Encours : situation en fin de mois. Les lignes entièrement à zéro sont omises dans cette annexe.',
      { size: 8, italic: true, gap: 3 },
    )
    for (const block of contract.blocks) {
      const lines = block.lines.filter((l) => l.values.some((v) => v !== 0))
      if (!lines.length) continue
      for (const monthIndexes of monthChunks) {
        autoTable(doc, {
          startY: cursorY,
          head: [
            [
              monthChunks.length > 1
                ? `${block.title}\n${report.monthLabels[monthIndexes[0]]} - ${report.monthLabels[monthIndexes[monthIndexes.length - 1]]}`
                : block.title,
              ...monthIndexes.map((i) => report.monthLabels[i]),
              monthChunks.length > 1
                ? 'Total / fin\nPériode entière'
                : TOTAL_COLUMN_LABEL,
            ],
          ],
          body: lines.map((l) => [
            `${l.label}${l.kind === 'stock' ? ' (fin de mois)' : ''}${l.unit === 'count' ? ' (nombre)' : ' (FCFA)'}`,
            ...monthIndexes.map((i) => formatReportNumber(l.values[i])),
            formatReportNumber(l.total),
          ]),
          theme: 'grid',
          pageBreak: 'avoid',
          margin: { left: margin, right: margin, top: 16, bottom: 14 },
          styles: {
            font: 'times',
            fontSize: 7.5,
            cellPadding: 1.2,
            textColor: TEXT,
            halign: 'right',
            lineColor: [226, 232, 240],
            lineWidth: 0.15,
          },
          headStyles: {
            fillColor: BRAND,
            textColor: 255,
            fontStyle: 'bold',
            halign: 'center',
          },
          columnStyles: { 0: { halign: 'left', cellWidth: 70 } },
          didDrawPage: () => {
            if (doc.getCurrentPageInfo().pageNumber !== firstContractPage) {
              doc.setFont('times', 'normal')
              doc.setFontSize(8)
              doc.setTextColor(...MUTED)
              doc.text(
                doc.splitTextToSize(
                  `Suite - ${contract.sourceKind} : ${contract.sourceId} | ${contract.party.name}`,
                  textWidth,
                )[0],
                margin,
                8,
              )
            }
          },
          didParseCell: (data) => {
            if (data.section === 'body' && data.column.index > 0) {
              const line = lines[data.row.index]
              const amount =
                data.column.index <= monthIndexes.length
                  ? line.values[monthIndexes[data.column.index - 1]]
                  : line.total
              if (amount < 0) data.cell.styles.textColor = [185, 28, 28]
            }
            if (
              data.section === 'body' &&
              (lines[data.row.index].level === 'total' ||
                lines[data.row.index].level === 'subtotal')
            ) {
              data.cell.styles.fontStyle = 'bold'
              data.cell.styles.fillColor = [241, 245, 249]
            }
          },
        })
        cursorY =
          ((doc as unknown as { lastAutoTable?: { finalY: number } })
            .lastAutoTable?.finalY ?? cursorY) + 6
      }
    }
  }
  const totalPages = doc.getNumberOfPages()
  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page)
    doc.setFont('times', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(120, 120, 120)
    doc.text(
      `Page ${page} / ${totalPages}`,
      pageWidth - margin,
      pageHeight - 6,
      { align: 'right' },
    )
  }

  return doc
}

export async function exportFinancialReportPdf(
  report: FinancialReport,
  textLevel: ReportTextLevel = 'full',
  contracts: FinancialContractReport[] = [],
): Promise<void> {
  const doc = await buildFinancialReportPdf(report, textLevel, contracts)
  doc.save(reportFileName(report, 'pdf'))
}
