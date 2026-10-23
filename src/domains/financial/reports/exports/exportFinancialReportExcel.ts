import { FINANCIAL_REPORT_GUIDE } from '../entities/financial-report-guide'
import type { FinancialReport } from '../entities/financial-report.types'
import { reportFileName, reportPeriodLabel, TOTAL_COLUMN_LABEL } from './report-format'

/** Feuille Excel : 31 caractères au plus, sans `: \ / ? * [ ]`. */
const sheetName = (title: string) => title.replace(/[:\\/?*[\]]/g, ' ').slice(0, 31)

/**
 * Un onglet « Mode d'emploi », puis un onglet par module ; les montants restent
 * des nombres, pour être recalculés dans Excel, et chaque ligne a son explication.
 */
export async function exportFinancialReportExcel(report: FinancialReport): Promise<void> {
  const XLSX = await import('xlsx')
  const workbook = XLSX.utils.book_new()
  const header = ['Libellé', ...report.monthLabels, TOTAL_COLUMN_LABEL, 'Explication']
  const explanationColumn = header.length - 1

  const guide = XLSX.utils.aoa_to_sheet([
    ['BILAN FINANCIER — MODE D’EMPLOI'],
    [`Période : ${reportPeriodLabel(report)}`],
    [`Généré le ${new Date(report.generatedAt).toLocaleDateString('fr-FR')}`],
    [],
    ...FINANCIAL_REPORT_GUIDE.map((entry) => [entry.title, entry.text]),
    [],
    ['ONGLETS'],
    ...report.modules.map((module) => [module.title, module.description]),
  ])
  guide['!cols'] = [{ wch: 30 }, { wch: 120 }]
  XLSX.utils.book_append_sheet(workbook, guide, 'Mode d’emploi')

  for (const module of report.modules) {
    const rows: Array<Array<string | number>> = [
      [`BILAN FINANCIER — ${module.title.toUpperCase()}`],
      [`Période : ${reportPeriodLabel(report)}`],
      [`Généré le ${new Date(report.generatedAt).toLocaleDateString('fr-FR')}`],
      [module.description],
      [],
    ]
    const numericRows: number[] = []
    for (const block of module.blocks) {
      rows.push([block.title.toUpperCase()])
      rows.push([block.description])
      rows.push(header)
      for (const line of block.lines) {
        const label = line.kind === 'stock' && line.level !== 'info' ? `${line.label} (fin de mois)` : line.label
        numericRows.push(rows.length)
        rows.push([label, ...line.values, line.total, line.description])
      }
      rows.push([])
    }
    if (module.notes.length > 0) {
      rows.push(['BASES DE CALCUL'])
      module.notes.forEach((note) => rows.push([`• ${note}`]))
    }

    const sheet = XLSX.utils.aoa_to_sheet(rows)
    sheet['!cols'] = header.map((_, column) =>
      column === 0 ? { wch: 52 } : column === explanationColumn ? { wch: 90 } : { wch: 14 }
    )
    for (const rowIndex of numericRows) {
      for (let column = 1; column < explanationColumn; column++) {
        const cell = sheet[XLSX.utils.encode_cell({ r: rowIndex, c: column })]
        if (cell && typeof cell.v === 'number') cell.z = '#,##0'
      }
    }
    XLSX.utils.book_append_sheet(workbook, sheet, sheetName(module.title))
  }

  XLSX.writeFile(workbook, reportFileName(report, 'xlsx'))
}
