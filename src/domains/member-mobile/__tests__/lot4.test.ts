// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { memoryDb, memberCaller as caller } from './memory-db'
import {
  createSolidarityRequest,
  memberPlacements,
  memberCharity,
  memberCharityReceiptSource,
} from '../server/solidarity'
const op = 'test-solidarity-000001'
const placement = {
  amount: 100000,
  rate: 2,
  periodMonths: 3,
  payoutMode: 'MonthlyCommission_CapitalEnd',
  desiredDate: '2026-12-01',
  cause: 'Projet personnel',
}
const event = {
  title: 'Soutien solidaire',
  status: 'ongoing',
  isPublic: true,
  minContributionAmount: 5000,
  totalCollectedAmount: 20000,
}
const intent = { eventId: 'E', contributionType: 'money', amount: 5000 }
describe('lot 4 membre : apports et charité', () => {
  it('isole les apports par UID et matricule, sans notes administratives', async () => {
    const { db } = memoryDb({
      'placements/A': {
        benefactorId: caller.uid,
        amount: 100000,
        privateNotes: 'secret',
      },
      'placements/B': { benefactorId: 'OTHER', amount: 999 },
      'placementDemands/D': {
        benefactorId: caller.matricule,
        status: 'PENDING',
      },
    })
    const r = await memberPlacements(db, caller)
    expect(r.items.map((p) => p.id)).toEqual(['A'])
    expect(r.demands.map((p) => p.id)).toEqual(['D'])
    expect(JSON.stringify(r)).not.toContain('secret')
  })
  it('crée seulement une demande en attente, avec identité serveur et notification idempotente', async () => {
    const { db, records, writes } = memoryDb({})
    await createSolidarityRequest(db, caller, 'placement-demand', placement, op)
    await createSolidarityRequest(db, caller, 'placement-demand', placement, op)
    expect(writes).toHaveLength(2)
    expect(records.get(`placementDemands/MEMBER_${op}`)).toMatchObject({
      benefactorId: caller.matricule,
      status: 'PENDING',
      amount: 100000,
    })
    expect([...records.keys()].some((k) => k.startsWith('placements/'))).toBe(
      false,
    )
  })
  it.each([
    { ...placement, benefactorId: 'OTHER' },
    { ...placement, status: 'APPROVED' },
    { ...placement, periodMonths: 2.5 },
    { ...placement, desiredDate: '2026-02-31' },
    { ...placement, amount: 49999 },
  ])(
    'refuse une identité, un statut ou des champs invalides',
    async (payload) => {
      const { db, writes } = memoryDb({})
      await expect(
        createSolidarityRequest(db, caller, 'placement-demand', payload, op),
      ).rejects.toThrow()
      expect(writes).toHaveLength(0)
    },
  )
  it.each([
    { ...event, isPublic: false },
    { ...event, status: 'closed' },
  ])('respecte la visibilité et la fermeture de charité', async (data) => {
    const { db, writes } = memoryDb({ 'charity-events/E': data })
    await expect(
      createSolidarityRequest(db, caller, 'charity-intent', intent, op),
    ).rejects.toThrow()
    expect(writes).toHaveLength(0)
  })
  it('conserve le minimum suggéré de l’œuvre sans en faire une interdiction absente du site membre', async () => {
    const { db, records } = memoryDb({
      'charity-events/E': { ...event, minContributionAmount: 6000 },
    })
    await createSolidarityRequest(
      db,
      caller,
      'charity-intent',
      { ...intent, amount: 500 },
      op,
    )
    expect(records.get(`charityContributions/MEMBER_${op}`)).toMatchObject({
      status: 'pending',
      amount: 500,
    })
    await expect(
      createSolidarityRequest(
        db,
        caller,
        'charity-intent',
        { ...intent, amount: 99 },
        'test-solidarity-000002',
      ),
    ).rejects.toThrow()
  })
  it('une déclaration en nature ne confirme ni argent reçu, ni étoiles', async () => {
    const { db, records, writes } = memoryDb({ 'charity-events/E': event })
    await createSolidarityRequest(
      db,
      caller,
      'charity-intent',
      {
        eventId: 'E',
        contributionType: 'in_kind',
        inKindDescription: 'Dix sacs de riz',
        estimatedValue: 30000,
      },
      op,
    )
    expect(records.get(`charityContributions/MEMBER_${op}`)).toMatchObject({
      participantId: caller.matricule,
      status: 'pending',
      payment: null,
    })
    expect(records.get('charity-events/E')).toEqual(event)
    expect(
      writes.every((w) => !w.path.startsWith('member-charity-summary')),
    ).toBe(true)
  })
  it('affiche les œuvres publiques et les contributions personnelles, garde les annulations et le plafond de 12', async () => {
    const seed: any = {
      'charity-events/E': event,
      'charity-events/PRIVATE': { ...event, isPublic: false },
      'charity-events/E/participants/P': {
        memberId: caller.uid,
        participantType: 'member',
      },
      'charity-events/E/participants/OTHER': {
        memberId: 'OTHER',
        participantType: 'member',
      },
      'charity-events/E/contributions/C': {
        participantId: 'P',
        status: 'canceled',
        amount: 10000,
        receiptUrl: 'https://private.invalid/receipt.pdf',
      },
      'charity-events/E/contributions/SECRET': {
        participantId: 'OTHER',
        amount: 999,
      },
      'charityContributions/D': {
        participantId: caller.matricule,
        status: 'pending',
        eventId: 'E',
        amount: 5000,
      },
      'charityContributions/CONFIRMED': {
        participantId: caller.uid,
        status: 'confirmed',
        eventId: 'E',
      },
      [`member-charity-summary/${caller.uid}`]: {
        starredEvents: Array.from({ length: 15 }, (_, i) => ({
          eventId: String(i),
          earnedAt: new Date(),
        })),
        deductionReason: 'secret',
      },
      [`member-charity-summary/${caller.matricule}`]: { starredEvents: [] },
    }
    const { db } = memoryDb(seed),
      r = await memberCharity(db, caller)
    expect(r.events.map((e) => e.id)).toEqual(['E'])
    expect(r.contributions).toHaveLength(2)
    expect(r.contributions.find((c) => c.id.includes(':C'))).toMatchObject({
      status: 'canceled',
      file: { kind: 'charity', id: 'E:P:C' },
    })
    expect(r.stars).toMatchObject({ count: 12, max: 12, isCapped: true })
    expect(JSON.stringify(r)).not.toMatch(
      /private.invalid|SECRET|deductionReason/,
    )
  })
  it('refuse les reçus d’un autre participant, même si son identifiant est connu', async () => {
    const { db } = memoryDb({
      'charity-events/E/participants/P': {
        memberId: caller.uid,
        participantType: 'member',
      },
      'charity-events/E/contributions/C': {
        participantId: 'P',
        receiptUrl: 'https://bucket.test/r.pdf',
      },
      'charity-events/E/participants/OTHER': {
        memberId: 'OTHER',
        participantType: 'member',
      },
      'charity-events/E/contributions/X': {
        participantId: 'OTHER',
        receiptUrl: 'https://bucket.test/x.pdf',
      },
    })
    expect(await memberCharityReceiptSource(db, caller, 'E:P:C')).toMatchObject(
      { name: 'recu-charite-C' },
    )
    await expect(
      memberCharityReceiptSource(db, caller, 'E:OTHER:X'),
    ).rejects.toThrow('introuvable')
    await expect(
      memberCharityReceiptSource(db, caller, 'E:P:X'),
    ).rejects.toThrow('introuvable')
  })
})
