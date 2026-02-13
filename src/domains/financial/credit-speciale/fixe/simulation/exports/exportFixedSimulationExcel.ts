import type { FixedSimulationResult } from '../entities/fixed-simulation.types'

function formatDate(value: Date): string {
  return new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export async function exportFixedSimulationExcel(
  result: FixedSimulationResult,
  fileName = `simulation_credit_fixe_${new Date().toISOString().slice(0, 10)}.xlsx`
): Promise<void> {
  const XLSX = await import('xlsx')

  const rows = result.schedule.map((row) => ({
    Échéances: `M${row.month}`,
    Date: formatDate(row.date),
    'Montant (FCFA)': row.payment,
  }))

  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Simulation')

  XLSX.writeFile(wb, fileName)
}
