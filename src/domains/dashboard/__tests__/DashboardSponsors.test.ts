import { describe, expect, it } from 'vitest'
import { UNKNOWN_USER_ID } from '@/domains/financial/caisse-imprevue/import/unknownUser'
import type { FinancialReportSources, SourceRecord } from '@/domains/financial/reports/entities/financial-report-sources.types'
import { buildGuarantorRankings } from '../services/buildGuarantorRankings'
import { buildVehicleDashboard } from '../services/buildVehicleDashboard'

const now = new Date('2026-11-11T12:00:00Z')
const range = { from: new Date('2026-11-01T00:00:00+01:00'), to: new Date('2026-11-11T23:59:59+01:00') }
const members = [{ id: 'g1', matricule: 'MK1', firstName: 'Alice', lastName: 'Ondo' }, { id: 'g2', matricule: 'MK2', firstName: 'Nadia', lastName: 'Mba' }]
const credit = (id: string, guarantorId: string, creditType = 'SPECIALE', createdAt = '2026-11-05') => ({ id, guarantorId, creditType, createdAt, status: 'ACTIVE' })
const payment = (id: string, creditId: string, guarantorId: string, amount: number, paymentDate: string) => ({ id, creditId, guarantorId, amount, paymentDate })
const source = (contracts: unknown[], payments: unknown[]) => ({ creditContracts: contracts, guarantorPayments: payments }) as FinancialReportSources
const insurance = (id: string, sponsorMemberId = 'g1'): SourceRecord => ({ id, sponsorMemberId, holderType: 'non-member', createdAt: '2026-11-03' })
const reward = (id: string, beneficiaryId = 'g1'): SourceRecord => ({ id, insuranceId: 'v1', beneficiaryId,
  expectedCommission: 999_999, premiumAmount: 5_000_000, memberAmount: 5000,
  partnerReceipt: { amount: 20000, receivedAt: '2026-11-02' }, memberPayment: { paidAt: '2026-11-04' } })

describe('garants par section crédit', () => {
  it.each(['SPECIALE', 'FIXE', 'AIDE'] as const)('sépare %s, la période des contrats et celle des remises réelles', type => {
    const result = buildGuarantorRankings(source([
      credit('a', 'g1', type), credit('b', 'MK1', type), credit('old', 'g2', type, '2026-10-01'),
      credit('other', 'g1', type === 'SPECIALE' ? 'FIXE' : 'SPECIALE'), { ...credit('draft', 'g1', type), status: 'DRAFT' },
    ], [payment('p1', 'a', 'g1', 2000, '2026-11-06'), payment('p2', 'b', 'MK1', 3000, '2026-11-08'),
      payment('p3', 'old', 'g2', 8000, '2026-11-05'), payment('future', 'a', 'g1', 100000, '2026-12-01'),
      payment('before', 'a', 'g1', 100000, '2026-10-01'), payment('missing', 'absent', 'g1', 99999, '2026-11-05'),
      payment('draft', 'draft', 'g1', 99999, '2026-11-05'), payment('other', 'other', 'g1', 99999, '2026-11-05'),
    ]), type, members, range, now)
    expect(result[0].items).toMatchObject([{ id: 'g1', label: 'Ondo Alice', value: 2 }])
    expect(result[1].items).toMatchObject([{ id: 'g2', value: 8000 }, { id: 'g1', value: 5000 }])
    expect(result[1].items[1].subLabel).toContain('2 versement(s) · 2 contrat(s)')
  })
  it('attribue une remise au bénéficiaire historique, ignore les doublons, INCONNU et les montants non reçus', () => {
    const actual = payment('p', 'a', 'MK1', 2000, '2026-11-05')
    const result = buildGuarantorRankings(source([credit('a', 'g2'), credit('unknown', UNKNOWN_USER_ID)], [actual, actual,
      payment('u', 'unknown', UNKNOWN_USER_ID, 9000, '2026-11-05'),
      { id: 'undated', creditId: 'a', guarantorId: 'g1', amount: 90000, createdAt: '2026-11-05' },
      payment('negative', 'a', 'g1', -1000, '2026-11-05'),
    ]), 'SPECIALE', members, range, now)
    expect(result[0].items).toMatchObject([{ id: 'g2', value: 1 }])
    expect(result[1].items).toMatchObject([{ id: 'g1', value: 2000 }])
    expect(result[1].items).toHaveLength(1)
  })
  it('conserve plus de dix garants sans mélanger des homonymes', () => {
    const people = Array.from({ length: 25 }, (_, i) => ({ id: `g${i}`, firstName: 'Même', lastName: 'Nom' }))
    const result = buildGuarantorRankings(source(people.map(m => credit(m.id, m.id)), []), 'SPECIALE', people, range, now)
    expect(result[0].items).toHaveLength(25)
    expect(new Set(result[0].items.map(item => item.id)).size).toBe(25)
  })
})

