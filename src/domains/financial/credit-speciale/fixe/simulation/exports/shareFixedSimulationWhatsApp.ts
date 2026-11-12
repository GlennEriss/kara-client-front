import type { FixedSimulationResult } from '../entities/fixed-simulation.types'
import { renderDefaultMessage, type MessageRenderer } from '@/domains/messaging/utils/renderMessage'

interface FixedSimulationWhatsAppOptions {
  moduleTitle?: string
  renderMessage?: MessageRenderer
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
  const message = (options.renderMessage || renderDefaultMessage)('fixedSimulationSchedule', {
    produit: moduleTitle,
    detail: result.schedule.map(row => `${row.month} | ${formatDate(row.date)} | ${formatAmount(row.payment)} FCFA`).join('\n'),
    montantTotal: formatAmount(result.summary.totalPlanned),
  })

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
  window.open(whatsappUrl, '_blank')
}
