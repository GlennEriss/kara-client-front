import type { FinancialReport } from '../entities/financial-report.types'

/** Montant avec des espaces simples : les polices des PDF n'ont pas l'espace fine insécable. */
export const formatReportNumber = (value: number): string => {
  const rounded = Math.round(value)
  const digits = Math.abs(rounded).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return rounded < 0 ? `-${digits}` : digits
}

export const reportPeriodLabel = (report: FinancialReport): string =>
  report.monthLabels.length > 1
    ? `de ${report.monthLabels[0]} à ${report.monthLabels[report.monthLabels.length - 1]}`
    : (report.monthLabels[0] ?? '')

/** « Bilan financier », ou « Bilan financier de NOM (matricule) » pour un membre. */
export const reportTitle = (report: FinancialReport): string =>
  report.subject ? `Bilan financier de ${report.subject.name} (${report.subject.matricule})` : 'Bilan financier'

export const reportFileName = (report: FinancialReport, extension: 'xlsx' | 'pdf'): string => {
  const member = report.subject ? `${report.subject.matricule.replace(/[^\w.-]+/g, '_')}_` : ''
  return `bilan_financier_${member}${report.from}_${report.to}.${extension}`
}

/** Colonne finale : somme des mois pour un flux, valeur de fin de période pour un stock. */
export const TOTAL_COLUMN_LABEL = 'Total / fin'
