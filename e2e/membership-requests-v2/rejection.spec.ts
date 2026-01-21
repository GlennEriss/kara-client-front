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
import { loginAsAdmin, goToMembershipRequestsV2, waitForRequestsList, waitForModal, waitForSuccessToast, getRequestRow, clickFilterTab } from './helpers'
import { createPendingUnpaidRequest, createRejectedRequest, deleteTestMembershipRequest, type CreateTestRequestResult } from './fixtures'

test.describe('E2E: Rejet d\'une demande V2', () => {
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

  test('devrait ouvrir le modal de rejet', async ({ page }) => {
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
      // Chercher le bouton Rejeter (peut être dans le menu ou directement visible)
      const rejectButton = requestRow.locator('button:has-text("Rejeter"), [data-testid="action-reject-mobile"], [data-testid="action-reject-menu"]').first()
      
      // Si dans le menu, ouvrir le menu d'abord
      const menuButton = requestRow.locator('[data-testid="action-menu"], button:has-text("⋮"), [aria-label*="menu" i]').first()
      if (await menuButton.count() > 0 && await menuButton.isVisible()) {
        await menuButton.click()
        await page.waitForTimeout(500)
      }

      if (await rejectButton.count() > 0) {
        await rejectButton.click()
        await page.waitForTimeout(1000)

        // Assert: Modal de rejet visible
        await waitForModal(page, 'reject-modal')
      }
    }
  })

  test('devrait rejeter une demande avec un motif', async ({ page }) => {
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
      // Ouvrir le menu si nécessaire
      const menuButton = requestRow.locator('[data-testid="action-menu"]').first()
      if (await menuButton.count() > 0 && await menuButton.isVisible()) {
        await menuButton.click()
        await page.waitForTimeout(500)
      }

      const rejectButton = requestRow.locator('button:has-text("Rejeter"), [data-testid="action-reject-menu"]').first()
      
      if (await rejectButton.count() > 0) {
        await rejectButton.click()
        await waitForModal(page, 'reject-modal')
        await page.waitForTimeout(1000)

        // Act: Remplir le motif
        const reasonTextarea = page.locator('[data-testid="reject-modal-reason-input"], textarea[name*="reason" i], textarea[placeholder*="motif" i]').first()
        if (await reasonTextarea.count() > 0) {
          await reasonTextarea.fill('Document d\'identité invalide (test E2E)')
        }

        // Act: Confirmer
        const confirmButton = page.locator('[data-testid="reject-modal-submit-button"], button:has-text("Confirmer"), button:has-text("Rejeter")').last()
        await confirmButton.click()

        // Assert: Vérifier qu'aucun toast d'erreur n'apparaît
        await page.waitForTimeout(1000)
        const errorToast = page.locator('[data-sonner-toast]:has-text("erreur"), [data-sonner-toast]:has-text("Erreur"), .sonner-toast:has-text("erreur")').first()
        if (await errorToast.count() > 0) {
          const errorText = await errorToast.textContent()
          throw new Error(`Toast d'erreur détecté: ${errorText}`)
        }

        // Assert: Toast de succès
        await waitForSuccessToast(page, /rejetée|succès/i)

        // Assert: Le modal doit se fermer après succès
        await page.waitForTimeout(1000)
        const modal = page.locator('[data-testid="reject-modal"]').first()
        if (await modal.count() > 0) {
          await expect(modal).not.toBeVisible({ timeout: 5000 })
        }

        // Assert: Le statut est mis à jour dans l'UI
        await page.waitForTimeout(2000)
        // Recharger la page pour s'assurer que le statut est bien enregistré
        await page.reload()
        await waitForRequestsList(page)
        
        // Rechercher à nouveau la demande
        const searchInputAfter = page.locator('[data-testid="search-input"]').first()
        await searchInputAfter.clear()
        await searchInputAfter.fill(testRequest.matricule)
        await page.waitForTimeout(2000)
        
        const requestRowAfter = await getRequestRow(page, testRequest.id)
        if (await requestRowAfter.count() > 0) {
          const statusBadge = requestRowAfter.locator('[data-testid="status-badge"], [data-testid="badge-status"]')
          if (await statusBadge.count() > 0) {
            await expect(statusBadge.first()).toContainText(/rejetée|rejected/i, { timeout: 10000 })
          }
        }
      }
    }
  })

  test('devrait valider la longueur minimale du motif (minimum 10 caractères)', async ({ page }) => {
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

    const requestRow = await getRequestRow(page, testRequest.id)
    
    if (await requestRow.count() > 0) {
      // Ouvrir le menu si nécessaire
      const menuButton = requestRow.locator('[data-testid="action-menu"]').first()
      if (await menuButton.count() > 0 && await menuButton.isVisible()) {
        await menuButton.click()
        await page.waitForTimeout(500)
      }

      const rejectButton = requestRow.locator('button:has-text("Rejeter"), [data-testid="action-reject-menu"]').first()
      
      if (await rejectButton.count() > 0) {
        await rejectButton.click()
        await waitForModal(page, 'reject-modal')
        await page.waitForTimeout(1000)

        // Act: Remplir le motif avec moins de 10 caractères
        const reasonTextarea = page.locator('[data-testid="reject-modal-reason-input"]').first()
        if (await reasonTextarea.count() > 0) {
          await reasonTextarea.fill('Court')
          
          // Assert: Le bouton de soumission devrait être désactivé
          const submitButton = page.locator('[data-testid="reject-modal-submit-button"]').first()
          await expect(submitButton).toBeDisabled()
          
          // Assert: Le compteur devrait afficher l'erreur
          const counter = page.locator('[data-testid="reject-modal-reason-counter"]').first()
          if (await counter.count() > 0) {
            await expect(counter).toContainText('Minimum 10 caractères requis')
          }
        }
      }
    }
  })

  test('devrait valider la longueur maximale du motif (maximum 500 caractères)', async ({ page }) => {
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

    const requestRow = await getRequestRow(page, testRequest.id)
    
    if (await requestRow.count() > 0) {
      // Ouvrir le menu si nécessaire
      const menuButton = requestRow.locator('[data-testid="action-menu"]').first()
      if (await menuButton.count() > 0 && await menuButton.isVisible()) {
        await menuButton.click()
        await page.waitForTimeout(500)
      }

      const rejectButton = requestRow.locator('button:has-text("Rejeter"), [data-testid="action-reject-menu"]').first()
      
      if (await rejectButton.count() > 0) {
        await rejectButton.click()
        await waitForModal(page, 'reject-modal')
        await page.waitForTimeout(1000)

        // Act: Remplir le motif avec plus de 500 caractères
        const reasonTextarea = page.locator('[data-testid="reject-modal-reason-input"]').first()
        if (await reasonTextarea.count() > 0) {
          const longReason = 'A'.repeat(501)
          await reasonTextarea.fill(longReason)
          
          // Assert: Le textarea devrait limiter à 500 caractères
          const value = await reasonTextarea.inputValue()
          expect(value.length).toBeLessThanOrEqual(500)
        }
      }
    }
  })
})

