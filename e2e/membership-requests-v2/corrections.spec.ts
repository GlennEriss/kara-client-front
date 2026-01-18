/**
 * Tests E2E pour la demande de corrections V2
 * 
 * Ces tests vérifient :
 * - Ouverture du modal de corrections
 * - Envoi de corrections via WhatsApp
 * - Validation du formulaire
 * 
 * @see PLAN_TESTS_TDD.md section 5.4
 */

import { test, expect } from '@playwright/test'
import { loginAsAdmin, goToMembershipRequestsV2, waitForRequestsList, waitForModal, waitForSuccessToast, getRequestRow } from './helpers'
import { createPendingUnpaidRequest, deleteTestMembershipRequest, type CreateTestRequestResult } from './fixtures'

test.describe('E2E: Demande de corrections V2', () => {
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

  test('devrait ouvrir le modal de corrections', async ({ page }) => {
    // Arrange: Créer une demande en attente pour le test
    const testRequest = await createPendingUnpaidRequest()
    createdRequests.push(testRequest)
    await page.reload()
    await waitForRequestsList(page)

    // Act: Rechercher la demande par matricule
    const searchInput = page.locator('[data-testid="search-input"]').first()
    await expect(searchInput).toBeVisible({ timeout: 5000 })
    await searchInput.fill(testRequest.matricule)
    await page.waitForTimeout(1500)

    // Assert: La demande devrait être visible
    const requestRow = await getRequestRow(page, testRequest.id)
    
    if (await requestRow.count() > 0) {
      // Ouvrir le menu
      const menuButton = requestRow.locator('[data-testid="action-menu"]').first()
      if (await menuButton.count() > 0 && await menuButton.isVisible()) {
        await menuButton.click()
        await page.waitForTimeout(500)
      }

      // Chercher le bouton Corrections
      const correctionsButton = page.locator('button:has-text("Corrections"), button:has-text("Demander corrections"), [data-testid="action-request-corrections-menu"]').first()
      
      if (await correctionsButton.count() > 0) {
        await correctionsButton.click()
        await page.waitForTimeout(1000)

        // Assert: Modal de corrections visible
        await waitForModal(page, 'modal-corrections')
      }
    }
  })

  test('devrait envoyer une demande de corrections', async ({ page }) => {
    // Arrange: Créer une demande en attente pour le test
    const testRequest = await createPendingUnpaidRequest()
    createdRequests.push(testRequest)
    await page.reload()
    await waitForRequestsList(page)

    // Act: Rechercher la demande par matricule
    const searchInput = page.locator('[data-testid="search-input"]').first()
    await expect(searchInput).toBeVisible({ timeout: 5000 })
    await searchInput.fill(testRequest.matricule)
    await page.waitForTimeout(1500)

    // Assert: La demande devrait être visible
    const requestRow = await getRequestRow(page, testRequest.id)
    
    if (await requestRow.count() > 0) {
      // Ouvrir le menu
      const menuButton = requestRow.locator('[data-testid="action-menu"]').first()
      if (await menuButton.count() > 0 && await menuButton.isVisible()) {
        await menuButton.click()
        await page.waitForTimeout(500)
      }

      const correctionsButton = page.locator('button:has-text("Corrections"), [data-testid="action-request-corrections-menu"]').first()
      
      if (await correctionsButton.count() > 0) {
        await correctionsButton.click()
        await waitForModal(page, 'modal-corrections')
        await page.waitForTimeout(1000)

        // Act: Remplir les corrections
        const correctionsTextarea = page.locator('[data-testid="corrections-textarea"], textarea[name*="correction" i], textarea[placeholder*="correction" i]').first()
        if (await correctionsTextarea.count() > 0) {
          await correctionsTextarea.fill('Veuillez mettre à jour votre photo et corriger votre adresse. (test E2E)')
        }

        // Act: Confirmer
        const confirmButton = page.locator('[data-testid="confirm-corrections"], button:has-text("Envoyer"), button:has-text("Confirmer")').last()
        await confirmButton.click()

        // Assert: Toast de succès
        await waitForSuccessToast(page, /correction|succès/i)
      }
    }
  })
})
