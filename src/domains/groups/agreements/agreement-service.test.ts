import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cancelGroupAgreement,
  createGroupAgreements,
  recordAgreementPayment,
  recordAgreementRemittance,
  recordAgreementReminder,
  voidAgreementPayment,
  voidAgreementRemittance,
} from './agreement-service'
import {
  generateAgreementSchedule,
  type AgreementBatchDraft,
  type GroupAgreement,
} from './agreement-model'

type RecordData = Record<string, unknown>
const memory = vi.hoisted(() => ({
  documents: new Map<string, RecordData>(),
  queue: Promise.resolve(),
  writes: [] as string[],
}))
vi.mock('@/firebase/firestore', () => ({ db: {} }))
vi.mock('firebase/firestore', () => {
  const reference = (...parts: string[]) => ({ path: parts.join('/'), id: parts.at(-1)! })
  return {
    doc: (_db: unknown, ...parts: string[]) => reference(...parts),
    collection: (_db: unknown, ...parts: string[]) => reference(...parts),
    serverTimestamp: () => 'server-time',
    getDocs: async (ref: { path: string }) => ({
      docs: [...memory.documents]
        .filter(
          ([p]) =>
            p.startsWith(`${ref.path}/`) && p.split('/').length === ref.path.split('/').length + 1,
        )
        .map(([p, data]) => ({ id: p.split('/').at(-1), data: () => structuredClone(data) })),
    }),
    // Serialize commits as a deterministic transaction test double; stage every
    // write and assert Firestore's read-before-write constraint.
    runTransaction: async (_db: unknown, action: (tx: unknown) => Promise<unknown>) => {
      const execution = memory.queue.then(async () => {
        const staged: { path: string; data: RecordData; merge: boolean }[] = []
        const result = await action({
          get: async (ref: { path: string; id: string }) => {
            if (staged.length) throw new Error('read after write')
            const data = memory.documents.get(ref.path)
            return {
              id: ref.id,
              ref,
              exists: () => !!data,
              data: () => (data ? structuredClone(data) : undefined),
            }
          },
          set: (ref: { path: string }, data: RecordData) =>
            staged.push({ path: ref.path, data, merge: false }),
          update: (ref: { path: string }, data: RecordData) =>
            staged.push({ path: ref.path, data, merge: true }),
        })
        for (const write of staged) {
          memory.documents.set(
            write.path,
            structuredClone({
              ...(write.merge ? memory.documents.get(write.path) : {}),
              ...write.data,
            }),
          )
          memory.writes.push(write.path)
        }
        return result
      })
      memory.queue = execution.then(
        () => undefined,
        () => undefined,
      )
      return execution
    },
  }
})
const actor = { id: 'admin', name: 'Gestionnaire' }
const draft = (): AgreementBatchDraft => ({
  requestId: 'batch-001',
  groupId: 'g1',
  creditorId: 'seller',
  kind: 'SALE',
  title: 'Ventilateurs',
  description: '',
  agreementDate: '2026-09-01',
  buyers: ['bob', 'paul'].map((debtorId) => ({
    debtorId,
    quantity: 1,
    unitAmount: 60000,
    schedule: generateAgreementSchedule(60000, 3, '2026-09-10'),
  })),
})
const path = 'groups/g1/agreements/batch-001_bob'
const getAgreement = () => memory.documents.get(path) as unknown as GroupAgreement
const money = (
  id: string,
  amount: number,
  receivedBy: 'KARA' | 'CREDITOR' = 'KARA',
  date = '2026-09-05',
) => ({ id, amount, receivedBy, date, mode: 'CASH' as const })
const pay = (id: string, amount: number, route: 'KARA' | 'CREDITOR' = 'KARA') =>
  recordAgreementPayment('g1', 'batch-001_bob', money(id, amount, route), actor)
const remit = (id: string, amount: number, date = '2026-09-06') =>
  recordAgreementRemittance('g1', 'batch-001_bob', { id, amount, date, mode: 'CASH' }, actor)

