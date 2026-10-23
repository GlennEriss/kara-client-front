import { describe, expect, it } from 'vitest'
import type { CreditContract, CreditPayment, CreditPenalty } from '@/types/types'
import { buildFinancialReport } from '../builders/buildFinancialReport'
import type { FinancialReportSources } from '../entities/financial-report-sources.types'
import type { FinancialReport, FinancialReportBlockKey, FinancialReportModuleKey } from '../entities/financial-report.types'

const noon = (value: string) => new Date(`${value}T12:00:00`)

// Contrat réel : 1 000 000 à 10 %, des mois payés à 0 ou seulement en intérêts.
const creditContract = {
  id: 'credit-f',
  creditType: 'SPECIALE',
  durationUnit: 'MONTHS',
  status: 'PARTIAL',
  amount: 1_000_000,
  interestRate: 10,
  monthlyPaymentAmount: 300_000,
  totalAmount: 1_750_000,
  duration: 5,
  firstPaymentDate: noon('2025-10-05'),
  disbursementDate: noon('2025-09-30'),
  createdAt: noon('2025-09-30'),
  restMonths: [],
} as unknown as CreditContract

const PAYMENTS: Array<[number, string]> = [
  [0, '2025-10-04'], [110_000, '2025-11-14'], [110_000, '2025-12-06'], [110_000, '2026-01-15'], [210_000, '2026-02-11'],
  [0, '2026-03-05'], [0, '2026-04-04'], [100_000, '2026-05-05'], [0, '2026-06-04'], [200_000, '2026-07-02'],
  [200_000, '2026-08-04'], [0, '2026-09-04'], [300_000, '2026-10-01'],
]

const creditPayments = PAYMENTS.map(([amount, date], index) => ({
  id: `M${index + 1}_credit-f`,
  creditId: 'credit-f',
  amount,
  comment: amount === 0 ? 'Paiement de 0 FCFA' : undefined,
  paymentDate: noon(date),
})) as CreditPayment[]

const creditPenalties = [
  [33_000, '2025-11-14'], [36_667, '2026-01-15'], [22_000, '2026-02-11'],
].map(([amount, date], index) => ({
  id: `p${index}`,
  creditId: 'credit-f',
  amount,
  paid: false,
  createdAt: noon(date as string),
})) as unknown as CreditPenalty[]

const sources: FinancialReportSources = {
  caisseSpecialeContracts: [{ id: 'cs-1' }],
  caisseSpecialePayments: [
    { id: 'pay-1', parentId: 'cs-1', status: 'PAID', amount: 10_000, penaltyApplied: 500, paidAt: noon('2026-03-05') },
  ],
  caisseSpecialeRefunds: [
    { id: 'ref-1', parentId: 'cs-1', status: 'PAID', amountNominal: 10_000, amountBonus: 500, withdrawalAmount: 10_500, withdrawalDate: noon('2026-06-10') },
    { id: 'ref-2', parentId: 'cs-1', status: 'ARCHIVED', amountNominal: 99_999, amountBonus: 0, withdrawalDate: noon('2026-06-10') },
  ],
  caisseImprevueContracts: [{ id: 'ci-1' }],
  caisseImprevuePayments: [
    { id: 'month-0', parentId: 'ci-1', versements: [{ date: '2026-04-02', amount: 5_000, penalty: 100 }] },
  ],
  caisseImprevueSupports: [
    { id: 'sup-1', parentId: 'ci-1', status: 'REPAID', amount: 3_000, approvedAt: noon('2026-05-01'), repayments: [{ date: '2026-06-01', amount: 3_000 }] },
  ],
  caisseImprevueRefunds: [],
  creditContracts: [creditContract],
  creditPayments,
  creditPenalties,
  guarantorPayments: [],
  placements: [
    { id: 'pl-1', status: 'Active', amount: 500_000, handoverDate: noon('2026-01-10') },
    { id: 'pl-2', status: 'Canceled', amount: 900_000, handoverDate: noon('2026-01-10') },
  ],
  placementCommissions: [
    { id: 'c-1', parentId: 'pl-1', status: 'Paid', amount: 25_000, paidAt: noon('2026-02-10') },
    { id: 'c-2', parentId: 'pl-1', status: 'Due', amount: 25_000, dueDate: noon('2026-03-10') },
  ],
  placementEarlyExits: [],
  membershipRequests: [
    { id: 'mr-1', payments: [{ date: noon('2026-02-01'), amount: 10_000, paymentType: 'Membership' }] },
  ],
}

const report = buildFinancialReport(sources, { from: '2025-09', to: '2026-10', now: noon('2026-10-23') })

