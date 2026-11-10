import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DashboardRankingCards } from '../components/tabs/DashboardRankingCards'

describe('classements du dashboard', () => {
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
