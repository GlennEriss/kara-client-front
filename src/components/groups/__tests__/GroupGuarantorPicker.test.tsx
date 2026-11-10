import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GroupGuarantorPicker, type GroupGuarantorChoice } from '../GroupGuarantorPicker'
import { UNKNOWN_USER_ID, buildUnknownUserBase } from '@/domains/financial/caisse-imprevue/import/unknownUser'

const mocks = vi.hoisted(() => ({ list: vi.fn(), getUser: vi.fn(), change: vi.fn() }))
vi.mock('@/domains/groups/group-service', () => ({ listGroupCandidates: mocks.list }))
vi.mock('@/db/user.db', () => ({ getUserById: mocks.getUser }))

function Fixture({ excludeIds = [] }: { excludeIds?: string[] }) {
  const [value, setValue] = useState<GroupGuarantorChoice | null>(null)
  return <GroupGuarantorPicker value={value} excludeIds={excludeIds} onChange={next => { mocks.change(next); setValue(next) }} />
}
function mount(excludeIds?: string[]) {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><Fixture excludeIds={excludeIds} /></QueryClientProvider>)
}
beforeEach(() => {
  vi.clearAllMocks()
  mocks.list.mockResolvedValue([{ id: 'alice', matricule: 'M001', firstName: 'Alice', lastName: 'Ondo', roles: ['Adherant'] }])
  mocks.getUser.mockResolvedValue(buildUnknownUserBase())
})

describe('sélecteur du garant du groupe', () => {
  it('réutilise le compte INCONNU existant même sans résultat dans la liste', async () => {
    mount()
    fireEvent.click(screen.getByRole('button', { name: 'Contact inconnu' }))
    await waitFor(() => expect(mocks.change).toHaveBeenCalledWith({ id: UNKNOWN_USER_ID, name: 'INCONNU — LE KARA' }))
    expect(mocks.getUser).toHaveBeenCalledWith(UNKNOWN_USER_ID)
    expect(screen.getByText('INCONNU — LE KARA')).toBeInTheDocument()
    expect(screen.getByText(/aucune commission de garant/)).toBeInTheDocument()
  })
  it('signale un compte absent sans sélectionner ni créer un faux garant', async () => {
    mocks.getUser.mockResolvedValue(null)
    mount()
    fireEvent.click(screen.getByRole('button', { name: 'Contact inconnu' }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Membre INCONNU introuvable'))
    expect(mocks.change).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('Aucun compte n’a été créé')
  })
  it('conserve l’exclusion d’un emprunteur de ses propres garants', async () => {
    mount(['alice'])
    await waitFor(() => expect(screen.getByText('Aucun membre correspondant.')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /Alice Ondo/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Contact inconnu' })).toBeEnabled()
  })
})
