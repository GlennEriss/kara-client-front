import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EarlyRefundHandover } from '../EarlyRefundHandover'

const access = vi.hoisted(() => ({ isSuperAdmin: true, isLoading: false }))
const modal = vi.hoisted(() => vi.fn())

vi.mock('@/hooks/useMyAccess', () => ({ useMyAccess: () => access }))
vi.mock('../FinalizeRefundHandoverModal', () => ({
  FinalizeRefundHandoverModal: (props: Record<string, unknown>) => {
    modal(props)
    return <div role="dialog" aria-label="Confirmation de remise" />
  },
}))

const refund = {
  id: 'refund-300k', type: 'EARLY', status: 'APPROVED', amountNominal: 300_000,
  approvedAt: new Date('2026-11-03T12:00:00Z'),
  payoutDueAt: new Date('2026-12-03T12:00:00Z'),
}

describe('finalisation d’un retrait anticipé dans les détails du contrat', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-03T12:00:00Z'))
    Object.assign(access, { isSuperAdmin: true, isLoading: false })
    modal.mockClear()
  })
  afterEach(() => vi.useRealTimers())

  it.each(['CS', 'CI'] as const)('permet au superadmin de finaliser en %s dès l’approbation, avec 30 jours restants', (fund) => {
    render(<EarlyRefundHandover fund={fund} contractId="contract-test" refund={refund} userId="superadmin-test" onSuccess={vi.fn()} />)

    expect(screen.getByText('30 jours restants')).toBeInTheDocument()
    const button = screen.getByRole('button', { name: 'Finaliser la remise' })
    expect(button).toBeEnabled()
    fireEvent.click(button)
    expect(screen.getByRole('dialog', { name: 'Confirmation de remise' })).toBeInTheDocument()
    expect(modal.mock.calls[0][0]).toMatchObject({
      fund, contractId: 'contract-test', refundId: refund.id, refundType: 'EARLY',
      approvedAt: refund.approvedAt, payoutDueAt: refund.payoutDueAt, userId: 'superadmin-test',
    })
  })

  it('garde le bouton visible mais désactivé pour un autre admin avant l’échéance', () => {
    access.isSuperAdmin = false
    render(<EarlyRefundHandover fund="CS" contractId="contract-test" refund={refund} userId="admin-test" onSuccess={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Finaliser la remise' })).toBeDisabled()
    expect(screen.getByText(/seul un superadmin peut confirmer/)).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('active le bouton pour un autre admin dès la fin du délai', () => {
    access.isSuperAdmin = false
    vi.setSystemTime(new Date('2026-12-03T12:00:00Z'))
    render(<EarlyRefundHandover fund="CS" contractId="contract-test" refund={refund} userId="admin-test" onSuccess={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Finaliser la remise' })).toBeEnabled()
  })

  it.each(['PENDING', 'PAID', 'ARCHIVED'])('ne propose pas de nouvelle remise au statut %s', (status) => {
    render(<EarlyRefundHandover fund="CS" contractId="contract-test" refund={{ ...refund, status }} userId="superadmin-test" onSuccess={vi.fn()} />)

    expect(screen.queryByRole('button', { name: 'Finaliser la remise' })).not.toBeInTheDocument()
  })

  it('attend la résolution des droits avant de permettre la confirmation', () => {
    access.isLoading = true
    render(<EarlyRefundHandover fund="CS" contractId="contract-test" refund={refund} userId="superadmin-test" onSuccess={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Finaliser la remise' })).toBeDisabled()
  })
})
