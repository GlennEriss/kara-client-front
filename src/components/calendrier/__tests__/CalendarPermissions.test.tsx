import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CalendarContractLink } from '../CalendarContractLink'
import { PaymentSidebarActions } from '../PaymentSidebarActions'
import { PermissionsEditor } from '@/components/admin/PermissionsEditor'
import type { CalendarPaymentItem } from '@/hooks/useCalendarCaisseSpeciale'

const access = vi.hoisted(() => ({
  permissions: new Set<string>(),
  canRecordPayments: false,
  isLoading: false,
}))
vi.mock('@/hooks/useMyAccess', () => ({
  useMyAccess: () => ({
    ...access,
    canSeeAmounts: true,
    can: (key: string) => access.permissions.has(key),
  }),
}))

const duePayment = { status: 'DUE', amount: 100_000 } as CalendarPaymentItem

describe('permissions des actions du calendrier', () => {
  beforeEach(() => {
    access.permissions = new Set(['calendar.view'])
    access.canRecordPayments = false
    access.isLoading = false
  })

  it('n’affiche aucun lien de contrat avec la consultation seule', () => {
    render(<CalendarContractLink product="Caisse Spéciale" contractId="contract-42" />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('affiche un lien vers le dossier exact avec les autorisations du calendrier et de la caisse', () => {
    access.permissions.add('calendar.contracts').add('caisseSpeciale.view')
    render(<CalendarContractLink product="Caisse Spéciale" contractId="contract-42" />)
    expect(screen.getByRole('link', { name: 'Ouvrir le contrat' })).toHaveAttribute('href', '/caisse-speciale/contrats/contract-42')
  })

  it('masque les liens pendant le chargement des droits', () => {
    access.permissions.add('calendar.contracts').add('caisseSpeciale.view')
    access.isLoading = true
    render(<CalendarContractLink product="Caisse Spéciale" contractId="contract-42" />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('ne propose pas de paiement avec le seul droit d’ouvrir les contrats', () => {
    access.permissions.add('calendar.contracts').add('caisseSpeciale.view')
    render(<PaymentSidebarActions payment={duePayment} onRecordPayment={vi.fn()} onViewReceipt={vi.fn()} onDownloadReceipt={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /Faire un versement/ })).not.toBeInTheDocument()
  })

  it('ouvre le formulaire de versement quand le droit d’encaisser est accordé', () => {
    access.canRecordPayments = true
    const onRecordPayment = vi.fn()
    render(<PaymentSidebarActions payment={duePayment} onRecordPayment={onRecordPayment} onViewReceipt={vi.fn()} onDownloadReceipt={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /Faire un versement/ }))
    expect(onRecordPayment).toHaveBeenCalledOnce()
  })

  it('permet d’accorder les liens sans accorder l’encaissement dans la fiche admin', () => {
    const onChange = vi.fn()
    render(<PermissionsEditor value={['calendar.view']} onChange={onChange} />)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Ouvrir les contrats depuis le calendrier' }))
    expect(onChange).toHaveBeenCalledWith(['calendar.view', 'calendar.contracts'])
  })
})
