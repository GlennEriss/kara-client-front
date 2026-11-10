import type { Firestore } from 'firebase-admin/firestore'
import { describe, expect, it, vi } from 'vitest'
import { firebaseCollectionNames as names } from '@/constantes/firebase-collection-names'
import { loadMemberFinancialReportSources } from '../services/loadMemberFinancialReportSources'

function fixture() {
  const records: Record<string, Record<string, Record<string, unknown>>> = {
    [names.users]: { alice: { lastName: 'ONDO', firstName: 'Alice', matricule: 'M001' } },
    [names.vehicleInsuranceRewards]: {
      v1_P0: { insuranceId: 'v1', beneficiaryId: 'alice', beneficiaryMatricule: 'M001' },
      v2_P0: { insuranceId: 'v2', beneficiaryId: 'M001' },
      v3_P0: { insuranceId: 'v3', beneficiaryId: 'bob', beneficiaryMatricule: 'M002' },
    },
    'vehicle-insurances': {
      v1: { policyNumber: 'POL-001', memberId: 'holder', primaryPhone: 'private', receiptUrl: 'private' },
      v2: { policyNumber: 'POL-002' },
      v3: { policyNumber: 'OTHER' },
    },
  }
  const queries = vi.fn()
  const document = (name: string, id: string) => ({ id, exists: !!records[name]?.[id], data: () => records[name]?.[id] })
  const db = {
    collection: (name: string) => ({
      doc: (id: string) => ({ id, collection: name, get: async () => document(name, id) }),
      where: (field: string, operator: string, value: unknown) => {
        queries(name, field, operator, value)
        return { get: async () => ({ docs: Object.entries(records[name] ?? {})
          .filter(([, data]) => operator === 'in' ? (value as unknown[]).includes(data[field]) : data[field] === value)
          .map(([id]) => document(name, id)) }) }
      },
    }),
    getAll: vi.fn(async (...args: unknown[]) => {
      const fields = (args.at(-1) as { fieldMask: string[] }).fieldMask
      return (args.slice(0, -1) as { id: string; collection: string }[]).map(ref => ({
        ...document(ref.collection, ref.id),
        data: () => Object.fromEntries(Object.entries(records[ref.collection]?.[ref.id] ?? {}).filter(([key]) => fields.includes(key))),
      }))
    }),
  }
  return { db: db as unknown as Firestore, queries, getAll: db.getAll }
}

describe('assurances dans le bilan administratif individuel', () => {
  it('isole le parrain par identifiant ou matricule et ne double pas les résultats des deux requêtes', async () => {
    const { db, queries, getAll } = fixture()
    const loaded = await loadMemberFinancialReportSources(db, 'alice')
    expect(loaded?.sources.vehicleRewards?.map(r => r.id)).toEqual(['v1_P0', 'v2_P0'])
    expect(loaded?.sources.vehicleInsurances).toEqual([
      { id: 'v1', policyNumber: 'POL-001', memberId: 'holder' },
      { id: 'v2', policyNumber: 'POL-002' },
    ])
    expect(queries).toHaveBeenCalledWith(names.vehicleInsuranceRewards, 'beneficiaryId', 'in', ['alice', 'M001'])
    expect(queries).toHaveBeenCalledWith(names.vehicleInsuranceRewards, 'beneficiaryMatricule', 'in', ['alice', 'M001'])
    expect(getAll).toHaveBeenCalledTimes(1)
    expect(JSON.stringify(loaded)).not.toContain('private')
    expect(JSON.stringify(loaded)).not.toContain('OTHER')
  })

  it('ne lit aucune assurance ou commission pour un membre introuvable', async () => {
    const { db, queries, getAll } = fixture()
    expect(await loadMemberFinancialReportSources(db, 'missing')).toBeNull()
    expect(queries).not.toHaveBeenCalled()
    expect(getAll).not.toHaveBeenCalled()
  })
})
