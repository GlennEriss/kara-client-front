import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ProspectsPage } from '../ProspectsPage'
import { prospectSchema, KARA_SPONSOR_ID } from '../model'

const f = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  change: vi.fn(),
  history: vi.fn(),
}))
vi.mock('../repository', () => ({
  InsuranceProspectRepository: class {
    list = f.list
    create = f.create
    change = f.change
    history = f.history
  },
}))
const input = {
  ownerName: 'Contact fictif',
  phone: '077000000',
  plateNumber: 'AB-123-CD',
  vehicleType: 'car' as const,
  city: 'Libreville',
  locationType: 'quarter' as const,
  quarter: 'Awendjé',
  insuranceCompany: 'Assureur externe',
  endDate: '2050-12-20',
}
const row = {
  id: 'P1',
  ...prospectSchema.parse(input),
  status: 'tracking',
  sponsorMemberId: 'M001',
  sponsorName: 'Membre fictif',
}
const member = {
  id: 'alice',
  memberId: 'M001',
  name: 'Membre fictif',
  admin: false,
}
function open(admin = false) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <ProspectsPage
        actor={
          admin
            ? { id: 'manager', name: 'Administration', admin: true }
            : member
        }
        loadMembers={async () => [
          { value: 'M002', label: 'Autre membre · M002' },
        ]}
        loadInsurances={async () => []}
      />
    </QueryClientProvider>,
  )
}
beforeEach(() => {
  cleanup()
  vi.resetAllMocks()
  f.list.mockResolvedValue([row])
  f.history.mockResolvedValue([])
  f.create.mockImplementation(async (input) => {
    prospectSchema.parse(input)
    return 'P2'
  })
})
describe('parcours web de prospection', () => {
  it('affiche le suivi sans commandes d’administration pour le membre', async () => {
    open()
    await screen.findByRole('heading', { name: 'AB-123-CD' })
    expect(f.list).toHaveBeenCalledWith(['alice', 'M001'])
    expect(
      screen.queryByRole('button', { name: 'Attribuer le parrainage' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Rattacher l’assurance LE KARA' }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: '077000000' })).toHaveAttribute(
      'href',
      'tel:077000000',
    )
  })
  it('crée un prospect avec un emplacement Autre obligatoire, sans prime ni police', async () => {
    open()
    await screen.findByRole('heading', { name: 'AB-123-CD' })
    fireEvent.click(screen.getByRole('button', { name: 'Nouveau prospect' }))
    for (const [label, value] of Object.entries({
      'Nom du contact': 'Nouveau contact',
      Téléphone: '077111111',
      Immatriculation: 'TEST-456',
      Ville: 'Libreville',
      'Assureur actuel': 'Autre assureur',
      'Fin de l’assurance actuelle': '2050-12-20',
    }))
      fireEvent.change(screen.getByLabelText(label), { target: { value } })
    fireEvent.change(screen.getByLabelText('Localisation'), {
      target: { value: 'other' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Précisez où')
    fireEvent.change(screen.getByLabelText('Précisez l’emplacement'), {
      target: { value: 'Parking du marché' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer' }))
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )
    expect(f.create).toHaveBeenLastCalledWith(
      expect.objectContaining({
        locationType: 'other',
        locationDetails: 'Parking du marché',
      }),
      'M001',
      member,
    )
  })
  it('enregistre la demande d’assurance du membre sans contrat inventé', async () => {
    open()
    await screen.findByRole('heading', { name: 'AB-123-CD' })
    fireEvent.click(
      screen.getByRole('button', { name: 'Demander une assurance LE KARA' }),
    )
    fireEvent.change(screen.getByLabelText('Résultat / motif'), {
      target: { value: 'Souhaite une proposition' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer' }))
    await waitFor(() =>
      expect(f.change).toHaveBeenCalledWith(
        'P1',
        member,
        'quote_requested',
        expect.objectContaining({ note: 'Souhaite une proposition' }),
      ),
    )
    expect(f.create).not.toHaveBeenCalled()
  })
  it('permet à l’administration l’attribution LE KARA et affiche les contraintes du rattachement', async () => {
    open(true)
    await screen.findByRole('heading', { name: 'AB-123-CD' })
    expect(f.list).toHaveBeenCalledWith(undefined)
    fireEvent.click(
      screen.getByRole('button', { name: 'Attribuer le parrainage' }),
    )
    fireEvent.change(screen.getByLabelText('Parrain'), {
      target: { value: KARA_SPONSOR_ID },
    })
    fireEvent.change(screen.getByLabelText('Résultat / motif'), {
      target: { value: 'Prospect LE KARA' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer' }))
    await waitFor(() =>
      expect(f.change).toHaveBeenCalledWith(
        'P1',
        expect.objectContaining({ admin: true }),
        'assign',
        expect.objectContaining({ sponsorMemberId: KARA_SPONSOR_ID }),
      ),
    )
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'Rattacher l’assurance LE KARA' }),
    )
    expect(
      await screen.findByText(/Aucune assurance correspondante/),
    ).toBeInTheDocument()
  })
  it('filtre et conserve les dossiers clôturés en lecture seule', async () => {
    f.list.mockResolvedValue([{ ...row, status: 'converted' }])
    open()
    await screen.findByRole('heading', { name: 'AB-123-CD' })
    expect(
      screen.queryByRole('button', { name: 'Enregistrer une relance' }),
    ).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Rechercher un prospect'), {
      target: { value: 'introuvable' },
    })
    expect(
      screen.getByText('Aucun prospect correspondant.'),
    ).toBeInTheDocument()
  })
})
