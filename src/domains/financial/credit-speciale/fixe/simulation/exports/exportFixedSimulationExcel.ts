import type { FixedSimulationResult } from '../entities/fixed-simulation.types'

interface FixedSimulationExportOptions {
  moduleSlug?: string
}

function formatDate(value: Date): string {
  return new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export async function exportFixedSimulationExcel(
  result: FixedSimulationResult,
  fileName?: string,
  options: FixedSimulationExportOptions = {}
): Promise<void> {
  const moduleSlug = options.moduleSlug ?? 'credit_fixe'
  const resolvedFileName = fileName ?? `simulation_${moduleSlug}_${new Date().toISOString().slice(0, 10)}.xlsx`

  const XLSX = await import('xlsx')

  const rows = result.schedule.map((row) => ({
    Échéances: `M${row.month}`,
    Date: formatDate(row.date),
    'Montant (FCFA)': row.payment,
  }))

  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Simulation')

  XLSX.writeFile(wb, resolvedFileName)
}
