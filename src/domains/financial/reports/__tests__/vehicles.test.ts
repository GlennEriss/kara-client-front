import { describe, expect, it } from 'vitest'
import { buildFinancialReport } from '../builders/buildFinancialReport'
import { buildFinancialReportContracts, buildFinancialReportDetails } from '../builders/buildFinancialReportDetails'
import type { FinancialReportSources, SourceRecord } from '../entities/financial-report-sources.types'
import type { FinancialReport, FinancialReportBlockKey, FinancialReportModuleKey } from '../entities/financial-report.types'
import { DEFAULT_REPORT_EXPORT_OPTIONS, selectReportContent } from '../exports/export-options'
import { financialContractsCsv } from '../exports/exportFinancialContractsCsv'
import { financialDetailsCsv } from '../exports/exportFinancialReportDetailsCsv'
import { buildFinancialReportWorkbook } from '../exports/exportFinancialReportExcel'
import { buildFinancialReportPdf } from '../exports/exportFinancialReportPdf'
import { firstActivityMonth } from '../utils/member-report'

const period = { from: '2026-09', to: '2026-11', now: new Date('2026-11-10T12:00:00Z') }
const reward = (extra: Record<string, unknown> = {}): SourceRecord => ({
  id: 'insurance-1_P0', insuranceId: 'insurance-1', periodIndex: 0,
  createdAt: '2026-09-01', startDate: '2026-09-01', endDate: '2027-08-31',
  plateNumber: 'AB-123-CD', vehicleLabel: 'Toyota Corolla', insuranceCompany: 'AXA',
  beneficiaryId: 'sponsor', beneficiaryMatricule: 'M001', beneficiaryName: 'ONDO Alice',
  premiumAmount: 200_000, expectedCommission: 20_000, memberAmount: 5_000,
  commissionRate: 10, memberSharePercent: 25, status: 'TO_PAY',
  partnerReceipt: { amount: 20_000, receivedAt: '2026-10-15', reference: 'AXA-001' },
  ...extra,
})
const sources = (rewards = [reward()]): FinancialReportSources => ({
  caisseSpecialeContracts: [], caisseSpecialePayments: [], caisseSpecialeRefunds: [],
  caisseImprevueContracts: [], caisseImprevuePayments: [], caisseImprevueSupports: [], caisseImprevueRefunds: [],
  creditContracts: [], creditPayments: [], creditPenalties: [], guarantorPayments: [],
  placements: [], placementCommissions: [], placementEarlyExits: [], membershipRequests: [],
  vehicleRewards: rewards,
  vehicleInsurances: [{ id: 'insurance-1', holderType: 'member', memberId: 'holder',
    memberLastName: 'MBA', memberFirstName: 'Paul', policyNumber: 'POL-001' }],
})
const values = (report: FinancialReport, block: FinancialReportBlockKey, line: string, module: FinancialReportModuleKey = 'vehicules') =>
  report.modules.find(m => m.key === module)!.blocks.find(b => b.key === block)!.lines.find(l => l.key === line)!.values

