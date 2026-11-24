import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ogarTariffGroups } from '@/domains/vehicles/server/ogar-tariff'
import { InsuranceSimulator } from '../InsuranceSimulator'

vi.mock('@/domains/vehicles/use-insurance-asset-types', () => ({
  useInsuranceAssetTypes: () => ({ data: { values: ['custom:Vitrine professionnelle'], inactive: [] } }),
}))
vi.mock('@/hooks/vehicule/useVehicleRewards', () => ({
  useInsurancePartners: () => ({
    data: [
      { id: 'ogar', name: 'OGAR', commissionRate: 10, memberSharePercent: 30 },
      { id: 'axa', name: 'AXA', commissionRate: 15, memberSharePercent: 20 },
    ],
  }),
}))

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function renderSimulator() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={client}><InsuranceSimulator /></QueryClientProvider>)
}

function choose(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

function expectAmount(label: string, amount: RegExp) {
  const caption = screen.getByText(label)
  const tile = caption.closest('dt')?.parentElement ?? caption.parentElement
  expect(tile).toBeTruthy()
  expect(within(tile!).getByText(amount)).toBeInTheDocument()
}

describe('simulateur d’assurance', () => {
  it('charge le barème OGAR et répartit la commission selon les taux configurés', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ documentId: 'ogar-vehicules', groups: ogarTariffGroups }),
    }))
    renderSimulator()
    choose('Type de bien', 'car')
    choose('Assureur', 'ogar')
    await screen.findByLabelText('Catégorie du véhicule')
    choose('Catégorie du véhicule', 'berline-particulier')
    choose('Énergie et puissance', '0')
    choose('Durée et bonus', '0')

    expectAmount('Prime à payer selon le barème', /115\s027/)
    expectAmount('Commission attendue de l’assureur', /11\s503/)
    expectAmount('Part du parrain', /3\s451/)
    expectAmount('Part estimée de LE KARA', /8\s052/)
    expect(screen.getByRole('link', { name: 'Vérifier le PDF source' })).toHaveAttribute(
      'href', '/api/vehicules/baremes?document=ogar-vehicules',
    )
    fireEvent.click(screen.getByRole('switch', { name: 'Prévoir un reversement au parrain' }))
    expectAmount('Part estimée de LE KARA', /11\s503/)

    fireEvent.click(screen.getByRole('button', { name: 'Réinitialiser' }))
    expect(screen.getByLabelText('Type de bien')).toHaveFocus()
    expect(screen.getByLabelText('Type de bien')).toHaveValue('')
    expect(screen.queryByText('Part estimée de LE KARA')).not.toBeInTheDocument()
  })

  it('accepte la prime du devis pour un autre assureur et un type de bien personnalisé', () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    renderSimulator()
    choose('Type de bien', 'custom:Vitrine professionnelle')
    choose('Assureur', 'axa')
    choose('Prime d’assurance (FCFA)', '200 000')

    expectAmount('Commission attendue de l’assureur', /30\s000/)
    expectAmount('Part du parrain', /6\s000/)
    expectAmount('Part estimée de LE KARA', /24\s000/)
    expect(fetch).not.toHaveBeenCalled()
  })
})
