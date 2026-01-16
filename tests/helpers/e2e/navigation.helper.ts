/**
 * Helper pour la navigation dans les tests E2E
 */
import { type Page, expect } from '@playwright/test'

/**
 * Routes de l'application
 */
export const ROUTES = {
  // Public
  home: '/',
  login: '/login',
  register: '/register',
  
  // Admin
  dashboard: '/dashboard',
  geographie: '/geographie',
  membres: '/membres',
  caisseSpeciale: '/caisse-speciale',
  caisseImprevue: '/caisse-imprevue',
  creditSpeciale: '/credit-speciale',
  placements: '/placements',
  bienfaiteur: '/bienfaiteur',
  vehicules: '/vehicules',
}

/**
 * Naviguer vers une route et attendre le chargement
 */
export async function navigateTo(page: Page, route: string): Promise<void> {
  await page.goto(route)
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(500)
}

/**
 * Naviguer via le menu latéral
 */
export async function navigateViaMenu(page: Page, menuText: string): Promise<void> {
  await page.click(`nav >> text=${menuText}`)
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(500)
}

/**
 * Vérifier que la page actuelle correspond à une route
 */
export async function expectCurrentRoute(page: Page, route: string): Promise<void> {
  await expect(page).toHaveURL(new RegExp(route))
}

/**
 * Attendre qu'un élément soit visible
 */
export async function waitForElement(
  page: Page,
  selector: string,
  timeout = 10000
): Promise<void> {
  await page.waitForSelector(selector, { state: 'visible', timeout })
}

/**
 * Vérifier que le titre de la page contient un texte
 */
export async function expectPageTitle(page: Page, title: string): Promise<void> {
  await expect(page.locator('h1, h2').first()).toContainText(title)
}

/**
 * Cliquer sur un onglet
 */
export async function clickTab(page: Page, tabText: string): Promise<void> {
  await page.click(`[role="tab"]:has-text("${tabText}"), button:has-text("${tabText}")`)
  await page.waitForTimeout(300)
}

/**
 * Ouvrir un modal de création
 */
export async function openCreateModal(page: Page, buttonText = 'Nouveau'): Promise<void> {
  await page.click(`button:has-text("${buttonText}")`)
  await page.waitForSelector('[role="dialog"]', { state: 'visible' })
}

/**
 * Fermer un modal
 */
export async function closeModal(page: Page): Promise<void> {
  // Essayer plusieurs méthodes pour fermer
  const closeButton = page.locator('[data-testid="modal-close"], button:has-text("Annuler"), [aria-label="Close"]')
  if (await closeButton.isVisible()) {
    await closeButton.click()
  } else {
    // Appuyer sur Escape
    await page.keyboard.press('Escape')
  }
  await page.waitForSelector('[role="dialog"]', { state: 'hidden' })
}

/**
 * Remplir un formulaire
 */
export async function fillForm(
  page: Page,
  fields: Record<string, string>
): Promise<void> {
  for (const [name, value] of Object.entries(fields)) {
    const selector = `[name="${name}"], [data-testid="${name}-input"], input[placeholder*="${name}" i]`
    await page.fill(selector, value)
  }
}

/**
 * Soumettre un formulaire
 */
export async function submitForm(page: Page): Promise<void> {
  await page.click('button[type="submit"]')
}

export default {
  ROUTES,
  navigateTo,
  navigateViaMenu,
  expectCurrentRoute,
  waitForElement,
  expectPageTitle,
  clickTab,
  openCreateModal,
  closeModal,
  fillForm,
  submitForm,
}
