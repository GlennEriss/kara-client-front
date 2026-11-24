// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  memberEcheances,
  ownedCalendarContract,
  calendarSummary,
} from '../server/calendar'
import {
  memberDocuments,
  storedDocument,
  memberOfficialDocument,
  personalDocumentSource,
} from '../server/documents'
import {
  memberNotificationInbox,
  memberNoticeTarget,
  markMemberNotifications,
  saveMemberDevice,
} from '../server/notifications'
import { memberCaller as caller, memoryDb } from './memory-db'

describe('calendrier personnel membre', () => {
  it('reprend les échéances passées et à venir sans élargir le périmètre du membre', async () => {
    const { db } = memoryDb({
      'caisseContracts/CS': {
        memberId: caller.matricule,
        status: 'ACTIVE',
        monthlyAmount: 10000,
      },
      'caisseContracts/CS/payments/LATER': {
        status: 'DUE',
        dueAt: '2026-12-10',
        amount: 10000,
      },
      'caisseContracts/CS/payments/EARLY': {
        status: 'PARTIAL',
        dueAt: '2026-11-10',
        amount: 10000,
      },
      'caisseContracts/CS/payments/PAID': {
        status: 'PAID',
        dueAt: '2026-10-10',
        amount: 10000,
      },
      'contractsCI/CI': {
        memberId: caller.uid,
        status: 'ACTIVE',
        firstPaymentDate: '2026-10-15',
        totalMonthsPaid: 1,
        subscriptionCIDuration: 3,
        subscriptionCIAmountPerMonth: 5000,
      },
      'contractsCI/FINISHED': {
        memberId: caller.uid,
        status: 'ACTIVE',
        totalMonthsPaid: 3,
        subscriptionCIDuration: 3,
      },
      'creditContracts/CREDIT': {
        clientId: caller.matricule,
        status: 'OVERDUE',
        creditType: 'FIXE',
        nextDueAt: '2026-11-19',
        monthlyPaymentAmount: 25000,
      },
      'creditContracts/OTHER': {
        clientId: 'FOREIGN',
        status: 'ACTIVE',
        creditType: 'SPECIALE',
        nextDueAt: '2026-11-01',
        monthlyPaymentAmount: 990000,
      },
      'placements/PLACEMENT': {
        benefactorId: caller.uid,
        status: 'Active',
        nextCommissionDate: '2026-12-05',
        amount: 100000,
        rate: 5,
        hasOverdueCommission: false,
      },
    })
    const rows = await memberEcheances(
      db,
      caller,
      new Date('2026-11-21T12:00:00Z'),
    )
    expect(rows.map((e) => e.contractId)).toEqual(['CS', 'CI', 'CS', 'CI', 'CREDIT', 'CS', 'CI'])
    expect(rows.map((e) => e.amount)).toEqual([10000, 5000, 10000, 5000, undefined, 10000, 5000])
    expect(rows[0]).toMatchObject({ status: 'PAID', isOverdue: false })
    expect(rows.find(e => e.contractId === 'CREDIT')).not.toHaveProperty('amount')
    expect(calendarSummary(rows, new Date('2026-11-21T12:00:00Z'))).toEqual({
      overdueCount: 3,
      thisMonthCount: 3,
    })
  })
  it('calcule les mois dans le fuseau gabonais, y compris au changement de mois UTC', async () => {
    const { db } = memoryDb({
      'contractsCI/CI': {
        memberId: caller.uid,
        status: 'ACTIVE',
        firstPaymentDate: '2026-01-31T23:00:00Z',
        totalMonthsPaid: 1,
        subscriptionCIDuration: 3,
        subscriptionCIAmountPerMonth: 5000,
      },
    })
    expect((await memberEcheances(db, caller)).map(row => row.day)).toEqual(['2026-02-01', '2026-03-01', '2026-04-01'])
  })
  it('affiche les semaines de crédit de plusieurs cycles sans exposer les montants', async () => {
    const { db } = memoryDb({
      'creditContracts/WEEKLY': {
        clientId: caller.matricule, status: 'ACTIVE', creditType: 'SPECIALE',
        duration: 3, durationUnit: 'WEEKS', firstPaymentDate: '2026-10-06', nextDueAt: '2026-11-10',
        creditCycles: [
          { cycleNumber: 1, firstPaymentDate: '2026-10-06' },
          { cycleNumber: 2, firstPaymentDate: '2026-11-03' },
        ],
      },
      'creditPayments/C1_M1_P1': { creditId: 'WEEKLY', amount: 10000, paymentDate: '2026-10-07' },
      'creditPayments/C2_M1_P2': { creditId: 'WEEKLY', amount: 10000, paymentDate: '2026-11-03' },
      'creditPayments/C2_M2_P3': { creditId: 'WEEKLY', amount: 0, comment: 'Paiement de pénalités uniquement' },
    })
    const rows = await memberEcheances(db, caller, new Date('2026-11-04T12:00:00Z'))
    expect(rows.map(row => [row.day, row.status])).toEqual([
      ['2026-10-06', 'PAID'], ['2026-11-03', 'PAID'], ['2026-11-10', 'DUE'], ['2026-11-17', 'DUE'],
    ])
    expect(new Set(rows.map(row => row.id)).size).toBe(4)
    rows.forEach(row => expect(row).not.toHaveProperty('amount'))
  })
  it('revalide le titulaire et la variante de crédit avant de présenter un contrat, sans champs admin', async () => {
    const { db } = memoryDb({
      'creditContracts/C': {
        clientId: caller.uid,
        creditType: 'FIXE',
        status: 'ACTIVE',
        amount: 10000,
        adminNotes: 'SECRET',
        privateKey: 'SECRET',
      },
      'creditContracts/OTHER': { clientId: 'FOREIGN', creditType: 'FIXE' },
    })
    await expect(
      ownedCalendarContract(db, caller, 'CREDIT_FIXE', 'OTHER'),
    ).rejects.toMatchObject({ status: 404 })
    await expect(
      ownedCalendarContract(db, caller, 'CREDIT_SPECIALE', 'C'),
    ).rejects.toMatchObject({ status: 404 })
    await expect(
      ownedCalendarContract(db, caller, 'CREDIT_FIXE', '../OTHER'),
    ).rejects.toMatchObject({ status: 404 })
    const result = await ownedCalendarContract(db, caller, 'CREDIT_FIXE', 'C')
    expect(result.status).toBe('Actif')
    expect(JSON.stringify(result)).not.toContain('SECRET')
  })
})
describe('documents membre et publications officielles', () => {
  it('masque les dates absentes et traduit les types de document inconnus sans valeur technique', () => {
    const document = storedDocument({
      id: 'D',
      type: 'constructor',
      url: 'https://bucket/test.pdf',
      createdAt: { toDate: () => new Date(0) },
    })
    expect(document).toMatchObject({
      createdAt: '',
      category: 'OTHER',
      typeLabel: 'Document personnel',
    })
  })

  it('réunit les documents et fiches d’adhésion, dédoublonne et ne révèle pas les URL ou dossiers tiers', async () => {
    const { db } = memoryDb({
      'documents/D': {
        memberId: caller.matricule,
        type: 'ADHESION',
        libelle: 'Fiche originale',
        url: 'https://bucket/own.pdf',
        size: 2400,
        createdAt: new Date('2026-11-01'),
      },
      'documents/OTHER': {
        memberId: 'FOREIGN',
        libelle: 'SECRET',
        url: 'https://bucket/secret.pdf',
      },
      'subscriptions/S': {
        userId: caller.uid,
        adhesionPdfURL: 'https://bucket/own.pdf',
        dateStart: '2026-01-01',
      },
      [`users/${caller.matricule}`]: {
        matricule: caller.matricule,
        adhesionPdfURL: 'https://bucket/extra.pdf',
      },
    })
    const rows = await memberDocuments(db, caller)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({
      label: 'Fiche originale',
      size: 2400,
      file: { kind: 'document', id: 'D' },
    })
    expect(JSON.stringify(rows)).not.toMatch(/https:|SECRET/)
  })
  it('refuse les pièces étrangères et les identifiants qui changent le chemin de lecture', async () => {
    const { db } = memoryDb({
      'documents/OTHER': {
        memberId: 'FOREIGN',
        url: 'https://bucket/secret.pdf',
      },
    })
    await expect(
      personalDocumentSource(db, caller, 'document', 'OTHER'),
    ).rejects.toMatchObject({ status: 404 })
    await expect(
      personalDocumentSource(db, caller, 'adhesion-user', 'FOREIGN'),
    ).rejects.toMatchObject({ status: 404 })
    await expect(
      personalDocumentSource(db, caller, 'document', '../OTHER'),
    ).rejects.toMatchObject({ status: 404 })
  })
  it('lit la publication adoptée sans transmettre brouillons, notes de travail ou opérations admin', async () => {
    const { db } = memoryDb({
      'association-documents/statuts': {
        lieu: 'Owendo',
        date: '2026-09-09',
        secretaireNom: 'Signataire test',
        draft: 'SECRET',
        workContent: 'SECRET',
      },
    })
    const d = await memberOfficialDocument(db, 'statuts')
    expect(d).toMatchObject({
      published: true,
      publication: { date: '2026-09-09', secretaireNom: 'Signataire test' },
    })
    expect(d).not.toHaveProperty('workContent')
    expect(JSON.stringify(d)).not.toContain('SECRET')
    const unpublished = await memberOfficialDocument(db, 'reglement-interieur')
    expect(unpublished).toMatchObject({ published: false, publication: null })
    await expect(memberOfficialDocument(db, 'OTHER')).rejects.toMatchObject({
      status: 404,
    })
  })
})
describe('notifications personnelles et appareils membres', () => {
  const data = {
    'notifications/OWN': {
      recipientId: caller.uid,
      isRead: false,
      title: 'À lire',
      createdAt: new Date('2026-11-21'),
    },
    'notifications/READ': {
      recipientId: caller.matricule,
      isRead: true,
      title: 'Déjà lue',
      createdAt: new Date('2026-11-20'),
    },
    'notifications/OTHER': {
      recipientId: 'FOREIGN',
      isRead: false,
      title: 'SECRET',
    },
    'notifications/PLACEMENT': { module: 'placement', recipientId: caller.uid, isRead: false, createdAt: new Date('2026-11-22') },
    'notifications/ADMIN': { isRead: false, title: 'SECRET ADMIN' },
  }
  it('dirige vers les versements du contrat et ignore les identifiants de route invalides', () => {
    expect(memberNoticeTarget({ module: 'caisse_imprevue', type: 'contract_paid', metadata: { contractId: 'CI-1', versementId: 'V-1' } }))
      .toMatchObject({ screen: 'member', module: 'caisse-imprevue', id: 'CI-1', kind: 'payments' })
    expect(memberNoticeTarget({ module: 'vehicule', metadata: { prospectId: 'P-1' } }))
      .toMatchObject({ screen: 'member', module: 'insurance', id: 'P-1', kind: 'prospect' })
    expect(memberNoticeTarget({ module: 'placement', entityId: 'P-1' })).toBeNull()
    expect(memberNoticeTarget({ module: 'caisse_speciale', metadata: { contractId: '../autre' } })?.id).toBeUndefined()
  })
  it('conserve les messages lus comme sur le site membre et exclut notifications admin et autres membres', async () => {
    const { db } = memoryDb(data),
      inbox = await memberNotificationInbox(db, caller)
    expect(inbox).toMatchObject({ unreadCount: 1 })
    expect('items' in inbox && inbox.items?.map((n) => n.id)).toEqual([
      'OWN',
      'READ',
    ])
    await expect(
      memberNotificationInbox(db, caller, 'OTHER'),
    ).rejects.toMatchObject({ status: 404 })
    expect(JSON.stringify(inbox)).not.toContain('SECRET')
  })
  it('marque seulement ses propres notifications et bloque la mise à jour d’un message étranger', async () => {
    const { db, writes, records } = memoryDb(data)
    await expect(
      markMemberNotifications(db, caller, { action: 'read', id: 'OTHER' }),
    ).rejects.toMatchObject({ status: 404 })
    expect(writes).toHaveLength(0)
    await markMemberNotifications(db, caller, { action: 'readAll' })
    expect(writes.map((w) => w.path)).toEqual(['notifications/OWN'])
    expect(records.get('notifications/OTHER')?.isRead).toBe(false)
    expect(records.get('notifications/PLACEMENT')?.isRead).toBe(false)
    expect(records.get('notifications/OWN')).toHaveProperty('readAt')
    expect(await memberNotificationInbox(db, caller)).toMatchObject({
      unreadCount: 0,
      items: expect.arrayContaining([
        expect.objectContaining({ id: 'OWN', isRead: true }),
      ]),
    })
  })
  it('lie les appareils aux identifiants vérifiés, dans une collection serveur, sans élargissement par le client', async () => {
    const { db, writes } = memoryDb({}),
      device = {
        token: 'native-token-at-least-20',
        platform: 'android',
        muted: true,
      }
    await expect(
      saveMemberDevice(db, caller, { ...device, memberIds: ['FOREIGN'] }),
    ).rejects.toThrow()
    expect(writes).toHaveLength(0)
    await saveMemberDevice(db, caller, device)
    expect(writes[0]).toMatchObject({
      path: `memberMobileDevices/${device.token}`,
      data: {
        audience: 'member',
        uid: caller.uid,
        memberIds: [caller.uid, caller.matricule],
        muted: true,
      },
    })
    const foreign = memoryDb({
      [`memberMobileDevices/${device.token}`]: { uid: 'FOREIGN' },
    })
    await expect(
      saveMemberDevice(foreign.db, caller, device, true),
    ).rejects.toMatchObject({ status: 403 })
    expect(foreign.writes).toHaveLength(0)
  })
})
