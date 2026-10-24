/** Mois au format `YYYY-MM`, heure de Libreville. */
export type MonthKey = string

/**
 * - `flow` : montant du mois (versements, sorties…) ; le total est la somme ;
 * - `stock` : valeur à la fin du mois (reste dû, épargne détenue…) ; le total
 *   est la valeur du dernier mois.
 */
export type FinancialReportLineKind = 'flow' | 'stock'

export type FinancialReportLineUnit = 'fcfa' | 'count'

/** `info` : ligne donnée pour information, jamais incluse dans un total. */
export type FinancialReportLineLevel = 'detail' | 'subtotal' | 'total' | 'info'

export interface FinancialReportLine {
  key: string
  label: string
  kind: FinancialReportLineKind
  unit: FinancialReportLineUnit
  level: FinancialReportLineLevel
  /** Ce que la ligne mesure, en langage courant. */
  description: string
  values: number[]
  total: number
}

export type FinancialReportBlockKey = 'treasury' | 'result' | 'outstanding' | 'risks'

export interface FinancialReportBlock {
  key: FinancialReportBlockKey
  title: string
  /** Ce que la partie montre et comment la lire. */
  description: string
  lines: FinancialReportLine[]
}

export type FinancialReportModuleKey =
  | 'synthesis'
  | 'caisse_speciale'
  | 'caisse_imprevue'
  | 'credit_speciale'
  | 'credit_fixe'
  | 'credit_aide'
  | 'placements'
  | 'adhesions'

export interface FinancialReportModule {
  key: FinancialReportModuleKey
  title: string
  description: string
  blocks: FinancialReportBlock[]
  /** Bases de calcul propres au module. */
  notes: string[]
}

/** Membre d'un bilan individuel : le bilan ne porte que sur ses contrats et paiements. */
export interface FinancialReportSubject {
  memberId: string
  matricule: string
  name: string
}

export interface FinancialReport {
  /** Absent pour le bilan de l'association. */
  subject?: FinancialReportSubject
  from: MonthKey
  to: MonthKey
  months: MonthKey[]
  monthLabels: string[]
  generatedAt: string
  modules: FinancialReportModule[]
}

/** Période maximale d'un bilan, en mois. */
export const FINANCIAL_REPORT_MAX_MONTHS = 36

/**
 * Période maximale du bilan d'un membre : « toute la période » couvre toute
 * son histoire, avec moins de lignes à calculer qu'un bilan de l'association.
 */
export const MEMBER_FINANCIAL_REPORT_MAX_MONTHS = 120
