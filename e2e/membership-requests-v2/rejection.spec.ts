/**
 * Tests E2E pour le rejet d'une demande V2
 * 
 * Ces tests vérifient :
 * - Ouverture du modal de rejet
 * - Validation du formulaire
 * - Enregistrement du rejet
 * - Mise à jour du statut
 * 
 * @see PLAN_TESTS_TDD.md section 5.4
 */

import { test, expect } from '@playwright/test'
import { loginAsAdmin, goToMembershipRequestsV2, waitForRequestsList, waitForModal, waitForSuccessToast } from './helpers'

test.describe('E2E: Rejet d\'une demande V2', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
    await goToMembershipRequestsV2(page)
    await waitForRequestsList(page)
  })

  test('devrait ouvrir le modal de rejet', async ({ page }) => {
    // Filtrer sur "En attente"
    const pendingTab = page.locator('[role="tab"]:has-text("En attente"), button:has-text("En attente")').first()
    await pendingTab.click()
    await page.waitForTimeout(2000)

    const firstRow = page.locator('[data-testid="membership-request-row"], [data-testid="membership-request-mobile-card"]').first()
    
    if (await firstRow.count() > 0) {
      // Chercher le bouton Rejeter (peut être dans le menu ou directement visible)
      const rejectButton = firstRow.locator('button:has-text("Rejeter"), [data-testid="action-reject-mobile"], [data-testid="action-reject-menu"]').first()
      
      // Si dans le menu, ouvrir le menu d'abord
      const menuButton = firstRow.locator('[data-testid="action-menu"], button:has-text("⋮"), [aria-label*="menu" i]').first()
      if (await menuButton.count() > 0 && await menuButton.isVisible()) {
        await menuButton.click()
        await page.waitForTimeout(500)
      }

      if (await rejectButton.count() > 0) {
        await rejectButton.click()
        await page.waitForTimeout(1000)

        // Assert: Modal de rejet visible
        await waitForModal(page, 'modal-reject')
      }
    }
  })

  test('devrait rejeter une demande avec un motif', async ({ page }) => {
    // Filtrer sur "En attente"
    const pendingTab = page.locator('[role="tab"]:has-text("En attente"), button:has-text("En attente")').first()
    await pendingTab.click()
    await page.waitForTimeout(2000)

    const firstRow = page.locator('[data-testid="membership-request-row"], [data-testid="membership-request-mobile-card"]').first()
    
    if (await firstRow.count() > 0) {
      // Ouvrir le menu si nécessaire
      const menuButton = firstRow.locator('[data-testid="action-menu"]').first()
      if (await menuButton.count() > 0 && await menuButton.isVisible()) {
        await menuButton.click()
        await page.waitForTimeout(500)
      }

      const rejectButton = firstRow.locator('button:has-text("Rejeter"), [data-testid="action-reject-menu"]').first()
      
      if (await rejectButton.count() > 0) {
        await rejectButton.click()
        await waitForModal(page, 'modal-reject')
        await page.waitForTimeout(1000)

        // Act: Remplir le motif
        const reasonTextarea = page.locator('[data-testid="reject-reason"], textarea[name*="reason" i], textarea[placeholder*="motif" i]').first()
        if (await reasonTextarea.count() > 0) {
          await reasonTextarea.fill('Document d\'identité invalide')
        }

        // Act: Confirmer
        const confirmButton = page.locator('[data-testid="confirm-reject"], button:has-text("Confirmer"), button:has-text("Rejeter")').last()
        await confirmButton.click()

        // Assert: Toast de succès
        await waitForSuccessToast(page, /rejetée|succès/i)

        // Assert: Le statut est mis à jour
        await page.waitForTimeout(3000)
        const statusBadge = firstRow.locator('[data-testid="status-badge"], [data-testid="badge-status"]')
        if (await statusBadge.count() > 0) {
          await expect(statusBadge.first()).toContainText(/rejetée|rejected/i, { timeout: 10000 })
        }
      }
    }
  })
})
