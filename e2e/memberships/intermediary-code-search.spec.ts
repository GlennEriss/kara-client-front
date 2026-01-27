/**
 * Tests E2E pour la recherche du code entremetteur avec autocomplétion
 * 
 * Ces tests vérifient :
 * - Recherche par nom/prénom
 * - Sélection d'un membre dans les résultats
 * - Validation du code entremetteur
 * - Cache React Query
 * 
 * @see documentation/memberships/V2/form-membership/code-entremetteur/tests/README.md
 */

import { test, expect } from '@playwright/test'

test.describe('E2E: Recherche Code Entremetteur', () => {
  test.beforeEach(async ({ page }) => {
    // Aller sur la page d'ajout de membre
    await page.goto('/memberships/add', { waitUntil: 'networkidle' })
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000) // Attendre le chargement du formulaire
  })

  test('E2E-ICS-01: Recherche et sélection de "NDONG Jean-Pierre"', async ({ page }) => {
    // Vérifier que le composant est visible
    const container = page.getByTestId('intermediary-code-search-container')
    await expect(container).toBeVisible({ timeout: 5000 })

    // Vérifier le hint initial
    const hint = page.getByTestId('intermediary-code-search-hint')
    await expect(hint).toBeVisible()
    await expect(hint).toContainText('Tapez au moins 2 caractères')

    // Cliquer sur le champ de recherche
    const input = page.getByTestId('intermediary-code-search-input')
    await expect(input).toBeVisible()
    
    // Ouvrir le popover en cliquant sur le bouton
    const trigger = page.locator('button[role="combobox"]').filter({ has: input })
    await trigger.click()
    await page.waitForTimeout(500)

    // Taper "NDONG" pour rechercher
    const commandInput = page.locator('input[placeholder*="Rechercher par nom"]')
    await expect(commandInput).toBeVisible({ timeout: 3000 })
    await commandInput.fill('NDONG')
    await page.waitForTimeout(500) // Attendre le debounce

    // Attendre que les résultats apparaissent (ou le loading disparaisse)
    const loading = page.getByTestId('intermediary-code-search-loading')
    const results = page.getByTestId('intermediary-code-search-results')
    
    // Soit on voit le loading, soit les résultats sont déjà là
    const loadingVisible = await loading.isVisible().catch(() => false)
    if (loadingVisible) {
      await expect(loading).not.toBeVisible({ timeout: 10000 })
    }

    // Attendre les résultats
    await expect(results).toBeVisible({ timeout: 10000 })

    // Rechercher l'option "NDONG Jean-Pierre"
    // Le data-testid sera au format: intermediary-code-search-option-{code}
    // On cherche par le texte affiché
    const option = page.locator('[data-testid^="intermediary-code-search-option-"]')
      .filter({ hasText: /NDONG.*Jean.*Pierre/i })
      .first()

    await expect(option).toBeVisible({ timeout: 5000 })
    
    // Cliquer sur l'option
    await option.click()
    await page.waitForTimeout(500)

    // Vérifier que le champ est rempli avec le code
    const filledInput = page.locator('button[role="combobox"]').filter({ hasText: /\.MK\./ })
    await expect(filledInput).toBeVisible({ timeout: 3000 })

    // Vérifier l'icône de validation
    const checkIcon = page.getByTestId('intermediary-code-search-check-icon')
    await expect(checkIcon).toBeVisible({ timeout: 3000 })

    // Vérifier le message de validation
    const validated = page.getByTestId('intermediary-code-search-validated')
    await expect(validated).toBeVisible({ timeout: 3000 })
    await expect(validated).toContainText('Format valide')

    // Vérifier que le bouton "Suivant" n'est pas désactivé
    const nextButton = page.getByRole('button', { name: /suivant/i })
    await expect(nextButton).not.toBeDisabled()
  })

  test('E2E-ICS-02: Recherche avec moins de 2 caractères', async ({ page }) => {
    const container = page.getByTestId('intermediary-code-search-container')
    await expect(container).toBeVisible()

    // Ouvrir le popover
    const trigger = page.locator('button[role="combobox"]')
    await trigger.click()
    await page.waitForTimeout(500)

    // Taper seulement "N"
    const commandInput = page.locator('input[placeholder*="Rechercher par nom"]')
    await commandInput.fill('N')
    await page.waitForTimeout(800) // Attendre le debounce

    // Vérifier qu'aucun résultat n'apparaît
    const results = page.getByTestId('intermediary-code-search-results')
    const emptyMessage = results.locator('text=Tapez au moins 2 caractères')
    await expect(emptyMessage).toBeVisible({ timeout: 3000 })
  })

  test('E2E-ICS-03: Effacement de la sélection', async ({ page }) => {
    // D'abord sélectionner un membre (réutiliser le test précédent)
    const container = page.getByTestId('intermediary-code-search-container')
    await expect(container).toBeVisible()

    const trigger = page.locator('button[role="combobox"]')
    await trigger.click()
    await page.waitForTimeout(500)

    const commandInput = page.locator('input[placeholder*="Rechercher par nom"]')
    await commandInput.fill('NDONG')
    await page.waitForTimeout(1000)

    const results = page.getByTestId('intermediary-code-search-results')
    await expect(results).toBeVisible({ timeout: 10000 })

    const option = page.locator('[data-testid^="intermediary-code-search-option-"]')
      .filter({ hasText: /NDONG.*Jean.*Pierre/i })
      .first()

    await option.click()
    await page.waitForTimeout(500)

    // Vérifier que le champ est rempli
    const checkIcon = page.getByTestId('intermediary-code-search-check-icon')
    await expect(checkIcon).toBeVisible({ timeout: 3000 })

    // Cliquer sur le bouton clear
    const clearButton = page.getByTestId('intermediary-code-search-clear')
    await expect(clearButton).toBeVisible({ timeout: 3000 })
    await clearButton.click()
    await page.waitForTimeout(500)

    // Vérifier que le champ est vide
    const hint = page.getByTestId('intermediary-code-search-hint')
    await expect(hint).toBeVisible()
  })

  test('E2E-ICS-04: Cache React Query - Recherche répétée', async ({ page }) => {
    const container = page.getByTestId('intermediary-code-search-container')
    await expect(container).toBeVisible()

    // Première recherche
    const trigger = page.locator('button[role="combobox"]')
    await trigger.click()
    await page.waitForTimeout(500)

    const commandInput = page.locator('input[placeholder*="Rechercher par nom"]')
    await commandInput.fill('NDONG')
    await page.waitForTimeout(1000)

    const results1 = page.getByTestId('intermediary-code-search-results')
    await expect(results1).toBeVisible({ timeout: 10000 })

    // Fermer le popover
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)

    // Effacer et rechercher à nouveau
    await trigger.click()
    await page.waitForTimeout(500)
    
    const commandInput2 = page.locator('input[placeholder*="Rechercher par nom"]')
    await commandInput2.fill('')
    await page.waitForTimeout(300)
    await commandInput2.fill('NDONG')
    await page.waitForTimeout(500) // Moins de temps car le cache devrait être utilisé

    // Les résultats devraient apparaître plus rapidement (cache)
    const results2 = page.getByTestId('intermediary-code-search-results')
    await expect(results2).toBeVisible({ timeout: 5000 })
  })
})
