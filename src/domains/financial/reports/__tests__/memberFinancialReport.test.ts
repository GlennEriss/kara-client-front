import { describe, expect, it } from 'vitest'
import { buildFinancialReport } from '../builders/buildFinancialReport'
import type { FinancialReportSources } from '../entities/financial-report-sources.types'
import { reportFileName, reportTitle } from '../exports/report-format'
import { firstActivityMonth } from '../utils/member-report'
import { listMonths, periodError } from '../utils/report-months'

const noon = (value: string) => new Date(`${value}T12:00:00`)

const emptySources = (): FinancialReportSources => ({
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
})

// Membre qui n'a qu'une caisse spéciale et son adhésion.
const memberSources: FinancialReportSources = {
  ...emptySources(),
  caisseSpecialeContracts: [{ id: 'cs-1', memberId: 'M1', createdAt: noon('2025-03-02') }],
  caisseSpecialePayments: [{ id: 'pay-1', parentId: 'cs-1', status: 'PAID', amount: 10_000, paidAt: noon('2025-04-05') }],
  membershipRequests: [
    { id: 'req-1', matricule: 'M1', createdAt: noon('2025-02-20'), payments: [{ paymentType: 'Membership', amount: 10_300, date: noon('2025-01-28') }] },
  ],
}

const subject = { memberId: 'M1', matricule: '0001.MK.010125', name: 'NDONG Paul' }

describe('bilan d’un membre', () => {
  it('« toute la période » part de sa première opération, paiements d’adhésion compris', () => {
    expect(firstActivityMonth(memberSources)).toBe('2025-01')
    expect(firstActivityMonth(emptySources())).toBeNull()
  })

  it('ne garde que les modules où le membre a une opération', () => {
    const report = buildFinancialReport(memberSources, { from: '2025-01', to: '2025-06', now: noon('2025-06-30') }, { subject })
    expect(report.subject).toEqual(subject)
    expect(report.modules.map((module) => module.key)).toEqual(['synthesis', 'caisse_speciale', 'adhesions'])
    expect(report.modules[0].description).toContain('NDONG Paul')
  })

  it('le bilan de l’association garde tous ses modules', () => {
    const report = buildFinancialReport(memberSources, { from: '2025-01', to: '2025-06', now: noon('2025-06-30') })
    expect(report.subject).toBeUndefined()
    expect(report.modules).toHaveLength(8)
  })

  it('accepte une période plus longue que celle de l’association', () => {
    expect(listMonths('2020-01', '2026-12')).toHaveLength(36)
    expect(listMonths('2020-01', '2026-12', 120)).toHaveLength(84)
    expect(periodError({ from: '2020-01', to: '2024-12' })).toMatch(/36 mois/)
    expect(periodError({ from: '2020-01', to: '2024-12' }, 120)).toBeNull()
  })

  it('nomme le fichier et le titre d’après le membre', () => {
    const report = buildFinancialReport(memberSources, { from: '2025-01', to: '2025-06', now: noon('2025-06-30') }, { subject })
    expect(reportTitle(report)).toBe('Bilan financier de NDONG Paul (0001.MK.010125)')
    expect(reportFileName(report, 'pdf')).toBe('bilan_financier_0001.MK.010125_2025-01_2025-06.pdf')
  })
})
