import type { FixedSimulationResult } from '../entities/fixed-simulation.types'

interface FixedSimulationWhatsAppOptions {
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

export function shareFixedSimulationWhatsApp(
  result: FixedSimulationResult,
  options: FixedSimulationWhatsAppOptions = {}
): void {
  const moduleTitle = options.moduleTitle ?? 'CREDIT FIXE'
  // Même structure que credit-speciale/simulations : titre + tableau 3 colonnes (Échéances | Date | Montant) + Total
  let message = `*ÉCHÉANCIER DE ${moduleTitle}*\n\n`
  message += `Echéances | Date | Montant\n`
  message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`

  for (const row of result.schedule) {
    message += `${row.month} | ${formatDate(row.date)} | ${formatAmount(row.payment)} FCFA\n`
  }

  message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
  message += `Total: | | ${formatAmount(result.summary.totalPlanned)} FCFA`

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
  window.open(whatsappUrl, '_blank')
}
