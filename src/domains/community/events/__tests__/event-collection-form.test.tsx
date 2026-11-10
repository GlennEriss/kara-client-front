import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EventCreatePage } from '../components/EventCreatePage'
import { EventEditPage } from '../components/EventEditPage'
import type { EventFormProps } from '../components/EventForm'

const { create, update, push, state } = vi.hoisted(() => ({
  create: vi.fn(), update: vi.fn(), push: vi.fn(), state: { collection: 'collecte-1' },
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))
vi.mock('@/domains/auth/hooks', () => ({ useAuth: () => ({ user: { uid: 'admin' } }) }))
vi.mock('@/firebase/auth', () => ({ auth: { currentUser: { uid: 'admin' } } }))
vi.mock('../hooks/useEventMutations', () => ({
  useCreateEvent: () => ({ mutateAsync: create }), useUpdateEvent: () => ({ mutateAsync: update }),
}))
vi.mock('../hooks/useEvent', () => ({ useEvent: () => ({ data: { id: 'event-1', status: 'draft' } }) }))
vi.mock('../components/EventForm', () => ({ EventForm: (props: EventFormProps) => <>
  {props.onPrepareWhatsAppChange && <button onClick={() => props.onPrepareWhatsAppChange?.(true)}>Préparer WhatsApp</button>}
  <button onClick={() => props.onSubmit({ title: 'Rencontre KARA', description: 'Rencontre de tous les membres', startDate: '2026-11-20T10:00',
    charityEventId: state.collection, pollEnabled: false, finalLocation: { name: 'Salle KARA' } })}>Enregistrer</button>
</> }))

beforeEach(() => {
  vi.clearAllMocks()
  state.collection = 'collecte-1'
  create.mockResolvedValue({ id: 'event-1' })
  update.mockResolvedValue({ id: 'event-1' })
})

describe('Collecte liée et invitations à la création', () => {
  it('sauvegarde la collecte choisie et transmet le choix de préparer WhatsApp', async () => {
    render(<EventCreatePage />)
    fireEvent.click(screen.getByRole('button', { name: 'Préparer WhatsApp' }))
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() => expect(create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ charityEventId: 'collecte-1' }) })))
    await waitFor(() => expect(push).toHaveBeenCalledWith('/events/event-1?notify=whatsapp'))
  })
  it('conserve la création habituelle sans préparer d’envoi par défaut', async () => {
    render(<EventCreatePage />)
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() => expect(push).toHaveBeenCalledWith('/events/event-1'))
  })
  it.each(['collecte-2', ''])('sauvegarde aussi le changement ou le retrait de la collecte : %s', async collection => {
    state.collection = collection
    render(<EventEditPage eventId="event-1" />)
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() => expect(update).toHaveBeenCalledWith(expect.objectContaining({ id: 'event-1', data: expect.objectContaining({ charityEventId: collection }) })))
  })
})