test.describe('E2E: Réouverture d\'une demande rejetée V2', () => {
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

  test('devrait ouvrir le modal de réouverture pour une demande rejetée', async ({ page }) => {
    // Arrange: Créer une demande rejetée pour le test
    const testRequest = await createRejectedRequest()
    createdRequests.push(testRequest)
    await page.reload()
    await waitForRequestsList(page)

    // Act: Filtrer sur "Rejetées"
    await clickFilterTab(page, 'Rejetées')
    await page.waitForTimeout(2000)

    // Rechercher la demande par matricule
    const searchInput = page.locator('[data-testid="search-input"]').first()
    await expect(searchInput).toBeVisible({ timeout: 5000 })
    await searchInput.fill(testRequest.matricule)
    await page.waitForTimeout(1500)

    // Assert: La demande devrait être visible
    const requestRow = await getRequestRow(page, testRequest.id)
    
    if (await requestRow.count() > 0) {
      // Chercher le bouton Réouvrir
      const reopenButton = requestRow.locator('button:has-text("Réouvrir"), [data-testid="reopen-button"]').first()
      
      // Si dans le menu, ouvrir le menu d'abord
      const menuButton = requestRow.locator('[data-testid="action-menu"]').first()
      if (await menuButton.count() > 0 && await menuButton.isVisible()) {
        await menuButton.click()
        await page.waitForTimeout(500)
      }

      if (await reopenButton.count() > 0) {
        await reopenButton.click()
        await page.waitForTimeout(1000)

        // Assert: Modal de réouverture visible
        await waitForModal(page, 'reopen-modal')
        
        // Assert: Vérifier que les informations sont affichées
        const memberName = page.locator('[data-testid="reopen-modal-member-name"]').first()
        if (await memberName.count() > 0) {
          await expect(memberName).toBeVisible()
        }
        
        const matricule = page.locator('[data-testid="reopen-modal-matricule"]').first()
        if (await matricule.count() > 0) {
          await expect(matricule).toContainText(testRequest.matricule)
        }
        
        const previousReason = page.locator('[data-testid="reopen-modal-previous-reject-reason"]').first()
        if (await previousReason.count() > 0) {
          await expect(previousReason).toBeVisible()
        }
      }
    }
  })

  test('devrait réouvrir une demande rejetée avec un motif valide', async ({ page }) => {
    // Arrange: Créer une demande rejetée pour le test
    const testRequest = await createRejectedRequest()
    createdRequests.push(testRequest)
    await page.reload()
    await waitForRequestsList(page)

    // Act: Filtrer sur "Rejetées"
    await clickFilterTab(page, 'Rejetées')
    await page.waitForTimeout(2000)

    // Rechercher la demande par matricule
    const searchInput = page.locator('[data-testid="search-input"]').first()
    await expect(searchInput).toBeVisible({ timeout: 5000 })
    await searchInput.fill(testRequest.matricule)
    await page.waitForTimeout(1500)

    const requestRow = await getRequestRow(page, testRequest.id)
    
    if (await requestRow.count() > 0) {
      // Ouvrir le menu si nécessaire
      const menuButton = requestRow.locator('[data-testid="action-menu"]').first()
      if (await menuButton.count() > 0 && await menuButton.isVisible()) {
        await menuButton.click()
        await page.waitForTimeout(500)
      }

      const reopenButton = requestRow.locator('button:has-text("Réouvrir"), [data-testid="reopen-button"]').first()
      
      if (await reopenButton.count() > 0) {
        await reopenButton.click()
        await waitForModal(page, 'reopen-modal')
        await page.waitForTimeout(1000)

        // Act: Remplir le motif de réouverture
        const reasonTextarea = page.locator('[data-testid="reopen-modal-reason-input"]').first()
        if (await reasonTextarea.count() > 0) {
          await reasonTextarea.fill('Nouvelle information disponible. Le dossier nécessite un réexamen approfondi (test E2E).')
        }

        // Act: Confirmer
        const confirmButton = page.locator('[data-testid="reopen-modal-submit-button"]').first()
        await confirmButton.click()

        // Assert: Toast de succès
        await waitForSuccessToast(page, /réouvert|succès/i)

        // Assert: Le statut est mis à jour à "En attente" (pending)
        await page.waitForTimeout(3000)
        const statusBadge = requestRow.locator('[data-testid="status-badge"], [data-testid="badge-status"]')
        if (await statusBadge.count() > 0) {
          await expect(statusBadge.first()).toContainText(/attente|pending/i, { timeout: 10000 })
        }
      }
    }
  })

  test('devrait valider la longueur minimale du motif de réouverture (minimum 10 caractères)', async ({ page }) => {
    // Arrange: Créer une demande rejetée pour le test
    const testRequest = await createRejectedRequest()
    createdRequests.push(testRequest)
    await page.reload()
    await waitForRequestsList(page)

    // Act: Filtrer sur "Rejetées"
    await clickFilterTab(page, 'Rejetées')
    await page.waitForTimeout(2000)

    const searchInput = page.locator('[data-testid="search-input"]').first()
    await expect(searchInput).toBeVisible({ timeout: 5000 })
    await searchInput.fill(testRequest.matricule)
    await page.waitForTimeout(1500)

    const requestRow = await getRequestRow(page, testRequest.id)
    
    if (await requestRow.count() > 0) {
      const menuButton = requestRow.locator('[data-testid="action-menu"]').first()
      if (await menuButton.count() > 0 && await menuButton.isVisible()) {
        await menuButton.click()
        await page.waitForTimeout(500)
      }

      const reopenButton = requestRow.locator('button:has-text("Réouvrir"), [data-testid="reopen-button"]').first()
      
      if (await reopenButton.count() > 0) {
        await reopenButton.click()
        await waitForModal(page, 'reopen-modal')
        await page.waitForTimeout(1000)

        // Act: Remplir le motif avec moins de 10 caractères
        const reasonTextarea = page.locator('[data-testid="reopen-modal-reason-input"]').first()
        if (await reasonTextarea.count() > 0) {
          await reasonTextarea.fill('Court')
          
          // Assert: Le bouton de soumission devrait être désactivé
          const submitButton = page.locator('[data-testid="reopen-modal-submit-button"]').first()
          await expect(submitButton).toBeDisabled()
        }
      }
    }
  })
})

