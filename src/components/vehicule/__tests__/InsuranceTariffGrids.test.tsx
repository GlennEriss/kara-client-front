import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { InsuranceTariffGrids } from '../InsuranceTariffGrids'
import type { TariffGrid, TariffGridInput } from '@/domains/vehicles/tariff-grid'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

it('affiche le tarif OGAR, enregistre sa correction et rafraîchit le tableau', async () => {
  let grid: TariffGrid = {
    id: 'ogar--vehicules', insurer: 'OGAR', assetType: 'Véhicules', revision: 0, updatedAt: null,
    groups: [{
      id: 'berline', label: 'Berline', assetTypes: ['car'], plans: ['1 an'],
      bands: [{ label: '2–4 CV', rates: [115027] }],
    }],
  }
  const fetch = vi.fn(async (_url: string, options: RequestInit) => {
    if (options.method === 'PUT') {
      const update = JSON.parse(String(options.body)) as TariffGridInput
      expect(update.revision).toBe(0)
      expect(update.groups[0].bands[0].rates[0]).toBe(120000)
      grid = { ...grid, groups: update.groups, revision: 1 }
      return { ok: true, json: async () => ({ id: grid.id }) }
    }
    return { ok: true, json: async () => ({ items: [grid], canEdit: true }) }
  })
  vi.stubGlobal('fetch', fetch)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={client}><InsuranceTariffGrids /></QueryClientProvider>)
  expect(await screen.findByRole('cell', { name: /115\s027/ })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Modifier la grille' }))
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Prime · 2–4 CV · 1 an' }), { target: { value: '120000' } })
  fireEvent.click(screen.getByRole('button', { name: 'Enregistrer la grille' }))
  expect(await screen.findByRole('cell', { name: /120\s000/ })).toBeInTheDocument()
  expect(screen.getByText('Grille enregistrée.')).toBeInTheDocument()
})
