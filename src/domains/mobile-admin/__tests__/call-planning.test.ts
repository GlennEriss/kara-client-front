import { describe, it, expect, vi } from 'vitest'
import { getAdminModule } from '../catalog'
import { administrationActions } from '../operations/administration'
import {
  actionSchema,
  redactAdminAmounts,
  type AdminContext,
} from '../server/registry'
const module = getAdminModule('calls')!
const log = {
  personKey: 'member:M1',
  memberId: 'M1',
  name: 'Membre test',
  product: 'Caisse spéciale',
  totalOverdue: 20000,
  overdueCount: 2,
  maxDaysOverdue: 15,
}
function context() {
  const create = vi.fn().mockResolvedValue(1),
    reschedule = vi.fn().mockResolvedValue(3)
  const ctx = {
    id: 'PLAN1',
    row: { batchId: 'LOT1' },
    caller: { claims: { uid: 'ADMIN1', email: 'admin@example.test' } },
    services: {
      callPlans: {
        createCallPlanBatch: create,
        rescheduleCallPlan: reschedule,
      },
      db: {
        collection: () => ({
          doc: (id: string) => ({
            get: async () => ({ exists: id === 'LOG1', data: () => log }),
          }),
        }),
      },
    },
  } as unknown as AdminContext
  return { ctx, create, reschedule }
}
describe('lots de relances natifs', () => {
  it('prend la situation financière dans les comptes rendus du serveur et déduplique la sélection', async () => {
    const { ctx, create } = context()
    const action = administrationActions(
      module,
      module.datasets.find((d) => d.key === 'logs')!,
    ).find((a) => a.id === 'call.batch.schedule')!
    const data = actionSchema(action).parse({
      scheduledDate: '2027-01-01',
      targets: [{ logId: 'LOG1' }, { logId: 'LOG1' }],
    })
    await action.run(ctx, data)
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        targets: [expect.objectContaining(log)],
        createdById: 'ADMIN1',
      }),
    )
    expect(
      actionSchema(action).safeParse({
        ...(data as Record<string, unknown>),
        totalOverdue: 1,
      }).success,
    ).toBe(false)
  })
  it('refuse un compte rendu disparu avant de créer un lot', async () => {
    const { ctx, create } = context()
    const action = administrationActions(module, module.datasets[0]).find(
      (a) => a.id === 'call.batch.schedule',
    )!
    await expect(
      action.run(ctx, {
        scheduledDate: '2027-01-01',
        targets: [{ logId: 'absent' }],
      }),
    ).rejects.toThrow('introuvable')
    expect(create).not.toHaveBeenCalled()
  })
  it('reporte le lot réel de la tâche avec le service existant', async () => {
    const { ctx, reschedule } = context()
    const action = administrationActions(
      module,
      module.datasets.find((d) => d.key === 'plans')!,
    ).find((a) => a.id === 'plan.batch.reschedule')!
    expect(action.superAdminOnly).toBe(true)
    await action.run(ctx, {
      scheduledDate: '2027-01-02',
      reason: 'Nouvelle disponibilité',
    })
    expect(reschedule).toHaveBeenCalledWith(
      expect.objectContaining({ batchId: 'LOT1', byId: 'ADMIN1' }),
    )
  })
  it('masque les montants imbriqués du recouvrement en conservant les dates et les compteurs', () => {
    const data = {
      totalOverdue: 20000,
      overdueCount: 2,
      related: [{ payment: { amount: 5000, date: '2027-01-01' } }],
    }
    expect(redactAdminAmounts(data, false)).toEqual({
      totalOverdue: null,
      overdueCount: 2,
      related: [{ payment: { amount: null, date: '2027-01-01' } }],
    })
    expect(redactAdminAmounts(data, true)).toBe(data)
  })
})
