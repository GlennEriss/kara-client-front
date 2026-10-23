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

export const reportFileName = (report: FinancialReport, extension: 'xlsx' | 'pdf'): string =>
  `bilan_financier_${report.from}_${report.to}.${extension}`

/** Colonne finale : somme des mois pour un flux, valeur de fin de période pour un stock. */
export const TOTAL_COLUMN_LABEL = 'Total / fin'
