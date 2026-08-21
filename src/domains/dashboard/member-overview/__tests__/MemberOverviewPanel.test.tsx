import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemberOverviewPanel } from '../components/MemberOverviewPanel'
import { useMemberOverview } from '../hooks/useMemberOverview'

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: { open: boolean; children: ReactNode }) =>
    open ? <div data-testid="member-overview-dialog">{children}</div> : null,
}))

vi.mock('@/components/ui/modal', () => ({
  ModalContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ModalHeader: ({ title }: { title: ReactNode }) => <h2>{title}</h2>,
  ModalBody: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/domains/community/member-form', () => ({
  MemberFormCard: ({
    memberId,
    onNavigate,
  }: {
    memberId: string
    onNavigate?: () => void
  }) => (
    <section data-testid="member-form-in-overview">
      <span>{memberId}</span>
      <button type="button" onClick={onNavigate}>Ouvrir un contrat historique</button>
    </section>
  ),
}))

vi.mock('../hooks/useMemberOverview', () => ({
  useMemberOverview: vi.fn(),
}))

vi.mock('../services/MemberOverviewAggregationService', () => ({
  MemberOverviewAggregationService: {
    getInstance: () => ({
      getModuleListRoutes: () => ({
        caisseSpeciale: { demandes: '/cs/demandes', contrats: '/cs/contrats' },
        caisseImprevue: { demandes: '/ci/demandes', contrats: '/ci/contrats' },
        creditSpeciale: { demandes: '/credit-speciale/demandes', contrats: '/credit-speciale/contrats' },
        creditFixe: { demandes: '/credit-fixe/demandes', contrats: '/credit-fixe/contrats' },
        creditAide: { demandes: '/credit-aide/demandes', contrats: '/credit-aide/contrats' },
        placement: { demandes: '/placements/demandes', contrats: '/placements' },
        charite: { demandes: '/bienfaiteur', contrats: '/bienfaiteur' },
      }),
    }),
  },
}))

const emptyModule = { demandes: [], contrats: [] }

describe('MemberOverviewPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useMemberOverview).mockReturnValue({
      data: {
        member: {
          id: 'member-42',
          firstName: 'Jeanne',
          lastName: 'MBOUMBA',
          isActive: true,
        },
        modules: {
          caisseSpeciale: emptyModule,
          caisseImprevue: emptyModule,
          creditSpeciale: emptyModule,
          creditFixe: emptyModule,
          creditAide: emptyModule,
          placement: emptyModule,
          charite: emptyModule,
        },
        counts: {},
        generatedAt: new Date().toISOString(),
      },
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useMemberOverview>)
  })

  it('affiche le même historique dans la modale de recherche navbar', () => {
    render(
      <MemberOverviewPanel
        memberId="member-42"
        open
        onOpenChange={vi.fn()}
      />,
    )

    expect(screen.getByTestId('member-form-in-overview')).toHaveTextContent('member-42')
  })

  it('ferme la modale quand un contrat de l’historique est ouvert', () => {
    const onOpenChange = vi.fn()
    render(
      <MemberOverviewPanel
        memberId="member-42"
        open
        onOpenChange={onOpenChange}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir un contrat historique' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
