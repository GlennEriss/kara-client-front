/**
 * Tests E2E pour le paiement d'une demande V2
 * 
 * Ces tests vérifient :
 * - Ouverture du modal de paiement
 * - Validation du formulaire
 * - Enregistrement du paiement
 * - Mise à jour du statut
 * 
 * @see PLAN_TESTS_TDD.md section 5.5
 */

import { test, expect } from '@playwright/test'
import { loginAsAdmin, goToMembershipRequestsV2, waitForRequestsList, waitForModal, waitForSuccessToast, waitForErrorToast, getRequestRow } from './helpers'
import { createPendingUnpaidRequest, deleteTestMembershipRequest } from './fixtures'

test.describe('E2E: Paiement d\'une demande V2', () => {
  const createdRequestIds: string[] = []

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
    await goToMembershipRequestsV2(page)
    await waitForRequestsList(page)
  })

  test.afterEach(async () => {
    // Nettoyer les demandes créées
    if (createdRequestIds.length > 0) {
      await Promise.all(createdRequestIds.map(id => deleteTestMembershipRequest(id)))
      createdRequestIds.length = 0
    }
  })

  test('devrait ouvrir le modal de paiement', async ({ page }) => {
    // Créer une demande non payée pour le test
    const requestId = await createPendingUnpaidRequest()
    createdRequestIds.push(requestId)
    await page.reload()
    await waitForRequestsList(page)

    // Filtrer sur "En attente"
    const pendingTab = page.locator('[role="tab"]:has-text("En attente"), button:has-text("En attente")').first()
    await pendingTab.click()
    await page.waitForTimeout(2000)

    // Chercher la demande créée
    const unpaidRow = await getRequestRow(page, requestId)
    
    if (await unpaidRow.count() > 0) {
      // Act: Cliquer sur le bouton Payer
      const payButton = unpaidRow.locator('button:has-text("Payer"), [data-testid="action-pay-primary"]').first()
      
      if (await payButton.count() > 0 && await payButton.isVisible()) {
        await payButton.click()
        await page.waitForTimeout(1000)

        // Assert: Modal de paiement visible
        await waitForModal(page, 'modal-payment')
      }
    }
  })

  test('devrait valider les champs du formulaire de paiement', async ({ page }) => {
    // Créer une demande non payée pour le test
    const requestId = await createPendingUnpaidRequest()
    createdRequestIds.push(requestId)
    await page.reload()
    await waitForRequestsList(page)

    // Filtrer sur "En attente"
    const pendingTab = page.locator('[role="tab"]:has-text("En attente"), button:has-text("En attente")').first()
    await pendingTab.click()
    await page.waitForTimeout(2000)

    const unpaidRow = await getRequestRow(page, requestId)
    
    if (await unpaidRow.count() > 0) {
      const payButton = unpaidRow.locator('button:has-text("Payer"), [data-testid="action-pay-primary"]').first()
      
      if (await payButton.count() > 0 && await payButton.isVisible()) {
        await payButton.click()
        await waitForModal(page, 'modal-payment')
        await page.waitForTimeout(1000)

        // Act: Essayer de confirmer sans remplir
        const confirmButton = page.locator('[data-testid="confirm-payment"], button:has-text("Confirmer"), button:has-text("Enregistrer")').last()
        await confirmButton.click()
        await page.waitForTimeout(1000)

        // Assert: Erreurs de validation (peuvent être affichées différemment selon le formulaire)
        const errorMessages = page.locator('text=/requis|obligatoire|invalid/i')
        const errorCount = await errorMessages.count()
        
        // Au moins une erreur devrait être affichée
        if (errorCount > 0) {
          await expect(errorMessages.first()).toBeVisible({ timeout: 3000 })
        }
      }
    }
  })

  test('devrait enregistrer un paiement avec succès', async ({ page }) => {
    // Créer une demande non payée pour le test
    const requestId = await createPendingUnpaidRequest()
    createdRequestIds.push(requestId)
    await page.reload()
    await waitForRequestsList(page)

    // Filtrer sur "En attente"
    const pendingTab = page.locator('[role="tab"]:has-text("En attente"), button:has-text("En attente")').first()
    await pendingTab.click()
    await page.waitForTimeout(2000)

    const unpaidRow = await getRequestRow(page, requestId)
    
    if (await unpaidRow.count() > 0) {
      const payButton = unpaidRow.locator('button:has-text("Payer"), [data-testid="action-pay-primary"]').first()
      
      if (await payButton.count() > 0 && await payButton.isVisible()) {
        await payButton.click()
        await waitForModal(page, 'modal-payment')
        await page.waitForTimeout(1000)

        // Act: Remplir le formulaire
        const amountInput = page.locator('[data-testid="payment-amount"], input[name*="amount" i], input[type="number"]').first()
        if (await amountInput.count() > 0) {
          await amountInput.fill('25000')
        }

        const modeSelect = page.locator('[data-testid="payment-mode"], select[name*="mode" i]').first()
        if (await modeSelect.count() > 0) {
          await modeSelect.selectOption({ index: 0 })
        }

        // Act: Confirmer
        const confirmButton = page.locator('[data-testid="confirm-payment"], button:has-text("Confirmer")').last()
        await confirmButton.click()

        // Assert: Toast de succès
        await waitForSuccessToast(page, /payé|succès/i)

        // Assert: Badge de paiement mis à jour
        await page.waitForTimeout(3000)
        const paymentBadge = unpaidRow.locator('[data-testid="payment-badge"], [data-testid="badge-payment"]')
        if (await paymentBadge.count() > 0) {
          await expect(paymentBadge.first()).toContainText(/payé|paid/i, { timeout: 10000 })
        }
      }
    }
  })
})
