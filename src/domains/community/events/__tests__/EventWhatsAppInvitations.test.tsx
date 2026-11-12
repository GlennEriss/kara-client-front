import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EventWhatsAppInvitations } from '../components/EventWhatsAppInvitations'
import type { EventInvitation } from '../utils/event-invitations'
vi.mock('@/domains/messaging/hooks/useMessageTemplates', async () => {
  const { renderDefaultMessage } = await import('@/domains/messaging/utils/renderMessage')
  return { useRenderMessageTemplate: () => renderDefaultMessage }
})

const { load, replace, anchorClick, hrefs, query } = vi.hoisted(() => ({ load: vi.fn(), replace: vi.fn(), anchorClick: vi.fn(), hrefs: [] as string[], query: { value: '' } }))
vi.mock('../services/loadInvitationRecipients', () => ({ loadInvitationRecipients: load }))
vi.mock('@/hooks/bienfaiteur/useCharityEvents', () => ({ useCharityEvent: vi.fn(() => ({})) }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }), useSearchParams: () => new URLSearchParams(query.value) }))

const event: EventInvitation = { id: 'demo', title: 'Rencontre KARA', startDate: new Date('2026-11-20T09:00:00Z'),
  location: 'Libreville', memberPath: '/evenements/demo', contribution: { title: 'Collecte KARA', memberPath: '/bienfaiteur/collecte', currency: 'FCFA' } }
function mount(value = event) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const result = render(<QueryClientProvider client={client}><EventWhatsAppInvitations event={value} /></QueryClientProvider>)
  return { ...result, updateEvent: (next: EventInvitation) => result.rerender(<QueryClientProvider client={client}><EventWhatsAppInvitations event={next} /></QueryClientProvider>) }
}

beforeEach(() => {
  vi.clearAllMocks()
  hrefs.length = 0
  query.value = ''
  load.mockResolvedValue([
    ...Array.from({ length: 22 }, (_, i) => ({ id: `member-${i}`, name: `Membre ${i}`, matricule: `MK-${i}`, phone: '+24177466973' })),
    { id: 'invalid', name: 'Sans contact', matricule: 'MK-invalide', unavailableReason: 'Aucun numéro renseigné' },
  ])
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { hrefs.push(this.href); anchorClick() })
})

describe('Préparation des invitations WhatsApp', () => {
  it('ouvre la préparation demandée à la création seulement après publication', async () => {
    query.value = 'notify=whatsapp'
    const view = mount({ ...event, blockedReason: 'Publiez cet événement.' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    view.updateEvent(event)
    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Inviter les membres' })).toBeInTheDocument())
    expect(replace).toHaveBeenCalledWith(expect.not.stringContaining('notify'), { scroll: false })
    expect(anchorClick).not.toHaveBeenCalled()
  })
  it('ne lit pas les membres avant ouverture et bloque les événements non publiés', () => {
    mount({ ...event, blockedReason: 'Publiez cet événement avant de prévenir les membres.' })
    expect(screen.getByRole('button', { name: 'Inviter par WhatsApp' })).toBeDisabled()
    expect(load).not.toHaveBeenCalled()
    expect(anchorClick).not.toHaveBeenCalled()
  })
  it('sélectionne tous les destinataires au-delà de la première page et ouvre un seul message par clic', async () => {
    mount()
    expect(load).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Inviter par WhatsApp' }))
    await waitFor(() => expect(screen.getByText('0 sélectionné(s) · 22 joignable(s) · 1 sans numéro valide')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Tous les membres joignables' }))
    expect(screen.getByText('22 sélectionné(s) · 22 joignable(s) · 1 sans numéro valide')).toBeInTheDocument()
    expect(anchorClick).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir pour Membre 0' }))
    expect(anchorClick).toHaveBeenCalledTimes(1)
    const url = new URL(hrefs[0])
    expect(url.origin).toBe('https://wa.me')
    expect(url.searchParams.get('text')).toContain('Bonjour Membre 0,')
    expect(url.searchParams.get('text')).toContain('https://association-le-kara.com/evenements/demo')
    expect(url.searchParams.get('text')).toContain('https://association-le-kara.com/bienfaiteur/collecte')
    expect(url.searchParams.get('text')).toContain('Je veux contribuer')
    expect(screen.getByRole('button', { name: 'Ouvrir pour Membre 1' })).toBeEnabled()
    expect(screen.getByText(/1 conversation\(s\) ouverte\(s\) sur 22/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }))
    expect(screen.getByLabelText('Sélectionner Sans contact')).toBeDisabled()
    expect(screen.getByLabelText('Sélectionner Membre 21')).toBeChecked()
  })
  it('n’ouvre rien avec une introduction vide et permet un message sans contribution', async () => {
    mount()
    fireEvent.click(screen.getByRole('button', { name: 'Inviter par WhatsApp' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Tous les membres joignables' })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: 'Tous les membres joignables' }))
    const input = screen.getByLabelText('Message d’introduction')
    fireEvent.change(input, { target: { value: '   ' } })
    expect(screen.getByRole('button', { name: 'Ouvrir pour Membre 0' })).toBeDisabled()
    fireEvent.change(input, { target: { value: 'Nous vous invitons !' } })
    fireEvent.click(screen.getByRole('switch', { name: 'Proposer de contribuer à la collecte' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir pour Membre 0' }))
    expect(new URL(hrefs[0]).searchParams.get('text')).not.toContain('Pour contribuer')
  })
  it('affiche une erreur réessayable sans annoncer de destinataires ou d’envois', async () => {
    load.mockRejectedValue(new Error('Lecture refusée'))
    mount()
    fireEvent.click(screen.getByRole('button', { name: 'Inviter par WhatsApp' }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Impossible de charger les membres'))
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeEnabled()
    expect(anchorClick).not.toHaveBeenCalled()
  })
})
