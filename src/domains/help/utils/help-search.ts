import type { HelpBlock, HelpPage, HelpTopic } from '../entities/help.types'
import { HELP_SECTION_TITLES } from '../entities/help.types'

/** Texte en minuscules, sans accents : « Pénalité » se trouve en tapant « penalite ». */
export const normalizeHelpText = (value: string): string =>
  value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

const blockText = (block: HelpBlock): string[] => {
  switch (block.type) {
    case 'text':
    case 'note':
      return [block.text]
    case 'list':
      return block.items
    case 'steps':
      return [block.title, ...block.items]
    case 'definitions':
      return block.items.flatMap((item) => [item.term, item.text])
    case 'faq':
      return block.items.flatMap((item) => [item.question, item.answer])
  }
}

const matchesPath = (pathname: string, page: HelpPage) => pathname === page.path || pathname.startsWith(`${page.path}/`)

/**
 * Fiche et page correspondant à une URL : la page dont le préfixe est le plus
 * long l'emporte (`/caisse-speciale/demandes` avant `/caisse-speciale`).
 */
export function findHelpContext(topics: HelpTopic[], pathname: string): { topic: HelpTopic; page: HelpPage } | null {
  let best: { topic: HelpTopic; page: HelpPage } | null = null
  for (const topic of topics) {
    for (const page of topic.pages) {
      if (matchesPath(pathname, page) && (!best || page.path.length > best.page.path.length)) best = { topic, page }
    }
  }
  return best
}

export interface HelpSearchResult {
  topic: HelpTopic
  /** Titres des sections où les mots apparaissent. */
  sections: string[]
}

/** Petits mots ignorés dans une recherche : « mois de repos » cherche « mois » et « repos ». */
const STOP_WORDS = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'un', 'une', 'et', 'en', 'au', 'aux', 'a', 'l', 'd', 'pour', 'sur'])

const countOccurrences = (text: string, part: string) => (part ? text.split(part).length - 1 : 0)

/**
 * Fiches contenant tous les mots de la recherche, la plus pertinente d'abord :
 * mots dans le titre ou le résumé, nombre d'occurrences, expression exacte.
 */
export function searchHelp(topics: HelpTopic[], query: string): HelpSearchResult[] {
  const phrase = normalizeHelpText(query).trim().replace(/\s+/g, ' ')
  const words = phrase.split(/[\s'’]+/).filter((word) => word.length > 1 && !STOP_WORDS.has(word))
  if (words.length === 0) return []

  return topics
    .map((topic) => {
      const title = normalizeHelpText(topic.title)
      const header = normalizeHelpText([topic.title, topic.summary, ...topic.pages.flatMap((page) => [page.label, page.summary])].join(' '))
      const sections = topic.sections.map((section) => ({
        title: HELP_SECTION_TITLES[section.kind],
        text: normalizeHelpText(section.blocks.flatMap(blockText).join(' ')),
      }))
      const fullText = `${header} ${sections.map((section) => section.text).join(' ')}`
      if (!words.every((word) => fullText.includes(word))) return null
      const score =
        words.reduce(
          (sum, word) => sum + (title.includes(word) ? 10 : 0) + (header.includes(word) ? 3 : 0) + Math.min(countOccurrences(fullText, word), 5),
          0
        ) + (words.length > 1 ? countOccurrences(fullText, phrase) * 4 : 0)
      return {
        topic,
        sections: sections.filter((section) => words.some((word) => section.text.includes(word))).map((section) => section.title),
        score,
      }
    })
    .filter((result): result is HelpSearchResult & { score: number } => result !== null)
    .sort((left, right) => right.score - left.score)
    .map(({ topic, sections }) => ({ topic, sections }))
}
