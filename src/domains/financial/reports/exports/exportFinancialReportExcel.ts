import type { FinancialReport } from '../entities/financial-report.types'
import { reportFileName, reportPeriodLabel, TOTAL_COLUMN_LABEL } from './report-format'

/** Feuille Excel : 31 caractères au plus, sans `: \ / ? * [ ]`. */
const sheetName = (title: string) => title.replace(/[:\\/?*[\]]/g, ' ').slice(0, 31)

/** Un onglet par module ; les montants restent des nombres, pour être recalculés dans Excel. */
export async function exportFinancialReportExcel(report: FinancialReport): Promise<void> {
  const XLSX = await import('xlsx')
  const workbook = XLSX.utils.book_new()
  const header = ['Libellé', ...report.monthLabels, TOTAL_COLUMN_LABEL]

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
      rows.push(header)
      for (const line of block.lines) {
        const label = line.level === 'info' ? line.label : line.kind === 'stock' ? `${line.label} (fin de mois)` : line.label
        numericRows.push(rows.length)
        rows.push([label, ...line.values, line.total])
      }
      rows.push([])
    }
    if (module.notes.length > 0) {
      rows.push(['BASES DE CALCUL'])
      module.notes.forEach((note) => rows.push([`• ${note}`]))
    }

    const sheet = XLSX.utils.aoa_to_sheet(rows)
    sheet['!cols'] = [{ wch: 52 }, ...header.slice(1).map(() => ({ wch: 14 }))]
    for (const rowIndex of numericRows) {
      for (let column = 1; column < header.length; column++) {
        const cell = sheet[XLSX.utils.encode_cell({ r: rowIndex, c: column })]
        if (cell && typeof cell.v === 'number') cell.z = '#,##0'
      }
    }
    XLSX.utils.book_append_sheet(workbook, sheet, sheetName(module.title))
  }

  XLSX.writeFile(workbook, reportFileName(report, 'xlsx'))
}
