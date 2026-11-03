import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CaisseContractHeader } from '../CaisseContractHeader'

describe('état présenté dans les détails d’un contrat de caisse', () => {
  it.each(['EARLY_REFUND_PENDING', 'CLOSED', 'CANCELED'])(
    'présente la remise en attente pour un retrait approuvé, même si le statut stocké est %s',
    (status) => {
      render(
        <CaisseContractHeader
          contractLabel="Contrat Standard" status={status} readOnly onBack={vi.fn()}
          refunds={[{ type: 'EARLY', status: 'APPROVED' }]}
        >
          <button>Remboursements</button>
        </CaisseContractHeader>,
      )

      expect(screen.getByText('Retrait anticipé · remise en attente')).toBeInTheDocument()
      expect(screen.getByText(/La remise d’argent reste à confirmer/)).toBeInTheDocument()
      expect(screen.queryByText(/Contrat fermé|^Clos$|^Résilié$/)).not.toBeInTheDocument()
    },
  )

  it.each([['CLOSED', 'Clos'], ['FINISHED', 'Terminé']])(
    'conserve le statut %s lorsque la remise est payée',
    (status, label) => {
      render(
        <CaisseContractHeader
          contractLabel="Contrat de caisse" status={status} readOnly onBack={vi.fn()}
          refunds={[{ type: 'EARLY', status: 'PAID' }]}
        >
          <button>Remboursements</button>
        </CaisseContractHeader>,
      )

      expect(screen.getByText(label)).toBeInTheDocument()
      expect(screen.queryByText(/remise en attente/)).not.toBeInTheDocument()
    },
  )

  it('distingue une demande de retrait à examiner d’une remise à confirmer', () => {
    render(
      <CaisseContractHeader
        contractLabel="Contrat Standard" status="EARLY_WITHDRAW_REQUESTED" readOnly onBack={vi.fn()}
        refunds={[{ type: 'EARLY', status: 'PENDING' }]}
      >
        <button>Remboursements</button>
      </CaisseContractHeader>,
    )

    expect(screen.getByText('Retrait anticipé demandé')).toBeInTheDocument()
    expect(screen.getByText(/La demande de retrait reste à examiner/)).toBeInTheDocument()
    expect(screen.queryByText(/La remise d’argent reste à confirmer/)).not.toBeInTheDocument()
  })

  it('présente le remboursement final en attente sur un ancien contrat déjà terminé', () => {
    render(
      <CaisseContractHeader
        contractLabel="Contrat Mensuel CI" status="FINISHED" readOnly onBack={vi.fn()}
        refunds={[{ type: 'FINAL', status: 'APPROVED' }, { type: 'EARLY', status: 'ARCHIVED' }]}
      >
        <button>Remboursements</button>
      </CaisseContractHeader>,
    )

    expect(screen.getByText('Remboursement final en attente')).toBeInTheDocument()
    expect(screen.queryByText('Terminé')).not.toBeInTheDocument()
  })
})