describe('parrains véhicules', () => {
  it('compte les dossiers validés une seule fois, sans confondre renouvellements et nouveaux apports', () => {
    const v = insurance('v1')
    const result = buildVehicleDashboard([v, v, { ...insurance('pending'), declarationStatus: 'pending' },
      { ...insurance('old'), createdAt: '2026-10-01' }, { ...insurance('future'), createdAt: '2026-12-01' }],
    [reward('r1'), reward('r1'), { ...reward('r2'), periodIndex: 1 }], members, range, now)
    expect(result.rankings![0].items).toMatchObject([{ id: 'g1', value: 1 }])
    expect(result.rankings![1].items[0].value).toBe(10000)
    expect(result.rankings![2].items[0].value).toBe(30000)
    expect(result.kpis.find(k => k.key === 'received')?.value).toBe(40000)
  })
  it('ne transforme ni une prévision ni un statut PAID en commission remise', () => {
    const result = buildVehicleDashboard([], [
      { ...reward('forecast'), partnerReceipt: undefined },
      { ...reward('status'), status: 'PAID', memberPayment: undefined },
      { ...reward('future'), partnerReceipt: { amount: 20000, receivedAt: '2026-12-01' } },
      { ...reward('early'), memberPayment: { paidAt: '2026-11-01' } },
    ], members, range, now)
    expect(result.rankings![1].items).toEqual([])
    expect(result.kpis.find(k => k.key === 'sponsors_payable')?.value).toBe(10000)
    expect(result.kpis.find(k => k.key === 'received')?.value).toBe(40000)
  })
  it('sépare les dates de réception et de remise et conserve le bénéficiaire historique', () => {
    const result = buildVehicleDashboard([insurance('v1', 'g2')], [
      { ...reward('old'), beneficiaryId: 'ancien-uid', beneficiaryMatricule: 'MK1', partnerReceipt: { amount: 20000, receivedAt: '2026-10-20' } },
      { ...reward('later'), beneficiaryId: 'g2', memberPayment: { paidAt: '2026-12-01' } },
    ], members, range, now)
    expect(result.rankings![1].items).toMatchObject([{ id: 'g1', label: 'Ondo Alice', value: 5000 }])
    expect(result.rankings![2].items).toMatchObject([{ id: 'g2', value: 15000 }])
    expect(result.kpis.find(k => k.key === 'sponsors_payable')?.value).toBe(5000)
  })
  it('applique le périmètre aux parrains même pour les titulaires non-membres, et exclut INCONNU des tops', () => {
    const result = buildVehicleDashboard([insurance('a'), insurance('b', 'g2')], [reward('a'), reward('b', 'g2'), reward('unknown', UNKNOWN_USER_ID)],
      members, range, now, new Set(['g1', 'MK1']))
    expect(result.kpis.find(k => k.key === 'introduced')?.value).toBe(1)
    expect(result.rankings![1].items).toMatchObject([{ id: 'g1', value: 5000 }])
    const all = buildVehicleDashboard([], [reward('unknown', UNKNOWN_USER_ID)], members, range, now)
    expect(all.rankings!.every(r => !r.items.length)).toBe(true)
  })
})
