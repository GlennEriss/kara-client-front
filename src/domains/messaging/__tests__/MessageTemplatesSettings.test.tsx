import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
const mock = vi.hoisted(() => ({ save: vi.fn(), urls: {} as Record<string, string>, overrides: {} }))
vi.mock('@/domains/auth/hooks', () => ({ useAuth: () => ({ user: { uid: 'admin' } }) }))
vi.mock('@/hooks/useMyAccess', () => ({ useMyAccess: () => ({ isSuperAdmin: true, can: () => true }) }))
vi.mock('../hooks/useMessageTemplates', () => ({
  useMessageTemplateOverrides: () => ({ data: mock.overrides, urls: mock.urls, isLoading: false, isError: false }),
  useSaveMessageTemplates: () => ({ save: mock.save, isPending: false }),
}))
import MessageTemplatesSettings from '../components/MessageTemplatesSettings'
beforeEach(() => { vi.clearAllMocks(); mock.urls = {}; mock.save.mockResolvedValue(undefined) })
describe('édition des adresses des modèles', () => {
  it('enregistre une adresse et la montre dans l’aperçu du message', async () => {
    render(<MessageTemplatesSettings />)
    fireEvent.mouseDown(screen.getByRole('tab', { name: /Demandes d’adhésion/ }), { button: 0, ctrlKey: false })
    const input = screen.getByLabelText('URL du site pour les liens')
    fireEvent.change(input, { target: { value: 'https://nouveau.example.com' } })
    const editor = input.closest('[data-slot="card"]')!
    fireEvent.click([...editor.querySelectorAll('button')].find(button => button.textContent?.includes('Aperçu'))!)
    expect(screen.getByText(/Cliquer sur ce lien : https:\/\/nouveau.example.com\/corrections/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() => expect(mock.save).toHaveBeenCalledWith({}, 'admin', { membershipCorrections: 'https://nouveau.example.com' }))
  })
  it('permet de rétablir l’adresse habituelle sans modifier le texte du modèle', async () => {
    mock.urls = { membershipCorrections: 'https://ancien.example.com' }
    render(<MessageTemplatesSettings />)
    fireEvent.mouseDown(screen.getByRole('tab', { name: /Demandes d’adhésion/ }), { button: 0, ctrlKey: false })
    const input = screen.getByLabelText('URL du site pour les liens')
    const editor = input.closest('[data-slot="card"]')!
    fireEvent.click([...editor.querySelectorAll('button')].find(button => button.textContent?.includes('Texte par défaut'))!)
    expect(input).toHaveValue('')
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() => expect(mock.save).toHaveBeenCalledWith({}, 'admin', { membershipCorrections: '' }))
  })
})
