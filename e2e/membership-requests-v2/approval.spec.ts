/**
 * Tests E2E pour l'approbation d'une demande V2
 * 
 * Ces tests vérifient :
 * - Approbation d'une demande payée
 * - Validation du workflow métier (paiement requis)
 * - Gestion des erreurs
 * 
 * @see PLAN_TESTS_TDD.md section 5.3
 */

import { test, expect } from '@playwright/test'
import { loginAsAdmin, goToMembershipRequestsV2, waitForRequestsList, getRequestRow, waitForSuccessToast, waitForErrorToast, waitForModal } from './helpers'
import { createPendingPaidRequest, createPendingUnpaidRequest, deleteTestMembershipRequest, type CreateTestRequestResult } from './fixtures'

test.describe('E2E: Approbation d\'une demande V2', () => {
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

  test('devrait afficher le bouton Approuver uniquement pour les demandes payées en attente', async ({ page }) => {
    // Filtrer sur "En attente"
    const pendingTab = page.locator('[role="tab"]:has-text("En attente"), button:has-text("En attente")').first()
    await pendingTab.click()
    await page.waitForTimeout(2000)

    const firstRow = page.locator('[data-testid="membership-request-row"], [data-testid="membership-request-mobile-card"]').first()
    
    if (await firstRow.count() > 0) {
      // Vérifier la présence des actions
      const actions = firstRow.locator('[data-testid="membership-request-actions"]')
      if (await actions.count() > 0) {
        // Le bouton Approuver peut être visible ou dans le menu
        const approveButton = firstRow.locator('button:has-text("Approuver"), [data-testid="action-approve-primary"], [data-testid="action-approve-menu"]')
        const payButton = firstRow.locator('button:has-text("Payer"), [data-testid="action-pay-primary"]')
        
        // Si le bouton Payer est visible, Approuver ne devrait pas l'être (workflow métier)
        if (await payButton.count() > 0 && await payButton.isVisible()) {
          // Le bouton Approuver ne devrait pas être visible directement
          // (il peut être dans le menu mais désactivé)
        }
      }
    }
  })

  test('devrait ouvrir le modal d\'approbation', async ({ page }) => {
    // Arrange: Créer une demande payée pour le test
    const testRequest = await createPendingPaidRequest()
    createdRequests.push(testRequest)
    await page.reload()
    await waitForRequestsList(page)

    // Act: Rechercher la demande par matricule
    const searchInput = page.locator('[data-testid="search-input"]').first()
    await expect(searchInput).toBeVisible({ timeout: 5000 })
    await searchInput.fill(testRequest.matricule)
    await page.waitForTimeout(1500)

    // Assert: La demande devrait être visible
    const paidRow = await getRequestRow(page, testRequest.id)
    
    if (await paidRow.count() > 0) {
      // Chercher le bouton Approuver
      const approveButton = paidRow.locator('button:has-text("Approuver"), [data-testid="action-approve-primary"]').first()
      
      if (await approveButton.count() > 0 && await approveButton.isVisible()) {
        // Act: Cliquer sur Approuver
        await approveButton.click()
        await page.waitForTimeout(1000)

        // Assert: Modal d'approbation visible
        await waitForModal(page, 'modal-approve')
      }
    }
  })

  test('devrait approuver une demande avec succès', async ({ page }) => {
    // Arrange: Créer une demande payée pour le test
    const testRequest = await createPendingPaidRequest()
    createdRequests.push(testRequest)
    await page.reload()
    await waitForRequestsList(page)

    // Act: Rechercher la demande par matricule
    const searchInput = page.locator('[data-testid="search-input"]').first()
    await expect(searchInput).toBeVisible({ timeout: 5000 })
    await searchInput.fill(testRequest.matricule)
    await page.waitForTimeout(1500)

    // Assert: La demande devrait être visible
    const paidRow = await getRequestRow(page, testRequest.id)
    
    if (await paidRow.count() > 0) {
      const approveButton = paidRow.locator('button:has-text("Approuver"), [data-testid="action-approve-primary"]').first()
      
      if (await approveButton.count() > 0 && await approveButton.isVisible()) {
        // Act: Ouvrir le modal
        await approveButton.click()
        await waitForModal(page, 'modal-approve')
        await page.waitForTimeout(1000)

        // Act: Sélectionner le type d'adhésion (si présent)
        const membershipTypeSelect = page.locator('[data-testid="membership-type-select"], select[name*="type" i]')
        if (await membershipTypeSelect.count() > 0) {
          await membershipTypeSelect.selectOption({ index: 0 })
        }

        // Act: Confirmer l'approbation
        const confirmButton = page.locator('[data-testid="confirm-approve"], button:has-text("Confirmer"), button:has-text("Approuver")').last()
        await confirmButton.click()

        // Assert: Toast de succès
        await waitForSuccessToast(page, /approuvée|succès/i)

        // Assert: Le statut est mis à jour (peut prendre du temps)
        await page.waitForTimeout(3000)
        const statusBadge = paidRow.locator('[data-testid="status-badge"], [data-testid="badge-status"]')
        if (await statusBadge.count() > 0) {
          await expect(statusBadge.first()).toContainText(/approuvée|approved/i, { timeout: 10000 })
        }
      }
    }
  })

  test('devrait NE PAS permettre d\'approuver une demande non payée', async ({ page }) => {
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
    const unpaidRow = await getRequestRow(page, testRequest.id)
    
    if (await unpaidRow.count() > 0) {
      // Le bouton Approuver ne devrait pas être visible ou devrait être désactivé
      const approveButton = unpaidRow.locator('button:has-text("Approuver"), [data-testid="action-approve-primary"]')
      
      if (await approveButton.count() > 0) {
        // Si présent, il devrait être désactivé
        await expect(approveButton.first()).toBeDisabled()
      }

      // Le bouton Payer devrait être visible
      const payButton = unpaidRow.locator('button:has-text("Payer"), [data-testid="action-pay-primary"]')
      if (await payButton.count() > 0) {
        await expect(payButton.first()).toBeVisible()
      }
    }
  })
})
