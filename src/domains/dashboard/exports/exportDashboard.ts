import type { Workbook, Worksheet } from 'exceljs'
import { dashboardExportMetadata, dashboardOverviewRows, exportLink, fullRankingTitle, rankingValue, rankingValueLabel, type DashboardExportData } from './dashboard-export-model'

const BRAND = 'FF234D65'
const cleanPdf = (value: unknown) => String(value).replace(/[\u00a0\u202f]/g, ' ').replace(/[–—]/g, '-').replace(/’/g, "'")
const fileName = (data: DashboardExportData, ext: string) => `KARA-tableau-de-bord-${data.rankingOnly ? 'classement' : 'section'}-${data.context.generatedAt.slice(0, 10)}.${ext}`

function decorateSheet(sheet: Worksheet, data: DashboardExportData, title: string, description: string, headers: string[], widths: number[]) {
  const metadata = [title, ...dashboardExportMetadata(data), description].filter(Boolean)
  for (const [index, line] of metadata.entries()) {
    const row = sheet.addRow([line])
    sheet.mergeCells(row.number, 1, row.number, headers.length)
    row.font = { name: 'Calibri', size: index === 0 ? 15 : 10, bold: index === 0, color: { argb: BRAND } }
    row.alignment = { wrapText: true, vertical: 'middle' }
    row.height = Math.max(23, Math.ceil(line.length / 120) * 15 + 8)
  }
  sheet.addRow([])
  const header = sheet.addRow(headers)
  header.height = 26
  header.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND } }
    cell.font = { name: 'Calibri', bold: true, color: { argb: 'FFFFFFFF' } }
    cell.alignment = { vertical: 'middle', wrapText: true }
  })
  widths.forEach((width, index) => { sheet.getColumn(index + 1).width = width })
  sheet.views = [{ state: 'frozen', ySplit: header.number }]
  sheet.autoFilter = { from: { row: header.number, column: 1 }, to: { row: header.number, column: headers.length } }
  sheet.pageSetup = { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: `${header.number}:${header.number}` }
}
function styleDataRow(sheet: Worksheet, values: Array<string | number>, index: number) {
  const row = sheet.addRow(values)
  row.font = { name: 'Calibri', size: 11 }
  row.alignment = { wrapText: true, vertical: 'top' }
  row.height = Math.max(25, ...values.map((value, column) => Math.ceil(String(value).length / ((sheet.getColumn(column + 1).width || 20) * 1.1)) * 14 + 8))
  if (index % 2 === 0) row.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } } })
  return row
}
export async function buildDashboardWorkbook(data: DashboardExportData): Promise<Workbook> {
  const ExcelJS = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'LE KARA'
  workbook.created = new Date(data.context.generatedAt)
  if (!data.rankingOnly) {
    const sheet = workbook.addWorksheet('Synthèse')
    decorateSheet(sheet, data, data.context.title, 'Indicateurs de la section, répartitions et explications.', ['Rubrique', 'Indicateur et précisions', 'Valeur', 'Unité'], [28, 88, 24, 16])
    dashboardOverviewRows(data.payload).forEach((values, index) => {
      const row = styleDataRow(sheet, values, index)
      if (typeof values[2] === 'number') row.getCell(3).numFmt = '#,##0.##;[Red]-#,##0.##'
    })
  }
  for (const [index, ranking] of (data.payload.rankings || []).entries()) {
    const sheet = workbook.addWorksheet(`Classement ${index + 1}`)
    decorateSheet(sheet, data, fullRankingTitle(ranking.title), ranking.description || '', ['Rang', 'Nom / Libellé', 'Matricule et précisions', rankingValueLabel(ranking), 'Fiche'], [9, 38, 57, 24, 36])
    ranking.items.forEach((item, rowIndex) => {
      const row = styleDataRow(sheet, [item.rank ?? rowIndex + 1, item.label, item.subLabel || '', rankingValue(item, ranking), ''], rowIndex)
      if (ranking.kind !== 'recent') row.getCell(4).numFmt = '#,##0.##;[Red]-#,##0.##'
      const url = exportLink(item.href, data.context.baseUrl)
      if (url) row.getCell(5).value = { text: 'Voir la fiche', hyperlink: url }
    })
    if (!ranking.items.length) sheet.addRow(['', 'Aucune donnée disponible'])
  }
  return workbook
}

