import { act, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CalendarView } from '../CalendarView'
import { getUserById } from '@/db/user.db'
import type { CalendarPaymentItem, DayPayments } from '@/hooks/useCalendarCaisseSpeciale'
import { calendarFocusKey, calendarPaymentHref } from '@/utils/calendar-payment-link'

vi.mock('@/hooks/useMyAccess', () => ({
  useMyAccess: () => ({ canSeeAmounts: true, canRecordPayments: true, can: () => true }),
}))
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { uid: 'admin-test' } }) }))
vi.mock('@/db/user.db', () => ({ getUserById: vi.fn() }))
vi.mock('@/db/group.db', () => ({ getGroupById: vi.fn() }))
vi.mock('@/services/caisse/mutations', () => ({ pay: vi.fn() }))
vi.mock('@/components/contract/PaymentCSModal', () => ({ default: () => null }))
vi.mock('../PaymentSidebarContent', () => ({ PaymentSidebarContent: () => null }))
vi.mock('../DayPaymentsModal', () => ({ DayPaymentsModal: () => null }))

const dueAt = new Date('2026-10-01T12:00:00')

function importedPayment(contractId: string, memberId: string, name: string): CalendarPaymentItem {
  return {
    // Cet identifiant est identique dans les sous-collections des deux contrats.
    id: 'MK_CS_P_MIG_0',
    dueMonthIndex: 0,
    dueAt,
    amount: 100_000,
    status: 'DUE',
    createdAt: dueAt,
    color: 'red',
    memberDisplayName: name,
    contract: {
      id: contractId,
      memberId,
      contractType: 'INDIVIDUAL',
      caisseType: 'STANDARD',
      monthlyAmount: 100_000,
      monthsPlanned: 12,
      currentMonthIndex: 0,
      nominalPaid: 0,
      bonusAccrued: 0,
      penaltiesTotal: 0,
      withdrawLockedUntilM: 0,
      settingsVersion: 'settings-test',
      createdAt: dueAt,
      status: 'ACTIVE',
    },
  }
}

const alpha = importedPayment('contract-ALPHA', 'member-A', 'Personne Alpha')
const beta = importedPayment('contract-BETA', 'member-B', 'Personne Beta')
const days: DayPayments[] = [{
  date: dueAt,
  payments: [alpha, beta],
  totalAmount: 200_000,
  paidAmount: 0,
  remainingAmount: 200_000,
  count: 2,
  statuses: ['DUE', 'DUE'],
  caisseTypes: ['STANDARD'],
  color: 'red',
}]

function focusFromLink(payment: CalendarPaymentItem): string {
  const href = calendarPaymentHref('Caisse Spéciale', payment.dueAt,
    calendarFocusKey.caisseSpeciale(payment.contract.id, payment.id))
  return new URL(href, 'https://kara.test').searchParams.get('focus')!
}

function calendar(focus: string, isLoading = false) {
  return <CalendarView month={dueAt} onMonthChange={vi.fn()} daysPayments={days}
    isLoading={isLoading} focusedPaymentKey={focus} />
}

function renderCalendar(focus: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(calendar(focus), {
    wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
  })
}

describe('ouverture du versement sélectionné dans le calendrier', () => {
  beforeEach(() => {
    vi.mocked(getUserById).mockReset()
    vi.mocked(getUserById).mockImplementation(async (id) => ({
      id,
      firstName: 'Personne',
      lastName: id === 'member-A' ? 'Alpha' : 'Beta',
    }) as Awaited<ReturnType<typeof getUserById>>)
  })

  it('ouvre le contrat et la personne du lien, malgré un ID de paiement identique', async () => {
    renderCalendar(focusFromLink(beta))

    expect(await screen.findByText('Personne Beta')).toBeInTheDocument()
    expect(screen.getByText('Contrat #act-BETA')).toBeInTheDocument()
    expect(screen.queryByText('Personne Alpha')).not.toBeInTheDocument()
    expect(getUserById).toHaveBeenCalledWith('member-B')
    expect(getUserById).not.toHaveBeenCalledWith('member-A')
  })

  it('retire le dossier précédent pendant le chargement du nouveau versement', async () => {
    const view = renderCalendar(focusFromLink(alpha))
    expect(await screen.findByText('Personne Alpha')).toBeInTheDocument()

    view.rerender(calendar(focusFromLink(beta), true))
    expect(screen.queryByText('Détails du versement')).not.toBeInTheDocument()

    view.rerender(calendar(focusFromLink(beta)))
    expect(await screen.findByText('Personne Beta')).toBeInTheDocument()
    expect(screen.queryByText('Personne Alpha')).not.toBeInTheDocument()
  })

  it('ignore une réponse tardive du membre précédemment sélectionné', async () => {
    let resolveAlpha!: (value: Awaited<ReturnType<typeof getUserById>>) => void
    vi.mocked(getUserById).mockImplementationOnce(() => new Promise((resolve) => { resolveAlpha = resolve }))
    const view = renderCalendar(focusFromLink(alpha))

    view.rerender(calendar(focusFromLink(beta)))
    expect(await screen.findByText('Personne Beta')).toBeInTheDocument()

    await act(async () => {
      resolveAlpha({ id: 'member-A', firstName: 'Ancienne', lastName: 'Personne Alpha' } as Awaited<ReturnType<typeof getUserById>>)
    })
    expect(screen.getByText('Personne Beta')).toBeInTheDocument()
    expect(screen.queryByText('Ancienne Personne Alpha')).not.toBeInTheDocument()
  })

  it('ne choisit aucun contrat pour un ancien lien ambigu sans identifiant de contrat', () => {
    renderCalendar('cs:MK_CS_P_MIG_0')

    expect(screen.queryByText('Détails du versement')).not.toBeInTheDocument()
    expect(getUserById).not.toHaveBeenCalled()
  })
})
