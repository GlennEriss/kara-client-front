import { describe, expect, it } from 'vitest'
import type { CreditContract, CreditPayment, GuarantorPayment } from '@/types/types'
import { UNKNOWN_USER_ID } from '@/domains/financial/caisse-imprevue/import/unknownUser'
import { buildCreditSpecialeHistory, buildCreditSpecialeTimelineHistory } from '@/utils/credit-speciale-history'
import { buildFinancialReport } from '../builders/buildFinancialReport'
import { buildFinancialReportContracts, buildFinancialReportDetails } from '../builders/buildFinancialReportDetails'
import type { FinancialReportSources } from '../entities/financial-report-sources.types'

const date = (day: string) => new Date(`${day}T12:00:00+01:00`)
const period = { from: '2026-06', to: '2026-11', now: date('2026-11-10') }
function sources(guarantorId = UNKNOWN_USER_ID): FinancialReportSources {
  const id = 'credit-garantie-kara'
  return {
    caisseSpecialeContracts: [], caisseSpecialePayments: [], caisseSpecialeRefunds: [],
    caisseImprevueContracts: [], caisseImprevuePayments: [], caisseImprevueSupports: [], caisseImprevueRefunds: [],
    placements: [], placementCommissions: [], placementEarlyExits: [], membershipRequests: [],
    creditContracts: [{
      id, creditType: 'SPECIALE', clientId: 'client', status: 'CLOSED',
      amount: 3_000_000, totalAmount: 3_500_000, monthlyPaymentAmount: 500_000,
      interestRate: 10, duration: 7, guarantorId, guarantorRemunerationPercentage: 2,
      createdAt: date('2026-07-06'), disbursementDate: date('2025-11-06'), firstPaymentDate: date('2025-12-05'),
    } as CreditContract],
    creditPayments: [500_000, 750_000, 233_000, 750_000, 750_000, 750_000, 680_693].map((amount, i) => ({
      id: `M${i + 1}_${id}`, creditId: id, amount,
      paymentDate: date(['2025-12-05', '2026-01-06', '2026-02-05', '2026-03-05', '2026-04-04', '2026-05-05', '2026-06-07'][i]),
    } as CreditPayment)),
    creditPenalties: [],
    guarantorPayments: [{ id: 'ancienne-saisie', creditId: id, guarantorId, amount: 282_721, paymentDate: date('2026-10-06') } as GuarantorPayment],
  }
}

describe('garantie assurée par LE KARA', () => {
  it('exclut une ancienne commission INCONNU de la trésorerie, du résultat et de la synthèse, en conservant les intérêts', () => {
    const report = buildFinancialReport(sources(), period)
    const credit = report.modules.find(m => m.key === 'credit_speciale')!
    const result = credit.blocks.find(b => b.key === 'result')!
    expect(result.lines.find(l => l.key === 'income_interest')?.total).toBe(61_873)
    expect(result.lines.find(l => l.key === 'charge_guarantors')?.total).toBe(0)
    expect(result.lines.find(l => l.key === 'net')).toMatchObject({ total: 61_873, values: [61_873, 0, 0, 0, 0, 0] })
    expect(credit.blocks.find(b => b.key === 'treasury')?.lines.find(l => l.key === 'out_guarantors')?.total).toBe(0)
    expect(report.modules.find(m => m.key === 'synthesis')?.blocks.find(b => b.key === 'result')?.lines.find(l => l.key === 'net')?.total).toBe(61_873)
  })

  it('réconcilie le détail et les dossiers exportables sans personne INCONNU associée', () => {
    const data = sources(), report = buildFinancialReport(data, period)
    const detail = buildFinancialReportDetails(data, report, { module: 'synthesis', block: 'result', line: 'net' })
    expect(detail).toMatchObject({ amount: 61_873, reconciliationDifference: 0 })
    expect(detail.rows[0]).toMatchObject({ amount: 61_873, relatedParties: [] })
    const contracts = buildFinancialReportContracts(data, report)
    expect(contracts[0].relatedParties).toEqual([])
    expect(contracts[0].facts).toContainEqual({ label: 'Garantie', value: 'LE KARA — aucune commission externe' })
    const october = buildFinancialReportDetails(data, report, { module: 'synthesis', block: 'result', line: 'net', month: '2026-10' })
    expect(october).toMatchObject({ amount: 0, rows: [] })
  })

  it('conserve les paiements à un vrai garant, même si le garant du contrat a changé depuis', () => {
    const data = sources()
    data.guarantorPayments[0].guarantorId = 'vrai-garant'
    const report = buildFinancialReport(data, period)
    const net = report.modules.find(m => m.key === 'credit_speciale')!.blocks.find(b => b.key === 'result')!.lines.find(l => l.key === 'net')!
    expect(net).toMatchObject({ total: -220_848, values: [61_873, 0, 0, 0, -282_721, 0] })
  })

  it.each(['DEGRESSIVE', 'FLAT'] as const)('annule les commissions simulées %s sans changer les intérêts et les remboursements', repaymentModel => {
    const data = sources()
    const contract = { ...data.creditContracts[0], repaymentModel }
    const history = buildCreditSpecialeHistory(contract, data.creditPayments)
    expect(history.every(row => row.commission === 0)).toBe(true)
    expect(buildCreditSpecialeTimelineHistory(contract, data.creditPayments).every(row => row.commission === 0)).toBe(true)
    const external = buildCreditSpecialeHistory({ ...contract, guarantorId: 'vrai-garant' }, data.creditPayments)
    expect(external.some(row => row.commission > 0)).toBe(true)
    expect(history.map(({ commission: _commission, ...row }) => row)).toEqual(external.map(({ commission: _commission, ...row }) => row))
  })
})
