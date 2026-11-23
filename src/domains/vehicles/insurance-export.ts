import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { Workbook } from 'exceljs'
import type { VehicleInsuranceReward } from '@/types/types'

export function paidInsuranceTotals(rewards: Pick<VehicleInsuranceReward, 'insuranceId' | 'status' | 'memberAmount'>[]) {
  const totals = new Map<string, number>()
  for (const reward of rewards) {
    if (!reward.insuranceId || reward.status !== 'PAID' || !Number.isFinite(reward.memberAmount) || reward.memberAmount < 0) continue
    totals.set(reward.insuranceId, (totals.get(reward.insuranceId) ?? 0) + reward.memberAmount)
  }
  return totals
}

type Row = (string | number)[]
const dateLabel = (date: Date) => date.toLocaleDateString('fr-FR', { timeZone: 'Africa/Libreville' })
const title = 'Portefeuille des assurances'
const totalAt = (rows: Row[], column: number) =>
  rows.reduce((total, row) => total + (Number(row[column]) || 0), 0)
const summary = (rows: Row[]) => [
  { label: 'Assurances validées', value: rows.length, formula: 'COUNT(Assurances!Q:Q)' },
  { label: 'Primes des dossiers', value: totalAt(rows, 13), formula: 'SUM(Assurances!N:N)' },
  { label: 'Versé aux parrains', value: totalAt(rows, 16), formula: 'SUM(Assurances!Q:Q)' },
]
const amount = (value: number) => new Intl.NumberFormat('fr-FR').format(value).replace(/[\u00a0\u202f]/g, ' ')

export function insuranceListPdf(headers: string[], rows: Row[], generated: Date) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 14
  const contentWidth = pageWidth - 2 * margin
  const metrics = summary(rows)
  autoTable(doc, {
    head: [headers],
    body: rows.map(row => row.map((value, i) =>
      typeof value === 'number' && [13, 16].includes(i) ? amount(value) : value,
    )),
    tableWidth: pageWidth - margin * 2,
    theme: 'plain',
    styles: {
      font: 'helvetica', fontSize: 7, cellPadding: 1.8, lineColor: [226, 232, 240],
      lineWidth: { bottom: 0.15 }, textColor: [30, 41, 59], valign: 'middle', overflow: 'linebreak',
    },
    headStyles: { fillColor: [230, 239, 243], textColor: [35, 77, 101], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: { 13: { halign: 'right' }, 14: { halign: 'right' }, 16: { halign: 'right', fontStyle: 'bold', textColor: [31, 90, 72] } },
    margin: { top: 61, right: margin, bottom: 14, left: margin },
    rowPageBreak: 'avoid',
    willDrawPage: () => {
      doc.setFillColor(35, 77, 101).roundedRect(margin, 9, contentWidth, 22, 2, 2, 'F')
      doc.setFont('helvetica', 'bold').setTextColor(255, 255, 255).setFontSize(15)
      doc.text(title, margin + 5, 19)
      doc.setFont('helvetica', 'normal').setFontSize(8)
      doc.text('LE KARA | Suivi des assurances et du parrainage', margin + 5, 25)
      doc.text(`Édité le ${dateLabel(generated)}`, pageWidth - margin - 5, 19, { align: 'right' })
      const gap = 3
      const cardWidth = (contentWidth - 2 * gap) / 3
      for (const [i, metric] of metrics.entries()) {
        const x = margin + i * (cardWidth + gap)
        if (i === 2) doc.setFillColor(232, 245, 239)
        else doc.setFillColor(244, 247, 250)
        doc.roundedRect(x, 36, cardWidth, 18, 2, 2, 'F')
        doc.setFont('helvetica', 'normal').setTextColor(61, 83, 100).setFontSize(8)
        doc.text(metric.label, x + 4, 42)
        doc.setFont('helvetica', 'bold').setTextColor(35, 77, 101).setFontSize(12)
        doc.text(`${amount(metric.value)}${i ? ' FCFA' : ''}`, x + 4, 49)
      }
    },
  })
  const totalPages = doc.getNumberOfPages()
  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page).setFont('helvetica', 'normal').setFontSize(9).setTextColor(75, 85, 99)
    doc.text(`Page ${page}/${totalPages}`, pageWidth - margin, doc.internal.pageSize.getHeight() - 6, { align: 'right' })
  }
  return doc
}

export function insuranceListExcel(headers: string[], rows: Row[], generated: Date) {
  const workbook = new Workbook()
  workbook.creator = 'LE KARA'
  const recap = workbook.addWorksheet('Synthèse')
  recap.columns = [{ width: 29 }, { width: 29 }, { width: 29 }]
  recap.mergeCells('A1:C1')
  recap.getCell('A1').value = title
  recap.getCell('A1').font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 16 }
  recap.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF234D65' } }
  recap.getRow(1).height = 28
  recap.mergeCells('A2:C2')
  recap.getCell('A2').value = `LE KARA | Édité le ${dateLabel(generated)}`
  for (const [index, metric] of summary(rows).entries()) {
    const label = recap.getCell(4, index + 1)
    label.value = metric.label
    label.font = { color: { argb: 'FF234D65' }, bold: true }
    const value = recap.getCell(5, index + 1)
    value.value = { formula: metric.formula, result: metric.value }
    value.numFmt = index ? '#,##0" FCFA"' : '#,##0'
    value.font = { color: { argb: 'FF234D65' }, bold: true, size: 15 }
    value.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: index === 2 ? 'FFE8F5EF' : 'FFF4F7FA' } }
  }
  recap.getRow(5).height = 27
  recap.mergeCells('A7:C7')
  recap.getCell('A7').value = 'Les reversements correspondent aux paiements enregistrés, renouvellements compris.'

  const sheet = workbook.addWorksheet('Assurances', { views: [{ state: 'frozen', ySplit: 5 }] })
  sheet.columns = headers.map(header => ({ width: Math.max(18, header.length + 4) }))
  for (const [index, text] of [title.toUpperCase(), `LE KARA | Assurances validées | ${rows.length} dossier(s)`, `Généré le ${dateLabel(generated)}`].entries()) {
    const row = index + 1
    sheet.mergeCells(row, 1, row, headers.length)
    sheet.getCell(row, 1).value = text
    sheet.getCell(row, 1).font = { color: { argb: 'FF234D65' }, bold: index === 0, size: index === 0 ? 15 : 11 }
    sheet.getRow(row).height = index === 0 ? 24 : 18
  }
  const headings = sheet.getRow(5)
  headings.values = headers
  headings.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF234D65' } }
    cell.font = { color: { argb: 'FFFFFFFF' }, bold: true }
  })
  for (const [i, values] of rows.entries()) {
    const row = sheet.addRow(values)
    const lines = Math.max(1, ...values.map((value, col) =>
      typeof value === 'string' ? Math.ceil(value.length / ((sheet.getColumn(col + 1).width ?? 18) - 2)) : 1,
    ))
    row.height = Math.min(400, 5 + lines * 15)
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      cell.alignment = { vertical: 'middle', wrapText: true }
      if ([14, 17].includes(col)) cell.numFmt = '#,##0'
      if (i % 2) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }
    })
  }
  sheet.autoFilter = { from: { row: 5, column: 1 }, to: { row: 5 + rows.length, column: headers.length } }
  return workbook
}
