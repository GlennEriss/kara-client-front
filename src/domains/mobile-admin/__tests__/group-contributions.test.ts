import { describe, expect, it } from 'vitest'
import { findPlannedContribution } from '../server/group-contributions'
import type { GroupProject } from '@/types/types'
const project = {
  id: 'P1',
  contributionPlan: {
    amount: 10000,
    participants: [{ id: 'M1', name: 'Alice' }],
    periods: [{ period: '2026-11', dueDate: '2026-11-05' }],
  },
} as GroupProject
describe('cotisations prévues des projets', () => {
  it('résout une cotisation sans document enregistré sans créer un versement', () => {
    expect(findPlannedContribution(project, 'P1__2026-11__M1')).toMatchObject({
      projectId: 'P1',
      memberId: 'M1',
      amount: 10000,
      payments: [],
    })
  })
  it('rejette une référence hors projet, période ou participant', () => {
    for (const id of ['P2__2026-11__M1', 'P1__2027-01__M1', 'P1__2026-11__M2'])
      expect(findPlannedContribution(project, id)).toBeUndefined()
  })
})
