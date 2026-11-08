import type jsPDF from 'jspdf'

type Cell = string | string[]

/** Tableau de remises réelles, avec en-tête répété et pagination à la hauteur disponible. */
export function drawPdfHistoryTable(doc: jsPDF, options: {
  startY: number
  columns: number[]
  rows: Cell[][]
  onNewPage: () => void
  totalAmount?: string
}): number {
  const marginX = 14
  const headerHeight = 8
  const rowHeight = 9
  const bottom = doc.internal.pageSize.getHeight() - 20
  const width = options.columns.reduce((sum, column) => sum + column, 0)
  const headers = ['DATE ECHEANCE', 'DATE REMISE', 'MONTANT', 'HEURE', 'MOYEN /TRANS', 'AGENT', 'REMARQUE']
  let y = options.startY

  const cell = (value: Cell, x: number, top: number, cellWidth: number, bold = false) => {
    doc.setFont('times', bold ? 'bold' : 'normal')
    doc.setFontSize(bold ? 8.3 : 8.7)
    doc.setTextColor(18, 18, 18)
    const lines = (Array.isArray(value) ? value : [value])
      .flatMap((line) => doc.splitTextToSize(String(line ?? ''), cellWidth - 3) as string[])
    const visible = lines.slice(0, 2)
    if (lines.length > 2) visible[1] = `${visible[1].slice(0, -3)}...`
    doc.text(visible, x + cellWidth / 2, top + (visible.length > 1 ? 3.4 : 5.7), { align: 'center', lineHeightFactor: 1.05 })
  }
  const header = () => {
    doc.setFillColor(225, 235, 245)
    doc.setDrawColor(24, 24, 24)
    doc.setLineWidth(0.2)
    doc.rect(marginX, y, width, headerHeight, 'FD')
    let x = marginX
    headers.forEach((label, index) => {
      cell(label, x, y, options.columns[index], true)
      x += options.columns[index]
    })
    y += headerHeight
  }
  const nextPage = () => {
    doc.addPage()
    options.onNewPage()
    y = 30
    header()
  }
  if (y + headerHeight + rowHeight > bottom) nextPage()
  else header()
  const rows = [...options.rows]
  if (options.totalAmount !== undefined) rows.push(['TOTAL', '-', options.totalAmount, '-', '-', '-', '-'])
  rows.forEach((row, index) => {
    if (y + rowHeight > bottom) nextPage()
    doc.setDrawColor(24, 24, 24)
    doc.setLineWidth(0.2)
    doc.rect(marginX, y, width, rowHeight)
    let x = marginX
    row.forEach((value, column) => {
      if (column) doc.line(x, y, x, y + rowHeight)
      cell(value, x, y, options.columns[column], options.totalAmount !== undefined && index === rows.length - 1)
      x += options.columns[column]
    })
    y += rowHeight
  })
  return y
}
