import type { FixedSimulationResult } from '../entities/fixed-simulation.types'

interface FixedSimulationExportOptions {
  moduleSlug?: string
  moduleTitle?: string
}

function formatAmount(value: number): string {
  return Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

function formatDate(value: Date): string {
  return new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export async function exportFixedSimulationPdf(
  result: FixedSimulationResult,
  fileName?: string,
  options: FixedSimulationExportOptions = {}
): Promise<void> {
  const moduleSlug = options.moduleSlug ?? 'credit_fixe'
  const moduleTitle = options.moduleTitle ?? 'Credit Fixe'
  const resolvedFileName = fileName ?? `simulation_${moduleSlug}_${new Date().toISOString().slice(0, 10)}.pdf`

  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default

  const doc = new jsPDF('portrait', 'mm', 'a4')
  doc.setFontSize(16)
  doc.setTextColor(35, 77, 101)
  doc.text(`Simulation ${moduleTitle}`, 14, 14)
  doc.setFontSize(10)
  doc.setTextColor(80, 80, 80)
  doc.text(`Mode : ${result.mode === 'STANDARD' ? 'Standard' : 'Personnalisee'}`, 14, 20)
  doc.text(`Montant emprunte : ${formatAmount(result.summary.amount)} FCFA`, 14, 25)
  doc.text(`Taux : ${result.summary.interestRate}%`, 14, 30)
  doc.text(`Interet : ${formatAmount(result.summary.interestAmount)} FCFA`, 14, 35)
  doc.text(`Total a rembourser : ${formatAmount(result.summary.totalAmount)} FCFA`, 14, 40)
  doc.text(`Date 1er versement : ${formatDate(result.summary.firstPaymentDate)}`, 14, 45)

  const tableData = result.schedule.map((row) => [
    `M${row.month}`,
    formatDate(row.date),
    `${formatAmount(row.payment)} FCFA`,
  ])

  autoTable(doc, {
    head: [['Échéances', 'Date', 'Montant']],
    body: tableData,
    startY: 52,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [35, 77, 101], textColor: 255, fontStyle: 'bold', halign: 'center' },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: {
      0: { cellWidth: 35, halign: 'center' },
      1: { cellWidth: 50, halign: 'center' },
      2: { cellWidth: 55, halign: 'right' },
    },
  })

  const finalY = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 52
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(`Total planifie : ${formatAmount(result.summary.totalPlanned)} FCFA`, 14, finalY + 8)

  doc.save(resolvedFileName)
}
