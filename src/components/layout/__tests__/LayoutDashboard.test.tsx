import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { TOOLS_KEY } from '@/domains/mobile/browser/tools-protocol'
import LayoutDashboard from '../LayoutDashboard'

vi.mock('next/navigation', () => ({ usePathname: () => '/dashboard' }))
vi.mock('@/hooks/useMyAccess', () => ({ useMyAccess: () => ({ can: () => true }) }))
vi.mock('@/domains/dashboard/member-overview/components/MemberNavbarSearch', () => ({
  MemberNavbarSearch: () => <input aria-label="Rechercher un membre" />,
}))
vi.mock('@/domains/help/components/HelpButton', () => ({ HelpButton: () => <button>Aide</button> }))
vi.mock('../NotificationBell', () => ({ default: () => <button>Notifications</button> }))
vi.mock('../DashboardBreadcrumb', () => ({ DashboardBreadcrumb: () => null }))
vi.mock('../AppSidebar', async () => {
  const { Sidebar } = await import('@/components/ui/sidebar')
  return { AppSidebar: () => <Sidebar><a href="/calendrier">Calendrier</a></Sidebar> }
})

beforeEach(() => {
  vi.stubGlobal('matchMedia', vi.fn().mockImplementation(() => ({
    matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  })))
  vi.stubGlobal('ReactNativeWebView', undefined)
  sessionStorage.setItem(TOOLS_KEY, JSON.stringify({
    version: 1, sessionId: 'a'.repeat(48), uid: 'admin',
    capabilities: { amounts: true, documents: true, exports: true },
  }))
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  sessionStorage.clear()
})

it('conserve la barre et ouvre puis ferme le menu du web admin sur mobile', async () => {
  render(<LayoutDashboard>Contenu administratif</LayoutDashboard>)
  const trigger = screen.getByRole('button', { name: 'Menu d’administration' })
  expect(trigger).toHaveAttribute('aria-expanded', 'false')
  expect(screen.getByRole('button', { name: 'Notifications' })).toBeVisible()
  expect(screen.getByRole('textbox', { name: 'Rechercher un membre' })).toBeVisible()

  fireEvent.click(trigger)
  const drawer = await screen.findByRole('dialog', { name: 'Menu d’administration' })
  expect(drawer).toHaveTextContent('Calendrier')
  expect(trigger).toHaveAttribute('aria-expanded', 'true')
  fireEvent.click(screen.getByRole('button', { name: 'Fermer le menu' }))
  expect(trigger).toHaveAttribute('aria-expanded', 'false')
})

it('rend la vue intégrée uniquement avec le pont des outils natifs', () => {
  vi.stubGlobal('ReactNativeWebView', { postMessage: vi.fn() })
  render(<LayoutDashboard>Contenu administratif</LayoutDashboard>)
  expect(screen.getByText('Contenu administratif')).toBeVisible()
  expect(screen.queryByRole('button', { name: 'Menu d’administration' })).not.toBeInTheDocument()
})
