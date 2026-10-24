import { describe, expect, it } from 'vitest'
import type { Worksheet } from 'exceljs'
import { buildFinancialReport } from '../builders/buildFinancialReport'
import type { FinancialReportSources } from '../entities/financial-report-sources.types'
import { buildFinancialReportWorkbook } from '../exports/exportFinancialReportExcel'
import { selectReportContent } from '../exports/export-options'

const sources = {
  caisseSpecialeContracts: [], caisseSpecialePayments: [], caisseSpecialeRefunds: [], caisseImprevueContracts: [],
  caisseImprevuePayments: [], caisseImprevueSupports: [], caisseImprevueRefunds: [], creditContracts: [], creditPayments: [],
  creditPenalties: [], guarantorPayments: [], placementCommissions: [], placementEarlyExits: [], membershipRequests: [],
  placements: [{ id: 'pl-1', status: 'Active', amount: 500_000, handoverDate: new Date('2026-01-10T12:00:00') }],
} as unknown as FinancialReportSources

const report = selectReportContent(
  buildFinancialReport(sources, { from: '2026-01', to: '2026-03', now: new Date('2026-03-20T12:00:00') }),
  { modules: ['placements'], blocks: ['treasury', 'outstanding'] }
)

const rowStartingWith = (sheet: Worksheet, label: string) => {
  let found: number | undefined
  sheet.eachRow((row, number) => {
    if (found === undefined && String(row.getCell(1).value).startsWith(label)) found = number
  })
  return sheet.getRow(found!)
}

describe('export Excel du bilan', () => {
  it('complet : mode d’emploi, en-tête figé, totaux en formules et colonne d’explication', async () => {
    const workbook = await buildFinancialReportWorkbook(report, 'full')
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(['Mode d’emploi', 'Placements'])

    const sheet = workbook.getWorksheet('Placements')!
    const headerNumber = (sheet.views[0] as { ySplit: number }).ySplit
    expect(sheet.getRow(headerNumber).getCell(1).value).toBe('Libellé')
    expect(sheet.getRow(headerNumber).getCell(6).value).toBe('Explication')

    // Flux : somme des mois ; fin de mois : valeur du dernier mois.
    const received = rowStartingWith(sheet, 'Capitaux reçus')
    expect(received.getCell(5).value).toEqual({ formula: `SUM(B${received.number}:D${received.number})`, result: 500_000 })
    expect(received.getCell(2).numFmt).toBe('#,##0;[Red]-#,##0')
    const toReturn = rowStartingWith(sheet, 'Capitaux à restituer')
    expect(toReturn.getCell(5).value).toEqual({ formula: `D${toReturn.number}`, result: 500_000 })
    expect(String(toReturn.getCell(6).value)).toContain('bienfaiteurs')
  })

  it('sans texte : ni mode d’emploi ni colonne d’explication', async () => {
    const workbook = await buildFinancialReportWorkbook(report, 'none')
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(['Placements'])
    const sheet = workbook.getWorksheet('Placements')!
    const header = sheet.getRow((sheet.views[0] as { ySplit: number }).ySplit)
    expect(header.cellCount).toBe(5)
    expect(header.getCell(5).value).toBe('Total / fin')
  })
})
