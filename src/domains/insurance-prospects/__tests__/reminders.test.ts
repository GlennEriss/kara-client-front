import { describe, expect, it } from 'vitest'
import { notifyInsuranceProspects } from '../../../../functions/src/scheduled/insuranceProspects'

function store(rows: Record<string, any>[]) {
  const notifications = new Map<string, any>()
  const db = {
    collection: (name: string) =>
      name === 'insurance-prospects'
        ? {
            where: (_key: string, _op: string, statuses: string[]) => ({
              get: async () => ({
                docs: rows
                  .filter((r) => statuses.includes(r.status))
                  .map((r, i) => ({ id: `p${i}`, data: () => r })),
              }),
            }),
          }
        : { doc: (id: string) => ({ id }) },
    runTransaction: async (fn: any) =>
      fn({
        get: async (ref: any) => ({ exists: notifications.has(ref.id) }),
        set: (ref: any, value: any) => notifications.set(ref.id, value),
      }),
  }
  return { notifications, db }
}
describe('rappels automatiques de prospection', () => {
  const now = new Date('2026-11-20T12:00:00Z')
  it('crée les rappels admin et parrain une seule fois par palier et nouvelle échéance', async () => {
    const row = {
      status: 'tracking',
      sponsorMemberId: 'M001',
      endDate: '2026-12-20',
      plateNumber: 'TEST',
      ownerName: 'Fictif',
      insuranceCompany: 'Autre',
    }
    const s = store([row])
    await notifyInsuranceProspects(s.db as never, now)
    await notifyInsuranceProspects(s.db as never, now)
    expect(s.notifications.size).toBe(2)
    expect(
      [...s.notifications.values()].filter((n) => n.recipientId === 'M001'),
    ).toHaveLength(1)
    expect([...s.notifications.values()][0].metadata).toMatchObject({
      dataset: 'prospects',
      prospectId: 'p0',
      stage: 30,
    })
    await notifyInsuranceProspects(
      s.db as never,
      new Date('2026-12-05T12:00:00Z'),
    )
    expect(s.notifications.size).toBe(4)
    row.endDate = '2027-01-04'
    await notifyInsuranceProspects(
      s.db as never,
      new Date('2026-12-05T12:00:00Z'),
    )
    expect(s.notifications.size).toBe(6)
  })
  it('réserve à l’administration les prospects LE KARA et ignore les suivis clôturés', async () => {
    const s = store([
      {
        status: 'tracking',
        sponsorMemberId: '2548.MK.290126',
        endDate: '2026-11-20',
      },
      { status: 'converted', sponsorMemberId: 'M001', endDate: '2026-11-20' },
      { status: 'lost', sponsorMemberId: 'M001', endDate: '2026-11-20' },
    ])
    await notifyInsuranceProspects(s.db as never, now)
    expect(s.notifications.size).toBe(1)
    expect([...s.notifications.values()][0]).not.toHaveProperty('recipientId')
  })
  it('rappelle une relance personnalisée, même avant J−30, sans répétition quotidienne', async () => {
    const s = store([
      {
        status: 'contacted',
        sponsorMemberId: 'M001',
        endDate: '2027-10-01',
        followUpDate: '2026-11-19',
      },
    ])
    await notifyInsuranceProspects(s.db as never, now)
    await notifyInsuranceProspects(
      s.db as never,
      new Date('2026-11-21T12:00:00Z'),
    )
    expect(s.notifications.size).toBe(2)
    expect([...s.notifications.values()][0].title).toContain('relance prévue')
  })
})
