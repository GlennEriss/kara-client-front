import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useMyAccess } from '@/hooks/useMyAccess'

const account = vi.hoisted(() => ({ data: {} as Record<string, unknown>, authLoading: false, signedIn: true }))

vi.mock('@/domains/auth/hooks/useAuth', () => ({
  useAuth: () => ({
    user: account.signedIn ? { uid: 'admin-calendar-test', getIdTokenResult: async () => ({ claims: {} }) } : null,
    loading: account.authLoading,
  }),
}))
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDoc: async () => ({ id: 'admin-calendar-test', exists: () => true, data: () => account.data }),
  getDocs: async () => ({ docs: [] }),
}))

function renderAccess() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  return renderHook(() => useMyAccess(), {
    wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
  })
}

describe('accès au paiement depuis le calendrier', () => {
  beforeEach(() => {
    account.authLoading = false
    account.signedIn = true
    account.data = { roles: ['Admin'], permissionsVersion: 2, permissions: ['calendar.view'] }
  })

  it('reste en chargement tant que Firebase restaure la connexion, sans afficher un refus prématuré', async () => {
    account.authLoading = true
    account.signedIn = false
    const { result, rerender } = renderAccess()
    expect(result.current.isLoading).toBe(true)
    expect(result.current.can('calendar.view')).toBe(false)
    account.authLoading = false
    account.signedIn = true
    rerender()
    await waitFor(() => expect(result.current.can('calendar.view')).toBe(true))
    expect(result.current.isLoading).toBe(false)
  })

  it('attend les permissions et ne donne pas le paiement à la consultation seule', async () => {
    const { result } = renderAccess()
    expect(result.current.canRecordPayments).toBe(false)
    expect(result.current.can('calendar.contracts')).toBe(false)

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.can('calendar.view')).toBe(true)
    expect(result.current.canRecordPayments).toBe(false)
    expect(result.current.can('calendar.contracts')).toBe(false)
  })

  it('permet d’encaisser avec les deux autorisations, sans ouvrir les contrats', async () => {
    account.data.permissions = ['calendar.view', 'calendar.payment']
    const { result } = renderAccess()
    await waitFor(() => expect(result.current.canRecordPayments).toBe(true))
    expect(result.current.can('calendar.contracts')).toBe(false)
  })

  it('refuse le paiement sans accès au calendrier', async () => {
    account.data.permissions = ['calendar.payment']
    const { result } = renderAccess()
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.canRecordPayments).toBe(false)
  })

  it('n’accorde pas l’encaissement avec le droit d’ouvrir les contrats', async () => {
    account.data.permissions = ['calendar.view', 'calendar.contracts', 'caisseSpeciale.view']
    const { result } = renderAccess()
    await waitFor(() => expect(result.current.can('calendar.contracts')).toBe(true))
    expect(result.current.canRecordPayments).toBe(false)
  })

  it('conserve tous les accès du superadmin', async () => {
    account.data = { roles: ['SuperAdmin'], permissionsVersion: 2, permissions: [] }
    const { result } = renderAccess()
    await waitFor(() => expect(result.current.isSuperAdmin).toBe(true))
    expect(result.current.canRecordPayments).toBe(true)
    expect(result.current.can('calendar.contracts')).toBe(true)
  })
})
