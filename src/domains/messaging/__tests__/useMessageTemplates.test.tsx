import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import {
  resetMessageTemplatesCache,
  useRenderMessageTemplate,
  useSaveMessageTemplates,
} from '../hooks/useMessageTemplates'
const mock = vi.hoisted(() => ({ load: vi.fn(), save: vi.fn() }))
vi.mock('../db/messageTemplates.db', () => ({
  fetchMessageTemplateSettings: mock.load,
  saveMessageTemplateOverrides: mock.save,
}))
beforeEach(() => {
  resetMessageTemplatesCache()
  vi.clearAllMocks()
  mock.save.mockResolvedValue(undefined)
})
afterEach(cleanup)
describe('personnalisation des nouveaux modèles', () => {
  it('utilise le texte livré lorsque le nouveau modèle ne possède aucune configuration enregistrée', async () => {
    mock.load.mockResolvedValue({ overrides: {}, urls: {} })
    const { result } = renderHook(() => useRenderMessageTemplate())
    await waitFor(() => expect(mock.load).toHaveBeenCalledTimes(1))
    expect(
      result.current('groupAgreementReminder', {
        nom: 'Alice',
        objet: 'Ventilateur',
        beneficiaire: 'Paul',
        montant: '50 000 FCFA',
      }),
    ).toContain('Solde à régler : 50 000 FCFA')
  })
  it('charge un texte personnalisé puis applique immédiatement sa nouvelle version enregistrée', async () => {
    mock.load.mockResolvedValue({ overrides: {
      groupAgreementReminder: 'Bonjour {{nom}}, rappel : {{montant}}.',
    }, urls: {} })
    const { result } = renderHook(() => ({
      render: useRenderMessageTemplate(),
      ...useSaveMessageTemplates(),
    }))
    await waitFor(() =>
      expect(
        result.current.render('groupAgreementReminder', { nom: 'Alice', montant: '50 000 FCFA' }),
      ).toBe('Bonjour Alice, rappel : 50 000 FCFA.'),
    )
    await act(() =>
      result.current.save({ groupAgreementReminder: 'Suivi de {{objet}} pour {{nom}}' }, 'admin'),
    )
    expect(mock.save).toHaveBeenCalledWith(
      { groupAgreementReminder: 'Suivi de {{objet}} pour {{nom}}' },
      'admin',
      {},
    )
    expect(
      result.current.render('groupAgreementReminder', { objet: 'Ventilateur', nom: 'Alice' }),
    ).toBe('Suivi de Ventilateur pour Alice')
  })
  it('charge et modifie l’adresse des liens sans perdre le dossier ni ses paramètres', async () => {
    mock.load.mockResolvedValue({ overrides: {}, urls: { membershipCorrections: 'https://membres.example.com' } })
    const { result } = renderHook(() => ({ render: useRenderMessageTemplate(), ...useSaveMessageTemplates() }))
    const variables = { lien: 'https://ancien.example.com/membership-requests/dossier-1/corrections?code=123456' }
    await waitFor(() => expect(result.current.render('membershipCorrections', variables)).toContain('https://membres.example.com/membership-requests/dossier-1/corrections?code=123456'))
    await act(() => result.current.save({}, 'admin', { membershipCorrections: 'https://nouveau.example.com' }))
    expect(result.current.render('membershipCorrections', variables)).toContain('https://nouveau.example.com/membership-requests/dossier-1/corrections?code=123456')
  })
})
