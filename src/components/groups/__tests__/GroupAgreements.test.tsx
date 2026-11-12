import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { User } from '@/types/types'
import type { GroupAgreement } from '@/domains/groups/agreements/agreement-model'
import GroupAgreements from '../GroupAgreements'
import { GroupAgreementMoneyDialog } from '../GroupAgreementMoneyDialog'
vi.mock('@/domains/messaging/hooks/useMessageTemplates', async () => {
  const { renderDefaultMessage } = await import('@/domains/messaging/utils/renderMessage')
  return { useRenderMessageTemplate: () => renderDefaultMessage }
})

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  pay: vi.fn(),
  remit: vi.fn(),
  follow: vi.fn(),
}))
vi.mock('@/domains/groups/agreements/agreement-service', () => ({
  listGroupAgreements: mocks.list,
  createGroupAgreements: mocks.create,
  recordAgreementPayment: mocks.pay,
  recordAgreementRemittance: mocks.remit,
  recordAgreementReminder: mocks.follow,
  cancelGroupAgreement: vi.fn(),
  voidAgreementPayment: vi.fn(),
  voidAgreementRemittance: vi.fn(),
}))
vi.mock('@/domains/groups/agreements/agreement-proof', () => ({
  uploadAgreementPaymentProof: vi.fn(),
}))
const actor = { id: 'admin', name: 'Admin' }
const members = ['seller', 'bob', 'paul'].map((id) => ({
  id,
  firstName: id,
  lastName: 'ONDO',
  roles: ['Adherant'],
  groupIds: ['g1'],
  contacts: [],
})) as unknown as User[]
const agreement: GroupAgreement = {
  id: 'a1',
  groupId: 'g1',
  batchId: 'b1',
  kind: 'SALE',
  title: 'Ventilateurs',
  description: '',
  agreementDate: '2026-09-01',
  creditorId: 'seller',
  creditorName: 'Alice Vendeur',
  creditorMatricule: 'S1',
  debtorId: 'bob',
  debtorName: 'Bob Acheteur',
  debtorMatricule: 'B1',
  partyIds: ['seller', 'bob'],
  quantity: 1,
  unitAmount: 60000,
  totalAmount: 60000,
  status: 'ACTIVE',
  schedule: [
    { id: 'e1', dueDate: '2026-10-01', amount: 20000 },
    { id: 'e2', dueDate: '2026-11-01', amount: 40000 },
  ],
  payments: [],
  remittances: [],
  reminders: [],
  history: [],
  createdBy: 'admin',
}
function workspace(canManage = true) {
  mocks.list.mockResolvedValue([agreement])
  mocks.create.mockResolvedValue(['a1'])
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <GroupAgreements groupId="g1" members={members} actor={actor} canManage={canManage} />
    </QueryClientProvider>,
  )
}
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})
describe('parcours admin des accords', () => {
  it('ouvre le suivi avec son échéancier et masque les mutations sans permission', async () => {
    workspace(false)
    fireEvent.click(await screen.findByRole('button', { name: /Ventilateurs.*Bob Acheteur/ }))
    expect(screen.getByRole('heading', { name: 'Échéancier' })).toBeInTheDocument()
    expect(screen.getByText('Bénéficiaire / créancier')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Enregistrer un versement' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Créer des accords' })).not.toBeInTheDocument()
  })
  it('prépare deux accords indépendants, vérifie leurs échéances puis les crée une seule fois', async () => {
    workspace()
    fireEvent.click(screen.getByRole('button', { name: 'Créer des accords' }))
    fireEvent.change(screen.getByLabelText('Vendeur / bénéficiaire'), {
      target: { value: 'seller' },
    })
    fireEvent.change(screen.getByLabelText('Objet de l’accord'), {
      target: { value: 'Vente de ventilateurs' },
    })
    fireEvent.change(screen.getByLabelText('Prix unitaire (FCFA)'), { target: { value: '60000' } })
    fireEvent.click(screen.getByRole('checkbox', { name: /bob ONDO/i }))
    fireEvent.click(screen.getByRole('checkbox', { name: /paul ONDO/i }))
    fireEvent.click(screen.getByRole('button', { name: /Vérifier les échéanciers/ }))
    expect(screen.getByRole('heading', { name: 'Vérifier chaque échéancier' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Créer les accords' }))
    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1))
    const payload = mocks.create.mock.calls[0][0]
    expect(payload.buyers).toHaveLength(2)
    expect(
      payload.buyers[0].schedule.reduce((s: number, r: { amount: number }) => s + r.amount, 0),
    ).toBe(60000)
    expect(
      payload.buyers[1].schedule.reduce((s: number, r: { amount: number }) => s + r.amount, 0),
    ).toBe(60000)
  })
  it('enregistre le destinataire du versement et conserve le formulaire en cas d’erreur', async () => {
    mocks.pay.mockRejectedValueOnce(new Error('Le montant dépasse le solde restant.'))
    render(
      <GroupAgreementMoneyDialog
        agreement={agreement}
        remittance={false}
        actor={actor}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    )
    fireEvent.change(screen.getByLabelText('Qui a reçu l’argent ?'), { target: { value: 'KARA' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer le versement reçu' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('dépasse le solde')
    expect(mocks.pay).toHaveBeenCalledWith(
      'g1',
      'a1',
      expect.objectContaining({ amount: 20000, receivedBy: 'KARA' }),
      actor,
    )
    expect(screen.getByLabelText('Qui a reçu l’argent ?')).toHaveValue('KARA')
  })
})
