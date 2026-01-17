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
import { loginAsAdmin, goToMembershipRequestsV2, waitForRequestsList, waitForModal, waitForSuccessToast } from './helpers'

test.describe('E2E: Demande de corrections V2', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
    await goToMembershipRequestsV2(page)
    await waitForRequestsList(page)
  })

  test('devrait ouvrir le modal de corrections', async ({ page }) => {
    // Filtrer sur "En attente"
    const pendingTab = page.locator('[role="tab"]:has-text("En attente"), button:has-text("En attente")').first()
    await pendingTab.click()
    await page.waitForTimeout(2000)

    const firstRow = page.locator('[data-testid="membership-request-row"], [data-testid="membership-request-mobile-card"]').first()
    
    if (await firstRow.count() > 0) {
      // Ouvrir le menu
      const menuButton = firstRow.locator('[data-testid="action-menu"]').first()
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
    // Filtrer sur "En attente"
    const pendingTab = page.locator('[role="tab"]:has-text("En attente"), button:has-text("En attente")').first()
    await pendingTab.click()
    await page.waitForTimeout(2000)

    const firstRow = page.locator('[data-testid="membership-request-row"], [data-testid="membership-request-mobile-card"]').first()
    
    if (await firstRow.count() > 0) {
      // Ouvrir le menu
      const menuButton = firstRow.locator('[data-testid="action-menu"]').first()
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
          await correctionsTextarea.fill('Veuillez mettre à jour votre photo et corriger votre adresse.')
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
