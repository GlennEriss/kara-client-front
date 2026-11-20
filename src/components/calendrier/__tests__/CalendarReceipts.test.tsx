import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PaymentSidebar } from '../PaymentSidebar'
import { PaymentSidebarCI } from '../PaymentSidebarCI'
import type { CalendarPaymentItem } from '@/hooks/useCalendarCaisseSpeciale'
import type { CalendarPaymentItemCI } from '@/hooks/useCalendarCaisseImprevue'

const mock = vi.hoisted(() => ({ csPdf: vi.fn(), ciPdf: vi.fn(), list: vi.fn(), member: vi.fn(), invoice: vi.fn(), ciInvoice: vi.fn() }))
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { uid: 'admin', displayName: 'Admin Test' } }) }))
vi.mock('@/hooks/useMyAccess', () => ({ useMyAccess: () => ({ canRecordPayments: true, canDownloadDocuments: true, canSeeAmounts: true }) }))
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: vi.fn() }) }))
vi.mock('@/db/user.db', () => ({ getUserById: mock.member }))
vi.mock('@/db/group.db', () => ({ getGroupById: vi.fn().mockResolvedValue(null) }))
vi.mock('@/db/caisse/payments.db', () => ({ listPayments: mock.list }))
vi.mock('@/services/caisse/mutations', () => ({ pay: vi.fn() }))
vi.mock('@/services/caisse/versementPdfExport', () => ({ generateSingleVersementPDF: mock.csPdf }))
vi.mock('@/services/caisse-imprevue/generateSingleVersementCIPDF', () => ({ generateSingleVersementCIPDF: mock.ciPdf }))
vi.mock('@/factories/ServiceFactory', () => ({ ServiceFactory: { getCaisseImprevueService: vi.fn() } }))
vi.mock('@/components/contract/PaymentCSModal', () => ({ default: () => null }))
vi.mock('@/components/caisse-imprevue/PaymentCIModal', () => ({ default: () => null }))
vi.mock('@/components/contract/standard/PaymentInvoiceModal', () => ({ default: (props: unknown) => { mock.invoice(props); return <div>Facture de versement</div> } }))
vi.mock('@/components/caisse-imprevue/PaymentReceiptCIModal', () => ({ default: (props: unknown) => { mock.ciInvoice(props); return <div>Reçu de versement CI</div> } }))
vi.mock('../PaymentSidebarHeader', () => ({ PaymentSidebarHeader: () => null }))
vi.mock('../PaymentSidebarContent', () => ({ PaymentSidebarContent: () => null }))
vi.mock('../PaymentSidebarHeaderCI', () => ({ PaymentSidebarHeaderCI: () => null }))
vi.mock('../PaymentSidebarContentCI', () => ({ PaymentSidebarContentCI: () => null }))
vi.mock('../CalendarContractLink', () => ({ CalendarContractLink: () => null }))
const cs = { id: 'P2', status: 'PAID', amount: 50_000, dueMonthIndex: 1,
  contract: { id: 'C1', memberId: 'M1', contractType: 'INDIVIDUAL' } } as CalendarPaymentItem
const ci = { id: 'CI-P1', status: 'PAID', targetAmount: 50_000, accumulatedAmount: 50_000, monthIndex: 0,
  dueDate: new Date('2026-11-17T12:00:00Z'), contract: { id: 'C2', memberId: 'M1', paymentFrequency: 'MONTHLY' } } as CalendarPaymentItemCI
beforeEach(() => {
  vi.clearAllMocks()
  mock.member.mockResolvedValue({ id: 'M1', firstName: 'Membre', lastName: 'Test' })
  mock.list.mockResolvedValue([{ id: 'P1' }, cs])
  mock.csPdf.mockResolvedValue(undefined)
  mock.ciPdf.mockResolvedValue(undefined)
})
describe('reçus du calendrier raccordés aux contrats', () => {
  it('exporte le reçu CS officiel avec son historique complet', async () => {
    render(<PaymentSidebar payment={cs} onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Télécharger le reçu PDF' }))
    await waitFor(() => expect(mock.csPdf).toHaveBeenCalled())
    expect(mock.csPdf.mock.calls[0][0]).toMatchObject({ contract: cs.contract, contractId: 'C1', payment: cs,
      payments: [{ id: 'P1' }, cs], member: { id: 'M1' } })
  })
  it('ouvre la facture CS existante au lieu d’un aperçu provisoire', async () => {
    render(<PaymentSidebar payment={cs} onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Voir le reçu' }))
    await screen.findByText('Facture de versement')
    expect(mock.invoice.mock.calls.at(-1)?.[0]).toMatchObject({ isOpen: true, payment: cs, allowDownload: true })
  })
  it('exporte le reçu CI officiel et ouvre le bon récapitulatif', async () => {
    render(<PaymentSidebarCI payment={ci} onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Télécharger le reçu PDF' }))
    await waitFor(() => expect(mock.ciPdf).toHaveBeenCalled())
    expect(mock.ciPdf.mock.calls[0]).toEqual([ci.contract, ci, expect.objectContaining({ contractId: 'C2', member: { id: 'M1', firstName: 'Membre', lastName: 'Test' } })])
    fireEvent.click(screen.getByRole('button', { name: 'Voir le reçu' }))
    await screen.findByText('Reçu de versement CI')
    expect(mock.ciInvoice.mock.calls.at(-1)?.[0]).toMatchObject({ isOpen: true, payment: ci, isMonthly: true })
  })
})
