import type {
  FinancialReportBlock,
  FinancialReportBlockKey,
  FinancialReportLine,
  FinancialReportLineKind,
  FinancialReportLineLevel,
  FinancialReportLineUnit,
  FinancialReportModule,
  MonthKey,
} from '../entities/financial-report.types'

/** Mouvement daté d'un mois : un versement, une sortie, des intérêts… */
export interface MonthAmount {
  month: MonthKey | null
  amount: number
}

export const BLOCK_TITLES: Record<FinancialReportBlockKey, string> = {
  treasury: 'Trésorerie',
  result: 'Résultat',
  outstanding: 'Encours et créances',
  risks: 'Pertes et risques',
}

export const toNumber = (value: unknown): number => {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

/** Somme des mouvements de chaque mois de la période. */
export function flowValues(months: MonthKey[], events: MonthAmount[]): number[] {
  const byMonth = new Map<MonthKey, number>()
  for (const event of events) {
    if (!event.month) continue
    byMonth.set(event.month, (byMonth.get(event.month) ?? 0) + event.amount)
  }
  return months.map((month) => byMonth.get(month) ?? 0)
}

/** Cumul des mouvements à la fin de chaque mois, depuis le premier mouvement (avant la période comprise). */
export function stockValues(months: MonthKey[], events: MonthAmount[]): number[] {
  return months.map((month) =>
    events.reduce((sum, event) => (event.month && event.month <= month ? sum + event.amount : sum), 0)
  )
}

export const addValues = (...series: number[][]): number[] =>
  series[0].map((_, index) => series.reduce((sum, values) => sum + (values[index] ?? 0), 0))

export const subtractValues = (left: number[], right: number[]): number[] =>
  left.map((value, index) => value - (right[index] ?? 0))

/** Cumul des valeurs d'une série depuis le début de la période. */
export const runningTotal = (values: number[]): number[] => {
  let sum = 0
  return values.map((value) => (sum += value))
}

export function makeLine(
  key: string,
  label: string,
  values: number[],
  options: { kind?: FinancialReportLineKind; unit?: FinancialReportLineUnit; level?: FinancialReportLineLevel } = {}
): FinancialReportLine {
  const kind = options.kind ?? 'flow'
  const rounded = values.map((value) => Math.round(value))
  return {
    key,
    label,
    kind,
    unit: options.unit ?? 'fcfa',
    level: options.level ?? 'detail',
    values: rounded,
    total: kind === 'flow' ? rounded.reduce((sum, value) => sum + value, 0) : (rounded.at(-1) ?? 0),
  }
}

export const makeBlock = (key: FinancialReportBlockKey, lines: FinancialReportLine[]): FinancialReportBlock => ({
  key,
  title: BLOCK_TITLES[key],
  lines,
})

/** Ligne d'un module, par bloc et clé ; une série de zéros si elle n'existe pas. */
export function findLineValues(module: FinancialReportModule, blockKey: FinancialReportBlockKey, lineKey: string, size: number): number[] {
  const line = module.blocks.find((block) => block.key === blockKey)?.lines.find((entry) => entry.key === lineKey)
  return line ? line.values : new Array(size).fill(0)
}
