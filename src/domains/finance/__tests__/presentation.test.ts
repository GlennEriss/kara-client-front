import { describe, it, expect } from 'vitest'
import {
  filterPresentedRows,
  summarizePresentedRows,
  financeTimeline,
  projectFinanceContract,
  presentedContracts,
} from '../server/presentation'
import type { FinanceServices } from '../server/services'
const row = (
  id: string,
  type = 'STANDARD',
  status = 'ACTIVE',
  paid = 10000,
) => ({
  id,
  status,
  memberName: 'André de test',
  createdAt: '2026-11-01T12:00:00Z',
  financeView: {
    type,
    paid,
    total: 100000,
    remaining: 100000 - paid,
    monthly: 10000,
    duration: 10,
    nextDueAt: '2026-11-20T12:00:00Z',
    overdue: status === 'OVERDUE',
    earlyWithdrawals: [],
    fixedPhase: false,
  },
})
describe('lecture financière pour les cartes natives', () => {
  it('refuse une statistique tronquée si le plafond de lecture est dépassé', async () => {
    const services = {
      db: {
        collection: () => ({
          limit: () => ({ get: async () => ({ size: 5001 }) }),
        }),
      },
    } as unknown as FinanceServices
    await expect(
      presentedContracts(services, 'caisse-speciale', { limit: 25 }),
    ).rejects.toThrow('agrégation serveur')
  })
  it('ne marque pas un crédit en attente comme en retard et somme ses pénalités réelles', async () => {
    const services = {
      creditSpeciale: {
        getPaymentsByCreditId: async () => [],
        getPenaltiesByCreditId: async () => [{ amount: 40 }, { amount: 10 }],
      },
    } as unknown as FinanceServices
    const contract = {
      id: 'C1',
      creditType: 'SPECIALE',
      status: 'PENDING',
      firstPaymentDate: '2026-01-01',
      createdAt: '2026-01-01',
      amount: 10000,
      monthlyPaymentAmount: 11000,
      totalAmount: 11000,
      amountPaid: 0,
      amountRemaining: 11000,
      duration: 1,
      interestRate: 10,
    }
    const presented = await projectFinanceContract(
      services,
      'credit-speciale',
      contract,
      new Date('2026-11-17T12:00:00Z'),
    )
    expect(presented.financeView).toMatchObject({
      overdue: false,
      penalties: 50,
    })
  })
  it('calcule les indicateurs sur tous les dossiers, au-delà de la première page', () => {
    const rows = Array.from({ length: 37 }, (_, i) => row(String(i)))
    expect(summarizePresentedRows(rows, 'caisse-speciale')).toMatchObject({
      total: 37,
      paid: 370000,
      distribution: [{ key: 'STANDARD', value: 37 }],
    })
  })
  it('conserve les variantes charitables dans l’onglet de famille et permet le type exact', () => {
    const rows = [row('A'), row('B', 'STANDARD_CHARITABLE'), row('C', 'LIBRE')]
    expect(
      filterPresentedRows(rows, { type: 'STANDARD_FAMILY' }).map((r) => r.id),
    ).toEqual(['A', 'B'])
    expect(
      filterPresentedRows(rows, { type: 'STANDARD' }).map((r) => r.id),
    ).toEqual(['A'])
  })
  it('distingue retards, clôtures CI et partie fixe sans confondre les statuts des modules', () => {
    const rows = [
      row('A', 'MONTHLY', 'FINISHED'),
      row('B', 'MONTHLY', 'CANCELED'),
      row('C', 'MONTHLY', 'ACTIVE'),
      row('D', 'SPECIALE', 'OVERDUE'),
    ]
    expect(
      filterPresentedRows(rows, { tab: 'closed' }).map((r) => r.id),
    ).toEqual(['A', 'B'])
    expect(
      filterPresentedRows(rows, { tab: 'overdue' }).map((r) => r.id),
    ).toEqual(['D'])
    expect(filterPresentedRows(rows, { tab: 'fixed' })).toEqual([])
  })
  it('croise recherche accentuée, montants et bornes de dates inclusives', () => {
    expect(
      filterPresentedRows([row('A')], {
        search: 'andre',
        paidMin: 10000,
        createdFrom: '2026-11-01',
        createdTo: '2026-11-01',
      }),
    ).toHaveLength(1)
    expect(filterPresentedRows([row('A')], { paidMin: 10001 })).toHaveLength(0)
  })
  it('affiche un paiement CI partiel et les mois non encore créés dans l’échéancier', () => {
    const result = financeTimeline(
      'caisse-imprevue',
      {
        status: 'ACTIVE',
        subscriptionCIDuration: 3,
        subscriptionCIAmountPerMonth: 10000,
        firstPaymentDate: '2026-10-31',
        paymentFrequency: 'MONTHLY',
      },
      [
        {
          id: 'p0',
          monthIndex: 0,
          accumulatedAmount: 5000,
          targetAmount: 10000,
          status: 'PARTIAL',
        },
      ],
      new Date('2026-11-17T12:00:00Z'),
    )
    expect(result).toHaveLength(3)
    expect(result[0]).toMatchObject({
      installmentNumber: 1,
      paidAmount: 5000,
      remainingAmount: 5000,
      status: 'OVERDUE',
      paymentId: 'p0',
    })
    expect(result[1]).toMatchObject({
      installmentNumber: 2,
      paidAmount: 0,
      status: 'DUE',
    })
    expect(result[1].dueDate?.slice(0, 10)).toBe('2026-11-30')
  })
})
