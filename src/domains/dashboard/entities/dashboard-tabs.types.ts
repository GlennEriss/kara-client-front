export const DASHBOARD_TAB_DEFINITIONS = [
  { key: 'executive', label: 'Executive', shortLabel: 'Exec' },
  { key: 'caisse_speciale', label: 'Caisse speciale', shortLabel: 'CS' },
  { key: 'caisse_imprevue', label: 'Caisse imprevue', shortLabel: 'CI' },
  { key: 'credit_speciale', label: 'Credit speciale', shortLabel: 'CrSpec' },
  { key: 'credit_fixe', label: 'Credit fixe', shortLabel: 'CFixe' },
  { key: 'caisse_aide', label: 'Caisse aide', shortLabel: 'CAide' },
  { key: 'placements', label: 'Placements', shortLabel: 'Place' },
  { key: 'administration', label: 'Administration', shortLabel: 'Admin' },
  { key: 'recouvrement', label: 'Recouvrement', shortLabel: 'Reco' },
  { key: 'groupes', label: 'Groupes', shortLabel: 'Groupes' },
  { key: 'metiers', label: 'Metiers', shortLabel: 'Metiers' },
  { key: 'geographie', label: 'Geographie', shortLabel: 'Geo' },
] as const

export type DashboardTabKey = (typeof DASHBOARD_TAB_DEFINITIONS)[number]['key']

export const DEFAULT_DASHBOARD_TAB: DashboardTabKey = 'executive'

export const DASHBOARD_TAB_KEYS: DashboardTabKey[] = DASHBOARD_TAB_DEFINITIONS.map((tab) => tab.key)
