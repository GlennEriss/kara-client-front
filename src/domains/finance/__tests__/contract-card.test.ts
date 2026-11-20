import { describe, expect, it } from 'vitest'
import { contractSignature, projectContractCard } from '../server/contract-card'
import { contractActionAvailable } from '../server/contract-policy'
import {
  projectFinanceContract,
  filterPresentedRows,
} from '../server/presentation'
import type { FinanceServices } from '../server/services'

describe('cartes contractuelles par module', () => {
  it.each(['2026-11-24T00:00:00Z', '2026-11-23T23:00:00Z'])(
    'expose le même forfait hebdomadaire et ses jours civils pour %s',
    async (firstPaymentDate) => {
      const result = await projectFinanceContract(
        {} as FinanceServices,
        'credit-speciale',
        {
          id: 'weekly-test',
          creditType: 'SPECIALE',
          durationUnit: 'WEEKS',
          repaymentModel: 'DEGRESSIVE',
          status: 'ACTIVE',
          amount: 300000,
          interestRate: 5,
          totalAmount: 315000,
          monthlyPaymentAmount: 315000,
          amountPaid: 0,
          amountRemaining: 315000,
          duration: 2,
          firstPaymentDate,
          initialStartAt: '2026-11-10',
          disbursementDate: '2026-11-10',
          createdAt: '2026-11-11',
        },
        new Date('2026-11-20T12:00:00Z'),
        { payments: [], penalties: [] },
      )
      expect(result.contractCard.credit.startAt).toBe(
        '2026-11-10T12:00:00.000Z',
      )
      expect(result.contractCard.credit.weekly).toEqual({
        weeks: 2,
        firstDueAt: '2026-11-24T12:00:00.000Z',
        interestEndAt: '2026-12-10T12:00:00.000Z',
        initialInterestAmount: 15000,
        initialDueAmount: 315000,
        recurring: true,
        periodDays: 7,
      })
      expect(result.financeView).toMatchObject({
        total: 315000,
        paid: 0,
        remaining: 315000,
        durationUnit: 'WEEKS',
      })
    },
  )
  it('ne confond pas un PDF CS préparé avec une signature membre validée', () => {
    expect(
      contractSignature('caisse-speciale', { contractPdf: { url: 'pdf' } }),
    ).toBe('WAITING_MEMBER')
    expect(
      contractSignature('caisse-speciale', {
        contractPdf: {},
        memberSignedStatus: 'REJECTED',
      }),
    ).toBe('REJECTED')
    expect(
      contractSignature('caisse-speciale', { memberSignedStatus: 'VALIDATED' }),
    ).toBe('SIGNED')
    expect(
      contractSignature('caisse-imprevue', {
        contractStartId: 'signed',
        memberSignedStatus: 'PENDING_ADMIN',
      }),
    ).toBe('SIGNED')
  })
  it('sépare la progression des échéances CI de la progression monétaire et masque les progressions variables CS', () => {
    const data = { refunds: [], paidPeriods: 2, duration: 5, progress: 17 }
    expect(projectContractCard('caisse-imprevue', {}, data)).toMatchObject({
      progress: 40,
      progressLabel: 'Échéances réglées',
    })
    for (const type of [
      'LIBRE',
      'LIBRE_CHARITABLE',
      'JOURNALIERE',
      'JOURNALIERE_CHARITABLE',
    ])
      expect(
        projectContractCard('caisse-speciale', { caisseType: type }, data)
          .progress,
      ).toBeNull()
    expect(
      projectContractCard('caisse-speciale', { caisseType: 'LIBRE' }, data)
        .monthlyKind,
    ).toBe('FREE')
  })
  it('privilégie la remise approuvée puis la date réelle pour un retrait déjà remis', () => {
    const data = {
      duration: 5,
      paidPeriods: 2,
      refunds: [
        { id: 'paid', type: 'EARLY', status: 'PAID', paidAt: '2026-10-01' },
        {
          id: 'approved',
          type: 'EARLY',
          status: 'APPROVED',
          approvedAt: '2026-11-01T12:00:00Z',
        },
      ],
    }
    expect(
      projectContractCard('caisse-imprevue', {}, data).earlyWithdrawal,
    ).toMatchObject({
      id: 'approved',
      date: '2026-12-01T12:00:00.000Z',
      dateKind: 'EXPECTED',
    })
    data.refunds.pop()
    expect(
      projectContractCard('caisse-imprevue', {}, data).earlyWithdrawal,
    ).toMatchObject({ date: '2026-10-01T00:00:00.000Z', dateKind: 'ACTUAL' })
  })
  it('conserve le document de remboursement historique même sans ligne de remboursement chargée', () => {
    expect(
      projectContractCard(
        'caisse-imprevue',
        { finalRefundDocumentId: 'legacy-document' },
        { refunds: [], duration: 1, paidPeriods: 1 },
      ).refundTypes,
    ).toEqual(['FINAL'])
  })
  it('reconstruit les retards CI même en absence de documents de versement', async () => {
    const row = await projectFinanceContract(
      {} as FinanceServices,
      'caisse-imprevue',
      {
        id: 'ci',
        status: 'ACTIVE',
        paymentFrequency: 'MONTHLY',
        firstPaymentDate: '2026-09-18',
        subscriptionCIDuration: 12,
        subscriptionCIAmountPerMonth: 30000,
        subscriptionCINominal: 360000,
      },
      new Date('2026-11-18T12:00:00Z'),
      { payments: [], refunds: [] },
    )
    expect(row.contractCard.overdueSummary).toMatchObject({
      count: 2,
      totalDue: 60000,
      maxDaysLate: 61,
    })
  })
  it('restreint les actions documentaires au bon état et protège les contrats verrouillés', () => {
    expect(
      contractActionAvailable(
        'caisse-imprevue',
        { status: 'ACTIVE', contractStartId: 'doc' },
        'document.upload',
      ),
    ).toBe(false)
    expect(
      contractActionAvailable(
        'caisse-imprevue',
        { status: 'FINISHED', contractStartId: 'doc' },
        'document.replace',
      ),
    ).toBe(false)
    expect(
      contractActionAvailable(
        'caisse-speciale',
        { status: 'CLOSED' },
        'contract.delete',
      ),
    ).toBe(false)
    expect(
      contractActionAvailable(
        'caisse-speciale',
        { status: 'ACTIVE' },
        'member-document.approve',
      ),
    ).toBe(false)
  })
  it('inclut aussi les contrats terminés avec pertes dans l’onglet En perte', () => {
    const financeView = {
      type: 'SPECIALE',
      earlyWithdrawals: [],
      paid: 1,
      total: 2,
      remaining: 1,
    }
    const row = {
      id: 'ended',
      status: 'DISCHARGED',
      financeView,
      contractCard: { credit: { losses: { missedEarnings: 4000 } } },
    }
    expect(filterPresentedRows([row], { tab: 'writtenOff' })).toHaveLength(1)
    expect(
      filterPresentedRows([{ ...row, contractCard: {} }], {
        tab: 'writtenOff',
      }),
    ).toHaveLength(0)
  })
})
