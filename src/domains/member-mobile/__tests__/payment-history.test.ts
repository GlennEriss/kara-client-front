import { expect, it } from 'vitest'
import { memoryDb } from './memory-db'
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
  const { db, reads } = memoryDb({
    ...Object.fromEntries(centralData.map(({ id, ...data }) => [`payments/${id}`, { ...data, date: '2026-06-10' }])),
    'payments/charity-sync': { beneficiaryId: 'MK1', paymentType: 'Charity', date: '2026-06-12', amount: 5000, sourcePath: 'charity-events/E1/contributions/C1' },
    'charity-events/E1': { title: 'Collecte de Libreville' },
    'charity-events/E1/participants/P1': { memberId: 'MK1', participantType: 'member' },
    'charity-events/E1/contributions/C1': { participantId: 'P1', contributionType: 'money', status: 'confirmed', contributionDate: '2026-06-12', payment: { amount: 5000 } },
    'charity-events/E1/contributions/C2': { participantId: 'P1', contributionType: 'money', status: 'confirmed', contributionDate: '2026-06-13', payment: { amount: 2500 } },
    'charity-events/E1/contributions/C3': { participantId: 'P1', contributionType: 'money', status: 'pending', contributionDate: '2026-06-13', payment: { amount: 2500 } },
    'contractsCI/CI1': { memberId: 'MK1' },
    'contractsCI/CI1/payments/month-0': { versements: [
      { id: 'v1', amount: 30000, date: '2026-06-10' },
      { id: 'v2', amount: 10000, date: '2026-06-11' },
    ] },
  })
  const rows = await memberPaymentHistory(db, {
    uid: 'uid-1', matricule: 'MK1', email: '', member: {}, dossier: { id: 'DOSSIER' },
  })

  expect(rows.map(row => row.domain)).toEqual(['charity', 'charity', 'caisse-imprevue', 'caisse-imprevue', 'membership'])
  expect(rows.reduce((sum, p) => sum + p.amount, 0)).toBe(57500)
  expect(reads).not.toContain('creditContracts')
  expect(reads).not.toContain('placements')
  expect(rows.filter(row => row.domain === 'charity').map(row => row.title)).toEqual(['Collecte de Libreville', 'Collecte de Libreville'])
  const file = await memberPaymentHistoryPdf(rows)
  expect(file.mime).toBe('application/pdf')
  expect(Buffer.from(file.base64, 'base64').toString('ascii', 0, 4)).toBe('%PDF')
})
