import type { Firestore, QuerySnapshot } from 'firebase-admin/firestore'
import { Timestamp } from 'firebase-admin/firestore'
import { describe, expect, it, vi } from 'vitest'
import { firebaseCollectionNames as names } from '@/constantes/firebase-collection-names'
import { FirestoreReadScope } from '../services/FirestoreReadScope'
import { loadFinancialReportSources, toRecord } from '../services/loadFinancialReportSources'
import { buildFinancialReport } from '../builders/buildFinancialReport'

function fixture() {
  const at = Timestamp.fromDate(new Date('2026-10-10T12:00:00'))
  const doc = (parent: string, id: string, data: Record<string, unknown>, parentId = 'contract-1') => ({
    id, data: () => data, ref: { parent: { parent: { id: parentId, parent: { id: parent } } } },
  })
  const collections = new Map([
    [names.caisseContracts, [doc(names.caisseContracts, 'contract-1', { memberId: 'M1', createdAt: at, status: 'ACTIVE' })]],
    [names.contractsCI, [doc(names.contractsCI, 'contract-1', { memberId: 'M2', createdAt: at, status: 'ACTIVE' })]],
    [names.membershipRequests, [doc(names.membershipRequests, 'adhesion-1', { createdAt: at, payments: [{ amount: 10_300, paymentType: 'Membership', date: at }] })]],
  ])
  const groups = new Map([
    ['payments', [
      doc(names.caisseContracts, 'same-id', { status: 'PAID', amount: 100_000, paidAt: at }),
      doc(names.contractsCI, 'same-id', { status: 'PARTIAL', accumulatedAmount: 12_000, targetAmount: 30_000, versements: [{ amount: 12_000, createdAt: at }], createdAt: at }),
      doc('other-module', 'same-id', { status: 'PAID', amount: 999_999, paidAt: at }),
    ]],
  ])
  const read = vi.fn(async (kind: string, name: string) => ({ docs: (kind === 'collection' ? collections : groups).get(name) ?? [] }) as unknown as QuerySnapshot)
  const db = {
    collection: (name: string) => ({ get: () => read('collection', name) }),
    collectionGroup: (name: string) => ({ get: () => read('group', name) }),
  } as unknown as Firestore
  return { db, read, collections, groups }
}

describe('sources financières : mêmes chiffres avec moins de lectures', () => {
  it('déduplique payments et garde les parents, dates et totaux des deux caisses séparés', async () => {
    const { db, read, groups } = fixture()
    const actual = await loadFinancialReportSources(db)
    expect(read.mock.calls.filter(([kind, name]) => kind === 'group' && name === 'payments')).toHaveLength(1)
    const oldChildren = (parent: string) => groups.get('payments')!
      .filter(d => d.ref.parent.parent.parent.id === parent)
      .map(d => ({ ...toRecord(d as never), parentId: d.ref.parent.parent.id }))
    const reference = { ...actual, caisseSpecialePayments: oldChildren(names.caisseContracts), caisseImprevuePayments: oldChildren(names.contractsCI) }
    expect(actual).toEqual(reference)
    expect(actual.caisseSpecialePayments[0]).toMatchObject({ id: 'same-id', amount: 100_000, paidAt: new Date('2026-10-10T12:00:00') })
    expect(actual.caisseImprevuePayments[0]).toMatchObject({ id: 'same-id', accumulatedAmount: 12_000, versements: [{ createdAt: new Date('2026-10-10T12:00:00'), amount: 12_000 }] })
    const options = { from: '2026-10', to: '2026-11', now: new Date('2026-11-03T12:00:00') }
    expect(buildFinancialReport(actual, options)).toEqual(buildFinancialReport(reference, options))
  })

  it('lit les remises et seulement les cotisations sous les groupes, sans confondre les dons', async () => {
    const { db,groups,collections }=fixture();
    const row=(parent:string,id:string) => ({id,data:()=>({memberId:'alice',payments:[{amount:10000,date:'2026-11-01',source:'CASH'}]}),ref:{parent:{parent:{id:'g1',parent:{id:parent}}}}});
    groups.set('contributions',[row('groups','cotisation'),row('charity-events','don')] as never);
    collections.set('groupPayouts',[{id:'r1',data:()=>({groupId:'g1',feeAmount:1000})} as never]);
    const sources=await loadFinancialReportSources(db);
    expect(sources.groupContributions).toHaveLength(1);
    expect(sources.groupContributions![0]).toMatchObject({id:'cotisation',parentId:'g1'});
    expect(sources.groupPayouts).toEqual([{id:'r1',groupId:'g1',feeAmount:1000}]);
  });

  it('partage les lectures avec les alertes de la même requête et relit les données à la requête suivante', async () => {
    const { db, read } = fixture()
    const scope = new FirestoreReadScope(db)
    await Promise.all([loadFinancialReportSources(db, scope), scope.collection(names.membershipRequests)])
    expect(read.mock.calls.filter(([kind, name]) => kind === 'collection' && name === names.membershipRequests)).toHaveLength(1)
    await loadFinancialReportSources(db)
    expect(read.mock.calls.filter(([kind, name]) => kind === 'collection' && name === names.membershipRequests)).toHaveLength(2)
  })

  it('propage un échec et permet une nouvelle lecture lors d’une autre requête', async () => {
    const { db, read } = fixture()
    read.mockRejectedValueOnce(new Error('Lecture refusée'))
    await expect(loadFinancialReportSources(db)).rejects.toThrow('Lecture refusée')
    await expect(loadFinancialReportSources(db)).resolves.toHaveProperty('caisseSpecialePayments')
  })
})
