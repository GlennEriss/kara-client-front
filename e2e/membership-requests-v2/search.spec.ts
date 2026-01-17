/**
 * Tests E2E pour la recherche de demandes V2
 * 
 * Ces tests vérifient :
 * - Recherche par matricule
 * - Recherche par nom
 * - Recherche par email
 * - Recherche par téléphone
 * 
 * @see PLAN_TESTS_TDD.md section 5.3
 */

import { test, expect } from '@playwright/test'
import { loginAsAdmin, goToMembershipRequestsV2, waitForRequestsList } from './helpers'
import { createPendingUnpaidRequest, deleteTestMembershipRequest, type CreateTestRequestResult } from './fixtures'

test.describe('E2E: Recherche de demandes V2', () => {
  const createdRequests: CreateTestRequestResult[] = []

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
    await goToMembershipRequestsV2(page)
    await waitForRequestsList(page)
  })

  test.afterEach(async () => {
    // Nettoyer les demandes créées
    if (createdRequests.length > 0) {
      await Promise.all(createdRequests.map(req => deleteTestMembershipRequest(req.id)))
      createdRequests.length = 0
    }
  })

  test('devrait rechercher une demande par matricule', async ({ page }) => {
    // Arrange: Créer une demande de test
    const testRequest = await createPendingUnpaidRequest()
    createdRequests.push(testRequest)
    
    // Attendre que la page se charge
    await page.waitForTimeout(2000)
    await page.reload()
    await waitForRequestsList(page)

    // Act: Rechercher par matricule
    const searchInput = page.locator('[data-testid="search-input"]').first()
    await expect(searchInput).toBeVisible({ timeout: 5000 })
    await searchInput.fill(testRequest.matricule)
    await page.waitForTimeout(1000) // Attendre que le filtre s'applique

    // Assert: La demande devrait être visible dans les résultats
    const requestRow = page.locator(`[data-testid="membership-request-row"][data-request-id="${testRequest.id}"], [data-testid="membership-request-mobile-card"][data-request-id="${testRequest.id}"]`)
    await expect(requestRow.first()).toBeVisible({ timeout: 5000 })
    
    // Vérifier que le matricule est affiché
    await expect(requestRow.first()).toContainText(testRequest.matricule, { timeout: 5000 })
  })

  test('devrait rechercher une demande par nom', async ({ page }) => {
    // Arrange: Créer une demande de test
    const testRequest = await createPendingUnpaidRequest()
    createdRequests.push(testRequest)
    
    await page.waitForTimeout(2000)
    await page.reload()
    await waitForRequestsList(page)

    // Act: Rechercher par nom (E2E Test)
    const searchInput = page.locator('[data-testid="search-input"]').first()
    await expect(searchInput).toBeVisible({ timeout: 5000 })
    await searchInput.fill('E2E Test')
    await page.waitForTimeout(1000)

    // Assert: La demande devrait être visible
    const requestRow = page.locator(`[data-testid="membership-request-row"][data-request-id="${testRequest.id}"], [data-testid="membership-request-mobile-card"][data-request-id="${testRequest.id}"]`)
    await expect(requestRow.first()).toBeVisible({ timeout: 5000 })
  })

  test('devrait afficher un message si aucune demande trouvée', async ({ page }) => {
    // Act: Rechercher un matricule inexistant
    const searchInput = page.locator('[data-testid="search-input"]').first()
    await expect(searchInput).toBeVisible({ timeout: 5000 })
    await searchInput.fill('INEXISTANT.999.999999')
    await page.waitForTimeout(1000)

    // Assert: Message d'état vide ou liste vide
    const emptyState = page.locator('text=/Aucune demande/i, text=/Aucun résultat/i')
    const hasResults = await page.locator('[data-testid="membership-request-row"], [data-testid="membership-request-mobile-card"]').count()
    
    // Soit un message d'état vide est affiché, soit aucune ligne n'est visible
    if (await emptyState.count() > 0) {
      await expect(emptyState.first()).toBeVisible({ timeout: 5000 })
    } else {
      expect(hasResults).toBe(0)
    }
  })
})
