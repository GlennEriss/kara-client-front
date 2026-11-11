// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { buildDashboardPdf, buildDashboardWorkbook } from '../exports/exportDashboard'
import { dashboardPeriodLabel, type DashboardExportData } from '../exports/dashboard-export-model'
import { DEFAULT_DASHBOARD_FILTERS } from '../entities/dashboard.types'

const data = (): DashboardExportData => ({
  context: { title: 'Crédit spécial', generatedAt: '2026-11-10T23:30:00Z', baseUrl: 'https://admin.example.test',
    filters: { ...DEFAULT_DASHBOARD_FILTERS, period: '7d', zoneProvince: 'Estuaire', memberType: 'adherant' } },
  payload: { title: 'Crédit spécial', kpis: [{ key: 'paid', label: 'Commissions reçues', value: 15000, format: 'currency' }],
    notes: ['Montants réellement remis.'], rankings: [{ key: 'paid', title: 'Top 10 des garants — Gains reçus', unit: 'FCFA', description: 'Remises enregistrées, hors INCONNU.',
      items: Array.from({ length: 65 }, (_, index) => ({ id: `g${index}`, label: `PERSONNE_${String(index).padStart(3, '0')}`,
        value: 65000 - index * 100, subLabel: `MK${index} · 2 contrats`, href: `/memberships/g${index}` })) },
      { key: 'recent', title: 'Les 10 membres les plus récents', kind: 'recent', items: [{ id: 'm', label: 'Membre récent', value: 0, date: '2026-11-10T23:30:00Z' }] }],
  },
})

describe('exports complets du dashboard', () => {
  it('calcule les dates de filtre avec le jour de Libreville à la génération', () => {
    expect(dashboardPeriodLabel(data().context)).toBe('Du 05/11/2026 au 11/11/2026')
  })
  it('exporte toutes les lignes Excel, des montants numériques et les liens, avec le périmètre', async () => {
    const workbook = await buildDashboardWorkbook(data())
    expect(workbook.worksheets).toHaveLength(3)
    const sheet = workbook.getWorksheet('Classement 1')!
    const row = sheet.getRows(1, sheet.rowCount)!.find(r => r.getCell(2).value === 'PERSONNE_064')!
    expect(row.getCell(1).value).toBe(65)
    expect(row.getCell(4).value).toBe(58600)
    expect(row.getCell(4).numFmt).toContain('#,##0')
    expect(row.getCell(5).value).toMatchObject({ hyperlink: 'https://admin.example.test/memberships/g64' })
    expect(sheet.views[0]).toMatchObject({ state: 'frozen' })
    const text = sheet.getRows(1, sheet.rowCount)!.map(r => String(r.getCell(1).value)).join(' ')
    expect(text).toContain('Estuaire')
    expect(text).toContain('Adhérents')
    expect(text).toContain('Remises enregistrées, hors INCONNU.')
    const recent = workbook.getWorksheet('Classement 2')!
    expect(recent.getRows(1, recent.rowCount)!.find(r => r.getCell(2).value === 'Membre récent')!.getCell(4).value).toBe('11/11/2026')
    const bytes = await workbook.xlsx.writeBuffer()
    expect(bytes.byteLength).toBeGreaterThan(3000)
  })
  it('exporte tous les résultats recherchés, sans synthèse et avec le rang initial', async () => {
    const selected = data()
    selected.rankingOnly = true
    selected.search = 'PERSONNE_064'
    selected.payload.rankings = [{ ...selected.payload.rankings![0], items: [{ ...selected.payload.rankings![0].items[64], rank: 65 }] }]
    const workbook = await buildDashboardWorkbook(selected)
    expect(workbook.worksheets).toHaveLength(1)
    expect(workbook.getWorksheet('Synthèse')).toBeUndefined()
    const sheet = workbook.worksheets[0]
    const row = sheet.getRows(1, sheet.rowCount)!.find(r => r.getCell(2).value === 'PERSONNE_064')!
    expect(row.getCell(1).value).toBe(65)
    expect(sheet.getRows(1, sheet.rowCount)!.some(r => String(r.getCell(1).value).includes('Recherche : PERSONNE_064'))).toBe(true)
  })
  it('produit un PDF paginé comprenant la dernière ligne du classement', async () => {
    const doc = await buildDashboardPdf(data())
    expect(doc.getNumberOfPages()).toBeGreaterThan(2)
    expect(doc.output()).toContain('PERSONNE_064')
    expect(doc.output('arraybuffer').byteLength).toBeGreaterThan(5000)
  })
})
