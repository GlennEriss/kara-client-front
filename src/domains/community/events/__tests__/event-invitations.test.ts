import { describe, expect, it } from 'vitest'
import type { CharityEvent } from '@/types/types'
import type { Event } from '../entities/event.types'
import { buildEventInvitationMessage, charityEventInvitation, communityEventInvitation, invitationRecipient, memberInvitationLink } from '../utils/event-invitations'

const event: Event = { id: 'event-1', title: 'Rencontre des membres', description: 'Une rencontre de tous les membres.',
  startDate: new Date('2026-11-20T09:00:00Z'), status: 'published', pollEnabled: false,
  finalLocation: { name: 'Salle KARA', address: 'Libreville' }, createdBy: 'admin', createdAt: new Date() }
const charity: CharityEvent = { id: 'charity-1', title: 'Collecte de la rencontre', description: 'Une collecte en argent et en nature.',
  startDate: event.startDate, endDate: new Date('2026-11-21T12:00:00Z'), location: 'Libreville', status: 'upcoming', isPublic: true,
  minContributionAmount: 1000, currency: 'FCFA', totalCollectedAmount: 0, totalContributionsCount: 0,
  totalParticipantsCount: 0, totalGroupsCount: 0, createdAt: new Date(), updatedAt: new Date(), createdBy: 'admin' }
const member = { id: 'member-1', matricule: '001.MK.2026', firstName: 'Alice', lastName: 'Ondo', contacts: ['077 46 69 73'] }

describe('Invitations aux événements', () => {
  it.each(['draft', 'completed', 'cancelled'] as const)('ne propose pas l’envoi pour un événement %s', status => {
    expect(communityEventInvitation({ ...event, status }).blockedReason).toBeTruthy()
  })
  it.each(['published', 'poll_open', 'location_confirmed'] as const)('autorise les événements visibles %s', status => {
    expect(communityEventInvitation({ ...event, status }).blockedReason).toBeUndefined()
  })
  it.each(['draft', 'closed', 'archived'] as const)('ne propose pas de contribution pour une collecte %s', status => {
    const result = charityEventInvitation({ ...charity, status })
    expect(result.blockedReason).toBeTruthy()
    expect(result.contribution).toBeUndefined()
  })
  it('exclut les collectes privées des invitations et des contributions', () => {
    expect(charityEventInvitation({ ...charity, isPublic: false }).contribution).toBeUndefined()
    expect(communityEventInvitation(event, { ...charity, isPublic: false }).contribution).toBeUndefined()
  })
  it('personnalise les dates au Gabon, le lieu et les liens vers le membre', () => {
    const message = buildEventInvitationMessage({ event: communityEventInvitation(event, charity), recipient: invitationRecipient(member),
      introduction: 'Vous êtes invité !', includeContribution: true, memberAppUrl: 'https://membres.example.test/' })
    expect(message).toContain('Bonjour Alice Ondo,')
    expect(message).toContain('10:00')
    expect(message).toContain('Salle KARA — Libreville')
    expect(message).toContain(event.description)
    expect(message).toContain('https://membres.example.test/evenements/event-1')
    expect(message).toContain('https://membres.example.test/bienfaiteur/charity-1')
    expect(message).toContain('1 000 FCFA')
    expect(message).toContain('Je veux contribuer')
    expect(message).toContain('ne vaut pas confirmation de réception')
  })
  it('n’annonce pas de collecte inexistante et permet de désactiver la contribution', () => {
    for (const invitation of [communityEventInvitation(event), communityEventInvitation(event, charity)]) {
      const message = buildEventInvitationMessage({ event: invitation, recipient: invitationRecipient(member), introduction: 'Bienvenue',
        includeContribution: false, memberAppUrl: '' })
      expect(message).not.toContain('contribuer')
      expect(message).not.toContain('https://')
    }
  })
  it('propose de répondre sur WhatsApp sans adresse configurée', () => {
    const message = buildEventInvitationMessage({ event: charityEventInvitation(charity), recipient: invitationRecipient(member),
      introduction: 'Bienvenue', includeContribution: true, memberAppUrl: '' })
    expect(message).toContain('répondez à ce message en indiquant le montant')
    expect(message).toContain('Collecte de la rencontre')
    expect(message).not.toContain('https://')
    expect(message).not.toContain('Je veux contribuer')
    expect(message).toContain('ne confirme pas la réception')
  })
  it('garde les dates des collectes sans inventer un horaire de début', () => {
    const invitation = charityEventInvitation({ ...charity, startDate: new Date('2026-11-20T00:00:00Z'), endDate: new Date('2026-11-21T00:00:00Z') })
    const message = buildEventInvitationMessage({ event: invitation, recipient: invitationRecipient(member), introduction: 'Bienvenue', includeContribution: true, memberAppUrl: '' })
    expect(message).toContain(charity.description)
    expect(message).toContain('vendredi 20 novembre 2026')
    expect(message).not.toContain('01:00')
    expect(message).not.toContain('00:00')
  })
  it('préfère le numéro WhatsApp et utilise les contacts en repli', () => {
    expect(invitationRecipient(member).phone).toBe('+24177466973')
    expect(invitationRecipient({ ...member, whatsappNumber: '+241 66 46 69 73' }).phone).toBe('+24166466973')
  })
  it('signale un numéro manquant ou invalide sans en fabriquer un', () => {
    expect(invitationRecipient({ ...member, contacts: [] }).unavailableReason).toContain('Aucun numéro')
    expect(invitationRecipient({ ...member, whatsappNumber: 'invalide' }).phone).toBeUndefined()
    expect(invitationRecipient({ ...member, whatsappNumber: 'invalide' }).unavailableReason).toContain('vérifier')
  })
  it.each(['javascript:alert(1)', 'http://example.test', 'https://user:password@example.test', 'pas-un-lien'])('rejette une adresse inadaptée : %s', base => {
    expect(memberInvitationLink(base, '/evenements/1')).toBe('')
  })
  it('accepte un serveur membre local pour le développement', () => {
    expect(memberInvitationLink('http://localhost:3001', '/evenements/1')).toBe('http://localhost:3001/evenements/1')
  })
})
