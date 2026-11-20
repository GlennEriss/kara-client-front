// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { toolRequestSchema, toolCalendarPath, toolDashboardPath } from '../tool-session'

describe('liens des outils mobiles', () => {
  it('ouvre la bonne échéance pour chaque produit, même lorsque les identifiants sont réutilisés', () => {
    const items = [
      ['caisse-speciale', 'caisse-speciale:C1:P1', 'cs:C1:P1'],
      ['caisse-imprevue', 'caisse-imprevue:C2:0', 'ci:C2:0'],
      ['credit-speciale', 'credit-speciale:C3:C3-M2', 'credit:C3:2'],
      ['credit-fixe', 'credit-fixe:C4:C4-M3', 'credit:C4:3'],
      ['caisse-aide', 'caisse-aide:C5:C5-M4', 'credit:C5:4'],
      ['placement', 'placement:C6:P2', 'placement:C6:P2'],
    ]
    for (const [module, eventId, focus] of items) {
      const input = toolRequestSchema.parse({ target: 'calendar', module, eventId, date: '2026-11-17' })
      const url = new URL(toolCalendarPath(input), 'https://admin.example')
      expect(url.searchParams.get('tab')).toBe(module)
      expect(url.searchParams.get('month')).toBe('2026-11')
      expect(url.searchParams.get('focus')).toBe(focus)
    }
  })
  it('refuse les chemins libres, les dates impossibles et les échéances incohérentes', () => {
    expect(toolRequestSchema.safeParse({ target: 'calendar', url: 'https://evil.example' }).success).toBe(false)
    expect(toolRequestSchema.safeParse({ target: 'calendar', date: '2026-02-31' }).success).toBe(false)
    for (const eventId of ['caisse-speciale:C/1:P1', 'credit-fixe:C1:C2-M1', 'caisse-imprevue:C1:abc', 'placement:C1:P1:extra']) {
      const module = eventId.split(':')[0]
      expect(() => toolCalendarPath(toolRequestSchema.parse({ target: 'calendar', module, eventId }))).toThrow()
    }
    expect(() => toolCalendarPath({ target: 'calendar', module: 'caisse-speciale', contractId: 'C2', eventId: 'caisse-speciale:C1:P1' })).toThrow()
  })
  it('conserve la période et la section choisies et cible le plan d’appels', () => {
    expect(toolDashboardPath({ target: 'dashboard', tab: 'placements', period: '7d' })).toBe('/dashboard?tab=placements&period=7d')
    expect(toolCalendarPath({ target: 'calls' })).toBe('/calendrier?tab=caisse-speciale#call-plan')
  })
})
