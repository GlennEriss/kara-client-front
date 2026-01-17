/**
 * Helpers partagés pour les tests E2E du module Membership Requests V2
 * 
 * Ces helpers fournissent des fonctions utilitaires pour :
 * - Authentification admin
 * - Navigation vers la page V2
 * - Sélecteurs communs
 * - Attentes personnalisées
 */

import { Page, expect } from '@playwright/test'

// Identifiants de test
export const TEST_CREDENTIALS = {
  matricule: process.env.E2E_AUTH_MATRICULE || '0001.MK.110126',
  email: process.env.E2E_AUTH_EMAIL || 'glenneriss@gmail.com',
  password: process.env.E2E_AUTH_PASSWORD || '0001.MK.110126',
}

/**
 * Authentifie l'utilisateur admin
 */
export async function loginAsAdmin(page: Page) {
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto('/login')
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(1000)

  // Trouver et remplir le formulaire visible
  const form = page.locator('form').filter({ has: page.locator(':visible') }).last()
  
  // Remplir les champs
  const matriculeInput = form.locator('input[type="text"], input[name*="matricule" i], input[placeholder*="matricule" i]').first()
  const emailInput = form.locator('input[type="email"], input[name*="email" i]').first()
  const passwordInput = form.locator('input[type="password"], input[name*="password" i]').first()
  
  await matriculeInput.fill(TEST_CREDENTIALS.matricule)
  await emailInput.fill(TEST_CREDENTIALS.email)
  await passwordInput.fill(TEST_CREDENTIALS.password)
  
  // Soumettre le formulaire
  const submitButton = form.locator('button[type="submit"]').first()
  await submitButton.click({ force: true })
  
  // Attendre la redirection
  await page.waitForURL(/\/(dashboard|geographie|membres|membership-requests)/, { timeout: 15000 })
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(2000)
}

/**
 * Navigue vers la page Membership Requests V2
 */
export async function goToMembershipRequestsV2(page: Page) {
  await page.goto('/membership-requests')
  await page.waitForLoadState('domcontentloaded')
  
  // Attendre que la page soit chargée en vérifiant la présence d'éléments clés
  // plutôt que d'attendre networkidle (qui peut ne jamais se produire avec React Query)
  try {
    // Attendre soit le titre, soit la barre de recherche, soit les tabs
    await page.waitForSelector(
      'h1, h2, [data-testid="search-input"], [data-testid="filter-tabs"], [role="tablist"]',
      { timeout: 10000 }
    )
  } catch (error) {
    // Si aucun élément n'est trouvé, attendre au moins que le DOM soit chargé
    await page.waitForLoadState('domcontentloaded')
  }
  
  // Attendre un peu pour que React Query initialise les requêtes
  await page.waitForTimeout(2000)
}

/**
 * Attend que la liste des demandes soit chargée
 */
export async function waitForRequestsList(page: Page) {
  // Attendre que le chargement soit terminé en vérifiant :
  // 1. Soit une ligne/card de demande est visible
  // 2. Soit l'état vide est affiché
  // 3. Soit un skeleton de chargement disparaît
  
  // D'abord, attendre que les skeletons de chargement disparaissent (si présents)
  try {
    await page.waitForSelector('[data-testid="skeleton"], .skeleton', { state: 'hidden', timeout: 5000 })
  } catch {
    // Pas de skeleton, continuer
  }
  
  // Ensuite, attendre soit une ligne/card, soit l'état vide, soit la table
  await Promise.race([
    page.waitForSelector('[data-testid="membership-request-row"]', { timeout: 10000 }).catch(() => null),
    page.waitForSelector('[data-testid="membership-request-mobile-card"]', { timeout: 10000 }).catch(() => null),
    page.waitForSelector('text=/Aucune demande/i', { timeout: 10000 }).catch(() => null),
    page.waitForSelector('table', { timeout: 10000 }).catch(() => null),
  ])
  
  // Attendre un peu pour que React finisse de rendre
  await page.waitForTimeout(500)
}

/**
 * Récupère la première ligne/card de demande
 */
export async function getFirstRequestRow(page: Page) {
  // Essayer d'abord la table (desktop)
  const tableRow = page.locator('[data-testid="membership-request-row"]').first()
  if ((await tableRow.count()) > 0) {
    return tableRow
  }
  // Sinon, utiliser la card mobile
  return page.locator('[data-testid="membership-request-mobile-card"]').first()
}

/**
 * Récupère une ligne/card de demande par ID
 */
export async function getRequestRow(page: Page, requestId: string) {
  // Essayer d'abord la table (desktop)
  const tableRow = page.locator(`[data-testid="membership-request-row"][data-request-id="${requestId}"]`)
  if ((await tableRow.count()) > 0) {
    return tableRow
  }
  // Sinon, utiliser la card mobile
  return page.locator(`[data-testid="membership-request-mobile-card"][data-request-id="${requestId}"]`)
}

/**
 * Attend qu'un toast de succès soit affiché
 */
export async function waitForSuccessToast(page: Page, message?: string | RegExp) {
  const toast = page.locator('[data-testid="toast-success"], [role="status"]:has-text("succès"), .sonner-toast:has-text("succès")')
  await expect(toast.first()).toBeVisible({ timeout: 10000 })
  if (message) {
    await expect(toast.first()).toContainText(message, { timeout: 5000 })
  }
}

/**
 * Attend qu'un toast d'erreur soit affiché
 */
export async function waitForErrorToast(page: Page, message?: string | RegExp) {
  const toast = page.locator('[data-testid="toast-error"], [role="alert"]:has-text("erreur"), .sonner-toast:has-text("erreur")')
  await expect(toast.first()).toBeVisible({ timeout: 10000 })
  if (message) {
    await expect(toast.first()).toContainText(message, { timeout: 5000 })
  }
}

/**
 * Attend qu'un modal soit ouvert
 */
export async function waitForModal(page: Page, modalTestId: string) {
  await expect(page.locator(`[data-testid="${modalTestId}"]`)).toBeVisible({ timeout: 5000 })
}

/**
 * Ferme un modal
 */
export async function closeModal(page: Page) {
  // Chercher le bouton de fermeture (X) ou le backdrop
  const closeButton = page.locator('[data-testid="modal-close"], button:has-text("Fermer"), [aria-label="Close"]').first()
  if (await closeButton.count() > 0) {
    await closeButton.click()
  } else {
    // Appuyer sur Escape
    await page.keyboard.press('Escape')
  }
  await page.waitForTimeout(500)
}
