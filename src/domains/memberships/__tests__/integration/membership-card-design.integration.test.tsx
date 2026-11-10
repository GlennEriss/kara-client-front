import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MembershipRequestMobileCardV2 } from '../../components/cards/MembershipRequestMobileCardV2'
import { MembershipRequestsGridView } from '../../components/grid/MembershipRequestsGridView'
import { MembershipRequestStats } from '../../components/list/MembershipRequestStats'
import { createMembershipRequestFixture } from '../fixtures/membership-request.fixture'

const request = (extra: Parameters<typeof createMembershipRequestFixture>[0] = {}) => createMembershipRequestFixture({ id: 'request1', matricule: 'MK001', ...extra })
beforeEach(() => {
  vi.stubGlobal('PointerEvent', MouseEvent)
  HTMLElement.prototype.scrollIntoView = vi.fn()
})

describe('cartes d’adhésion harmonisées', () => {
  it('conserve l’identité et le bouton de détails dans les vues grille et mobile', () => {
    const details = vi.fn()
    const r = request()
    const view = render(<MembershipRequestMobileCardV2 request={r} onViewDetails={details} />)
    expect(screen.getByRole('heading', { name: 'Jean Dupont' })).toBeInTheDocument()
    expect(screen.getByText('MK001')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Voir détails' }))
    expect(details).toHaveBeenCalledWith('request1')
    view.rerender(<MembershipRequestsGridView requests={[r]} onViewDetails={details} />)
    expect(screen.getByRole('heading', { name: 'Jean Dupont' })).toBeInTheDocument()
    expect(screen.getByText('MK001')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Voir détails' })).toHaveLength(1)
  })

  it('ne propose l’approbation qu’après paiement et conserve les callbacks de la grille', () => {
    const pay = vi.fn(), approve = vi.fn()
    const r = request()
    const view = render(<MembershipRequestsGridView requests={[r]} onPay={pay} onApprove={approve} />)
    fireEvent.click(screen.getByRole('button', { name: 'Payer' }))
    expect(pay).toHaveBeenCalledWith(r)
    expect(screen.queryByRole('button', { name: 'Approuver' })).not.toBeInTheDocument()
    const paid = { ...r, isPaid: true }
    view.rerender(<MembershipRequestsGridView requests={[paid]} onPay={pay} onApprove={approve} />)
    expect(screen.queryByRole('button', { name: 'Payer' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Approuver' }))
    expect(approve).toHaveBeenCalledWith(paid)
  })

  it('garde les corrections et le rejet dans le menu de la carte', async () => {
    const reject = vi.fn(), corrections = vi.fn()
    render(<MembershipRequestMobileCardV2 request={request()} onReject={reject} onRequestCorrections={corrections} />)
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Actions de Jean Dupont' }), { button: 0, ctrlKey: false })
    expect(await screen.findByRole('menuitem', { name: 'Demander corrections' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Rejeter' }))
    expect(reject).toHaveBeenCalledWith('request1')
    expect(corrections).not.toHaveBeenCalled()
  })

  it('n’affiche aucune action de gestion sans le callback autorisé', () => {
    render(<MembershipRequestMobileCardV2 request={request()} onViewDetails={vi.fn()} />)
    expect(screen.getAllByRole('button')).toHaveLength(1)
    expect(screen.queryByTestId('action-menu')).not.toBeInTheDocument()
  })

  it('désactive le paiement pendant son enregistrement', () => {
    const pay = vi.fn()
    render(<MembershipRequestMobileCardV2 request={request()} onPay={pay} loadingActions={{ 'pay-request1': true }} />)
    const button = screen.getByRole('button', { name: 'Paiement…' })
    expect(button).toBeDisabled()
    fireEvent.click(button)
    expect(pay).not.toHaveBeenCalled()
  })

  it('conserve le bloc de correction en grille et ses actions dédiées', () => {
    render(<MembershipRequestsGridView requests={[request({ status: 'under_review', reviewNote: 'Corriger la pièce d’identité', securityCode: 'AB1234' })]}
      onCopyCorrectionLink={vi.fn()} onSendWhatsAppCorrection={vi.fn()} onRenewSecurityCode={vi.fn()} onPay={vi.fn()} onApprove={vi.fn()} />)
    expect(screen.getByTestId('corrections-block')).toBeInTheDocument()
    expect(screen.getByText('Corriger la pièce d’identité')).toBeInTheDocument()
    expect(screen.getByTestId('corrections-block-copy-link-button')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Payer' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Approuver' })).not.toBeInTheDocument()
  })

  it('permet la réouverture d’un dossier rejeté sans réactiver paiement ou approbation', () => {
    const reopen = vi.fn()
    render(<MembershipRequestMobileCardV2 request={request({ status: 'rejected' })} onReopen={reopen} onPay={vi.fn()} onApprove={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Réouvrir' }))
    expect(reopen).toHaveBeenCalledWith('request1')
    expect(screen.queryByRole('button', { name: 'Payer' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Approuver' })).not.toBeInTheDocument()
  })

  it('conserve l’approbateur et l’accès au PDF officiel', () => {
    const pdf = vi.fn()
    render(<MembershipRequestMobileCardV2 request={request({ status: 'approved', isPaid: true, approvedBy: 'admin1', approvedAt: new Date('2026-11-10T10:00:00Z') })}
      getApprovedByInfo={() => ({ name: 'Gestionnaire Kara' })} onViewApprovedMembershipPdf={pdf} />)
    expect(screen.getByText('Approuvé par : Gestionnaire Kara')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'PDF d’adhésion' }))
    expect(pdf).toHaveBeenCalledWith('request1')
  })

  it('présente les états vide et chargement sans dossiers fictifs', () => {
    const view = render(<MembershipRequestsGridView requests={[]} isLoading />)
    expect(screen.getByRole('status', { name: 'Chargement des demandes' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Voir détails' })).not.toBeInTheDocument()
    view.rerender(<MembershipRequestsGridView requests={[]} />)
    expect(screen.getByRole('heading', { name: 'Aucune demande trouvée' })).toBeInTheDocument()
  })
})

describe('statistiques des adhésions', () => {
  it('garde les compteurs et les filtres accessibles au clavier dans des cartes fixes', () => {
    const select = vi.fn()
    render(<MembershipRequestStats stats={{ total: 20, byStatus: { pending: 8, under_review: 2, approved: 6, rejected: 4 },
      byPayment: { paid: 10, unpaid: 10 }, percentages: { pending: 40, under_review: 10, approved: 30, rejected: 20 } }} activeTab="approved" onSelect={select} />)
    const section = screen.getByRole('region', { name: 'Statistiques des demandes d’adhésion' })
    expect(within(section).getByRole('button', { name: 'Approuvées 6' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(within(section).getByRole('button', { name: 'Non payées 10' }))
    expect(select).toHaveBeenCalledWith('unpaid')
    fireEvent.click(within(section).getByRole('button', { name: 'Total 20' }))
    expect(select).toHaveBeenLastCalledWith('all')
    expect(within(section).getByText('À traiter')).toBeInTheDocument()
  })
})
