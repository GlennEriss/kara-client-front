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
 * Attend qu'une demande apparaisse dans la liste (par ID ou matricule)
 */
export async function waitForRequestInList(page: Page, requestId: string, matricule: string, maxAttempts: number = 10) {
  // Essayer d'abord avec la recherche par matricule (plus fiable)
  const searchInput = page.locator('[data-testid="search-input"]').first()
  if (await searchInput.count() > 0) {
    await searchInput.clear()
    await page.waitForTimeout(300)
    await searchInput.fill(matricule)
    await page.waitForTimeout(2000) // Attendre que le filtre s'applique
  }
  
  for (let i = 0; i < maxAttempts; i++) {
    // Essayer de trouver par ID
    const byId = await getRequestRow(page, requestId)
    if (await byId.count() > 0 && await byId.first().isVisible().catch(() => false)) {
      return byId
    }
    
    // Essayer de trouver par matricule dans le texte
    const byMatricule = page.locator(`text=${matricule}`).first()
    if (await byMatricule.count() > 0) {
      // Essayer de trouver la ligne/card parente qui contient le matricule
      const parentRow = byMatricule.locator('xpath=ancestor::tr[contains(@data-testid, "membership-request")] | ancestor::div[contains(@data-testid, "membership-request")]').first()
      if (await parentRow.count() > 0 && await parentRow.isVisible().catch(() => false)) {
        return parentRow
      }
    }
    
    // Attendre un peu avant de réessayer
    await page.waitForTimeout(1000)
    
    // Recharger la liste si nécessaire (invalider React Query)
    if (i === 3 || i === 6) {
      await page.reload()
      await page.waitForLoadState('domcontentloaded')
      await waitForRequestsList(page)
      await page.waitForTimeout(2000)
      
      // Réappliquer la recherche
      if (await searchInput.count() > 0) {
        await searchInput.clear()
        await page.waitForTimeout(300)
        await searchInput.fill(matricule)
        await page.waitForTimeout(2000)
      }
    }
  }
  
  // Si on n'a pas trouvé, retourner quand même le locator pour avoir une erreur claire
  return getRequestRow(page, requestId)
}

/**
 * Attend qu'un toast de succès soit affiché
 */
export async function waitForSuccessToast(
  page: Page,
  message?: string | RegExp,
  options?: { timeout?: number }
) {
  const timeout = options?.timeout ?? 10000
  
  // Sonner utilise plusieurs sélecteurs possibles
  const toastSelectors = [
    '[data-sonner-toast]',
    '.sonner-toast',
    '[data-testid="toast-success"]',
    '[role="status"]',
    'div:has-text("succès")',
    'div:has-text("enregistré")',
    'div:has-text("payé")',
  ]
  
  // Essayer chaque sélecteur
  let toast = null
  for (const selector of toastSelectors) {
    toast = page.locator(selector).first()
    try {
      await expect(toast).toBeVisible({ timeout: 2000 })
      break
    } catch {
      continue
    }
  }
  
  // Si aucun toast n'a été trouvé avec les sélecteurs spécifiques, chercher n'importe quel toast visible
  if (!toast || (await toast.count()) === 0) {
    toast = page.locator('[data-sonner-toast], .sonner-toast, [role="status"], [role="alert"]').first()
  }
  
  await expect(toast.first()).toBeVisible({ timeout })
  
  if (message) {
    // Chercher le message dans le toast ou dans un élément enfant
    const messageLocator = toast.locator(`text=${message}`).first()
    if (await messageLocator.count() > 0) {
      await expect(messageLocator).toBeVisible({ timeout: 5000 })
    } else {
      // Fallback: vérifier que le toast contient le texte
      await expect(toast.first()).toContainText(message, { timeout: 5000 })
    }
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

/**
 * Clique sur un onglet de filtre par son texte
 */
export async function clickFilterTab(page: Page, tabText: string) {
  // Chercher l'onglet par son texte (peut être dans TabsTrigger ou Select)
  // Les onglets peuvent être des boutons avec le texte, ou des éléments avec role="tab"
  const tabSelectors = [
    `button:has-text("${tabText}")`,
    `[role="tab"]:has-text("${tabText}")`,
    `[role="tablist"] button:has-text("${tabText}")`,
    `button[value*="${tabText.toLowerCase()}"]`,
  ]
  
  let tab = null
  for (const selector of tabSelectors) {
    tab = page.locator(selector).first()
    if (await tab.count() > 0 && await tab.isVisible().catch(() => false)) {
      break
    }
  }
  
  if (tab && await tab.count() > 0) {
    await tab.click({ force: true })
    await page.waitForTimeout(2000) // Attendre que les données se chargent
    await waitForRequestsList(page)
    return true
  }
  
  // Si l'onglet n'est pas trouvé, essayer de chercher dans un Select (mobile)
  const selectTrigger = page.locator('[role="combobox"], button[aria-haspopup="listbox"]').first()
  if (await selectTrigger.count() > 0) {
    await selectTrigger.click()
    await page.waitForTimeout(500)
    const option = page.locator(`[role="option"]:has-text("${tabText}")`).first()
    if (await option.count() > 0) {
      await option.click()
      await page.waitForTimeout(2000)
      await waitForRequestsList(page)
      return true
    }
  }
  
  return false
}
