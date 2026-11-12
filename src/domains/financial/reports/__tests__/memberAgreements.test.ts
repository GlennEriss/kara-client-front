import { describe, expect, it } from 'vitest'
import { buildFinancialReport } from '../builders/buildFinancialReport'
import {
  buildFinancialReportContracts,
  buildFinancialReportDetails,
} from '../builders/buildFinancialReportDetails'
import { DEFAULT_REPORT_EXPORT_OPTIONS } from '../exports/export-options'
import { buildFinancialReportWorkbook } from '../exports/exportFinancialReportExcel'
import type {
  ChildRecord,
  FinancialReportSources,
} from '../entities/financial-report-sources.types'
import type {
  FinancialReport,
  FinancialReportBlockKey,
  FinancialReportModuleKey,
} from '../entities/financial-report.types'

const agreement = (id = 'sale-1', extra: Record<string, unknown> = {}): ChildRecord => ({
  id,
  parentId: 'group-1',
  groupId: 'group-1',
  title: 'Ventilateur',
  creditorId: 'seller',
  creditorName: 'Alice Vendeur',
  debtorId: 'buyer',
  debtorName: 'Bob Acheteur',
  totalAmount: 60000,
  status: 'ACTIVE',
  payments: [
    { id: 'direct', date: '2026-09-05', amount: 20000, receivedBy: 'CREDITOR' },
    { id: 'kara', date: '2026-10-10', amount: 40000, receivedBy: 'KARA' },
  ],
  remittances: [{ id: 'r1', date: '2026-11-01', amount: 12000 }],
  ...extra,
})
const sources = (agreements = [agreement()]): FinancialReportSources => ({
  caisseSpecialeContracts: [],
  caisseSpecialePayments: [],
  caisseSpecialeRefunds: [],
  caisseImprevueContracts: [],
  caisseImprevuePayments: [],
  caisseImprevueSupports: [],
  caisseImprevueRefunds: [],
  creditContracts: [],
  creditPayments: [],
  creditPenalties: [],
  guarantorPayments: [],
  placements: [],
  placementCommissions: [],
  placementEarlyExits: [],
  membershipRequests: [],
  groupAgreements: agreements,
})
const period = { from: '2026-09', to: '2026-11', now: new Date('2026-11-11T12:00:00Z') }
const values = (
  r: FinancialReport,
  block: FinancialReportBlockKey,
  line: string,
  module: FinancialReportModuleKey = 'accords_membres',
) =>
  r.modules
    .find((m) => m.key === module)!
    .blocks.find((b) => b.key === block)!
    .lines.find((l) => l.key === line)!.values

describe('bilan des accords entre membres', () => {
  it('exclut le paiement direct et sépare encaissement et remise, sans créer de revenu', () => {
    const report = buildFinancialReport(sources(), period)
    expect(values(report, 'treasury', 'in_total')).toEqual([0, 40000, 0])
    expect(values(report, 'treasury', 'out_total')).toEqual([0, 0, 12000])
    expect(values(report, 'result', 'net')).toEqual([0, 0, 0])
    expect(values(report, 'outstanding', 'funds_held')).toEqual([0, 40000, 28000])
    expect(values(report, 'treasury', 'net', 'synthesis')).toEqual([0, 40000, -12000])
    expect(values(report, 'outstanding', 'payables_total', 'synthesis')).toEqual([0, 40000, 28000])
    expect(values(report, 'outstanding', 'receivables_total', 'synthesis')).toEqual([0, 0, 0])
    expect(values(report, 'result', 'net', 'synthesis')).toEqual([0, 0, 0])
  })
  it('reprend les encaissements antérieurs au bilan et ignore annulations et dates futures', () => {
    const a = agreement('a', {
      payments: [
        { id: 'old', date: '2026-01-01', amount: 50000, receivedBy: 'KARA' },
        {
          id: 'wrong',
          date: '2026-10-01',
          amount: 9999,
          receivedBy: 'KARA',
          voidedAt: '2026-10-02',
        },
        { id: 'future', date: '2099-10-01', amount: 10000, receivedBy: 'KARA' },
      ],
      remittances: [
        { id: 'wrong', date: '2026-09-01', amount: 7777, voidedAt: '2026-09-02' },
        { id: 'r', date: '2026-11-01', amount: 30000 },
      ],
    })
    const report = buildFinancialReport(sources([a]), period)
    expect(values(report, 'outstanding', 'funds_held')).toEqual([50000, 50000, 20000])
    expect(values(report, 'treasury', 'in_total')).toEqual([0, 0, 0])
  })
  it('réconcilie tous les totaux avec les accords, même pour des ids identiques dans deux groupes', async () => {
    const s = sources([
      agreement(),
      agreement('sale-1', {
        parentId: 'group-2',
        groupId: 'group-2',
        creditorName: 'Autre vendeur',
      }),
    ])
    const report = buildFinancialReport(s, period)
    for (const module of report.modules.filter((m) =>
      ['accords_membres', 'synthesis'].includes(m.key),
    ))
      for (const block of module.blocks)
        for (const line of block.lines) {
          const detail = buildFinancialReportDetails(s, report, {
            module: module.key,
            block: block.key,
            line: line.key,
          })
          expect(detail.reconciliationDifference, `${module.key}/${block.key}/${line.key}`).toBe(0)
        }
    const detail = buildFinancialReportDetails(s, report, {
      module: 'accords_membres',
      block: 'treasury',
      line: 'in_total',
    })
    expect(detail.rows).toHaveLength(2)
    expect(new Set(detail.rows.map((r) => r.key)).size).toBe(2)
    expect(detail.rows[0]).toMatchObject({
      party: { name: 'Alice Vendeur' },
      relatedParties: expect.arrayContaining([expect.objectContaining({ name: 'Bob Acheteur' })]),
    })
    const contracts = buildFinancialReportContracts(s, report).filter(
      (c) => c.module === 'accords_membres',
    )
    expect(contracts[0].sourceHref).toContain('tab=agreements&agreement=sale-1')
    expect(contracts[0].facts).toContainEqual({ label: 'Montant convenu', value: '60 000 FCFA' })
    expect(DEFAULT_REPORT_EXPORT_OPTIONS.modules).toContain('accords_membres')
    expect(
      (await buildFinancialReportWorkbook(report, 'full', contracts)).worksheets.length,
    ).toBeGreaterThan(1)
  })
})