export async function buildDashboardPdf(data: DashboardExportData) {
  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  let first = true
  const chapter = (title: string, description = '') => {
    if (!first) doc.addPage()
    first = false
    doc.setFont('helvetica', 'bold').setFontSize(14).setTextColor(35, 77, 101)
    let y = 16
    for (const line of doc.splitTextToSize(cleanPdf(title), 270) as string[]) { doc.text(line, 12, y); y += 6 }
    doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(75, 85, 99)
    for (const text of [...dashboardExportMetadata(data), description].filter(Boolean)) {
      const lines = doc.splitTextToSize(cleanPdf(text), 270) as string[]
      for (const line of lines) { doc.text(line, 12, y); y += 4 }
    }
    return y + 3
  }
  if (!data.rankingOnly) {
    autoTable(doc, {
      startY: chapter(data.context.title), margin: { top: 18, right: 12, bottom: 15, left: 12 },
      willDrawPage: hook => { if (hook.pageNumber > 1) doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(35, 77, 101).text(cleanPdf(`${data.context.title} - Indicateurs (suite)`), 12, 10) },
      head: [['Rubrique', 'Indicateur et précisions', 'Valeur', 'Unité']],
      body: dashboardOverviewRows(data.payload).map(row => row.map(value => cleanPdf(typeof value === 'number' ? value.toLocaleString('fr-FR') : value))),
      styles: { font: 'helvetica', fontSize: 8, cellPadding: 2.5, overflow: 'linebreak' }, headStyles: { fillColor: [35, 77, 101] },
      columnStyles: { 0: { cellWidth: 42 }, 1: { cellWidth: 170 }, 2: { halign: 'right', cellWidth: 38 }, 3: { cellWidth: 23 } },
    })
  }
  for (const ranking of data.payload.rankings || []) {
    autoTable(doc, {
      startY: chapter(fullRankingTitle(ranking.title), ranking.description),
      margin: { top: 18, right: 12, bottom: 15, left: 12 },
      willDrawPage: hook => { if (hook.pageNumber > 1) doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(35, 77, 101).text(cleanPdf(`${fullRankingTitle(ranking.title)} (suite)`), 12, 10) },
      head: [['Rang', 'Nom / Libellé', 'Matricule et précisions', rankingValueLabel(ranking)]],
      body: ranking.items.length ? ranking.items.map((item, index) => [String(item.rank ?? index + 1), cleanPdf(item.label), cleanPdf(item.subLabel || ''), cleanPdf(typeof rankingValue(item, ranking) === 'number' ? item.value.toLocaleString('fr-FR') : rankingValue(item, ranking))]) : [['', 'Aucune donnée disponible', '', '']],
      styles: { font: 'helvetica', fontSize: 8, cellPadding: 3, overflow: 'linebreak' }, headStyles: { fillColor: [35, 77, 101] },
      columnStyles: { 0: { cellWidth: 14 }, 1: { cellWidth: 80 }, 2: { cellWidth: 137 }, 3: { halign: 'right', cellWidth: 42 } },
    })
  }
  for (let page = 1; page <= doc.getNumberOfPages(); page++) {
    doc.setPage(page).setFontSize(8).setTextColor(100)
    doc.text(`LE KARA - ${page} / ${doc.getNumberOfPages()}`, 285, 202, { align: 'right' })
  }
  return doc
}

export async function exportDashboard(data: DashboardExportData, format: 'pdf' | 'excel') {
  if (format === 'pdf') { (await buildDashboardPdf(data)).save(fileName(data, 'pdf')); return }
  const workbook = await buildDashboardWorkbook(data)
  const buffer = await workbook.xlsx.writeBuffer()
  const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName(data, 'xlsx')
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
