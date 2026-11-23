import { expect, it, vi } from 'vitest'
import type { Firestore } from 'firebase-admin/firestore'
import { memberPaymentHistory, memberPaymentHistoryPdf } from '../server/payment-history'

it('alimente la liste et le PDF uniquement avec les versements du membre admis dans l’historique', async () => {
  const centralData = [
    { id: 'membership', beneficiaryId: 'DOSSIER', paymentType: 'Membership', amount: 10000 },
    { id: 'credit', beneficiaryId: 'MK1', paymentType: 'Credit', amount: 50000 },
    { id: 'placement', beneficiaryId: 'MK1', sourceType: 'placement', amount: 90000 },
    { id: 'misleading', beneficiaryId: 'MK1', paymentType: 'Subscription', creditId: 'credit-1', amount: 50000 },
    { id: 'foreign', beneficiaryId: 'MK2', sourceId: 'MK1', paymentType: 'Membership', amount: 10000 },
    { id: 'unknown', beneficiaryId: 'MK1', amount: 1000 },
    { id: 'ci-sync', beneficiaryId: 'MK1', paymentType: 'UnexpectedFund', amount: 30000,
      sourcePath: 'contractsCI/CI1/payments/month-0', versementId: 'v1' },
  ]
  const db = {
    collection: vi.fn((name: string) => {
      if (name === 'payments') return { where: () => ({ get: async () => ({
        docs: centralData.map(data => ({ id: data.id, data: () => ({ ...data, date: '2026-06-10' }) })),
      }) }) }
      if (name === 'contractsCI') return {
        where: () => ({ get: async () => ({ docs: [{ id: 'CI1', data: () => ({ memberId: 'MK1' }) }] }) }),
        doc: () => ({ collection: () => ({ get: async () => ({ docs: [{
          ref: { path: 'contractsCI/CI1/payments/month-0' },
          data: () => ({ versements: [
            { id: 'v1', amount: 30000, date: '2026-06-10' },
            { id: 'v2', amount: 10000, date: '2026-06-11' },
          ] }),
        }] }) }) }),
      }
      return { where: () => ({ get: async () => ({ docs: [] }) }) }
    }),
  }
  const rows = await memberPaymentHistory(db as unknown as Firestore, {
    uid: 'uid-1', matricule: 'MK1', email: '', member: {}, dossier: { id: 'DOSSIER' },
  })

  expect(rows.map(row => row.domain)).toEqual(['caisse-imprevue', 'caisse-imprevue', 'membership'])
  expect(rows.reduce((sum, p) => sum + p.amount, 0)).toBe(50000)
  expect(db.collection.mock.calls.flat()).not.toContain('creditContracts')
  expect(db.collection.mock.calls.flat()).not.toContain('placements')
  const file = await memberPaymentHistoryPdf(rows)
  expect(file.mime).toBe('application/pdf')
  expect(Buffer.from(file.base64, 'base64').toString('ascii', 0, 4)).toBe('%PDF')
})
