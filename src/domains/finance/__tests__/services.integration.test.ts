import { beforeAll, afterAll, describe, it, expect, vi } from 'vitest'
import { getApps, deleteApp } from 'firebase-admin/app'
vi.mock('@/firebase/storage', async () => ({
  ...(await import('firebase/storage')),
  getStorageInstance: () => {
    throw new Error('Browser storage must not be used by the native API')
  },
}))
vi.mock('@/firebase/firestore', async () => ({
  ...(await import('firebase/firestore')),
  db: null,
  isFirestoreAvailable: () => false,
}))
vi.mock('@/firebase/adminFirestore', async () => {
  const { initializeApp } = await import('firebase-admin/app'),
    { getFirestore } = await import('firebase-admin/firestore')
  const app = initializeApp(
    { projectId: 'demo-kara-native-finance' },
    'native-finance-tests',
  )
  return { adminFirestore: getFirestore(app) }
})
vi.mock('../server/documents', async () => {
  const { DocumentRepository } =
    await import('@/domains/infrastructure/documents/repositories/DocumentRepository')
  return {
    ServerFinanceDocuments: class extends DocumentRepository {
      async uploadDocumentFile(file: File, _id: string, type: string) {
        return {
          url: `https://storage.example/${type}/${file.name}`,
          path: `test/${type}/${file.name}`,
          size: file.size,
        }
      }
      async deleteFile() {}
    },
  }
})
import { createFinanceServices } from '../server/services'
import { adminFirestore } from '@/firebase/adminFirestore'
const enabled = process.env.FIRESTORE_EMULATOR_HOST === '127.0.0.1:8189'
const caller = {
  claims: { uid: 'test-admin', name: 'Admin de test' },
  access: {
    isSuperAdmin: true,
    permissions: [],
    permissionsDefined: true,
    isAgent: false,
    restrictedRole: null,
  },
  mustChangePassword: false,
} as any
const day = '2026-11-17'
describe.skipIf(!enabled)(
  'services financiers sur Firestore local isolé',
  () => {
    beforeAll(async () => {
      expect(
        getApps().find((app) => app.name === 'native-finance-tests')?.options
          .projectId,
      ).toBe('demo-kara-native-finance')
      await fetch(
        'http://127.0.0.1:8189/emulator/v1/projects/demo-kara-native-finance/databases/(default)/documents',
        { method: 'DELETE' },
      )
      await adminFirestore!.collection('users').doc('test-member').set({
        id: 'test-member',
        matricule: '9999.TEST',
        firstName: 'Membre',
        lastName: 'Fictif',
        contacts: [],
        groupIds: [],
      })
      await adminFirestore!
        .collection('admins')
        .doc('test-admin')
        .set({
          firstName: 'Admin',
          lastName: 'Test',
          roles: ['SuperAdmin'],
          contacts: [],
          isActive: true,
        })
      await adminFirestore!
        .collection('caisseSettings')
        .doc('test-settings')
        .set({
          caisseType: 'STANDARD',
          isActive: true,
          effectiveAt: new Date('2026-01-01'),
          bonusTable: { M4: 2 },
          penaltyRules: { day4To12: { perDay: 0.5 } },
        })
    })
    afterAll(async () => {
      for (const app of getApps().filter(
        (app) => app.name === 'native-finance-tests',
      ))
        await deleteApp(app)
    })
    it('crée un contrat CS et recalcule son versement avec les vrais repositories', async () => {
      const s = createFinanceServices(caller)
      const id = await s.cs.subscribe({
        memberId: 'test-member',
        monthlyAmount: 25000,
        monthsPlanned: 12,
        caisseType: 'STANDARD',
        firstPaymentDate: day,
        createdBy: caller.claims.uid,
      })
      expect(await s.csPayments.listPayments(id)).toHaveLength(12)
      await s.cs.pay({
        contractId: id,
        memberId: 'test-member',
        dueMonthIndex: 0,
        amount: 25000,
        paidAt: new Date(day + 'T12:00:00Z'),
        time: '12:30',
        mode: 'cash',
      })
      const rows = await s.csPayments.listPayments(id)
      expect(rows[0].status).toBe('PAID')
      const contract = await s.csContracts.getContract(id)
      expect(contract?.nominalPaid).toBe(25000)
      expect(contract?.updatedBy).toBeTruthy()
      const contribution = rows[0].contribs[0]
      await s.cs.updatePaymentContribution({
        contractId: id,
        paymentId: rows[0].id,
        contributionId: contribution.id,
        updates: {
          amount: 25000,
          time: '14:30',
          mode: 'cash',
          paidAt: new Date(day + 'T12:00:00Z'),
          modificationReason: 'Correction de l’heure',
        },
      })
      expect((await s.csPayments.listPayments(id))[0].contribs[0].time).toBe(
        '14:30',
      )
    }, 20000)
    it('répartit un versement CI sur deux mois sans navigateur ni session web', async () => {
      const s = createFinanceServices(caller)
      const id = 'test-CI'
      await adminFirestore!.collection('contractsCI').doc(id).set({
        id,
        memberId: 'test-member',
        memberFirstName: 'Membre',
        memberLastName: 'Fictif',
        memberContacts: [],
        subscriptionCIID: 'test-sub',
        subscriptionCICode: 'A',
        subscriptionCIAmountPerMonth: 10000,
        subscriptionCINominal: 120000,
        subscriptionCIDuration: 12,
        subscriptionCISupportMin: 1000,
        subscriptionCISupportMax: 5000,
        paymentFrequency: 'MONTHLY',
        firstPaymentDate: day,
        status: 'ACTIVE',
        supportHistory: [],
        totalMonthsPaid: 0,
        isEligibleForSupport: false,
        createdBy: 'test-admin',
        updatedBy: 'test-admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      await s.caisseImprevue.createVersement(
        id,
        0,
        { date: day, time: '12:30', amount: 15000, mode: 'cash' },
        new File(['proof'], 'proof.png', { type: 'image/png' }),
        'test-admin',
      )
      const rows = await s.caisseImprevue.getPaymentsByContractId(id)
      expect(rows.find((row) => row.monthIndex === 0)?.accumulatedAmount).toBe(
        10000,
      )
      expect(rows.find((row) => row.monthIndex === 1)?.accumulatedAmount).toBe(
        5000,
      )
      expect(rows.reduce((sum, row) => sum + row.accumulatedAmount, 0)).toBe(
        15000,
      )
      await s.caisseImprevue.createVersement(
        id,
        1,
        { date: day, time: '12:31', amount: 1000, mode: 'cash' },
        new File(['proof'], 'proof.png', { type: 'image/png' }),
        'test-admin',
      )
      const second = (await s.caisseImprevue.getPaymentsByContractId(id)).find(
        (row) => row.monthIndex === 1,
      )!
      expect(new Set(second.versements.map((v) => v.id)).size).toBe(
        second.versements.length,
      )
    }, 20000)
    it('enregistre un crédit et conserve ses totaux métier', async () => {
      const s = createFinanceServices(caller),
        id = 'MK_CSP_9999_TEST'
      await adminFirestore!
        .collection('creditContracts')
        .doc(id)
        .set({
          id,
          clientId: 'test-member',
          clientFirstName: 'Membre',
          clientLastName: 'Fictif',
          clientContacts: [],
          creditType: 'SPECIALE',
          amount: 100000,
          interestRate: 7,
          monthlyPaymentAmount: 20000,
          totalAmount: 107000,
          amountPaid: 0,
          amountRemaining: 100000,
          duration: 7,
          firstPaymentDate: new Date(day + 'T12:00:00Z'),
          status: 'ACTIVE',
          createdBy: 'test-admin',
          createdAt: new Date(),
          updatedAt: new Date(),
          guarantorIsMember: false,
        })
      const payment = await s.creditSpeciale.createPayment(
        {
          creditId: id,
          amount: 20000,
          principalAmount: 0,
          interestAmount: 0,
          penaltyAmount: 0,
          paymentDate: new Date(day + 'T12:00:00Z'),
          paymentTime: '12:30',
          mode: 'cash',
          createdBy: 'test-admin',
        },
        undefined,
        [],
        1,
      )
      expect(payment.amount).toBe(20000)
      const contract = await s.creditSpeciale.getContractById(id)
      expect(contract?.amountPaid).toBe(20000)
      expect(contract?.amountRemaining).toBeGreaterThan(0)
    }, 20000)
  },
)
