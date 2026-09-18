/**
 * Export Excel d'une liste filtrée.
 *
 * Mutualise la mise en forme des journaux (relances, journalisation) : titre,
 * rappel de la période exportée, en-têtes, largeurs de colonnes. `xlsx` est
 * importé à la demande pour rester hors du bundle initial.
 */

import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export type ExcelCell = string | number

export interface ExcelExportOptions {
  /** Nom du fichier, sans extension. */
  fileName: string
  /** Nom de l'onglet (Excel le limite à 31 caractères). */
  sheetName: string
  /** Titre affiché en première ligne. */
  title: string
  /** Libellés de colonnes. */
  header: string[]
  /** Lignes de données, dans l'ordre des colonnes. */
  rows: ExcelCell[][]
  /** Largeurs de colonnes, en caractères. */
  colWidths?: number[]
  /** Informations complémentaires ajoutées à la ligne de contexte. */
  extraMeta?: string[]
  /** Bornes de la période exportée (format `yyyy-MM-dd`), si filtrée. */
  period?: { from?: string; to?: string }
}

/** « du 01/03/2026 au 31/03/2026 », ou une mention explicite si non bornée. */
export function describePeriod(period?: { from?: string; to?: string }): string {
  const fmt = (value: string) => {
    const date = new Date(`${value}T00:00:00`)
    return Number.isNaN(date.getTime()) ? value : format(date, 'dd/MM/yyyy', { locale: fr })
  }
  const from = period?.from?.trim()
  const to = period?.to?.trim()

  if (from && to) return `Période : du ${fmt(from)} au ${fmt(to)}`
  if (from) return `Période : à partir du ${fmt(from)}`
  if (to) return `Période : jusqu'au ${fmt(to)}`
  return 'Période : toutes dates'
}

export async function exportRowsToExcel({
  fileName,
  sheetName,
  title,
  header,
  rows,
  colWidths,
  extraMeta = [],
  period,
}: ExcelExportOptions): Promise<void> {
  const XLSX = await import('xlsx')

  const meta = [
    `Généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}`,
    describePeriod(period),
    `${rows.length} ligne${rows.length !== 1 ? 's' : ''}`,
    ...extraMeta,
  ].join('  •  ')

  const aoa: ExcelCell[][] = [[title], [meta], [], header, ...rows]
  const worksheet = XLSX.utils.aoa_to_sheet(aoa)

  worksheet['!cols'] = (colWidths ?? header.map(() => 20)).map((wch) => ({ wch }))
  // Titre et ligne de contexte étalés sur toute la largeur du tableau.
  const lastCol = Math.max(0, header.length - 1)
  worksheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: lastCol } },
  ]
  // Fige l'en-tête : les journaux se lisent en faisant défiler.
  worksheet['!freeze'] = { xSplit: '0', ySplit: '4' }

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31))
  XLSX.writeFile(workbook, `${fileName}.xlsx`)
}
