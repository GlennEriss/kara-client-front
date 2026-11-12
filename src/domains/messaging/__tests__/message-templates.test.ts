import { describe, expect, it, vi } from 'vitest'
import { MESSAGE_TEMPLATES, defaultTemplateBody } from '../constants/message-templates'
import { extractTemplateVariables, renderTemplate } from '../utils/renderTemplate'
import { renderDefaultMessage } from '../utils/renderMessage'
import {
  buildEventInvitationMessage,
  charityEventInvitation,
  communityEventInvitation,
} from '@/domains/community/events/utils/event-invitations'
import type { CharityEvent } from '@/types/types'
import type { Event } from '@/domains/community/events/entities/event.types'
import { shareFixedSimulationWhatsApp } from '@/domains/financial/credit-speciale/fixe/simulation/exports/shareFixedSimulationWhatsApp'
import type { FixedSimulationResult } from '@/domains/financial/credit-speciale/fixe/simulation/entities/fixed-simulation.types'

const event = {
  id: 'event',
  title: 'Rencontre',
  status: 'published',
  startDate: new Date('2026-11-20T09:00:00Z'),
  pollEnabled: false,
} as Event
const charity = {
  id: 'collecte',
  title: 'Collecte solidaire',
  status: 'upcoming',
  isPublic: true,
  startDate: event.startDate,
  location: 'Libreville',
  currency: 'FCFA',
} as CharityEvent
const recipient = { id: 'alice', name: 'Alice ONDO', matricule: 'M1' }
describe('catalogue des modèles de messages', () => {
  it('couvre les invitations, accords et quatre parcours de simulation sans clés ni variables inconnues', () => {
    const keys = MESSAGE_TEMPLATES.map((t) => t.key)
    expect(new Set(keys).size).toBe(keys.length)
    expect(keys).toEqual(
      expect.arrayContaining([
        'communityEventInvitation',
        'charityEventInvitation',
        'eventContributionNotice',
        'groupAgreementReminder',
        'creditSimulationCalculated',
        'creditSimulationCustom',
        'fixedSimulationSchedule',
        'caisseSimulationSchedule',
      ]),
    )
    for (const template of MESSAGE_TEMPLATES) {
      expect(
        extractTemplateVariables(template.defaultBody).every((name) =>
          template.variables.some((v) => v.name === name),
        ),
        template.key,
      ).toBe(true)
    }
  })
  it('conserve les montants et lignes d’échéancier dans le rendu du modèle fixe', () => {
    const message = renderDefaultMessage('fixedSimulationSchedule', {
      produit: 'CREDIT AIDE',
      detail: '1 | 19/11/2026 | 55 000 FCFA',
      montantTotal: '55 000',
    })
    expect(message).toContain('*ÉCHÉANCIER DE CREDIT AIDE*')
    expect(message).toContain('1 | 19/11/2026 | 55 000 FCFA')
    expect(message).toContain('Total: | | 55 000 FCFA')
    expect(message).not.toContain('{{')
  })
  it('utilise le modèle configuré pour préparer le partage réel d’une simulation fixe', () => {
    const opened = vi.spyOn(window, 'open').mockImplementation(() => null)
    try {
      const simulation = {
        schedule: [{ month: 1, date: new Date('2026-11-19'), payment: 55000 }],
        summary: { totalPlanned: 55000 },
      } as FixedSimulationResult
      shareFixedSimulationWhatsApp(simulation, {
        moduleTitle: 'CREDIT AIDE',
        renderMessage: (_key, variables) =>
          renderTemplate('Plan {{produit}}\n{{detail}}\nTotal : {{montantTotal}} FCFA', variables),
      })
      const url = new URL(String(opened.mock.calls[0][0]))
      expect(url.searchParams.get('text')).toBe(
        'Plan CREDIT AIDE\n1 | 19/11/2026 | 55 000 FCFA\nTotal : 55 000 FCFA',
      )
    } finally {
      opened.mockRestore()
    }
  })
  it('applique le modèle personnalisé de l’événement et celui du bloc de contribution', () => {
    const renderMessage = vi.fn((key: string, values = {}) =>
      renderTemplate(
        (
          {
            communityEventInvitation: 'Invitation pour {{nom}} : {{evenement}}\n{{contribution}}',
            eventContributionNotice: 'Participer à {{collecte}} : {{lien}}',
          } as Record<string, string>
        )[key] || defaultTemplateBody(key),
        values,
      ),
    )
    const message = buildEventInvitationMessage({
      event: communityEventInvitation(event, charity),
      recipient,
      introduction: 'Bonjour',
      includeContribution: true,
      memberAppUrl: 'https://association-le-kara.com',
      renderMessage,
    })
    expect(message).toContain('Invitation pour Alice ONDO : Rencontre')
    expect(message).toContain(
      'Participer à Collecte solidaire : https://association-le-kara.com/bienfaiteur/collecte',
    )
  })
  it('sépare le modèle Bienfaiteur et ne prépare pas de contribution lorsque l’option est décochée', () => {
    const renderMessage = vi.fn(renderDefaultMessage)
    buildEventInvitationMessage({
      event: charityEventInvitation(charity),
      recipient,
      introduction: 'Invitation',
      includeContribution: false,
      memberAppUrl: 'https://association-le-kara.com',
      renderMessage,
    })
    expect(renderMessage).toHaveBeenCalledWith(
      'charityEventInvitation',
      expect.objectContaining({ contribution: '' }),
    )
    expect(renderMessage.mock.calls.some(([key]) => key === 'eventContributionNotice')).toBe(false)
  })
})
