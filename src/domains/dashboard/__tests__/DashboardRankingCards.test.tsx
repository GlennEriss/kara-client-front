import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DashboardRankingCards } from '../components/tabs/DashboardRankingCards'

const { download } = vi.hoisted(() => ({ download: vi.fn() }))
vi.mock('../exports/exportDashboard', () => ({ exportDashboard: download }))
beforeEach(() => { download.mockReset(); download.mockResolvedValue(undefined) })

describe('classements du dashboard', () => {
  it('exporte le classement complet depuis la deuxième page et préserve le rang après recherche', async () => {
    render(<DashboardRankingCards rankings={[{ key: 'full', title: 'Top 10 des garants', unit: 'FCFA', items: Array.from({ length: 43 }, (_, index) => ({ id: `g${index + 1}`, label: `Garant ${index + 1}`, value: 50000 - index })) }]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Voir plus : Top 10 des garants' }))
    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }))
    fireEvent.keyDown(screen.getByRole('button', { name: 'Exporter le classement' }), { key: 'Enter' })
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Exporter en Excel' }))
    await waitFor(() => expect(download).toHaveBeenCalledTimes(1))
    expect(download.mock.calls[0][0].payload.rankings[0].items).toHaveLength(43)
    expect(download.mock.calls[0][1]).toBe('excel')
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Garant 43' } })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Exporter le classement' })).toBeEnabled())
    fireEvent.keyDown(screen.getByRole('button', { name: 'Exporter le classement' }), { key: 'Enter' })
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Exporter en PDF' }))
    await waitFor(() => expect(download).toHaveBeenCalledTimes(2))
    expect(download.mock.calls[1][0].payload.rankings[0].items).toMatchObject([{ id: 'g43', rank: 43 }])
    expect(download.mock.calls[1][0].search).toBe('Garant 43')
  })
  it('limite l’aperçu à dix, ouvre toutes les pages et conserve les rangs après recherche', () => {
    render(<DashboardRankingCards rankings={[{ key: 'full', title: 'Top 10 des membres', unit: 'FCFA', items: Array.from({ length: 45 }, (_, index) => ({
      id: `m${index + 1}`, label: `Membre ${index + 1}`, subLabel: `MK-${index + 1}`, value: 50000 - index, href: `/memberships/m${index + 1}`,
    })) }]} />)
    const preview = screen.getByRole('list', { name: 'Top 10 des membres' })
    expect(within(preview).getAllByRole('listitem')).toHaveLength(10)
    expect(screen.getByText('10 sur 45')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Voir plus : Top 10 des membres' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('table', { name: 'Classement complet' })).toBeInTheDocument()
    expect(within(dialog).getByText('Page 1 sur 3')).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Suivant' }))
    expect(within(dialog).getByRole('link', { name: 'Membre 21' })).toHaveAttribute('href', '/memberships/m21')
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Rechercher dans le classement' }), { target: { value: 'MK-45' } })
    expect(within(dialog).getByText('Page 1 sur 1')).toBeInTheDocument()
    expect(within(dialog).getByRole('cell', { name: '45' })).toBeInTheDocument()
    expect(within(dialog).getByRole('link', { name: 'Membre 45' })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Exporter le classement' })).toBeEnabled()
    fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: 'introuvable' } })
    expect(within(dialog).getByText('Aucun résultat pour cette recherche.')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Exporter le classement' })).toBeDisabled()
  })
  it('présente les rangs, la période, les montants et des liens utilisables au clavier', () => {
    render(<DashboardRankingCards rankings={[{
      key: 'received', title: 'Top 10 des membres — Versements reçus', description: 'Versements du 01/11/2026 au 10/11/2026.', unit: 'FCFA', items: [
        { id: 'm1', label: 'Même nom', subLabel: 'MK1', value: 50_000, href: '/memberships/m1' },
        { id: 'm2', label: 'Même nom', subLabel: 'MK2', value: 30_000, href: '/memberships/m2' },
      ],
    }]} />)
    const list = screen.getByRole('list', { name: 'Top 10 des membres — Versements reçus' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByLabelText('Position 1')).toHaveTextContent('1')
    expect(screen.getByText(/Versements du 01/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /MK1/ })).toHaveAttribute('href', '/memberships/m1')
    expect(screen.getByRole('link', { name: /MK2/ })).toHaveAttribute('href', '/memberships/m2')
  })

  it('présente une liste vide et les retards comme une priorité de suivi', () => {
    render(<DashboardRankingCards rankings={[{
      key: 'late', title: 'Retards les plus importants', tone: 'danger', description: 'Situation à ce jour.', items: [],
    }]} />)
    expect(screen.getByRole('heading', { name: 'Retards les plus importants' })).toHaveClass('text-red-700')
    expect(screen.getByText(/Aucune donnée disponible/)).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('affiche la date de Libreville dans les listes récentes, sans montant ni barre de comparaison', () => {
    render(<DashboardRankingCards rankings={[{
      key: 'recent', title: 'Les 10 membres les plus récents', kind: 'recent', items: [{
        id: 'm1', label: 'ONDO Alice', subLabel: 'MK1 · Adhésion approuvée', value: 0,
        date: '2026-11-02T23:30:00Z', href: '/memberships/m1',
      }],
    }]} />)
    expect(screen.getByText('03/11/2026')).toHaveAttribute('datetime', '2026-11-02T23:30:00Z')
    expect(screen.getByRole('link', { name: /ONDO Alice/ })).toHaveAttribute('href', '/memberships/m1')
    expect(screen.queryByText(/FCFA/)).not.toBeInTheDocument()
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })
})