beforeEach(() => {
  memory.documents.clear()
  memory.writes = []
  memory.queue = Promise.resolve()
  memory.documents.set('groups/g1', { name: 'Solidaires', projects: [] })
  for (const id of ['seller', 'bob', 'paul'])
    memory.documents.set(`users/${id}`, {
      firstName: id,
      lastName: 'ONDO',
      matricule: `M-${id}`,
      roles: ['Adherant'],
      groupIds: ['g1'],
    })
})
describe('opérations des accords entre membres', () => {
  it('crée un accord par acheteur atomiquement, sans versement ni montants privés sur le groupe', async () => {
    const ids = await createGroupAgreements(draft(), actor)
    expect(ids).toHaveLength(2)
    expect(getAgreement()).toMatchObject({
      debtorId: 'bob',
      totalAmount: 60000,
      payments: [],
      remittances: [],
    })
    expect(memory.documents.get('groupAgreementLedgers/g1')).toMatchObject({
      agreementCount: 2,
      openByMember: { seller: 2, bob: 1, paul: 1 },
    })
    expect(memory.documents.get('groups/g1')).not.toHaveProperty('openByMember')
    expect(memory.documents.get('groups/g1')).not.toHaveProperty('agreements')
  })
  it('rend les tentatives répétées idempotentes et refuse de changer la même création', async () => {
    const [first, second] = await Promise.all([
      createGroupAgreements(draft(), actor),
      createGroupAgreements(draft(), actor),
    ])
    expect(second).toEqual(first)
    expect(memory.documents.get('groupAgreementLedgers/g1')?.agreementCount).toBe(2)
    const modified = draft()
    modified.title = 'Autre matériel'
    await expect(createGroupAgreements(modified, actor)).rejects.toThrow(/autres conditions/)
  })
  it('ne crée rien si un des acheteurs a quitté le groupe ou représente INCONNU', async () => {
    memory.documents.set('users/paul', {
      firstName: 'Paul',
      lastName: 'ONDO',
      roles: ['Adherant'],
      groupIds: [],
    })
    await expect(createGroupAgreements(draft(), actor)).rejects.toThrow(/appartenant/)
    expect(memory.writes).toHaveLength(0)
    const d = draft()
    d.buyers[1].debtorId = '2548.MK.290126'
    memory.documents.set('users/2548.MK.290126', {
      lastName: 'INCONNU(E)',
      matricule: '2548.MK.290126',
      roles: ['Adherant'],
      groupIds: ['g1'],
    })
    await expect(createGroupAgreements(d, actor)).rejects.toThrow(/INCONNU/)
  })
  it('évite le surpaiement concurrent et les doublons de versement sans toucher l’autre acheteur', async () => {
    await createGroupAgreements(draft(), actor)
    const results = await Promise.allSettled([pay('p1', 40000), pay('p2', 40000)])
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    expect(getAgreement().payments).toHaveLength(1)
    await pay('p1', 40000)
    expect(getAgreement().payments).toHaveLength(1)
    await expect(pay('p1', 30000)).rejects.toThrow(/autres informations/)
    expect(
      memory.documents.get('groups/g1/agreements/batch-001_paul')?.payments as unknown[],
    ).toHaveLength(0)
  })
  it('ne clôture qu’après paiement intégral et remise effective, y compris partielle', async () => {
    await createGroupAgreements(draft(), actor)
    await pay('direct', 20000, 'CREDITOR')
    await pay('kara', 40000)
    expect((memory.documents.get('groupAgreementLedgers/g1')?.openByMember as RecordData).bob).toBe(
      1,
    )
    await expect(remit('too-much', 40001)).rejects.toThrow(/dépasse/)
    await remit('r1', 12000)
    await remit('r1', 12000)
    expect(getAgreement().remittances).toHaveLength(1)
    await remit('r2', 28000)
    expect((memory.documents.get('groupAgreementLedgers/g1')?.openByMember as RecordData).bob).toBe(
      0,
    )
    expect(
      (memory.documents.get('groupAgreementLedgers/g1')?.openByMember as RecordData).seller,
    ).toBe(1)
    await voidAgreementRemittance('g1', 'batch-001_bob', 'r2', 'Montant saisi par erreur', actor)
    expect((memory.documents.get('groupAgreementLedgers/g1')?.openByMember as RecordData).bob).toBe(
      1,
    )
  })
  it('bloque l’annulation d’un encaissement déjà remis et une remise historique sans fonds', async () => {
    await createGroupAgreements(draft(), actor)
    await pay('p1', 40000)
    await expect(remit('early', 10000, '2026-09-04')).rejects.toThrow(/cette date/)
    await remit('r1', 15000)
    await expect(
      voidAgreementPayment('g1', 'batch-001_bob', 'p1', 'Erreur de saisie', actor),
    ).rejects.toThrow(/cette date/)
    expect(getAgreement().payments[0].voidedAt).toBeUndefined()
    await voidAgreementRemittance('g1', 'batch-001_bob', 'r1', 'Mauvaise saisie de remise', actor)
    await voidAgreementPayment('g1', 'batch-001_bob', 'p1', 'Erreur de saisie', actor)
    expect(getAgreement().payments[0]).toMatchObject({
      voidReason: 'Erreur de saisie',
      voidedById: 'admin',
    })
    await cancelGroupAgreement('g1', 'batch-001_bob', 'Achat non réalisé', actor)
    expect(getAgreement().status).toBe('CANCELLED')
  })
  it('exige une date réelle de règlement et un motif pour corriger, sans annuler un accord payé', async () => {
    await createGroupAgreements(draft(), actor)
    await expect(
      recordAgreementPayment('g1', 'batch-001_bob', money('bad', 100, 'KARA', '2026-08-31'), actor),
    ).rejects.toThrow(/création/)
    await expect(
      recordAgreementPayment(
        'g1',
        'batch-001_bob',
        money('future', 100, 'KARA', '2099-01-01'),
        actor,
      ),
    ).rejects.toThrow(/future/)
    await pay('p1', 100)
    await expect(
      cancelGroupAgreement('g1', 'batch-001_bob', 'Mauvaise référence', actor),
    ).rejects.toThrow(/remboursement/)
    await expect(voidAgreementPayment('g1', 'batch-001_bob', 'p1', '', actor)).rejects.toThrow(
      /motif/,
    )
  })
  it('enregistre une promesse et garde la date du contrat, mais refuse les relances après règlement', async () => {
    await createGroupAgreements(draft(), actor)
    const reminder = {
      id: 'follow-001',
      channel: 'PHONE' as const,
      outcome: 'PROMISE' as const,
      note: 'Attend son salaire',
      promiseDate: '2099-01-01',
    }
    await recordAgreementReminder('g1', 'batch-001_bob', reminder, actor)
    await recordAgreementReminder('g1', 'batch-001_bob', reminder, actor)
    expect(getAgreement().reminders).toHaveLength(1)
    await expect(recordAgreementReminder('g1', 'batch-001_bob', { ...reminder, promiseDate: '2099-01-02' }, actor)).rejects.toThrow(/autres informations/)
    expect(getAgreement()).toMatchObject({
      agreementDate: '2026-09-01',
      reminders: [{ promiseDate: '2099-01-01', byId: 'admin' }],
    })
    await pay('paid', 60000)
    await expect(
      recordAgreementReminder('g1', 'batch-001_bob', { ...reminder, id: 'another' }, actor),
    ).rejects.toThrow(/réglé/)
  })
  it('ne rouvre pas une dette pour un membre retiré du groupe sans rétablir son appartenance', async () => {
    await createGroupAgreements(draft(), actor)
    await pay('p1', 60000, 'CREDITOR')
    memory.documents.set('users/bob', { ...memory.documents.get('users/bob'), groupIds: [] })
    await expect(
      voidAgreementPayment('g1', 'batch-001_bob', 'p1', 'Mauvaise saisie', actor),
    ).rejects.toThrow(/appartenant/)
    expect(getAgreement().payments[0].voidedAt).toBeUndefined()
  })
})
