import { describe, expect, it } from 'vitest'
import {
  agreementBalance,
  generateAgreementSchedule,
  validateAgreementBatch,
  validateAgreementCashTimeline,
  validAgreementDate,
  type AgreementBatchDraft,
  type AgreementPayment,
  type GroupAgreement,
} from './agreement-model'

export const payment = (
  id: string,
  amount: number,
  date: string,
  receivedBy: 'KARA' | 'CREDITOR' = 'KARA',
): AgreementPayment => ({
  id,
  amount,
  date,
  receivedBy,
  mode: 'CASH',
  byId: 'admin',
  byName: 'Admin',
  recordedAt: `${date}T12:00:00Z`,
})
export const agreement = (extra: Partial<GroupAgreement> = {}): GroupAgreement => ({
  id: 'a1',
  groupId: 'g1',
  batchId: 'batch-001',
  kind: 'SALE',
  title: 'Ventilateur',
  description: 'Équipement',
  agreementDate: '2026-09-01',
  creditorId: 'seller',
  creditorMatricule: 'S1',
  creditorName: 'Alice Vendeur',
  debtorId: 'bob',
  debtorMatricule: 'B1',
  debtorName: 'Bob Acheteur',
  partyIds: ['seller', 'S1', 'bob', 'B1'],
  quantity: 1,
  unitAmount: 60000,
  totalAmount: 60000,
  schedule: generateAgreementSchedule(60000, 3, '2026-09-10'),
  status: 'ACTIVE',
  payments: [],
  remittances: [],
  reminders: [],
  history: [],
  createdBy: 'admin',
  ...extra,
})
export const batch = (): AgreementBatchDraft => ({
  requestId: 'batch-001',
  groupId: 'g1',
  creditorId: 'seller',
  kind: 'SALE',
  title: 'Ventilateurs',
  description: '',
  agreementDate: '2026-09-01',
  buyers: [
    {
      debtorId: 'bob',
      quantity: 1,
      unitAmount: 60000,
      schedule: generateAgreementSchedule(60000, 3, '2026-09-10'),
    },
    {
      debtorId: 'paul',
      quantity: 2,
      unitAmount: 60000,
      schedule: generateAgreementSchedule(120000, 4, '2026-09-10'),
    },
  ],
})

describe('échéanciers et soldes des accords entre membres', () => {
  it('garde les jours de fin de mois et répartit exactement les FCFA', () => {
    expect(generateAgreementSchedule(100, 3, '2028-01-31')).toEqual([
      { id: 'e1', dueDate: '2028-01-31', amount: 34 },
      { id: 'e2', dueDate: '2028-02-29', amount: 33 },
      { id: 'e3', dueDate: '2028-03-31', amount: 33 },
    ])
    expect(generateAgreementSchedule(30, 3, '2026-12-28', 'WEEKLY').map((r) => r.dueDate)).toEqual([
      '2026-12-28',
      '2027-01-04',
      '2027-01-11',
    ])
    expect(generateAgreementSchedule(20, 2, '2026-12-31', 'DAILY')[1].dueDate).toBe('2027-01-01')
    expect(validAgreementDate('2026-02-30')).toBe(false)
  })
  it('valide la quantité et le total propre à chaque acheteur', () => {
    expect(() => validateAgreementBatch(batch())).not.toThrow()
    const invalid = batch()
    invalid.buyers[1].schedule[0].amount++
    expect(() => validateAgreementBatch(invalid)).toThrow(/somme/)
    const self = batch()
    self.buyers[0].debtorId = 'seller'
    expect(() => validateAgreementBatch(self)).toThrow(/différents/)
    const duplicate = batch()
    duplicate.buyers[1].debtorId = 'bob'
    expect(() => validateAgreementBatch(duplicate)).toThrow(/fois/)
    const unordered = batch()
    unordered.buyers[0].schedule[1].dueDate = '2026-09-10'
    expect(() => validateAgreementBatch(unordered)).toThrow(/ordre/)
  })
  it('affecte les paiements aux échéances anciennes, sans toucher un autre accord', () => {
    const first = agreement({ payments: [payment('p1', 25000, '2026-09-09', 'CREDITOR')] })
    expect(agreementBalance(first, '2026-10-11')).toMatchObject({
      paid: 25000,
      remaining: 35000,
      overdue: 15000,
      directlyReceived: 25000,
      heldByKara: 0,
      receivable: 35000,
      status: 'OVERDUE',
      installments: [
        { paid: 20000, remaining: 0 },
        { paid: 5000, remaining: 15000 },
        { paid: 0, remaining: 20000 },
      ],
    })
    expect(agreementBalance(agreement(), '2026-09-10').overdue).toBe(0)
  })
  it('distingue règlement de l’acheteur et remise au vendeur, y compris une remise partielle', () => {
    const a = agreement({
      payments: [
        payment('direct', 20000, '2026-09-05', 'CREDITOR'),
        payment('kara', 40000, '2026-10-01'),
      ],
    })
    expect(agreementBalance(a, '2026-11-01')).toMatchObject({
      remaining: 0,
      receivedByCreditor: 20000,
      heldByKara: 40000,
      receivable: 40000,
      status: 'PENDING_REMITTANCE',
    })
    a.remittances.push(payment('r1', 12000, '2026-10-02'))
    expect(agreementBalance(a, '2026-11-01')).toMatchObject({
      receivedByCreditor: 32000,
      heldByKara: 28000,
      status: 'PENDING_REMITTANCE',
    })
    a.remittances.push(payment('r2', 28000, '2026-10-03'))
    expect(agreementBalance(a, '2026-11-01')).toMatchObject({
      remaining: 0,
      heldByKara: 0,
      status: 'SETTLED',
    })
  })
  it('ignore les écritures annulées ou futures et garde les soldes annulés hors encours', () => {
    const a = agreement({
      payments: [
        { ...payment('void', 20000, '2026-09-01'), voidedAt: '2026-09-02' },
        payment('future', 20000, '2026-12-01'),
      ],
    })
    expect(agreementBalance(a, '2026-11-01').paid).toBe(0)
    expect(agreementBalance({ ...a, status: 'CANCELLED' }, '2026-11-01')).toMatchObject({
      remaining: 0,
      overdue: 0,
      receivable: 0,
      nextDue: undefined,
      status: 'CANCELLED',
    })
  })
  it('refuse une remise avant les fonds et une correction qui rendrait une ancienne remise sans couverture', () => {
    const a = agreement({
      payments: [payment('old', 20000, '2026-09-01'), payment('new', 40000, '2026-11-01')],
      remittances: [payment('remit', 15000, '2026-10-01')],
    })
    expect(() => validateAgreementCashTimeline(a)).not.toThrow()
    a.payments[0].voidedAt = '2026-11-10'
    expect(() => validateAgreementCashTimeline(a)).toThrow(/cette date/)
    expect(() =>
      validateAgreementCashTimeline(
        agreement({
          payments: [payment('p', 20000, '2026-10-02')],
          remittances: [payment('r', 20000, '2026-10-01')],
        }),
      ),
    ).toThrow(/cette date/)
  })
})
