// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  mobileHelpRows,
  filterHelpRows,
  helpOverview,
} from '../server/help-presentation'
import { resolveAdminAccess } from '@/domains/auth/access-policy'
import { HELP_TOPICS } from '@/domains/help/content'
import { searchHelp } from '@/domains/help/utils/help-search'
import { GROUP_TUTORIAL_LESSONS } from '@/domains/groups/tutorial/group-tutorial'
import { POST as importPost } from '@/app/api/mobile/imports/route'
import { POST as resetPost } from '@/app/api/mobile/reset/route'
import { adminActions } from '../operations'
import { getAdminModule } from '../catalog'
import { mobileSections } from '@/domains/mobile/sections'
const superAdmin = resolveAdminAccess([{ role: 'SuperAdmin' }], {})
describe('centre d’aide et périmètre mobile', () => {
  it('désactive les anciens points d’entrée mobiles sans appeler les services métier', async () => {
    for (const post of [importPost, resetPost]) {
      const response = post()
      expect(response.status).toBe(404)
      expect((await response.json()).error).toContain('pas disponible')
    }
  })
  it('ne propose aucune mutation sur les fiches pédagogiques', () => {
    expect(
      adminActions(
        getAdminModule('help')!,
        getAdminModule('help')!.datasets[0],
      ),
    ).toEqual([])
  })
  it('exclut les imports et la remise à zéro sans modifier les contenus web', () => {
    const rows = mobileHelpRows(superAdmin)
    expect(rows).toHaveLength(27)
    expect(
      rows.some((t) => ['imports', 'reinitialisation'].includes(t.key)),
    ).toBe(false)
    expect(JSON.stringify(rows)).not.toContain(' et la réinitialisation')
    expect(JSON.stringify(HELP_TOPICS)).toContain(' et la réinitialisation')
    expect(mobileSections.some((s) => /import|reset/.test(s.key))).toBe(false)
    expect(
      helpOverview(rows).categories.some((c) => c.value === 'Vie de l’association'),
    ).toBe(true)
  })
  it('filtre les pages de chaque fiche et les accès directs par permissions', () => {
    const access = resolveAdminAccess(
      [{ role: 'Admin', permissions: ['members.view'] }],
      {},
    )
    const rows = mobileHelpRows(access)
    expect(rows.some((t) => t.key === 'bilans-financiers')).toBe(false)
    expect(rows.some((t) => t.key === 'caisse-speciale')).toBe(false)
    expect(rows.some((t) => t.key === 'membres')).toBe(true)
    const historyAccess = resolveAdminAccess(
      [{ role: 'Admin', permissions: ['paymentsHistory.view'] }],
      {},
    )
    expect(
      mobileHelpRows(historyAccess)
        .find((t) => t.key === 'historiques')
        ?.pages.map((p) => p.path),
    ).toEqual(['/payments-history'])
    const admin = resolveAdminAccess([{ role: 'Admin' }], {})
    expect(mobileHelpRows(admin).some((t) => t.superAdminOnly)).toBe(false)
  })
  it('garde le classement, les accents et les rubriques trouvées du moteur web', () => {
    const rows = mobileHelpRows(superAdmin)
    const result = filterHelpRows(rows, { search: 'paiement penalite' })
    const expected = searchHelp(rows as any, 'paiement pénalité')
    expect(result.map((t) => t.key)).toEqual(expected.map((t) => t.topic.key))
    expect(result[0].searchMatches).toEqual(expected[0].sections)
    expect(
      filterHelpRows(rows, { category: 'Membres' }).every(
        (t) => t.category === 'Membres',
      ),
    ).toBe(true)
    expect(filterHelpRows(rows, { search: 'zzzintrouvable' })).toEqual([])
    expect(helpOverview(rows).categories.reduce((n, c) => n + c.count, 0)).toBe(
      rows.length,
    )
  })
  it('transmet la fiche de prospection recherchable avec les mêmes consignes que le site', () => {
    const rows = mobileHelpRows(superAdmin)
    const result = filterHelpRows(rows, { search: 'prospection assurance' })
    const topic = result.find(t => t.key === 'vehicules')!
    expect(topic.pages.some((p: { path: string }) => p.path === '/vehicules/prospection')).toBe(true)
    expect(topic.sections).toEqual(HELP_TOPICS.find(t => t.key === 'vehicules')!.sections)
    expect(JSON.stringify(topic.sections)).toContain('J−15')
    expect(JSON.stringify(topic.sections)).toContain('LE KARA — Inconnu')
  })
  it('partage exactement les trois leçons et vingt gestes pédagogiques du site', () => {
    const topic = mobileHelpRows(superAdmin).find((t) => t.key === 'groupes')!
    expect(topic.tutorial!.lessons.map((l) => l.id)).toEqual(
      GROUP_TUTORIAL_LESSONS.map((l) => l.id),
    )
    expect(topic.tutorial!.lessons.flatMap((l) => l.steps)).toHaveLength(20)
    expect(topic.tutorial!.lessons[1].example.objective).toContain(
      '29 000 FCFA',
    )
    expect(
      topic
        .tutorial!.lessons.flatMap((l) => l.steps)
        .every(
          (s) => s.guidance.before && s.guidance.after && s.duration >= 9000,
        ),
    ).toBe(true)
  })
})
