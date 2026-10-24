import * as fs from 'fs'
import * as path from 'path'
import { describe, expect, it } from 'vitest'
import { HELP_TOPICS } from '../content'
import { findHelpContext, searchHelp } from '../utils/help-search'

const ADMIN_APP_DIR = path.join(process.cwd(), 'src', 'app', '(admin)')

describe('aide : fiche de la page en cours', () => {
  it('choisit la page la plus précise', () => {
    expect(findHelpContext(HELP_TOPICS, '/caisse-speciale/demandes/nouvelle')?.page.label).toBe('Demandes')
    expect(findHelpContext(HELP_TOPICS, '/caisse-speciale/contrats/abc/versements')?.page.label).toBe('Contrats')
    expect(findHelpContext(HELP_TOPICS, '/credit-speciale/contrats/MK_CSP_1')?.topic.key).toBe('credit-speciale')
    expect(findHelpContext(HELP_TOPICS, '/credit-fixe/simulation')?.topic.key).toBe('credit-fixe')
  })

  it('ne confond pas deux URL qui commencent pareil', () => {
    expect(findHelpContext(HELP_TOPICS, '/placements-archives')).toBeNull()
    expect(findHelpContext(HELP_TOPICS, '/memberships')).toBeNull()
  })
})

describe('aide : recherche', () => {
  it('trouve un mot sans tenir compte des accents ni des majuscules', () => {
    const keys = searchHelp(HELP_TOPICS, 'PENALITE').map((result) => result.topic.key)
    expect(keys).toContain('credit-speciale')
    expect(keys).toContain('caisse-speciale')
  })

  it('demande tous les mots et indique la section', () => {
    const [first] = searchHelp(HELP_TOPICS, 'mois de repos')
    expect(first.topic.key).toBe('credit-speciale')
    expect(searchHelp(HELP_TOPICS, 'sortie anticipée commission')[0].topic.key).toBe('placements')
    expect(searchHelp(HELP_TOPICS, 'zzzz')).toEqual([])
  })
})

describe('aide : contenu', () => {
  it('chaque fiche a une clé unique, un résumé et sa section « À quoi sert »', () => {
    const keys = HELP_TOPICS.map((topic) => topic.key)
    expect(new Set(keys).size).toBe(keys.length)
    for (const topic of HELP_TOPICS) {
      expect(topic.summary.trim(), topic.key).not.toBe('')
      expect(topic.sections.map((section) => section.kind), topic.key).toContain('purpose')
    }
  })

  it('chaque page n’est couverte que par une fiche et existe dans l’application', () => {
    const paths = HELP_TOPICS.flatMap((topic) => topic.pages.map((page) => page.path))
    expect(new Set(paths).size).toBe(paths.length)
    for (const pagePath of paths) {
      expect(fs.existsSync(path.join(ADMIN_APP_DIR, pagePath)), pagePath).toBe(true)
    }
  })
})
