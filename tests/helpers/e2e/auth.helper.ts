/**
 * Helper pour l'authentification dans les tests E2E
 */
import { type Page, type BrowserContext } from '@playwright/test'

// Credentials de test
export const TEST_CREDENTIALS = {
  admin: {
    matricule: '0001.MK.110126',
    email: 'glenneriss@gmail.com',
    password: '0001.MK.110126',
  },
}

/**
 * Authentifier un utilisateur pour les tests E2E
 */
export async function authenticateUser(
  page: Page,
  credentials = TEST_CREDENTIALS.admin
): Promise<void> {
  await page.goto('/login')
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(1000)
  
  // Remplir le formulaire
  await page.fill('[data-testid="matricule-input"], input[name="matricule"]', credentials.matricule)
  await page.fill('[data-testid="email-input"], input[name="email"]', credentials.email)
  await page.fill('[data-testid="password-input"], input[name="password"]', credentials.password)
  
  // Soumettre
  await page.click('[data-testid="submit-login"], button[type="submit"]')
  
  // Attendre la redirection
  await page.waitForURL(/\/(dashboard|geographie|membres)/, { timeout: 15000 })
  await page.waitForLoadState('domcontentloaded')
}

/**
 * Vérifier si l'utilisateur est authentifié
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  const url = page.url()
  return !url.includes('/login') && !url.includes('/register')
}

/**
 * Déconnecter l'utilisateur
 */
export async function logout(page: Page): Promise<void> {
  // Cliquer sur le menu utilisateur
  await page.click('[data-testid="user-menu"], [aria-label="Menu utilisateur"]')
  await page.click('[data-testid="logout-button"], text=Déconnexion')
  
  // Attendre la redirection vers login
  await page.waitForURL('**/login')
}

/**
 * Sauvegarder l'état d'authentification pour réutilisation
 */
export async function saveAuthState(
  context: BrowserContext,
  path: string
): Promise<void> {
  await context.storageState({ path })
}

/**
 * Charger un état d'authentification sauvegardé
 */
export async function loadAuthState(
  context: BrowserContext,
  path: string
): Promise<void> {
  // L'état est chargé lors de la création du contexte
  // via: browser.newContext({ storageState: path })
}

export default {
  TEST_CREDENTIALS,
  authenticateUser,
  isAuthenticated,
  logout,
  saveAuthState,
  loadAuthState,
}
