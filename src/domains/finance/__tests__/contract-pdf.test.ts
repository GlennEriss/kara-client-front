import { describe, it, expect, vi } from 'vitest'
vi.mock('../server/read-model', () => ({
  financeContractDetail: vi.fn(async (_s, module, id) => ({
    record: {
      id,
      memberId: 'test-member',
      clientId: 'test-member',
      clientFirstName: 'Membre',
      clientLastName: 'Fictif',
      clientContacts: [],
      status: 'ACTIVE',
      creditType: 'SPECIALE',
      amount: 100000,
      interestRate: 7,
      monthlyAmount: 25000,
      monthlyPaymentAmount: 20000,
      monthsPlanned: 12,
      duration: 7,
      totalAmount: 107000,
      amountPaid: 0,
      amountRemaining: 100000,
      firstPaymentDate: '2026-11-17',
      contractStartAt: new Date('2026-11-17'),
      caisseType: 'STANDARD',
      paymentFrequency: 'MONTHLY',
      subscriptionCIDuration: 12,
      subscriptionCIAmountPerMonth: 10000,
      subscriptionCINominal: 120000,
      emergencyContact: {},
    },
    member: {
      matricule: '9999.TEST',
      firstName: 'Membre',
      lastName: 'Fictif',
      contacts: [],
    },
    payments: [],
    refunds: [],
    stats: { totalAmountPaid: 0 },
  })),
}))
import { generateContractDocument } from '../server/contract-pdf'
describe('documents contractuels générés sans navigateur', () => {
  it.each(['caisse-speciale', 'caisse-imprevue', 'credit-speciale'] as const)(
    'produit le modèle officiel %s et sa quittance',
    async (module) => {
      const services = {
        members: {
          getMemberById: vi.fn().mockResolvedValue({
            matricule: '9999.TEST',
            firstName: 'Membre',
            lastName: 'Fictif',
            contacts: [],
          }),
        },
      }
      for (const liquidation of [false, true]) {
        const result = await generateContractDocument(
          services as any,
          module,
          'test-contract',
          liquidation,
        )
        const buffer = Buffer.from(result.base64, 'base64')
        expect(buffer.subarray(0, 5).toString()).toBe('%PDF-')
        expect(buffer.length).toBeGreaterThan(5000)
        expect(result.filename).toContain(liquidation ? 'quittance' : 'contrat')
      }
    },
    20000,
  )
})
