import type {
  FinancialReport,
  FinancialReportBlockKey,
  FinancialReportModuleKey,
} from '../entities/financial-report.types'

export type ReportExportFormat = 'excel' | 'pdf'

/**
 * - `full` : guide de lecture, explication de chaque partie et de chaque ligne, bases de calcul ;
 * - `minimal` : une phrase par partie et une légende de lecture ;
 * - `none` : les tableaux seuls.
 */
export type ReportTextLevel = 'full' | 'minimal' | 'none'

export interface ReportExportOptions {
  format: ReportExportFormat
  textLevel: ReportTextLevel
  modules: FinancialReportModuleKey[]
  blocks: FinancialReportBlockKey[]
}

export const REPORT_TEXT_LEVELS: Array<{ value: ReportTextLevel; label: string; description: string }> = [
  {
    value: 'full',
    label: 'Complet',
    description: 'Guide de lecture, explication de chaque partie et de chaque ligne, bases de calcul.',
  },
  {
    value: 'minimal',
    label: 'Minimal',
    description: 'Une phrase sous chaque partie et une courte légende de lecture.',
  },
  {
    value: 'none',
    label: 'Sans texte',
    description: 'Uniquement les tableaux de chiffres.',
  },
]

export const REPORT_BLOCK_KEYS: FinancialReportBlockKey[] = ['treasury', 'result', 'outstanding', 'risks']

/** Légende du niveau minimal : juste ce qu'il faut pour lire les colonnes. */
export const REPORT_MINIMAL_LEGEND =
  'Montants en FCFA. « Total / fin » : somme des mois, ou valeur à la fin de la période pour les lignes « fin de mois ».'

export const DEFAULT_REPORT_EXPORT_OPTIONS: ReportExportOptions = {
  format: 'pdf',
  textLevel: 'full',
  modules: ['synthesis', 'caisse_speciale', 'caisse_imprevue', 'credit_speciale', 'credit_fixe', 'credit_aide', 'placements', 'adhesions'],
  blocks: REPORT_BLOCK_KEYS,
}

/** Le bilan réduit aux onglets et aux parties choisis ; un onglet sans partie restante disparaît. */
export function selectReportContent(
  report: FinancialReport,
  options: Pick<ReportExportOptions, 'modules' | 'blocks'>
): FinancialReport {
  return {
    ...report,
    modules: report.modules
      .filter((module) => options.modules.includes(module.key))
      .map((module) => ({ ...module, blocks: module.blocks.filter((block) => options.blocks.includes(block.key)) }))
      .filter((module) => module.blocks.length > 0),
  }
}

const STORAGE_KEY = 'kara.financialReport.exportOptions'

/** Derniers choix de l'admin sur ce navigateur ; les valeurs par défaut si rien n'est lisible. */
export function loadReportExportOptions(): ReportExportOptions {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_REPORT_EXPORT_OPTIONS
    const saved = JSON.parse(raw) as Partial<ReportExportOptions>
    return {
      format: saved.format === 'excel' || saved.format === 'pdf' ? saved.format : DEFAULT_REPORT_EXPORT_OPTIONS.format,
      textLevel: REPORT_TEXT_LEVELS.some((level) => level.value === saved.textLevel)
        ? (saved.textLevel as ReportTextLevel)
        : DEFAULT_REPORT_EXPORT_OPTIONS.textLevel,
      modules: Array.isArray(saved.modules)
        ? DEFAULT_REPORT_EXPORT_OPTIONS.modules.filter((key) => saved.modules!.includes(key))
        : DEFAULT_REPORT_EXPORT_OPTIONS.modules,
      blocks: Array.isArray(saved.blocks) ? REPORT_BLOCK_KEYS.filter((key) => saved.blocks!.includes(key)) : REPORT_BLOCK_KEYS,
    }
  } catch {
    return DEFAULT_REPORT_EXPORT_OPTIONS
  }
}

export function saveReportExportOptions(options: ReportExportOptions): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(options))
  } catch {
    // Stockage indisponible (navigation privée…) : les choix ne seront pas retenus.
  }
}
