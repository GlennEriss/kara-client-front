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
  ModalContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
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
      <button type="button" onClick={onNavigate}>
        Ouvrir un contrat historique
      </button>
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
        creditSpeciale: {
          demandes: '/credit-speciale/demandes',
          contrats: '/credit-speciale/contrats',
        },
        creditFixe: {
          demandes: '/credit-fixe/demandes',
          contrats: '/credit-fixe/contrats',
        },
        creditAide: {
          demandes: '/credit-aide/demandes',
          contrats: '/credit-aide/contrats',
        },
        placement: {
          demandes: '/placements/demandes',
          contrats: '/placements',
        },
        charite: { demandes: '/bienfaiteur', contrats: '/bienfaiteur' },
      }),
    }),
  },
}))

const emptyModule = {
  demandes: [],
  contrats: [],
  closedContracts: [],
  closedContrats: 0,
}

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
      <MemberOverviewPanel memberId="member-42" open onOpenChange={vi.fn()} />,
    )

    expect(screen.getByTestId('member-form-in-overview')).toHaveTextContent(
      'member-42',
    )
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

    fireEvent.click(
      screen.getByRole('button', { name: 'Ouvrir un contrat historique' }),
    )
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('ouvre les compteurs et propose les vrais identifiants des contrats clôturés', () => {
    // Le beforeEach fournit la même structure ; seul le module exercé est rempli.
    const hook = vi.mocked(useMemberOverview)
    const base = hook.getMockImplementation()!('member-42')
    hook.mockReturnValue({
      ...base,
      data: {
        ...base.data!,
        modules: {
          ...base.data!.modules,
          creditFixe: {
            demandes: [],
            contrats: [],
            closedContrats: 9,
            closedContracts: Array.from({ length: 9 }, (_, i) => ({
              id: `FIXE-CLOSED-${i}`,
              status: 'CLOSED',
              module: 'creditFixe',
              kind: 'contrat',
            })),
          },
        },
      },
    } as ReturnType<typeof useMemberOverview>)
    const close = vi.fn()
    render(
      <MemberOverviewPanel memberId="member-42" open onOpenChange={close} />,
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'Voir clôturés Crédit fixe (9)' }),
    )
    expect(
      screen.getByRole('link', { name: 'Ouvrir le contrat FIXE-CLOSED-0' }),
    ).toHaveAttribute('href', '/credit-fixe/contrats/FIXE-CLOSED-0')
    fireEvent.click(
      screen.getByRole('button', { name: 'Afficher davantage (3)' }),
    )
    fireEvent.click(
      screen.getByRole('link', { name: 'Ouvrir le contrat FIXE-CLOSED-8' }),
    )
    expect(close).toHaveBeenCalledWith(false)
  })

it('distingue les contrats résiliés des clôturés et ouvre leur fiche',()=>{
 const current=vi.mocked(useMemberOverview).getMockImplementation()!('member-42')
 vi.mocked(useMemberOverview).mockReturnValue({...current,data:{...current.data!,modules:{...current.data!.modules,caisseSpeciale:{...emptyModule,terminatedContrats:1,terminatedContracts:[{id:'CS-RESILIE',status:'RESCINDED',kind:'contrat',module:'caisseSpeciale'}]}}}} as ReturnType<typeof useMemberOverview>)
 render(<MemberOverviewPanel memberId="member-42" open onOpenChange={vi.fn()}/>)
 fireEvent.click(screen.getByRole('button',{name:'Voir résiliés Caisse spéciale (1)'}))
 expect(screen.getByRole('heading',{name:'Contrats résiliés (1)'})).toBeInTheDocument()
 expect(screen.getByRole('link',{name:/CS-RESILIE/})).toHaveAttribute('href',expect.stringContaining('CS-RESILIE'))
})

})
