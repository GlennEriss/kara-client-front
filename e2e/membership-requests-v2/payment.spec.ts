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
import { createPendingUnpaidRequest, deleteTestMembershipRequest, type CreateTestRequestResult } from './fixtures'

test.describe('E2E: Paiement d\'une demande V2', () => {
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

  test('devrait ouvrir le modal de paiement', async ({ page }) => {
    // Arrange: Créer une demande non payée pour le test
    const testRequest = await createPendingUnpaidRequest()
    createdRequests.push(testRequest)
    
    await page.reload()
    await waitForRequestsList(page)

    // Act: Rechercher la demande par matricule
    const searchInput = page.locator('[data-testid="search-input"]').first()
    await expect(searchInput).toBeVisible({ timeout: 5000 })
    await searchInput.fill(testRequest.matricule)
    await page.waitForTimeout(1500) // Attendre que le filtre s'applique

    // Assert: La demande devrait être visible
    const requestRow = await getRequestRow(page, testRequest.id)
    await expect(requestRow.first()).toBeVisible({ timeout: 5000 })

    // Act: Cliquer sur le bouton Payer avec data-testid
    const payButton = requestRow.locator('[data-testid="action-pay-primary"]').first()
    await expect(payButton).toBeVisible({ timeout: 5000 })
    await payButton.click()
    await page.waitForTimeout(1000)

    // Assert: Modal de paiement visible
    await waitForModal(page, 'modal-payment')
    
    // Vérifier que les champs principaux sont visibles
    await expect(page.locator('[data-testid="payment-amount"]')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('[data-testid="payment-mode"]')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('[data-testid="payment-date"]')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('[data-testid="payment-time"]')).toBeVisible({ timeout: 5000 })
  })

  test('devrait valider les champs du formulaire de paiement', async ({ page }) => {
    // Arrange: Créer une demande non payée pour le test
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
    await expect(requestRow.first()).toBeVisible({ timeout: 5000 })

    // Act: Cliquer sur le bouton Payer avec data-testid
    const payButton = requestRow.locator('[data-testid="action-pay-primary"]').first()
    await expect(payButton).toBeVisible({ timeout: 5000 })
    await payButton.click()
    
    // Assert: Modal de paiement visible
    await waitForModal(page, 'modal-payment')
    await page.waitForTimeout(1000)

    // Act: Essayer de confirmer sans remplir tous les champs obligatoires
    const confirmButton = page.locator('[data-testid="confirm-payment"]').first()
    await expect(confirmButton).toBeVisible({ timeout: 5000 })
    
    // Le bouton devrait être désactivé si les champs ne sont pas remplis
    const isDisabled = await confirmButton.isDisabled()
    if (!isDisabled) {
      // Si le bouton n'est pas désactivé, cliquer dessus pour déclencher la validation
      await confirmButton.click()
      await page.waitForTimeout(1000)

      // Assert: Erreurs de validation ou bouton désactivé
      const errorMessages = page.locator('text=/requis|obligatoire|invalid/i')
      const errorCount = await errorMessages.count()
      
      // Soit le bouton est désactivé, soit des erreurs sont affichées
      if (errorCount > 0) {
        await expect(errorMessages.first()).toBeVisible({ timeout: 3000 })
      } else {
        // Vérifier que le bouton est désactivé
        await expect(confirmButton).toBeDisabled()
      }
    } else {
      // Le bouton est déjà désactivé, c'est bon
      await expect(confirmButton).toBeDisabled()
    }
  })

  test('devrait enregistrer un paiement avec succès', async ({ page }) => {
    // Arrange: Créer une demande non payée pour le test
    const testRequest = await createPendingUnpaidRequest()
    createdRequests.push(testRequest)
    
    await page.reload()
    await waitForRequestsList(page)

    // Act: Rechercher la demande par matricule
    const searchInput = page.locator('[data-testid="search-input"]').first()
    await expect(searchInput).toBeVisible({ timeout: 5000 })
    await searchInput.fill(testRequest.matricule)
    await page.waitForTimeout(1500) // Attendre que le filtre s'applique

    // Assert: La demande devrait être visible
    const requestRow = await getRequestRow(page, testRequest.id)
    await expect(requestRow.first()).toBeVisible({ timeout: 5000 })

    // Act: Cliquer sur le bouton Payer avec data-testid
    const payButton = requestRow.locator('[data-testid="action-pay-primary"]').first()
    await expect(payButton).toBeVisible({ timeout: 5000 })
    await payButton.click()
    
    // Assert: Modal de paiement visible
    await waitForModal(page, 'modal-payment')
    await page.waitForTimeout(1000)

    // Act: Remplir tous les champs du formulaire avec leurs data-testid
    
    // 1. Type de paiement (déjà "Membership" par défaut, on peut le laisser)
    const paymentTypeSelect = page.locator('[data-testid="payment-type"]').first()
    await expect(paymentTypeSelect).toBeVisible({ timeout: 5000 })
    
    // 2. Date de versement
    const dateInput = page.locator('[data-testid="payment-date"]').first()
    await expect(dateInput).toBeVisible({ timeout: 5000 })
    const today = new Date().toISOString().split('T')[0]
    await dateInput.fill(today)
    await page.waitForTimeout(300)
    
    // 3. Heure de versement
    const timeInput = page.locator('[data-testid="payment-time"]').first()
    await expect(timeInput).toBeVisible({ timeout: 5000 })
    await timeInput.fill('14:30')
    await page.waitForTimeout(300)
    
    // 4. Montant
    const amountInput = page.locator('[data-testid="payment-amount"]').first()
    await expect(amountInput).toBeVisible({ timeout: 5000 })
    await amountInput.clear()
    await amountInput.fill('10300')
    await page.waitForTimeout(300)

    // 5. Mode de paiement (shadcn Select)
    const modeSelectTrigger = page.locator('[data-testid="payment-mode"]').first()
    await expect(modeSelectTrigger).toBeVisible({ timeout: 5000 })
    await modeSelectTrigger.click()
    await page.waitForTimeout(500)
    
    // Sélectionner "Airtel Money" (premier mode mobile money)
    const airtelMoneyOption = page.locator('[role="option"]:has-text("Airtel Money")').first()
    if (await airtelMoneyOption.count() > 0) {
      await airtelMoneyOption.click()
    } else {
      // Fallback: sélectionner le premier mode disponible
      const firstPaymentMode = page.locator('[role="option"]').first()
      await expect(firstPaymentMode).toBeVisible({ timeout: 5000 })
      await firstPaymentMode.click()
    }
    await page.waitForTimeout(500)

    // 6. Frais (si mode mobile money sélectionné)
    const withFeesSelect = page.locator('[data-testid="payment-with-fees"]')
    if (await withFeesSelect.count() > 0 && await withFeesSelect.isVisible()) {
      await withFeesSelect.click()
      await page.waitForTimeout(300)
      const noFeesOption = page.locator('[role="option"]:has-text("Sans frais")').first()
      if (await noFeesOption.count() > 0) {
        await noFeesOption.click()
      } else {
        // Fallback: sélectionner la première option
        const firstFeesOption = page.locator('[role="option"]').first()
        await firstFeesOption.click()
      }
      await page.waitForTimeout(300)
    }

    // 7. Preuve de paiement - Utiliser la justification (plus simple pour le test E2E)
    const proofJustificationTextarea = page.locator('[data-testid="payment-proof-justification"]').first()
    await expect(proofJustificationTextarea).toBeVisible({ timeout: 5000 })
    await proofJustificationTextarea.fill('Paiement effectué en personne, capture d\'écran non disponible pour le moment.')
    await page.waitForTimeout(500)

    // Act: Confirmer le paiement
    const confirmButton = page.locator('[data-testid="confirm-payment"]').first()
    await expect(confirmButton).toBeEnabled({ timeout: 5000 })
    await confirmButton.click()

    // Assert: Toast de succès
    await waitForSuccessToast(page, /payé|succès|enregistré/i)

    // Attendre que le modal se ferme
    await page.waitForTimeout(2000)
    await expect(page.locator('[data-testid="modal-payment"]')).not.toBeVisible({ timeout: 5000 })

    // Recharger la page pour vérifier que le paiement est bien enregistré
    await page.reload()
    await waitForRequestsList(page)
    await page.waitForTimeout(2000)

    // Rechercher à nouveau par matricule pour vérifier le statut
    await searchInput.fill(testRequest.matricule)
    await page.waitForTimeout(1500)

    // Vérifier que la demande est maintenant payée
    const updatedRow = await getRequestRow(page, testRequest.id)
    await expect(updatedRow.first()).toBeVisible({ timeout: 5000 })
    
    const paymentBadge = updatedRow.locator('[data-testid="payment-badge"], [data-testid="badge-payment"]')
    if (await paymentBadge.count() > 0) {
      await expect(paymentBadge.first()).toContainText(/payé|paid/i, { timeout: 10000 })
    }
  })
})
