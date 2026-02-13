import type { FixedSimulationResult } from '../entities/fixed-simulation.types'

interface FixedSimulationPrintOptions {
  moduleTitle?: string
}

function formatAmount(value: number): string {
  return Math.round(value).toLocaleString('fr-FR')
}

function formatDate(value: Date): string {
  return new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function printFixedSimulation(
  result: FixedSimulationResult,
  options: FixedSimulationPrintOptions = {}
): void {
  const moduleTitle = options.moduleTitle ?? 'Credit Fixe'
  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  const rowsHtml = result.schedule
    .map(
      (row) => `
        <tr>
          <td>M${row.month}</td>
          <td>${formatDate(row.date)}</td>
          <td class="text-right">${formatAmount(row.payment)} FCFA</td>
          <td class="text-right">${formatAmount(row.cumulativePaid)} FCFA</td>
          <td class="text-right">${formatAmount(row.remaining)} FCFA</td>
        </tr>
      `
    )
    .join('')

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Simulation ${moduleTitle}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #222; }
          h1 { color: #234D65; margin: 0 0 12px; }
          .meta { margin-bottom: 12px; font-size: 14px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th, td { border: 1px solid #ddd; padding: 8px; }
          th { background-color: #234D65; color: white; text-align: left; }
          .text-right { text-align: right; }
          tr:nth-child(even) { background-color: #f6f7f8; }
          @media print {
            body { margin: 0; }
            @page { margin: 1cm; }
          }
        </style>
      </head>
      <body>
        <h1>Simulation ${moduleTitle}</h1>
        <div class="meta">Mode: ${result.mode === 'STANDARD' ? 'Standard' : 'Personnalisee'}</div>
        <div class="meta">Montant emprunte: ${formatAmount(result.summary.amount)} FCFA</div>
        <div class="meta">Taux: ${result.summary.interestRate}%</div>
        <div class="meta">Interet: ${formatAmount(result.summary.interestAmount)} FCFA</div>
        <div class="meta">Total a rembourser: ${formatAmount(result.summary.totalAmount)} FCFA</div>
        <table>
          <thead>
            <tr>
              <th>Mois</th>
              <th>Date echeance</th>
              <th class="text-right">Montant</th>
              <th class="text-right">Cumul</th>
              <th class="text-right">Reste</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </body>
    </html>
  `

  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()

  setTimeout(() => {
    printWindow.print()
    printWindow.close()
  }, 250)
}