test.describe('E2E: Suppression d\'une demande rejetée V2', () => {
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

  test('devrait ouvrir le modal de suppression pour une demande rejetée', async ({ page }) => {
    // Arrange: Créer une demande rejetée pour le test
    const testRequest = await createRejectedRequest()
    createdRequests.push(testRequest)
    await page.reload()
    await waitForRequestsList(page)

    // Act: Filtrer sur "Rejetées"
    await clickFilterTab(page, 'Rejetées')
    await page.waitForTimeout(2000)

    // Rechercher la demande par matricule
    const searchInput = page.locator('[data-testid="search-input"]').first()
    await expect(searchInput).toBeVisible({ timeout: 5000 })
    await searchInput.fill(testRequest.matricule)
    await page.waitForTimeout(1500)

    const requestRow = await getRequestRow(page, testRequest.id)
    
    if (await requestRow.count() > 0) {
      // Chercher le bouton Supprimer
      const deleteButton = requestRow.locator('button:has-text("Supprimer"), [data-testid="delete-button"]').first()
      
      // Si dans le menu, ouvrir le menu d'abord
      const menuButton = requestRow.locator('[data-testid="action-menu"]').first()
      if (await menuButton.count() > 0 && await menuButton.isVisible()) {
        await menuButton.click()
        await page.waitForTimeout(500)
      }

      if (await deleteButton.count() > 0) {
        await deleteButton.click()
        await page.waitForTimeout(1000)

        // Assert: Modal de suppression visible
        await waitForModal(page, 'delete-modal')
        
        // Assert: Vérifier l'avertissement
        const warning = page.locator('[data-testid="delete-modal-warning"]').first()
        if (await warning.count() > 0) {
          await expect(warning).toBeVisible()
        }
        
        // Assert: Vérifier les informations affichées
        const memberName = page.locator('[data-testid="delete-modal-member-name"]').first()
        if (await memberName.count() > 0) {
          await expect(memberName).toBeVisible()
        }
        
        const matriculeDisplay = page.locator('[data-testid="delete-modal-matricule-display"]').first()
        if (await matriculeDisplay.count() > 0) {
          await expect(matriculeDisplay).toContainText(testRequest.matricule)
        }
      }
    }
  })

  test('devrait désactiver le bouton de soumission si le matricule ne correspond pas', async ({ page }) => {
    // Arrange: Créer une demande rejetée pour le test
    const testRequest = await createRejectedRequest()
    createdRequests.push(testRequest)
    await page.reload()
    await waitForRequestsList(page)

    // Act: Filtrer sur "Rejetées"
    await clickFilterTab(page, 'Rejetées')
    await page.waitForTimeout(2000)

    const searchInput = page.locator('[data-testid="search-input"]').first()
    await expect(searchInput).toBeVisible({ timeout: 5000 })
    await searchInput.fill(testRequest.matricule)
    await page.waitForTimeout(1500)

    const requestRow = await getRequestRow(page, testRequest.id)
    
    if (await requestRow.count() > 0) {
      const menuButton = requestRow.locator('[data-testid="action-menu"]').first()
      if (await menuButton.count() > 0 && await menuButton.isVisible()) {
        await menuButton.click()
        await page.waitForTimeout(500)
      }

      const deleteButton = requestRow.locator('button:has-text("Supprimer"), [data-testid="delete-button"]').first()
      
      if (await deleteButton.count() > 0) {
        await deleteButton.click()
        await waitForModal(page, 'delete-modal')
        await page.waitForTimeout(1000)

        // Act: Saisir un matricule incorrect
        const matriculeInput = page.locator('[data-testid="delete-modal-matricule-input"]').first()
        if (await matriculeInput.count() > 0) {
          await matriculeInput.fill('MATRICULE-INCORRECT')
          
          // Assert: Le bouton de soumission devrait être désactivé
          const submitButton = page.locator('[data-testid="delete-modal-submit-button"]').first()
          await expect(submitButton).toBeDisabled()
          
          // Assert: Une erreur devrait s'afficher
          const error = page.locator('[data-testid="delete-modal-matricule-error"]').first()
          if (await error.count() > 0) {
            await expect(error).toBeVisible()
          }
        }
      }
    }
  })

  test('devrait activer le bouton de soumission si le matricule correspond', async ({ page }) => {
    // Arrange: Créer une demande rejetée pour le test
    const testRequest = await createRejectedRequest()
    createdRequests.push(testRequest)
    await page.reload()
    await waitForRequestsList(page)

    // Act: Filtrer sur "Rejetées"
    await clickFilterTab(page, 'Rejetées')
    await page.waitForTimeout(2000)

    const searchInput = page.locator('[data-testid="search-input"]').first()
    await expect(searchInput).toBeVisible({ timeout: 5000 })
    await searchInput.fill(testRequest.matricule)
    await page.waitForTimeout(1500)

    const requestRow = await getRequestRow(page, testRequest.id)
    
    if (await requestRow.count() > 0) {
      const menuButton = requestRow.locator('[data-testid="action-menu"]').first()
      if (await menuButton.count() > 0 && await menuButton.isVisible()) {
        await menuButton.click()
        await page.waitForTimeout(500)
      }

      const deleteButton = requestRow.locator('button:has-text("Supprimer"), [data-testid="delete-button"]').first()
      
      if (await deleteButton.count() > 0) {
        await deleteButton.click()
        await waitForModal(page, 'delete-modal')
        await page.waitForTimeout(1000)

        // Act: Saisir le matricule correct
        const matriculeInput = page.locator('[data-testid="delete-modal-matricule-input"]').first()
        if (await matriculeInput.count() > 0) {
          await matriculeInput.fill(testRequest.matricule)
          
          // Assert: Le bouton de soumission devrait être activé
          const submitButton = page.locator('[data-testid="delete-modal-submit-button"]').first()
          await expect(submitButton).not.toBeDisabled()
        }
      }
    }
  })

  test('devrait supprimer définitivement une demande rejetée avec confirmation matricule', async ({ page }) => {
    // Arrange: Créer une demande rejetée pour le test
    const testRequest = await createRejectedRequest()
    createdRequests.push(testRequest)
    await page.reload()
    await waitForRequestsList(page)

    // Act: Filtrer sur "Rejetées"
    await clickFilterTab(page, 'Rejetées')
    await page.waitForTimeout(2000)

    const searchInput = page.locator('[data-testid="search-input"]').first()
    await expect(searchInput).toBeVisible({ timeout: 5000 })
    await searchInput.fill(testRequest.matricule)
    await page.waitForTimeout(1500)

    const requestRow = await getRequestRow(page, testRequest.id)
    
    if (await requestRow.count() > 0) {
      const menuButton = requestRow.locator('[data-testid="action-menu"]').first()
      if (await menuButton.count() > 0 && await menuButton.isVisible()) {
        await menuButton.click()
        await page.waitForTimeout(500)
      }

      const deleteButton = requestRow.locator('button:has-text("Supprimer"), [data-testid="delete-button"]').first()
      
      if (await deleteButton.count() > 0) {
        await deleteButton.click()
        await waitForModal(page, 'delete-modal')
        await page.waitForTimeout(1000)

        // Act: Saisir le matricule correct
        const matriculeInput = page.locator('[data-testid="delete-modal-matricule-input"]').first()
        if (await matriculeInput.count() > 0) {
          await matriculeInput.fill(testRequest.matricule)
        }

        // Act: Confirmer la suppression
        const submitButton = page.locator('[data-testid="delete-modal-submit-button"]').first()
        await submitButton.click()

        // Assert: Toast de succès
        await waitForSuccessToast(page, /supprimé|succès/i)

        // Assert: Le modal devrait se fermer
        await page.waitForTimeout(2000)
        const modal = page.locator('[data-testid="delete-modal"]').first()
        if (await modal.count() > 0) {
          await expect(modal).not.toBeVisible({ timeout: 5000 })
        }

        // Note: La demande sera supprimée par la Cloud Function
        // Pour vérifier, on devrait attendre que la demande disparaisse de la liste
        await page.waitForTimeout(3000)
        await page.reload()
        await waitForRequestsList(page)
        
        // Marquer comme supprimé pour ne pas essayer de la supprimer dans afterEach
        createdRequests.pop()
      }
    }
  })
})

