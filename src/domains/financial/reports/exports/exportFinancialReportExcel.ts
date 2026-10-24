import type { Borders, Fill, Font, Row, Workbook, Worksheet } from 'exceljs'
import { FINANCIAL_REPORT_GUIDE } from '../entities/financial-report-guide'
import type { FinancialReport, FinancialReportLine } from '../entities/financial-report.types'
import { REPORT_MINIMAL_LEGEND, type ReportTextLevel } from './export-options'
import { reportFileName, reportPeriodLabel, reportTitle, TOTAL_COLUMN_LABEL } from './report-format'

const BRAND = 'FF234D65'
const BAND = 'FFEEF2F6'
const SUBTOTAL = 'FFF1F5F9'
const TOTAL = 'FFE2E8F0'
const GRID = 'FFE2E8F0'
const MUTED = 'FF64748B'
const AMOUNT_FORMAT = '#,##0;[Red]-#,##0'
const COUNT_FORMAT = '#,##0'

const solid = (argb: string): Fill => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } })
const thin = { style: 'thin' as const, color: { argb: GRID } }
const GRID_BORDERS: Partial<Borders> = { top: thin, left: thin, bottom: thin, right: thin }

/** Feuille Excel : 31 caractères au plus, sans `: \ / ? * [ ]`. */
const sheetName = (title: string) => title.replace(/[:\\/?*[\]]/g, ' ').slice(0, 31)

/** Excel n'ajuste pas à l'ouverture la hauteur d'une ligne dont le texte passe à la ligne. */
const wrappedHeight = (text: string, columnWidth: number) => Math.max(15, Math.ceil(text.length / (columnWidth * 1.1)) * 13)

const lineLabel = (line: FinancialReportLine) =>
  line.kind === 'stock' && line.level !== 'info' ? `${line.label} (fin de mois)` : line.label

function styleRow(row: Row, fromColumn: number, toColumn: number, style: { font?: Partial<Font>; fill?: Fill; border?: boolean }) {
  for (let column = fromColumn; column <= toColumn; column++) {
    const cell = row.getCell(column)
    if (style.font) cell.font = { ...cell.font, ...style.font }
    if (style.fill) cell.fill = style.fill
    if (style.border) cell.border = GRID_BORDERS
  }
}

function addGuideSheet(workbook: Workbook, report: FinancialReport, generatedOn: string) {
  const sheet = workbook.addWorksheet('Mode d’emploi', { properties: { tabColor: { argb: BRAND } } })
  sheet.columns = [{ width: 30 }, { width: 110 }]
  sheet.addRow([`${reportTitle(report)} — mode d’emploi`]).font = { bold: true, size: 14, color: { argb: BRAND } }
  sheet.addRow([`Période : ${reportPeriodLabel(report)} · montants en FCFA · généré le ${generatedOn}`]).font = { color: { argb: MUTED } }
  sheet.addRow([])
  for (const entry of FINANCIAL_REPORT_GUIDE) {
    const row = sheet.addRow([entry.title, entry.text])
    row.getCell(1).font = { bold: true }
    row.getCell(2).alignment = { wrapText: true, vertical: 'top' }
    row.getCell(1).alignment = { vertical: 'top' }
    row.height = wrappedHeight(entry.text, 110)
  }
  sheet.addRow([])
  sheet.addRow(['Onglets du bilan']).font = { bold: true, color: { argb: BRAND } }
  for (const module of report.modules) {
    const row = sheet.addRow([module.title, module.description])
    row.getCell(1).font = { bold: true }
    row.getCell(2).alignment = { wrapText: true, vertical: 'top' }
  }
}

