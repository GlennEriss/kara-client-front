/** Contenu d'une fiche d'aide, en blocs simples rendus de la même façon partout. */
export type HelpBlock =
  | { type: 'text'; text: string }
  | { type: 'list'; items: string[] }
  /** Marche à suivre numérotée. */
  | { type: 'steps'; title: string; items: string[] }
  /** Termes et leur définition : statuts, notions, colonnes. */
  | { type: 'definitions'; items: Array<{ term: string; text: string }> }
  | { type: 'faq'; items: Array<{ question: string; answer: string }> }
  /** Encadré : `warning` pour une action irréversible ou une limite à connaître. */
  | { type: 'note'; tone: 'info' | 'warning'; text: string }

export type HelpSectionKind = 'purpose' | 'howto' | 'rules' | 'statuses' | 'faq'

export interface HelpSection {
  kind: HelpSectionKind
  blocks: HelpBlock[]
}

/** Page de l'application couverte par une fiche. */
export interface HelpPage {
  /** Préfixe d'URL : la page et ses sous-pages (ex. `/credit-speciale/contrats`). */
  path: string
  label: string
  /** Ce qu'on fait sur cette page, affiché quand l'aide est ouverte depuis elle. */
  summary: string
}

export type HelpCategory = 'Pilotage' | 'Épargne' | 'Crédits' | 'Placements' | 'Utiliser l’aide'

export interface HelpTopic {
  key: string
  title: string
  category: HelpCategory
  summary: string
  pages: HelpPage[]
  sections: HelpSection[]
  /** Fiche réservée au super admin (comme la section qu'elle documente). */
  superAdminOnly?: boolean
}

export const HELP_SECTION_TITLES: Record<HelpSectionKind, string> = {
  purpose: 'À quoi sert cette section',
  howto: 'Pas à pas',
  rules: 'Règles et calculs',
  statuses: 'Statuts',
  faq: 'Questions fréquentes',
}