describe('bilan des assurances véhicules', () => {
  it('réserve la part du parrain sans compter une sortie avant la remise enregistrée', () => {
    const report = buildFinancialReport(sources(), period)
    expect(values(report, 'treasury', 'in_total')).toEqual([0, 20_000, 0])
    expect(values(report, 'treasury', 'out_total')).toEqual([0, 0, 0])
    expect(values(report, 'result', 'net')).toEqual([0, 15_000, 0])
    expect(values(report, 'outstanding', 'sponsors_payable')).toEqual([0, 5_000, 5_000])
    expect(values(report, 'outstanding', 'payables_total', 'synthesis')).toEqual([0, 5_000, 5_000])
    expect(values(report, 'result', 'net', 'synthesis')).toEqual([0, 15_000, 0])
  })

  it('compte une remise confirmée le mois suivant sans diminuer une deuxième fois le résultat', () => {
    const report = buildFinancialReport(sources([reward({ status: 'PAID', memberPayment: { paidAt: '2026-11-05', mode: 'cash' } })]), period)
    expect(values(report, 'treasury', 'out_total')).toEqual([0, 0, 5_000])
    expect(values(report, 'treasury', 'net', 'synthesis')).toEqual([0, 20_000, -5_000])
    expect(values(report, 'result', 'net', 'synthesis')).toEqual([0, 15_000, 0])
    expect(values(report, 'outstanding', 'sponsors_payable')).toEqual([0, 5_000, 0])
  })

  it('conserve les commissions attendues en prévision sans les inclure dans les recettes ou créances', () => {
    const report = buildFinancialReport(sources([reward({ status: 'AWAITING_PARTNER', partnerReceipt: undefined })]), period)
    expect(values(report, 'outstanding', 'expected_commissions')).toEqual([20_000, 20_000, 20_000])
    for (const block of ['treasury', 'result'] as const)
      expect(values(report, block, 'net', 'synthesis')).toEqual([0, 0, 0])
    expect(values(report, 'outstanding', 'sponsors_payable')).toEqual([0, 0, 0])
    expect(values(report, 'outstanding', 'receivables_total', 'synthesis')).toEqual([0, 0, 0])
    expect(values(report, 'outstanding', 'payables_total', 'synthesis')).toEqual([0, 0, 0])
  })

  it('utilise la commission et la part réellement enregistrées plutôt que les estimations ou la prime', () => {
    const report = buildFinancialReport(sources([reward({
      memberAmount: 3_000, partnerReceipt: { amount: 12_000, receivedAt: '2026-10-15' },
    })]), period)
    expect(values(report, 'treasury', 'in_total')).toEqual([0, 12_000, 0])
    expect(values(report, 'result', 'net')).toEqual([0, 9_000, 0])
    expect(values(report, 'outstanding', 'sponsors_payable')).toEqual([0, 3_000, 3_000])
    expect(values(report, 'outstanding', 'expected_commissions')).toEqual([20_000, 0, 0])
  })

  it.each([
    { status: 'PAID' },
    { status: 'PAID', memberPayment: {} },
    { status: 'PAID', memberPayment: { paidAt: 'invalide' } },
    { status: 'PAID', memberPayment: { paidAt: '2026-12-01' } },
  ])('ne fabrique pas de sortie depuis un statut ou une remise sans date effective passée : %j', extra => {
    const report = buildFinancialReport(sources([reward(extra)]), period)
    expect(values(report, 'treasury', 'out_total')).toEqual([0, 0, 0])
    expect(values(report, 'outstanding', 'sponsors_payable')).toEqual([0, 5_000, 5_000])
  })

  it('ignore les réceptions futures ou sans date et les paiements sans réception', () => {
    for (const partnerReceipt of [undefined, { amount: 20_000 }, { amount: 20_000, receivedAt: '2026-12-01' }]) {
      const report = buildFinancialReport(sources([reward({ partnerReceipt, memberPayment: { paidAt: '2026-11-05' } })]), period)
      expect(values(report, 'treasury', 'net')).toEqual([0, 0, 0])
      expect(values(report, 'result', 'net')).toEqual([0, 0, 0])
    }
  })

  it('conserve les dettes antérieures à la période et lit le mois à Libreville', () => {
    const report = buildFinancialReport(sources([reward({
      partnerReceipt: { amount: 20_000, receivedAt: '2026-08-20' },
      memberPayment: { paidAt: new Date('2026-10-31T23:30:00Z') },
    })]), period)
    expect(values(report, 'outstanding', 'sponsors_payable')).toEqual([5_000, 5_000, 0])
    expect(values(report, 'treasury', 'out_total')).toEqual([0, 0, 5_000])
    expect(values(report, 'result', 'net')).toEqual([0, 0, 0])
    const sponsors = report.modules[0].blocks.find(b => b.key === 'outstanding')!.lines.find(l => l.key === 'vehicle_sponsors')!
    expect(sponsors.total).toBe(0)
  })

  it('ventile toutes les lignes et la synthèse sans écart, une opération par renouvellement', () => {
    const s = sources([reward(), reward({ id: 'insurance-1_P1', periodIndex: 1,
      createdAt: '2026-10-01', partnerReceipt: undefined, status: 'AWAITING_PARTNER' })])
    const report = buildFinancialReport(s, period)
    for (const module of report.modules.filter(m => ['vehicules', 'synthesis'].includes(m.key)))
      for (const block of module.blocks)
        for (const line of block.lines)
          for (const month of [undefined, ...report.months]) {
            const detail = buildFinancialReportDetails(s, report, { module: module.key, block: block.key, line: line.key, month })
            expect(detail.reconciliationDifference, `${module.key}/${block.key}/${line.key}/${month}`).toBe(0)
          }
    const contracts = buildFinancialReportContracts(s, report)
    expect(contracts).toHaveLength(2)
    expect(contracts[0].sourceLabel).toContain('Période initiale')
    expect(contracts[1].sourceLabel).toContain('Renouvellement 1')
    expect(contracts[0]).toMatchObject({ sourceKind: 'Opération', sourceHref: '/vehicules/insurance-1',
      party: { id: 'sponsor', name: 'ONDO Alice', matricule: 'M001' },
      relatedParties: [{ id: 'holder', name: 'MBA Paul' }],
    })
  })

  it('préserve les montants historiques si la fiche d’assurance a disparu', () => {
    const s = sources()
    s.vehicleInsurances = []
    const report = buildFinancialReport(s, period)
    const contract = buildFinancialReportContracts(s, report)[0]
    expect(contract.sourceHref).toBeUndefined()
    expect(contract.facts).toContainEqual({ label: 'Fiche d’assurance', value: 'Introuvable ; historique financier conservé' })
    expect(values(report, 'result', 'net')).toEqual([0, 15_000, 0])
  })

  it('inclut le détail des assurances dans les exports CSV, Excel et PDF', async () => {
    const s = sources([reward({ status: 'PAID', memberPayment: { paidAt: '2026-11-05', mode: 'cash', reference: 'PAY-001', proofUrl: 'https://kara.test/proof.pdf' } })])
    const report = selectReportContent(buildFinancialReport(s, period), { ...DEFAULT_REPORT_EXPORT_OPTIONS, modules: ['vehicules'] })
    expect(DEFAULT_REPORT_EXPORT_OPTIONS.modules).toContain('vehicules')
    const contracts = buildFinancialReportContracts(s, report).filter(c => c.module === 'vehicules')
    const csv = financialContractsCsv(report, contracts)
    for (const text of ['AXA-001', 'POL-001', 'PAY-001', 'AB-123-CD', 'MBA Paul', 'ONDO Alice', 'https://kara.test/proof.pdf', 'Remise enregistrée au parrain'])
      expect(csv).toContain(text)
    const details = buildFinancialReportDetails(s, report, { module: 'vehicules', block: 'treasury', line: 'out_total' })
    expect(financialDetailsCsv(details)).toContain('5000')
    const book = await buildFinancialReportWorkbook(report, 'full', contracts)
    expect(book.getWorksheet('Véhicules — Assurances')).toBeDefined()
    expect(book.getWorksheet('Contrats et dossiers')!.getRow(2).getCell(5).value).toBe('Remise enregistrée au parrain')
    const pdf = await buildFinancialReportPdf(report, 'none', contracts)
    expect(pdf.getNumberOfPages()).toBeGreaterThan(0)
    expect(pdf.output()).toContain('POL-001')
  })

  it('rattache aussi les assurances au bilan administratif du parrain et à toute sa période', () => {
    const s = sources([reward({ createdAt: undefined, startDate: undefined })])
    s.vehicleInsurances = []
    expect(firstActivityMonth(s)).toBe('2026-10')
    const report = buildFinancialReport(s, period, { subject: { memberId: 'sponsor', matricule: 'M001', name: 'ONDO Alice' } })
    expect(report.modules.map(m => m.key)).toEqual(['synthesis', 'vehicules'])
    expect(values(report, 'outstanding', 'vehicle_sponsors', 'synthesis')).toEqual([0, 5_000, 5_000])
  })
})
