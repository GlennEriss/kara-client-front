import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { createCallPlanBatch, listOverdueCallPlans, listCallPlans, rescheduleCallPlan } from '../callPlan'

const store = vi.hoisted(() => ({ data: new Map<string, Record<string, any>>(), next: 0, writes: vi.fn() }))
vi.mock('@/firebase/firestore', () => ({ db: {} }))
vi.mock('firebase/firestore', () => {
  const snapshot = (ref: { id: string }) => ({ ref, id: ref.id, exists: () => store.data.has(ref.id), data: () => store.data.get(ref.id)! })
  return {
    collection: (_db: unknown, name: string) => ({ name }),
    doc: (...args: unknown[]) => ({ id: args.length === 1 ? `new-${++store.next}` : String(args.at(-1)) }),
    where: (field: string, op: string, value: unknown) => ({ field, op, value }),
    orderBy: () => ({}),
    query: (_ref: unknown, ...filters: unknown[]) => filters,
    serverTimestamp: () => new Date(), Timestamp: { now: () => new Date() },
    getDocs: async (filters: Array<{ field?: string; op?: string; value?: any }>) => ({
      docs: [...store.data].filter(([, data]) => filters.every(({ field, op, value }) => !field || (op === '==' ? data[field] === value : op === '>=' ? data[field] >= value : data[field] <= value))).map(([id]) => snapshot({ id })),
    }),
    writeBatch: () => {
      const writes: Array<() => void> = []
      return { set: (ref: { id: string }, data: Record<string, any>) => writes.push(() => store.data.set(ref.id, data)), commit: async () => writes.forEach((write) => write()) }
    },
    runTransaction: async (_db: unknown, action: (tx: unknown) => Promise<unknown>) => {
      const writes: Array<() => void> = []
      const result = await action({ get: async (ref: { id: string }) => snapshot(ref), update: (ref: { id: string }, updates: Record<string, unknown>) => {
        store.writes(ref.id, updates)
        writes.push(() => store.data.set(ref.id, { ...store.data.get(ref.id), ...updates }))
      } })
      writes.forEach((write) => write())
      return result
    },
    updateDoc: vi.fn(), deleteDoc: vi.fn(),
  }
})

const target = { personKey: 'uid:member-1', product: 'Crédit Spéciale', name: 'Jeanne', isGroup: false, totalOverdue: 100_000, overdueCount: 2, maxDaysOverdue: 10 }
const assignee = { adminId: 'agent-1', email: 'agent@example.test', name: 'Agent A' }
const plan = (date: string, overrides = {}) => ({ ...target, scheduledDate: date, batchId: 'lot-1', status: 'planned', assignee, ...overrides })
const actor = { byId: 'super-1', byName: 'Super Admin' }

beforeEach(() => {
  store.data.clear(); store.writes.mockClear(); store.next = 0
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-11-08T12:00:00+01:00'))
})
afterEach(() => vi.useRealTimers())

describe('reports d’appels', () => {
  it('conserve l’ID, le lot et l’agent, et ajoute chaque report avec son auteur et son motif', async () => {
    store.data.set('appel-1', plan('2026-11-10'))
    expect(await rescheduleCallPlan({ id: 'appel-1', scheduledDate: '2026-11-13', reason: ' Attend son salaire ', ...actor })).toBe(1)
    expect(await rescheduleCallPlan({ id: 'appel-1', scheduledDate: '2026-11-16', ...actor })).toBe(1)
    expect(store.data.get('appel-1')).toMatchObject({ batchId: 'lot-1', assignee, originalScheduledDate: '2026-11-10', scheduledDate: '2026-11-16', status: 'planned', rescheduleHistory: [
      { from: '2026-11-10', to: '2026-11-13', reason: 'Attend son salaire', ...actor },
      { from: '2026-11-13', to: '2026-11-16', ...actor },
    ] })
    expect(store.data.size).toBe(1)
    const days = await listCallPlans('2026-11-16', '2026-11-22')
    expect(days[0].rescheduleHistory?.[0].at).toBeInstanceOf(Date)
    expect(await listCallPlans('2026-11-09', '2026-11-15')).toEqual([])
  })

  it('déplace tout le lot sur plusieurs semaines, en laissant les appels terminés et les autres lots intacts', async () => {
    store.data.set('a', plan('2026-11-03'))
    store.data.set('b', plan('2026-11-20', { assignee: { ...assignee, adminId: 'agent-2' } }))
    store.data.set('c', plan('2026-11-04', { status: 'completed' }))
    store.data.set('d', plan('2026-11-04', { batchId: 'autre-lot' }))
    expect(await rescheduleCallPlan({ batchId: 'lot-1', scheduledDate: '2026-12-02', ...actor })).toBe(2)
    expect(store.data.get('a')?.scheduledDate).toBe('2026-12-02')
    expect(store.data.get('b')?.assignee.adminId).toBe('agent-2')
    expect(store.data.get('c')?.scheduledDate).toBe('2026-11-04')
    expect(store.data.get('d')?.scheduledDate).toBe('2026-11-04')
  })

  it('ignore une tâche terminée, supprimée ou déjà à la date demandée', async () => {
    store.data.set('a', plan('2026-11-10', { status: 'completed' }))
    store.data.set('b', plan('2026-11-13'))
    for (const id of ['a', 'b', 'absent']) expect(await rescheduleCallPlan({ id, scheduledDate: '2026-11-13', ...actor })).toBe(0)
    expect(store.writes).not.toHaveBeenCalled()
  })

  it('replanifie aussi les lots de plus de 400 appels', async () => {
    for (let index = 0; index < 405; index++) store.data.set(`a-${index}`, plan('2026-11-10', { personKey: `uid:${index}` }))
    expect(await rescheduleCallPlan({ batchId: 'lot-1', scheduledDate: '2026-11-20', ...actor })).toBe(405)
    expect([...store.data.values()].every((item) => item.scheduledDate === '2026-11-20' && item.rescheduleHistory.length === 1)).toBe(true)
  })

  it.each(['2026-11-07', '2026-02-30', '2030-13-01', ''])('rejette une date passée ou invalide : %s', async (scheduledDate) => {
    await expect(rescheduleCallPlan({ id: 'a', scheduledDate, ...actor })).rejects.toThrow('Choisissez une date')
    expect(store.writes).not.toHaveBeenCalled()
  })

  it('retrouve les appels à replanifier de toutes les semaines, sans modifier leur état', async () => {
    store.data.set('a', plan('2026-10-01'))
    store.data.set('b', plan('2026-11-08'))
    store.data.set('c', plan('2026-11-07', { status: 'completed' }))
    expect((await listOverdueCallPlans()).map((item) => item.id)).toEqual(['a'])
    expect(store.writes).not.toHaveBeenCalled()
  })
})

describe('création après des reports', () => {
  it('permet une date éloignée et ne réécrit jamais une ancienne tâche déplacée', async () => {
    store.data.set('ancien-id', plan('2026-12-10', { rescheduleHistory: [{ from: '2026-11-10', to: '2026-12-10', ...actor }] }))
    expect(await createCallPlanBatch({ scheduledDate: '2026-11-10', targets: [target, target], createdById: 'super-1', createdByName: 'Admin', assignee })).toBe(1)
    expect(store.data.get('ancien-id')?.scheduledDate).toBe('2026-12-10')
    expect(store.data.size).toBe(2)
    expect(await createCallPlanBatch({ scheduledDate: '2026-12-10', targets: [target], createdById: 'super-1', createdByName: 'Admin' })).toBe(0)
    expect(store.data.get('ancien-id')?.rescheduleHistory).toHaveLength(1)
  })
})
