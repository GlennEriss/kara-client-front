import { HELP_TOPICS, HELP_CATEGORY_ORDER } from '@/domains/help/content'
import {
  HELP_SECTION_TITLES,
  type HelpTopic,
} from '@/domains/help/entities/help.types'
import { searchHelp } from '@/domains/help/utils/help-search'
import {
  adminAccessRedirect,
  type ResolvedAdminAccess,
} from '@/domains/auth/access-policy'
import {
  GROUP_TUTORIAL_LESSONS,
  GROUP_TUTORIAL_APPLY_MS,
  getGroupTutorialStepDuration,
} from '@/domains/groups/tutorial/group-tutorial'
import {
  TUTORIAL_CASES,
  TUTORIAL_GUIDANCE,
} from '@/domains/groups/tutorial/group-tutorial-guidance'

const excluded = new Set(['imports', 'reinitialisation'])
/** Partage les fiches du site sans exposer ses outils exclus du mobile. */
export function mobileHelpRows(access: ResolvedAdminAccess) {
  return HELP_TOPICS.filter(
    (t) => !excluded.has(t.key) && (!t.superAdminOnly || access.isSuperAdmin),
  )
    .map((t) => ({
      ...t,
      pages: t.pages.filter((p) => !adminAccessRedirect(p.path, access)),
    }))
    .filter((t) => t.pages.length > 0)
    .map((t) => {
      const topic: HelpTopic = JSON.parse(
        JSON.stringify(t).replaceAll(' et la réinitialisation', ''),
      )
      return {
        ...topic,
        id: topic.key,
        status: topic.category,
        ...(topic.demonstration === 'groups'
          ? {
              tutorial: {
                applyMs: GROUP_TUTORIAL_APPLY_MS,
                lessons: GROUP_TUTORIAL_LESSONS.map((lesson) => ({
                  ...lesson,
                  example: TUTORIAL_CASES[lesson.id],
                  steps: lesson.steps.map((step) => ({
                    ...step,
                    duration: getGroupTutorialStepDuration(step),
                    guidance: TUTORIAL_GUIDANCE[step.id],
                  })),
                })),
              },
            }
          : {}),
      }
    })
}
export function filterHelpRows(
  rows: Record<string, any>[],
  input: Record<string, any>,
): Record<string, any>[] {
  const available = rows.filter(
    (t) => !input.category || t.category === input.category,
  )
  return String(input.search || '').trim().length > 1
    ? searchHelp(available as HelpTopic[], input.search).map((r) => ({
        ...r.topic,
        searchMatches: r.sections,
      }))
    : available
}
export function helpOverview(rows: Record<string, any>[]) {
  return {
    total: rows.length,
    sectionTitles: HELP_SECTION_TITLES,
    categories: HELP_CATEGORY_ORDER.map((label) => {
      return {
        value: label,
        label,
        count: rows.filter((t) => t.category === label).length,
      }
    }).filter((c) => c.count > 0),
  }
}