function addModuleSheet(workbook: Workbook, report: FinancialReport, moduleIndex: number, textLevel: ReportTextLevel, generatedOn: string) {
  const module = report.modules[moduleIndex]
  const withExplanations = textLevel === 'full'
  const withDescriptions = textLevel !== 'none'
  const firstMonthColumn = 2
  const lastMonthColumn = report.months.length + 1
  const totalColumn = lastMonthColumn + 1
  const lastColumn = withExplanations ? totalColumn + 1 : totalColumn

  const sheet: Worksheet = workbook.addWorksheet(sheetName(module.title), {
    pageSetup: {
      paperSize: 9,
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 },
    },
    headerFooter: { oddFooter: `&L${module.title}&RPage &P / &N` },
  })
  sheet.columns = [
    { width: 48 },
    ...report.months.map(() => ({ width: 13 })),
    { width: 15 },
    ...(withExplanations ? [{ width: 70 }] : []),
  ]

  sheet.addRow([`${reportTitle(report)} — ${module.title}`]).font = { bold: true, size: 14, color: { argb: BRAND } }
  sheet.addRow([`Période : ${reportPeriodLabel(report)} · montants en FCFA · généré le ${generatedOn}`]).font = { color: { argb: MUTED } }
  if (withDescriptions) sheet.addRow([module.description]).font = { italic: true, color: { argb: MUTED } }
  if (textLevel === 'minimal') sheet.addRow([REPORT_MINIMAL_LEGEND]).font = { italic: true, size: 9, color: { argb: MUTED } }
  sheet.addRow([])

  // Un seul en-tête, figé avec la colonne des libellés et répété à l'impression.
  const header = sheet.addRow(['Libellé', ...report.monthLabels, TOTAL_COLUMN_LABEL, ...(withExplanations ? ['Explication'] : [])])
  styleRow(header, 1, lastColumn, { font: { bold: true, color: { argb: 'FFFFFFFF' } }, fill: solid(BRAND), border: true })
  header.eachCell((cell, column) => {
    cell.alignment = { horizontal: column === 1 || column > totalColumn ? 'left' : 'center', vertical: 'middle' }
  })
  header.height = 20
  sheet.views = [{ state: 'frozen', xSplit: 1, ySplit: header.number }]
  sheet.pageSetup.printTitlesRow = `${header.number}:${header.number}`

  const lastMonthLetter = sheet.getColumn(lastMonthColumn).letter
  const firstMonthLetter = sheet.getColumn(firstMonthColumn).letter

  for (const block of module.blocks) {
    const title = sheet.addRow([block.title.toUpperCase()])
    styleRow(title, 1, lastColumn, { font: { bold: true, color: { argb: BRAND } }, fill: solid(BAND) })
    title.height = 18
    if (withDescriptions) sheet.addRow([block.description]).font = { italic: true, size: 9, color: { argb: MUTED } }

    for (const line of block.lines) {
      const row = sheet.addRow([lineLabel(line), ...line.values, null, ...(withExplanations ? [line.description] : [])])
      // Total en formule : la somme des mois, ou la valeur du dernier mois pour une ligne « fin de mois ».
      row.getCell(totalColumn).value = {
        formula: line.kind === 'flow' ? `SUM(${firstMonthLetter}${row.number}:${lastMonthLetter}${row.number})` : `${lastMonthLetter}${row.number}`,
        result: line.total,
      }
      for (let column = firstMonthColumn; column <= totalColumn; column++) {
        row.getCell(column).numFmt = line.unit === 'count' ? COUNT_FORMAT : AMOUNT_FORMAT
      }
      row.getCell(totalColumn).font = { bold: true }
      styleRow(row, 1, lastColumn, { border: true })
      row.getCell(1).alignment = { wrapText: true, vertical: 'top' }
      if (line.level === 'subtotal') styleRow(row, 1, totalColumn, { font: { bold: true }, fill: solid(SUBTOTAL) })
      if (line.level === 'total') styleRow(row, 1, totalColumn, { font: { bold: true }, fill: solid(TOTAL) })
      if (line.level === 'info') styleRow(row, 1, totalColumn, { font: { italic: true, color: { argb: MUTED } } })
      let height = wrappedHeight(lineLabel(line), 48)
      if (withExplanations) {
        const explanation = row.getCell(totalColumn + 1)
        explanation.alignment = { wrapText: true, vertical: 'top' }
        explanation.font = { size: 9, color: { argb: MUTED } }
        height = Math.max(height, wrappedHeight(line.description, 70 * 1.15))
      }
      row.height = height
    }
    sheet.addRow([])
  }

  if (withExplanations && module.notes.length > 0) {
    sheet.addRow(['Bases de calcul']).font = { bold: true, color: { argb: BRAND } }
    const width = 48 + report.months.length * 13 + 15
    for (const note of module.notes) {
      const row = sheet.addRow([`• ${note}`])
      sheet.mergeCells(row.number, 1, row.number, totalColumn)
      row.getCell(1).alignment = { wrapText: true, vertical: 'top' }
      row.getCell(1).font = { size: 9, color: { argb: MUTED } }
      row.height = wrappedHeight(note, width)
    }
  }
}

/** Classeur du bilan : mis en forme, totaux en formules, prêt à imprimer. */
export async function buildFinancialReportWorkbook(report: FinancialReport, textLevel: ReportTextLevel = 'full'): Promise<Workbook> {
  const ExcelJS = await import('exceljs')
  const WorkbookClass = ExcelJS.Workbook ?? (ExcelJS as unknown as { default: typeof ExcelJS }).default.Workbook
  const workbook = new WorkbookClass()
  const generatedOn = new Date(report.generatedAt).toLocaleDateString('fr-FR')
  workbook.creator = 'LE KARA'
  workbook.created = new Date(report.generatedAt)
  workbook.title = `${reportTitle(report)} ${reportPeriodLabel(report)}`

  if (textLevel === 'full') addGuideSheet(workbook, report, generatedOn)
  report.modules.forEach((_, index) => addModuleSheet(workbook, report, index, textLevel, generatedOn))
  return workbook
}

/** Télécharge le bilan au format Excel. */
export async function exportFinancialReportExcel(report: FinancialReport, textLevel: ReportTextLevel = 'full'): Promise<void> {
  const workbook = await buildFinancialReportWorkbook(report, textLevel)
  const buffer = await workbook.xlsx.writeBuffer()
  const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  const link = document.createElement('a')
  link.href = url
  link.download = reportFileName(report, 'xlsx')
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
