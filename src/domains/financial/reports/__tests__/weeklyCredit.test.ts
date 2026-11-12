import { describe, expect, it } from 'vitest'
import type { CreditContract, CreditPayment } from '@/types/types'
import { buildFinancialReport } from '../builders/buildFinancialReport'
import { buildFinancialReportDetails } from '../builders/buildFinancialReportDetails'
import type { FinancialReportSources } from '../entities/financial-report-sources.types'

const contract = {
  id: 'weekly',
  demandId: 'weekly-demand',
  clientId: 'weekly-member',
  clientFirstName: 'Alice',
  clientLastName: 'ONDO',
  clientContacts: [],
  creditType: 'SPECIALE',
  durationUnit: 'WEEKS',
  repaymentModel: 'DEGRESSIVE',
  status: 'DISCHARGED',
  amount: 100000,
  totalAmount: 110000,
  monthlyPaymentAmount: 110000,
  interestRate: 10,
  duration: 2,
  firstPaymentDate: new Date('2026-01-15'),
  createdAt: new Date('2026-01-01'),
  disbursementDate: new Date('2026-01-01'),
  restMonths: [],
  amountPaid: 117500,
  amountRemaining: 0,
  guarantorIsMember: false,
  guarantorIsParrain: false,
  guarantorRemunerationPercentage: 0,
  createdBy: 'admin',
  updatedBy: 'admin',
  updatedAt: new Date('2026-02-05'),
} satisfies CreditContract
const payments = [
  [60000, '2026-01-15'],
  [30000, '2026-01-22'],
  [2500, '2026-01-29'],
  [25000, '2026-02-05'],
].map(([amount, date], index) => ({
  id: `M${index + 1}_weekly`,
  creditId: 'weekly',
  amount,
  paymentDate: new Date(date),
})) as CreditPayment[]
const sources: FinancialReportSources = {
  caisseSpecialeContracts: [],
  caisseSpecialePayments: [],
  caisseSpecialeRefunds: [],
  caisseImprevueContracts: [],
  caisseImprevuePayments: [],
  caisseImprevueSupports: [],
  caisseImprevueRefunds: [],
  creditContracts: [contract],
  creditPayments: payments,
  creditPenalties: [],
  guarantorPayments: [],
  placements: [],
  placementCommissions: [],
  placementEarlyExits: [],
  membershipRequests: [],
}

describe('bilan des intérêts hebdomadaires', () => {
  it('additionne les semaines du même mois sans intérêts après la limite ni double comptage', () => {
    const report = buildFinancialReport(sources, {
      from: '2026-01',
      to: '2026-02',
      now: new Date('2026-02-15'),
    })
    const module = report.modules.find((m) => m.key === 'credit_speciale')!
    const line = (block: string, key: string) =>
      module.blocks.find((b) => b.key === block)!.lines.find((l) => l.key === key)!
    expect(line('result', 'net').values).toEqual([17500, 0])
    expect(line('result', 'info_interest_generated').values).toEqual([17500, 0])
    expect(line('treasury', 'in_total').values).toEqual([92500, 25000])
    expect(line('outstanding', 'receivables').values).toEqual([25000, 0])
    for (const block of module.blocks)
      for (const row of block.lines) {
        const detail = buildFinancialReportDetails(sources, report, {
          module: module.key,
          block: block.key,
          line: row.key,
        })
        expect(detail.reconciliationDifference, `${block.key}/${row.key}`).toBe(0)
      }
  })
})
