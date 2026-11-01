export const DASHBOARD_TAB_DEFINITIONS = [
  { key: 'executive', label: 'Exécutif', shortLabel: 'Exec' },
  { key: 'caisse_speciale', label: 'Caisse spéciale', shortLabel: 'CS' },
  { key: 'caisse_imprevue', label: 'Caisse imprévue', shortLabel: 'CI' },
  { key: 'credit_speciale', label: 'Crédit spécial', shortLabel: 'CrSpec' },
  { key: 'credit_fixe', label: 'Crédit fixe', shortLabel: 'CFixe' },
  { key: 'caisse_aide', label: 'Caisse aide', shortLabel: 'CAide' },
  { key: 'placements', label: 'Placements', shortLabel: 'Place' },
  { key: 'administration', label: 'Administration', shortLabel: 'Admin' },
  { key: 'recouvrement', label: 'Recouvrement', shortLabel: 'Reco' },
  { key: 'groupes', label: 'Groupes', shortLabel: 'Groupes' },
  { key: 'metiers', label: 'Métiers', shortLabel: 'Métiers' },
  { key: 'geographie', label: 'Géographie', shortLabel: 'Géo' },
] as const

export type DashboardTabKey = (typeof DASHBOARD_TAB_DEFINITIONS)[number]['key']

export const DEFAULT_DASHBOARD_TAB: DashboardTabKey = 'executive'

export const DASHBOARD_TAB_KEYS: DashboardTabKey[] = DASHBOARD_TAB_DEFINITIONS.map((tab) => tab.key)
