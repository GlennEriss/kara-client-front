import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { HelpButton } from '../components/HelpButton'
import { useVisibleHelpTopics } from '../hooks/useVisibleHelpTopics'
import type { HelpTopic } from '../entities/help.types'
import routes from '@/constantes/routes'

vi.mock('next/navigation', () => ({ usePathname: () => '/calendrier' }))
vi.mock('../hooks/useVisibleHelpTopics', () => ({ useVisibleHelpTopics: vi.fn() }))

const topic: HelpTopic = {
  key: 'calendrier', title: 'Calendrier et recouvrement', category: 'Pilotage', summary: 'Organiser les relances.',
  pages: [{ path: '/calendrier', label: 'Calendrier', summary: 'Suivre les versements.' }],
  sections: [{ kind: 'howto', blocks: [{ type: 'text', text: 'Sélectionner les membres à rappeler.' }] }],
}

describe('aide contextuelle différée', () => {
  it('ouvre la fiche de la page après le clic et garde le lien vers le centre d’aide', async () => {
    vi.mocked(useVisibleHelpTopics).mockReturnValue({ topics: [topic], isLoading: false })
    render(<HelpButton />)
    expect(useVisibleHelpTopics).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Aide sur cette page' }))
    expect(await screen.findByText('Calendrier et recouvrement')).toBeVisible()
    expect(screen.getByRole('link', { name: 'Ouvrir le centre d’aide' })).toHaveAttribute('href', `${routes.admin.helpCenter}?fiche=calendrier`)
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Aide sur cette page' }))
    expect(await screen.findByText('Sélectionner les membres à rappeler.')).toBeVisible()
  })
})
