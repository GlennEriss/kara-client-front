import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MemberNavbarSearch } from '../components/MemberNavbarSearch'

const panelLoaded = vi.hoisted(() => vi.fn())
vi.mock('../hooks/useMemberGlobalSearch', () => ({
  useMemberGlobalSearch: () => ({ data: [
    { id: 'member-41', firstName: 'Nestor', lastName: 'MENGUE' },
    { id: 'member-42', firstName: 'Jeanne', lastName: 'MBOUMBA' },
  ], isLoading: false }),
}))
vi.mock('../components/MemberOverviewPanel', () => {
  panelLoaded()
  return {
    MemberOverviewPanel: ({ memberId, open, onOpenChange }: { memberId: string; open: boolean; onOpenChange: (open: boolean) => void }) => open ? (
      <div role="dialog" aria-label="Dossier sélectionné">
        <span>{memberId}</span>
        <button onClick={() => onOpenChange(false)}>Fermer le dossier</button>
      </div>
    ) : null,
  }
})

describe('recherche membre avec dossier différé', () => {
  it('charge le dossier uniquement après sélection et ouvre le membre choisi', async () => {
    render(<MemberNavbarSearch />)
    expect(panelLoaded).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    fireEvent.change(screen.getByPlaceholderText('Rechercher un membre...'), { target: { value: 'Jeanne' } })
    fireEvent.click(screen.getByRole('button', { name: /Jeanne MBOUMBA/ }))
    expect(await screen.findByRole('dialog', { name: 'Dossier sélectionné' })).toHaveTextContent('member-42')
    expect(screen.getByPlaceholderText('Rechercher un membre...')).toHaveValue('Jeanne MBOUMBA')
    fireEvent.click(screen.getByRole('button', { name: 'Fermer le dossier' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
