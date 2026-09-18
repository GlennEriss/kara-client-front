import { beforeEach, describe, expect, it, vi } from 'vitest'

const aoaToSheet = vi.fn((_aoa: unknown[][]) => ({}) as Record<string, unknown>)
const bookNew = vi.fn(() => ({}))
const bookAppendSheet = vi.fn((_wb: unknown, _ws: unknown, _name: string) => undefined)
const writeFile = vi.fn((_wb: unknown, _fileName: string) => undefined)

vi.mock('xlsx', () => ({
  utils: {
    aoa_to_sheet: (aoa: unknown[][]) => aoaToSheet(aoa),
    book_new: () => bookNew(),
    book_append_sheet: (wb: unknown, ws: unknown, name: string) => bookAppendSheet(wb, ws, name),
  },
  writeFile: (wb: unknown, fileName: string) => writeFile(wb, fileName),
}))

import { describePeriod, exportRowsToExcel } from '../excel-export'

describe('describePeriod', () => {
  it('décrit une période bornée des deux côtés', () => {
    expect(describePeriod({ from: '2026-03-01', to: '2026-03-31' }))
      .toBe('Période : du 01/03/2026 au 31/03/2026')
  })

  it('gère une borne unique', () => {
    expect(describePeriod({ from: '2026-03-01' })).toBe('Période : à partir du 01/03/2026')
    expect(describePeriod({ to: '2026-03-31' })).toBe("Période : jusqu'au 31/03/2026")
  })

  it('annonce explicitement l\'absence de filtre', () => {
    expect(describePeriod()).toBe('Période : toutes dates')
    expect(describePeriod({ from: '', to: '' })).toBe('Période : toutes dates')
  })
})

describe('exportRowsToExcel', () => {
  beforeEach(() => {
    aoaToSheet.mockClear()
    bookAppendSheet.mockClear()
    writeFile.mockClear()
  })

  it('compose titre, contexte, en-tête et lignes', async () => {
    await exportRowsToExcel({
      fileName: 'journal_relances',
      sheetName: 'Relances',
      title: 'Journal des relances',
      period: { from: '2026-03-01', to: '2026-03-31' },
      header: ['Date', 'Membre'],
      rows: [['01/03/2026', 'Jean K.'], ['02/03/2026', 'Marie N.']],
    })

    const aoa = aoaToSheet.mock.calls[0]![0]
    expect(aoa[0]).toEqual(['Journal des relances'])
    expect(String(aoa[1][0])).toContain('Période : du 01/03/2026 au 31/03/2026')
    expect(String(aoa[1][0])).toContain('2 lignes')
    expect(aoa[2]).toEqual([])
    expect(aoa[3]).toEqual(['Date', 'Membre'])
    expect(aoa[4]).toEqual(['01/03/2026', 'Jean K.'])
    expect(writeFile.mock.calls[0]![1]).toBe('journal_relances.xlsx')
  })

  it('tronque le nom d\'onglet à la limite Excel de 31 caractères', async () => {
    await exportRowsToExcel({
      fileName: 'x',
      sheetName: 'Un nom d onglet vraiment beaucoup trop long',
      title: 'T',
      header: ['A'],
      rows: [['1']],
    })
    expect(bookAppendSheet.mock.calls[0]![2].length).toBeLessThanOrEqual(31)
  })
})