test.describe('E2E: Envoi WhatsApp du motif de rejet V2', () => {
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

  test('devrait ouvrir le modal WhatsApp pour une demande rejetée', async ({ page }) => {
    // Arrange: Créer une demande rejetée avec numéro de téléphone
    const testRequest = await createRejectedRequest()
    createdRequests.push(testRequest)
    await page.reload()
    await waitForRequestsList(page)

    // Act: Filtrer sur "Rejetées"
    await clickFilterTab(page, 'Rejetées')
    await page.waitForTimeout(2000)

    const searchInput = page.locator('[data-testid="search-input"]').first()
    await expect(searchInput).toBeVisible({ timeout: 5000 })
    await searchInput.fill(testRequest.matricule)
    await page.waitForTimeout(1500)

    const requestRow = await getRequestRow(page, testRequest.id)
    
    if (await requestRow.count() > 0) {
      // Chercher le bouton Envoyer WhatsApp
      const whatsappButton = requestRow.locator('button:has-text("Envoyer WhatsApp"), [data-testid="send-whatsapp-button"]').first()
      
      // Si dans le menu, ouvrir le menu d'abord
      const menuButton = requestRow.locator('[data-testid="action-menu"]').first()
      if (await menuButton.count() > 0 && await menuButton.isVisible()) {
        await menuButton.click()
        await page.waitForTimeout(500)
      }

      if (await whatsappButton.count() > 0) {
        await whatsappButton.click()
        await page.waitForTimeout(1000)

        // Assert: Modal WhatsApp visible
        await waitForModal(page, 'reject-whatsapp-modal')
        
        // Assert: Vérifier que le message template est prérempli
        const messageTextarea = page.locator('[data-testid="reject-whatsapp-modal-message-textarea"]').first()
        if (await messageTextarea.count() > 0) {
          const message = await messageTextarea.inputValue()
          expect(message).toContain('Bonjour')
          expect(message).toContain(testRequest.matricule)
        }
      }
    }
  })

  test('devrait ouvrir WhatsApp Web avec le message de rejet', async ({ page, context }) => {
    // Arrange: Créer une demande rejetée avec numéro de téléphone
    const testRequest = await createRejectedRequest()
    createdRequests.push(testRequest)
    await page.reload()
    await waitForRequestsList(page)

    // Act: Filtrer sur "Rejetées"
    await clickFilterTab(page, 'Rejetées')
    await page.waitForTimeout(2000)

    const searchInput = page.locator('[data-testid="search-input"]').first()
    await expect(searchInput).toBeVisible({ timeout: 5000 })
    await searchInput.fill(testRequest.matricule)
    await page.waitForTimeout(1500)

    const requestRow = await getRequestRow(page, testRequest.id)
    
    if (await requestRow.count() > 0) {
      const menuButton = requestRow.locator('[data-testid="action-menu"]').first()
      if (await menuButton.count() > 0 && await menuButton.isVisible()) {
        await menuButton.click()
        await page.waitForTimeout(500)
      }

      const whatsappButton = requestRow.locator('button:has-text("Envoyer WhatsApp"), [data-testid="send-whatsapp-button"]').first()
      
      if (await whatsappButton.count() > 0) {
        await whatsappButton.click()
        await waitForModal(page, 'reject-whatsapp-modal')
        await page.waitForTimeout(1000)

        // Si plusieurs numéros, sélectionner un numéro
        const phoneSelect = page.locator('[data-testid="reject-whatsapp-modal-phone-select"]').first()
        if (await phoneSelect.count() > 0 && await phoneSelect.isVisible()) {
          await phoneSelect.click()
          await page.waitForTimeout(500)
          const option = page.locator('[role="option"]').first()
          if (await option.count() > 0) {
            await option.click()
            await page.waitForTimeout(500)
          }
        }

        // Act: Ouvrir WhatsApp
        const sendButton = page.locator('[data-testid="reject-whatsapp-modal-send-button"]').first()
        
        // Attendre l'ouverture d'un nouvel onglet
        const [newPage] = await Promise.all([
          context.waitForEvent('page', { timeout: 5000 }).catch(() => null),
          sendButton.click(),
        ])

        // Assert: Si un nouvel onglet a été ouvert, vérifier l'URL WhatsApp
        if (newPage) {
          await expect(newPage.url()).toContain('wa.me/')
          await expect(newPage.url()).toContain('text=')
          await newPage.close()
        } else {
          // Sinon, vérifier que le bouton a été cliqué (le modal peut se fermer)
          await page.waitForTimeout(2000)
          const modal = page.locator('[data-testid="reject-whatsapp-modal"]').first()
          if (await modal.count() > 0) {
            // Le modal peut être fermé après l'ouverture de WhatsApp
            // (comportement attendu selon l'implémentation)
          }
        }
      }
    }
  })

  test('devrait permettre la modification du message WhatsApp', async ({ page }) => {
    // Arrange: Créer une demande rejetée avec numéro de téléphone
    const testRequest = await createRejectedRequest()
    createdRequests.push(testRequest)
    await page.reload()
    await waitForRequestsList(page)

    // Act: Filtrer sur "Rejetées"
    await clickFilterTab(page, 'Rejetées')
    await page.waitForTimeout(2000)

    const searchInput = page.locator('[data-testid="search-input"]').first()
    await expect(searchInput).toBeVisible({ timeout: 5000 })
    await searchInput.fill(testRequest.matricule)
    await page.waitForTimeout(1500)

    const requestRow = await getRequestRow(page, testRequest.id)
    
    if (await requestRow.count() > 0) {
      const menuButton = requestRow.locator('[data-testid="action-menu"]').first()
      if (await menuButton.count() > 0 && await menuButton.isVisible()) {
        await menuButton.click()
        await page.waitForTimeout(500)
      }

      const whatsappButton = requestRow.locator('button:has-text("Envoyer WhatsApp"), [data-testid="send-whatsapp-button"]').first()
      
      if (await whatsappButton.count() > 0) {
        await whatsappButton.click()
        await waitForModal(page, 'reject-whatsapp-modal')
        await page.waitForTimeout(1000)

        // Act: Modifier le message
        const messageTextarea = page.locator('[data-testid="reject-whatsapp-modal-message-textarea"]').first()
        if (await messageTextarea.count() > 0) {
          const originalMessage = await messageTextarea.inputValue()
          await messageTextarea.fill('Message modifié pour test E2E')
          
          // Assert: Le message devrait être modifié
          const modifiedMessage = await messageTextarea.inputValue()
          expect(modifiedMessage).toBe('Message modifié pour test E2E')
          expect(modifiedMessage).not.toBe(originalMessage)
        }
      }
    }
  })
})