const line = (module: FinancialReportModuleKey, block: FinancialReportBlockKey, key: string, data: FinancialReport = report) => {
  const found = data.modules.find((entry) => entry.key === module)?.blocks.find((entry) => entry.key === block)?.lines.find((entry) => entry.key === key)
  if (!found) throw new Error(`Ligne introuvable : ${module}.${block}.${key}`)
  return found
}
const at = (module: FinancialReportModuleKey, block: FinancialReportBlockKey, key: string, month: string) =>
  line(module, block, key).values[report.months.indexOf(month)]

describe('bilan financier', () => {
  it('liste les mois de la période et commence par la synthèse', () => {
    expect(report.months).toHaveLength(14)
    expect(report.months[0]).toBe('2025-09')
    expect(report.monthLabels[0]).toBe('sept. 2025')
    expect(report.modules.map((module) => module.key)).toEqual([
      'synthesis', 'caisse_speciale', 'caisse_imprevue', 'credit_speciale', 'credit_fixe', 'credit_aide', 'placements', 'adhesions',
    ])
  })

  it('crédit spécial : trésorerie, intérêts perçus et reste dû du contrat réel', () => {
    expect(at('credit_speciale', 'treasury', 'out_disbursed', '2025-09')).toBe(1_000_000)
    expect(line('credit_speciale', 'treasury', 'in_repayments').total).toBe(1_340_000)
    expect(line('credit_speciale', 'result', 'income_interest').total).toBe(440_000)
    expect(line('credit_speciale', 'result', 'info_interest_generated').total).toBe(750_000)
    // Reste dû = 1 000 000 + intérêts échus − versements.
    expect(at('credit_speciale', 'outstanding', 'receivables', '2025-09')).toBe(1_000_000)
    expect(at('credit_speciale', 'outstanding', 'receivables', '2025-10')).toBe(1_100_000)
    expect(at('credit_speciale', 'outstanding', 'receivables', '2026-10')).toBe(410_000)
    expect(at('credit_speciale', 'outstanding', 'contracts_active', '2026-10')).toBe(1)
  })

  it('crédit spécial : manque à gagner, pénalités impayées et retard', () => {
    // Partie fixe de M8 à M13 (mois passés) : 10 % de la dette de chaque mois.
    expect(line('credit_speciale', 'risks', 'missed_earnings').total).toBe(576_000)
    expect(at('credit_speciale', 'risks', 'unpaid_penalties', '2026-10')).toBe(91_667)
    expect(at('credit_speciale', 'risks', 'late_amount', '2026-10')).toBe(410_000)
    expect(at('credit_speciale', 'risks', 'late_contracts', '2026-10')).toBe(1)
  })

  it('caisse spéciale : épargne, pénalités et bonus ; un remboursement annulé est ignoré', () => {
    expect(line('caisse_speciale', 'treasury', 'in_total').total).toBe(10_500)
    expect(line('caisse_speciale', 'treasury', 'out_refunds').total).toBe(10_500)
    expect(at('caisse_speciale', 'outstanding', 'funds_held', '2026-05')).toBe(10_000)
    expect(at('caisse_speciale', 'outstanding', 'funds_held', '2026-06')).toBe(0)
    expect(line('caisse_speciale', 'result', 'net').total).toBe(0)
  })

  it('caisse imprévue : un support sort puis rentre', () => {
    expect(at('caisse_imprevue', 'treasury', 'in_contributions', '2026-04')).toBe(5_000)
    expect(at('caisse_imprevue', 'outstanding', 'supports_outstanding', '2026-05')).toBe(3_000)
    expect(at('caisse_imprevue', 'outstanding', 'supports_outstanding', '2026-06')).toBe(0)
  })

  it('placements : capital à restituer et commissions payées seulement', () => {
    expect(at('placements', 'outstanding', 'capital_to_return', '2026-10')).toBe(500_000)
    expect(line('placements', 'result', 'charge_commissions').total).toBe(25_000)
    expect(at('placements', 'outstanding', 'placements_active', '2026-10')).toBe(1)
  })

  it('synthèse : additionne les modules', () => {
    expect(at('synthesis', 'outstanding', 'receivables_total', '2026-10')).toBe(410_000)
    expect(at('synthesis', 'outstanding', 'payables_total', '2026-10')).toBe(505_000)
    expect(line('synthesis', 'result', 'net').total).toBe(
      440_000 + 100 + 10_000 - 25_000 // intérêts + pénalité CI + adhésion − commission ; CS : pénalité 500 − bonus 500
    )
    const inTotal = line('synthesis', 'treasury', 'in_total')
    const outTotal = line('synthesis', 'treasury', 'out_total')
    expect(line('synthesis', 'treasury', 'net_cumulative').total).toBe(inTotal.total - outTotal.total)
  })
})
