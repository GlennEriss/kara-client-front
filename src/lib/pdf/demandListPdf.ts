export interface DemandListPdfOptions {
  title: string
  subtitle?: string
  headers: string[]
  rows: Array<Array<string | number>>
  orientation?: 'portrait' | 'landscape'
  contextLines?: string[]
  statusColumnIndex?: number
  columnWidths?: number[]
}

const STATUS_COLORS: Record<string, [number, number, number]> = {
  'En attente': [180, 83, 9],
  'Acceptée': [21, 128, 61],
  'Acceptées': [21, 128, 61],
  'Refusée': [185, 28, 28],
  'Refusées': [185, 28, 28],
  'Convertie': [30, 64, 175],
  'Converties': [30, 64, 175],
  'Réouverte': [124, 58, 237],
  'Réouvertes': [124, 58, 237],
}

export async function createDemandListPdf(options: DemandListPdfOptions) {
  const jsPDFModule = await import('jspdf')
  const jsPDF = jsPDFModule.jsPDF
  const autoTableModule = await import('jspdf-autotable')
  const autoTable = autoTableModule.default || autoTableModule

  const doc = new jsPDF({
    orientation: options.orientation ?? 'landscape',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const marginX = 10
  const contentWidth = pageWidth - marginX * 2

  const now = new Date()
  const generatedLine = `Généré le ${now.toLocaleDateString('fr-FR')} à ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
  const totalLine = `Total: ${options.rows.length} demande(s)`
  const extraContext = (options.contextLines ?? []).filter(Boolean)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  const subtitleLines = options.subtitle
    ? (doc.splitTextToSize(options.subtitle, contentWidth - 8) as string[])
    : []
  const infoLines = [generatedLine, totalLine, ...extraContext]
  const headerHeight = 14 + subtitleLines.length * 4 + infoLines.length * 3.8 + 6

  doc.setFillColor(31, 69, 91)
  doc.roundedRect(marginX, 8, contentWidth, headerHeight, 3, 3, 'F')

  let y = 15
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.text(options.title, marginX + 4, y)

  y += 5
  if (subtitleLines.length > 0) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(232, 240, 245)
    doc.text(subtitleLines, marginX + 4, y)
    y += subtitleLines.length * 4
  }

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(210, 224, 235)
  infoLines.forEach((line) => {
    doc.text(line, marginX + 4, y)
    y += 3.8
  })

  const tableStartY = 8 + headerHeight + 6

  if (options.rows.length === 0) {
    doc.setDrawColor(220, 228, 236)
    doc.setFillColor(249, 251, 253)
    doc.roundedRect(marginX, tableStartY, contentWidth, 22, 3, 3, 'FD')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(55, 65, 81)
    doc.text('Aucune demande à exporter', marginX + 4, tableStartY + 13)
    return doc
  }

  const columnStyles = (options.columnWidths ?? []).reduce<Record<number, { cellWidth: number }>>((acc, width, index) => {
    if (width > 0) {
      acc[index] = { cellWidth: width }
    }
    return acc
  }, {})

  autoTable(doc, {
    head: [options.headers],
    body: options.rows.map((row) => row.map((value) => String(value ?? '—'))),
    startY: tableStartY,
    margin: { top: tableStartY, left: marginX, right: marginX, bottom: 12 },
    styles: {
      fontSize: 7.5,
      cellPadding: 2.2,
      textColor: [31, 41, 55],
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
      overflow: 'linebreak',
      valign: 'middle',
    },
    headStyles: {
      fillColor: [35, 77, 101],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      fontSize: 8,
      cellPadding: 2.3,
    },
    bodyStyles: {
      fillColor: [255, 255, 255],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles,
    didParseCell: (data: any) => {
      if (
        typeof options.statusColumnIndex === 'number'
        && data.section === 'body'
        && data.column.index === options.statusColumnIndex
      ) {
        const rawStatus = String(data.cell.raw ?? '').trim()
        const color = STATUS_COLORS[rawStatus]
        if (color) {
          data.cell.styles.fillColor = color
          data.cell.styles.textColor = [255, 255, 255]
          data.cell.styles.halign = 'center'
          data.cell.styles.fontStyle = 'bold'
        }
      }
    },
    didDrawPage: (data: any) => {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(100, 116, 139)
      doc.text('Kara Administration • Export demandes', marginX, pageHeight - 6)
      doc.text(`Page ${data.pageNumber}`, pageWidth - marginX, pageHeight - 6, { align: 'right' })
    },
  })

  return doc
}
