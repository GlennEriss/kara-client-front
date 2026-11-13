// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Firestore } from 'firebase-admin/firestore'
import { deleteGroupPermanently, validateGroupDeletion } from './delete-group'

vi.mock('firebase-admin/firestore', () => ({ FieldValue: {
  serverTimestamp: () => 'timestamp', arrayRemove: (id: string) => ({ remove: id }),
} }))

let records: Map<string, Record<string, unknown>>
let db: Firestore
let recursive: ReturnType<typeof vi.fn>
const actor = { id: 'superadmin', name: 'SuperAdmin' }
beforeEach(() => {
  records = new Map([
    ['groups/g1', { name: 'Premier groupe', projects: [{ id: 'p1' }] }],
    ['groups/g1/contributions/c1', { payments: [{ amount: 10000 }] }],
    ['groups/g1/agreements/a1', { totalAmount: 100000 }],
    ['groups/g1/agreementOperations/b1', { signature: 'batch' }],
    ['groupPayouts/g1-payout', { groupId: 'g1', netAmount: 49000 }],
    ['groupAgreementLedgers/g1', { agreementCount: 1 }],
    ['users/alice', { groupIds: ['g1', 'g2'] }],
    ['users/bob', { groupIds: ['g2'] }],
    ['groups/g2', { name: 'Autre groupe' }],
    ['groupPayouts/g2-payout', { groupId: 'g2' }],
    ['creditContracts/credit', { groupProject: { groupId: 'g1' }, amountRemaining: 100000 }],
    ['caisseContracts/caisse', { groupeId: 'g1' }],
  ])
  const snapshot = (path: string) => ({ id: path.split('/').at(-1), ref: { path }, exists: records.has(path), data: () => records.get(path) })
  const collection = (name: string) => ({
    doc: (id: string) => ({
      path: `${name}/${id}`,
      set: async (data: Record<string, unknown>) => { records.set(`${name}/${id}`, data) },
      delete: async () => { records.delete(`${name}/${id}`) },
      listCollections: async () => [...new Set([...records.keys()]
        .filter(path => path.startsWith(`${name}/${id}/`))
        .map(path => path.split('/').slice(0, 3).join('/')))]
        .map(path => ({ path })),
    }),
    add: vi.fn(async (data: Record<string, unknown>) => { records.set(`${name}/audit-${records.size}`, data) }),
    where: (field: string, op: string, value: unknown) => ({ get: async () => ({ docs: [...records].filter(([path, data]) => path.split('/').length === 2 && path.startsWith(`${name}/`) && (op === 'array-contains' ? (data[field] as unknown[] ?? []).includes(value) : data[field] === value)).map(([path]) => snapshot(path)) }) }),
  })
  recursive = vi.fn(async (ref: { path: string }) => {
    for (const path of records.keys()) if (path === ref.path || path.startsWith(`${ref.path}/`)) records.delete(path)
  })
  db = {
    collection,
    runTransaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({
      get: async (ref: { path: string }) => snapshot(ref.path),
      update: (ref: { path: string }, data: Record<string, unknown>) => records.set(ref.path, { ...records.get(ref.path), ...data }),
    }),
    bulkWriter: () => ({
      onWriteError: vi.fn(),
      update: async (ref: { path: string }, data: { groupIds: { remove: string } }) => {
        const prior = records.get(ref.path)!
        records.set(ref.path, { ...prior, groupIds: (prior.groupIds as string[]).filter(id => id !== data.groupIds.remove) })
      },
      delete: async (ref: { path: string }) => { records.delete(ref.path) },
      close: async () => undefined,
    }),
    recursiveDelete: recursive,
  } as unknown as Firestore
})

describe('suppression définitive d’un groupe', () => {
  it('nettoie le suivi interne et les appartenances, en conservant membres et contrats financiers', async () => {
    const proofCleanup = vi.fn(async () => undefined)
    await deleteGroupPermanently(db, 'g1', actor, proofCleanup)
    expect([...records.keys()].some(path => path === 'groups/g1' || path.startsWith('groups/g1/'))).toBe(false)
    expect(records.has('groupPayouts/g1-payout')).toBe(false)
    expect(records.has('groupAgreementLedgers/g1')).toBe(false)
    expect(records.get('users/alice')?.groupIds).toEqual(['g2'])
    expect(records.get('users/bob')?.groupIds).toEqual(['g2'])
    expect(records.has('creditContracts/credit')).toBe(true)
    expect(records.has('caisseContracts/caisse')).toBe(true)
    expect(records.get('deletedGroupIdentities/g1')).toMatchObject({ name: 'Premier groupe' })
    expect(records.get('deletedGroupIdentities/g1')).not.toHaveProperty('projects')
    expect(records.has('groups/g2')).toBe(true)
    expect(records.has('groupPayouts/g2-payout')).toBe(true)
    expect(proofCleanup).toHaveBeenCalledOnce()
    expect([...records.keys()].filter(path => path.startsWith('auditLogs/'))).toHaveLength(2)
  })
  it('conserve le verrou après une interruption et permet de reprendre sans doublonner les opérations', async () => {
    const proofCleanup = vi.fn().mockRejectedValueOnce(new Error('Stockage indisponible')).mockResolvedValue(undefined)
    await expect(deleteGroupPermanently(db, 'g1', actor, proofCleanup)).rejects.toThrow('Stockage')
    expect(records.get('groups/g1')?.deletionInProgress).toBe(true)
    expect(recursive).not.toHaveBeenCalled()
    await deleteGroupPermanently(db, 'g1', actor, proofCleanup)
    await deleteGroupPermanently(db, 'g1', actor, proofCleanup)
    expect(records.has('groups/g1')).toBe(false)
    expect(records.get('users/alice')?.groupIds).toEqual(['g2'])
    expect(proofCleanup).toHaveBeenCalledTimes(2)
  })
  it('exige l’identifiant exact et interdit les chemins de collection', () => {
    expect(() => validateGroupDeletion('g1', 'autre')).toThrow(/confirmation/)
    expect(() => validateGroupDeletion('../users', '../users')).toThrow(/invalide/)
    expect(() => validateGroupDeletion('g1', ' g1 ')).not.toThrow()
  })
  it('garde la fiche accessible pour relancer un nettoyage récursif interrompu', async () => {
    const proofCleanup = vi.fn().mockResolvedValue(undefined)
    recursive.mockImplementationOnce(async (ref: { path: string }) => {
      const firstChild = [...records.keys()].find(path => path.startsWith(`${ref.path}/`))
      if (firstChild) records.delete(firstChild)
      throw new Error('Nettoyage récursif interrompu')
    })
    await expect(deleteGroupPermanently(db, 'g1', actor, proofCleanup)).rejects.toThrow('interrompu')
    expect(records.get('groups/g1')).toMatchObject({ name: 'Premier groupe', deletionInProgress: true })
    expect(records.has('groups/g1/agreements/a1')).toBe(true)
    await deleteGroupPermanently(db, 'g1', actor, proofCleanup)
    expect([...records.keys()].some(path => path === 'groups/g1' || path.startsWith('groups/g1/'))).toBe(false)
    expect(records.has('creditContracts/credit')).toBe(true)
    expect(records.get('users/alice')?.groupIds).toEqual(['g2'])
  })
})
