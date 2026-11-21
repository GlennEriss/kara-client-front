// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { memberProfile, subscriptionRow } from '../server/read-model'
import type { MemberCaller } from '../server/access'
describe('présentation personnelle issue du site membre', () => {
  it('ne transmet ni champs internes ni droits, et conserve les champs du profil du web', () => {
    const p = memberProfile({
      uid: 'own',
      matricule: 'TEST',
      email: 'own@test.ga',
      member: { roles: ['SuperAdmin'] },
      dossier: {
        status: 'approved',
        isPaid: true,
        identity: {
          firstName: 'Marie',
          birthDate: '1976-05-22',
          contacts: ['077000000', null],
          secret: 'private',
        },
        address: { city: 'Owendo' },
        company: { isEmployed: false },
        documents: { identityDocument: 'CNI' },
        internalNotes: 'secret',
      },
    } as MemberCaller)
    expect(p.identity).toMatchObject({
      firstName: 'Marie',
      birthDate: '1976-05-22T00:00:00.000Z',
      contacts: ['077000000'],
    })
    expect(p.company.isEmployed).toBe(false)
    expect(JSON.stringify(p)).not.toMatch(/secret|SuperAdmin|internalNotes/)
  })
  it('associe le montant et les informations du versement à son abonnement', () => {
    const s = subscriptionRow(
      {
        id: 'S1',
        dateStart: '2026-01-01',
        dateEnd: '2026-12-22',
        amount: 5000,
        membershipType: 'sympathisant',
      },
      { amount: 10000, date: '2026-01-01', mode: 'AIRTEL-MONEY' },
      new Date('2026-11-20T12:00:00Z'),
    )
    expect(s).toMatchObject({
      amount: 10000,
      status: 'active',
      remainingDays: 32,
      paymentMode: 'AIRTEL-MONEY',
      type: 'sympathisant',
    })
  })
  it('ne transforme pas un montant absent en zéro et calcule l’expiration en jours gabonais', () => {
    expect(
      subscriptionRow(
        { id: 'S1', dateEnd: '2026-11-20T00:00:00Z' },
        null,
        new Date('2026-11-20T23:30:00Z'),
      ),
    ).toMatchObject({ amount: null, status: 'expired', remainingDays: -1 })
  })
})
