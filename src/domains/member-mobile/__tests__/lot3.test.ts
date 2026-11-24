// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { memberCaller as caller, memoryDb } from './memory-db'
import {
  checkMemberFinanceAccess,
  contractDTO,
  financePolicy,
  memberFinanceList,
  ownedFinanceRecord,
  paymentDTO,
} from '../server/finance-model'
import {
  applyMemberFinanceOperation,
  createMemberFinanceDemand,
  type UploadedMemberFiles,
} from '../server/finance-actions'

const op = 'test-operation-000001',
  now = new Date('2026-11-21T12:00:00Z')
const ci = {
  memberId: caller.matricule,
  status: 'ACTIVE',
  firstPaymentDate: '2026-06-01',
  subscriptionCIDuration: 12,
  paymentFrequency: 'MONTHLY',
  subscriptionCIAmountPerMonth: 10000,
  subscriptionCISupportMin: 1000,
  subscriptionCISupportMax: 30000,
}
const cs = {
  memberId: caller.uid,
  status: 'ACTIVE',
  contractStartAt: '2026-06-01',
  monthsPlanned: 3,
  caisseType: 'STANDARD',
  monthlyAmount: 10000,
  currentMonthIndex: 3,
  withdrawLockedUntilM: 0,
}
const files: UploadedMemberFiles = {
  proof: {
    url: 'https://fixture.test/proof.pdf',
    path: 'fixture/proof',
    mime: 'application/pdf',
    size: 100,
    name: 'preuve.pdf',
  },
  signedDocument: {
    url: 'https://fixture.test/signed.pdf',
    path: 'fixture/signed',
    mime: 'application/pdf',
    size: 100,
    name: 'signe.pdf',
  },
  proofPhoto: {
    url: 'https://fixture.test/photo.jpg',
    path: 'fixture/photo',
    mime: 'image/jpeg',
    size: 100,
    name: 'photo.jpg',
  },
}
const declare = {
  action: 'declare',
  monthIndex: 0,
  amount: 2000,
  mode: 'cash',
  date: '2026-11-21',
  time: '12:30',
}
const refund = {
  action: 'refund',
  type: 'FINAL',
  reason: 'Je demande mon capital.',
  withdrawalAmount: 2000,
  withdrawalMode: 'cash',
  withdrawalDate: '2026-11-21',
  withdrawalTime: '12:30',
}
const demand = {
  contactIsMember: false,
  caisseType: 'STANDARD',
  monthlyAmount: 5000,
  monthsPlanned: 12,
  desiredDate: '2026-12-01',
}
describe('caisses natives membre — propriété et présentation', () => {
  it('filtre les deux identifiants personnels et ne retourne jamais les documents bruts', async () => {
    const { db } = memoryDb({
      'contractsCI/OWN': { ...ci, adminSecret: 'INTERNAL' },
      'contractsCI/UID': { ...ci, memberId: caller.uid },
      'contractsCI/FOREIGN': { ...ci, memberId: 'OTHER' },
      'caisseImprevueDemands/DEMAND': {
        memberId: caller.uid,
        status: 'PENDING',
      },
      'contractsCI/OWN/declaredVersements/D': {
        proofUrl: 'https://secret',
        status: 'PENDING_MEMBER',
      },
    })
    const result = await memberFinanceList(db, caller, 'caisse-imprevue')
    expect(result.contracts.map((r) => r.id)).toEqual(['OWN', 'UID'])
    expect(result.demands).toHaveLength(1)
    expect(JSON.stringify(result)).not.toContain('https://secret')
    expect(JSON.stringify(result)).not.toContain('INTERNAL')
    await expect(
      ownedFinanceRecord(db, caller, 'caisse-imprevue', 'FOREIGN'),
    ).rejects.toMatchObject({ status: 404 })
  })
  it('exige un abonnement actif uniquement sur la caisse spéciale, comme son layout membre', async () => {
    const { db } = memoryDb({})
    await expect(
      checkMemberFinanceAccess(db, caller, 'caisse-speciale'),
    ).rejects.toMatchObject({ status: 403, code: 'SUBSCRIPTION_REQUIRED' })
    await expect(
      checkMemberFinanceAccess(db, caller, 'caisse-imprevue'),
    ).resolves.toBeUndefined()
  })
  it('conserve les contributions migrées, sans supposer que les déclarations sont payées', () => {
    const record = { ...cs, id: 'CS', nominalPaid: 0 }
    const dto = contractDTO(
      'caisse-speciale',
      record,
      {
        payments: [
          {
            id: 'M0',
            dueMonthIndex: 0,
            status: 'PAID',
            amount: 10000,
            paidAt: '2026-06-01',
          },
          {
            id: 'M1',
            dueMonthIndex: 1,
            status: 'PARTIAL',
            amount: 10000,
            contribs: [
              {
                amount: 2000,
                paidAt: '2026-07-02',
                penaltyDays: 1,
                penalty: 100,
              },
            ],
          },
        ],
        declarations: [
          { id: 'D', monthIndex: 1, amount: 8000, status: 'PENDING_MEMBER' },
        ],
        refunds: [],
        supports: [],
      },
      now,
    )
    expect(dto.totalPaid).toBe(12000)
    expect(dto.paidMonths).toBe(1)
    expect(dto.declarations[0].amount).toBe(8000)
    expect(dto.payments[1].versements[0]).toMatchObject({
      date: '2026-07-02',
      daysLate: 1,
      penalty: 100,
    })
  })
  it('distingue les versements détaillés du paiement historique d’une échéance de caisse spéciale', () => {
    const legacy = {
      id: 'M0',
      status: 'PAID',
      amount: 30000,
      paidAt: '2026-06-10T17:00:00Z',
      mode: 'airtel_money',
      withFees: false,
      proofUrl: 'https://fixture/legacy',
    }
    const payment = paymentDTO(legacy, cs, 'caisse-speciale')
    expect(payment.versements).toEqual([])
    expect(payment.legacyVersement).toMatchObject({
      amount: 30000,
      date: '2026-06-10',
      time: '18:00',
      mode: 'airtel_money',
      withFees: false,
      hasProof: true,
    })
    expect(paymentDTO({ ...legacy, status: 'DUE' }, cs, 'caisse-speciale').legacyVersement).toBeNull()
    expect(paymentDTO(legacy, ci, 'caisse-imprevue').legacyVersement).toEqual(payment.legacyVersement)

    const detailed = paymentDTO({
      ...legacy,
      contribs: [],
      versements: [{ amount: 30000, date: '2026-06-10', mode: 'other', paymentMethodOther: 'Chèque' }],
    }, cs, 'caisse-speciale')
    expect(detailed.legacyVersement).toBeNull()
    expect(detailed.versements).toMatchObject([
      { date: '2026-06-10', amount: 30000, mode: 'other', paymentMethodOther: 'Chèque' },
    ])
  })
  it('calcule les périodes journalières de 30 jours et borne les fins de mois', () => {
    expect(
      paymentDTO(
        { id: 'M1', monthIndex: 1 },
        { ...ci, firstPaymentDate: '2026-01-31', paymentFrequency: 'DAILY' },
        'caisse-imprevue',
      ).dueAt.slice(0, 10),
    ).toBe('2026-03-31')
    expect(
      paymentDTO(
        { id: 'M1', dueMonthIndex: 1 },
        { ...cs, contractStartAt: '2026-01-31' },
        'caisse-speciale',
      ).dueAt.slice(0, 10),
    ).toBe('2026-02-28')
  })
  it('la remise finale ne dépend pas de toutes les cotisations payées et ne double pas un retrait déjà remis', () => {
    const children = {
      payments: [{ id: 'M0', status: 'PARTIAL', accumulatedAmount: 2000 }],
      declarations: [],
      supports: [],
      refunds: [],
    }
    expect(
      financePolicy('caisse-speciale', cs, children, now).finalRefund,
    ).toBe(true)
    expect(
      financePolicy(
        'caisse-speciale',
        cs,
        { ...children, refunds: [{ status: 'PAID' }] },
        now,
      ).finalRefund,
    ).toBe(false)
    expect(
      financePolicy(
        'caisse-speciale',
        { ...cs, contractStartAt: '2026-12-01' },
        children,
        now,
      ).finalRefund,
    ).toBe(false)
  })
})
describe('mutations membre — aucun droit administrateur', () => {
  it('déclare seulement dans la sous-collection d’attente et déduplique le renvoi', async () => {
    const { db, records, writes } = memoryDb({
      'contractsCI/CI': ci,
      'contractsCI/CI/payments/M0': {
        monthIndex: 0,
        status: 'PARTIAL',
        accumulatedAmount: 1000,
        targetAmount: 10000,
      },
    })
    await applyMemberFinanceOperation(
      db,
      caller,
      'caisse-imprevue',
      'CI',
      declare,
      files,
      op,
      now,
    )
    expect(
      records.get(`contractsCI/CI/declaredVersements/MEMBER_${op}`),
    ).toMatchObject({
      status: 'PENDING_MEMBER',
      memberId: caller.matricule,
      amount: 2000,
      _submittedByMember: true,
    })
    expect(records.get('contractsCI/CI/payments/M0')).toMatchObject({
      accumulatedAmount: 1000,
      status: 'PARTIAL',
    })
    const count = writes.length
    expect(
      await applyMemberFinanceOperation(
        db,
        caller,
        'caisse-imprevue',
        'CI',
        declare,
        files,
        op,
        now,
      ),
    ).toMatchObject({ replayed: true })
    expect(writes).toHaveLength(count)
  })
  it.each([
    ['autre propriétaire', { ...ci, memberId: 'OTHER' }, declare, files],
    ['contrat clôturé', { ...ci, status: 'FINISHED' }, declare, files],
    ['échéance déjà payée', ci, { ...declare, monthIndex: 1 }, files],
    ['date future', ci, { ...declare, date: '2026-11-22' }, files],
    ['sans preuve', ci, declare, {}],
    ['montant invalide', ci, { ...declare, amount: -10 }, files],
    ['injection de propriétaire', ci, { ...declare, memberId: 'OTHER' }, files],
    ['action admin', ci, { action: 'validate-payment' }, files],
  ])(
    'refuse %s avant toute écriture',
    async (_label, contract, payload, attachments) => {
      const { db, writes } = memoryDb({
        'contractsCI/CI': contract,
        'contractsCI/CI/payments/M0': { monthIndex: 0, status: 'DUE' },
        'contractsCI/CI/payments/M1': { monthIndex: 1, status: 'PAID' },
      })
      await expect(
        applyMemberFinanceOperation(
          db,
          caller,
          'caisse-imprevue',
          'CI',
          payload,
          attachments as UploadedMemberFiles,
          op,
          now,
        ),
      ).rejects.toThrow()
      expect(writes).toHaveLength(0)
    },
  )
  it('téléverse un document en attente, sans le rendre officiel', async () => {
    const { db, records } = memoryDb({ 'contractsCI/CI': ci })
    await applyMemberFinanceOperation(
      db,
      caller,
      'caisse-imprevue',
      'CI',
      { action: 'upload-signed' },
      files,
      op,
      now,
    )
    expect(records.get('contractsCI/CI')).toMatchObject({
      memberSignedStatus: 'PENDING_ADMIN',
    })
    expect(records.get('contractsCI/CI')?.contractStartId).toBeUndefined()
    expect(records.get(`documents/MEMBER_${op}`)).toMatchObject({
      type: 'MEMBER_SIGNED_CI',
      memberId: caller.matricule,
    })
  })
  it('demande une aide uniquement après trois mois payés, dans la plage du forfait', async () => {
    const { db, records } = memoryDb({
      'contractsCI/CI': ci,
      ...Object.fromEntries(
        [0, 1, 2].map((i) => [
          `contractsCI/CI/payments/M${i}`,
          { monthIndex: i, status: 'PAID', accumulatedAmount: 10000 },
        ]),
      ),
    })
    await applyMemberFinanceOperation(
      db,
      caller,
      'caisse-imprevue',
      'CI',
      { action: 'support', amount: 20000, motif: 'Besoin de soins médicaux.' },
      files,
      op,
      now,
    )
    expect(records.get(`contractsCI/CI/supports/MEMBER_${op}`)).toMatchObject({
      status: 'PENDING_ADMIN',
      amountRepaid: 0,
      amountRemaining: 20000,
    })
    await expect(
      applyMemberFinanceOperation(
        db,
        caller,
        'caisse-imprevue',
        'CI',
        {
          action: 'support',
          amount: 20000,
          motif: 'Besoin de soins médicaux.',
        },
        files,
        op + '2',
        now,
      ),
    ).rejects.toThrow('déjà')
  })
  it('refuse une aide trop tôt ou hors forfait', async () => {
    const { db, writes } = memoryDb({ 'contractsCI/CI': ci })
    await expect(
      applyMemberFinanceOperation(
        db,
        caller,
        'caisse-imprevue',
        'CI',
        {
          action: 'support',
          amount: 30000,
          motif: 'Besoin de soins médicaux.',
        },
        files,
        op,
        now,
      ),
    ).rejects.toThrow('Trois mois')
    expect(writes).toHaveLength(0)
  })
  it('resoumet uniquement une reconnaissance refusée de son contrat', async () => {
    const { db, records } = memoryDb({
      'contractsCI/CI': ci,
      'contractsCI/CI/supports/S': {
        status: 'REJECTED',
        rejectionReason: 'Illisible',
      },
    })
    await applyMemberFinanceOperation(
      db,
      caller,
      'caisse-imprevue',
      'CI',
      { action: 'support-document', supportId: 'S' },
      files,
      op,
      now,
    )
    expect(records.get('contractsCI/CI/supports/S')).toMatchObject({
      status: 'PENDING_ADMIN',
      rejectionReason: null,
    })
  })
  it('demande le capital partiel à terme sans comptabiliser une remise et sans dépasser le capital', async () => {
    const { db, records } = memoryDb({
      'caisseContracts/CS': cs,
      'caisseContracts/CS/payments/M0': {
        status: 'PARTIAL',
        accumulatedAmount: 2000,
      },
    })
    await expect(
      applyMemberFinanceOperation(
        db,
        caller,
        'caisse-speciale',
        'CS',
        { ...refund, withdrawalAmount: 3000 },
        files,
        op,
        now,
      ),
    ).rejects.toThrow('capital')
    await applyMemberFinanceOperation(
      db,
      caller,
      'caisse-speciale',
      'CS',
      refund,
      files,
      op,
      now,
    )
    expect(
      records.get(`caisseContracts/CS/refunds/MEMBER_${op}`),
    ).toMatchObject({
      status: 'PENDING',
      amountNominal: 2000,
      type: 'FINAL',
      deadlineAt: new Date('2026-09-01T12:00:00Z'),
    })
    expect(records.get('caisseContracts/CS')?.status).toBe('ACTIVE')
  })
  it('annule uniquement sa demande PENDING', async () => {
    const { db, records } = memoryDb({
      'caisseImprevueDemands/D': { memberId: caller.uid, status: 'PENDING' },
    })
    await applyMemberFinanceOperation(
      db,
      caller,
      'caisse-imprevue',
      'D',
      { action: 'cancel-demand' },
      {},
      op,
      now,
    )
    expect(records.get('caisseImprevueDemands/D')?.status).toBe('CANCELED')
  })
  it('crée une demande individuelle avec identité serveur, contact inconnu et notification admin unique', async () => {
    const { db, records, writes } = memoryDb({})
    const result = await createMemberFinanceDemand(
      db,
      caller,
      'caisse-speciale',
      demand,
      op,
      now,
    )
    expect(records.get(`caisseSpecialeDemands/${result.id}`)).toMatchObject({
      memberId: caller.matricule,
      contractType: 'INDIVIDUAL',
      status: 'PENDING',
      emergencyContact: { lastName: 'INCONNU' },
    })
    const count = writes.length
    await createMemberFinanceDemand(
      db,
      caller,
      'caisse-speciale',
      demand,
      op,
      now,
    )
    expect(writes).toHaveLength(count)
    expect(
      [...records.keys()].filter((k) => k.startsWith('notifications/')),
    ).toHaveLength(1)
    await expect(
      createMemberFinanceDemand(
        db,
        caller,
        'caisse-speciale',
        { ...demand, memberId: 'OTHER' },
        op + '2',
      ),
    ).rejects.toThrow()
  })
  it('relit le forfait CI, refuse le prix client et le contact soi-même', async () => {
    const { db, records } = memoryDb({
      'subscriptionsCI/P': {
        status: 'ACTIVE',
        code: 'A',
        amountPerMonth: 10000,
        durationInMonths: 12,
        supportMin: 0,
        supportMax: 30000,
      },
    })
    const payload = {
      contactIsMember: false,
      subscriptionCIID: 'P',
      paymentFrequency: 'MONTHLY',
      desiredDate: '2026-12-01',
      cause: 'Préparer mes imprévus.',
    }
    const result = await createMemberFinanceDemand(
      db,
      caller,
      'caisse-imprevue',
      payload,
      op,
    )
    expect(records.get(`caisseImprevueDemands/${result.id}`)).toMatchObject({
      subscriptionCIAmountPerMonth: 10000,
      subscriptionCIDuration: 12,
    })
    await expect(
      createMemberFinanceDemand(
        db,
        caller,
        'caisse-imprevue',
        { ...payload, subscriptionCIAmountPerMonth: 1 },
        op + '2',
      ),
    ).rejects.toThrow()
    await expect(
      createMemberFinanceDemand(
        db,
        caller,
        'caisse-speciale',
        {
          ...demand,
          contactIsMember: true,
          contactMatricule: caller.matricule,
          relationship: 'Frère',
        },
        op + '3',
      ),
    ).rejects.toThrow('autre personne')
  })
})
