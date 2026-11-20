import { describe, expect, it } from 'vitest'
import type { CreditContract, CreditPayment } from '@/types/types'
import { buildFinancialReport } from '../builders/buildFinancialReport'
import { buildFinancialReportDetails } from '../builders/buildFinancialReportDetails'
import { contractSourcesFixture } from './fixtures/contracts'

const date = (day: string) => new Date(`${day}T12:00:00+01:00`)
describe('bilan des crédits simples après terme', () => {
  it.each(['FIXE', 'AIDE'] as const)(
    '%s : sépare le prêt impayé des pénalités et compte chaque encaissement une fois',
    (creditType) => {
      const contract = {
        id: 'SIMPLE',
        creditType,
        clientId: 'alice',
        status: 'PARTIAL',
        amount: 100000,
        totalAmount: 110000,
        interestRate: 10,
        duration: 2,
        monthlyPaymentAmount: 55000,
        firstPaymentDate: date('2026-02-01'),
        createdAt: date('2026-01-01'),
        disbursementDate: date('2026-01-01'),
        restMonths: [],
        missedEarningsPayments: [
          {
            id: 'LEGACY',
            amount: 4000,
            date: date('2026-05-10'),
            mode: 'cash',
            recordedBy: 'admin',
          },
        ],
      } as unknown as CreditContract
      const sources = {
        ...contractSourcesFixture(),
        creditContracts: [contract],
        creditPenalties: [],
        guarantorPayments: [],
        creditPayments: [
          {
            id: 'M2_SIMPLE',
            creditId: 'SIMPLE',
            amount: 50000,
            paymentDate: date('2026-03-15'),
          },
        ] as CreditPayment[],
      }
      const report = buildFinancialReport(sources, {
        from: '2026-03',
        to: '2026-05',
        now: date('2026-05-31'),
      })
      const module = report.modules.find(
        (module) =>
          module.key ===
          (creditType === 'FIXE' ? 'credit_fixe' : 'credit_aide'),
      )!
      const line = (block: string, key: string) =>
        module.blocks
          .find((blockItem) => blockItem.key === block)!
          .lines.find((row) => row.key === key)!
      expect(line('treasury', 'in_total').values).toEqual([50000, 0, 4000])
      expect(line('treasury', 'in_penalties').values).toEqual([0, 0, 4000])
      expect(line('treasury', 'in_missed_earnings').values).toEqual([0, 0, 0])
      expect(line('risks', 'unpaid_penalties').values).toEqual([0, 6000, 8000])
      expect(line('risks', 'missed_earnings_outstanding').values).toEqual([
        60000, 60000, 60000,
      ])
      expect(line('outstanding', 'receivables').values).toEqual([
        60000, 60000, 60000,
      ])
      for (const block of module.blocks)
        for (const row of block.lines) {
          const details = buildFinancialReportDetails(sources, report, {
            module: module.key,
            block: block.key,
            line: row.key,
          })
          expect(
            details.reconciliationDifference,
            `${block.key}/${row.key}`,
          ).toBe(0)
        }
    },
  )
})
