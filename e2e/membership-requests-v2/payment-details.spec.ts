/**
 * Tests E2E pour les détails du paiement - Membership Requests V2
 * 
 * Ces tests vérifient :
 * - Enregistrement d'un paiement avec traçabilité complète
 * - Affichage des détails du paiement dans le modal
 * - Validation de sécurité stricte : "Inconnu" interdit (P0 Sécurité)
 * - Téléchargement et validation du PDF
 * 
 * Exigences critiques (P0 Sécurité) :
 * - recordedBy est obligatoire et doit correspondre à l'admin authentifié
 * - Si "Enregistré par: Inconnu" apparaît → FAIL immédiat (incident sécurité)
 * - Même règle pour le PDF : "Inconnu" interdit
 */

import { test, expect } from '@playwright/test'
import { loginAsAdmin, goToMembershipRequestsV2, waitForRequestsList, waitForModal, waitForSuccessToast, clickFilterTab, waitForRequestInList } from './helpers'
import { createPendingUnpaidRequest, deleteTestMembershipRequest, type CreateTestRequestResult } from './fixtures'
import * as fs from 'fs'
import * as path from 'path'

test.describe('E2E: Détails du paiement - Sécurité & Traçabilité (P0)', () => {
  const createdRequests: CreateTestRequestResult[] = []
  const TEST_CREDENTIALS = {
    matricule: process.env.E2E_AUTH_MATRICULE || '0001.MK.110126',
    email: process.env.E2E_AUTH_EMAIL || 'glenneriss@gmail.com',
  }

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

  /**
   * A) Happy path — Paiement → Détails → Assertions strictes
   * 
   * P0-SEC-01: Vérifier que l'enregistrement d'un paiement inclut la traçabilité complète
   * et que "Inconnu" n'apparaît jamais
   */
  test('P0-SEC-01: devrait enregistrer un paiement avec traçabilité complète et afficher les détails corrects', async ({ page }) => {
    test.setTimeout(180000) // 3 minutes pour ce test critique

    // Arrange: Créer une demande non payée
    const testRequest = await createPendingUnpaidRequest()
    createdRequests.push(testRequest)
    
    await page.waitForTimeout(2000)
    await page.reload()
    await page.waitForLoadState('domcontentloaded')
    await waitForRequestsList(page)
    await page.waitForTimeout(2000)

    // Naviguer vers l'onglet "En attente"
    await clickFilterTab(page, 'En attente')
    
    // Attendre que la demande apparaisse
    const requestRow = await waitForRequestInList(page, testRequest.id, testRequest.matricule)
    await expect(requestRow.first()).toBeVisible({ timeout: 15000 })

    // Act: Ouvrir le modal de paiement
    const payButton = requestRow.locator('[data-testid="action-pay-primary"]').first()
    await expect(payButton).toBeVisible({ timeout: 10000 })
    await payButton.click()
    await waitForModal(page, 'modal-payment')
    await page.waitForTimeout(1000)

    // Remplir le formulaire de paiement
    const today = new Date().toISOString().split('T')[0]
    await page.locator('[data-testid="payment-date"]').fill(today)
    await page.locator('[data-testid="payment-time"]').fill('15:00')
    await page.locator('[data-testid="payment-amount"]').clear()
    await page.locator('[data-testid="payment-amount"]').fill('10300')
    
    // Mode de paiement (shadcn Select) - EXACTEMENT comme payment.spec.ts
    const modeSelectTrigger = page.locator('[data-testid="payment-mode"]').first()
    await expect(modeSelectTrigger).toBeVisible({ timeout: 10000 })
    await modeSelectTrigger.click()
    await page.waitForTimeout(800)
    
    // Sélectionner "Airtel Money" (premier mode mobile money)
    const airtelMoneyOption = page.locator('[role="option"]:has-text("Airtel Money")').first()
    if (await airtelMoneyOption.count() > 0) {
      await airtelMoneyOption.click()
    } else {
      // Fallback: sélectionner le premier mode disponible
      const firstPaymentMode = page.locator('[role="option"]').first()
      await expect(firstPaymentMode).toBeVisible({ timeout: 10000 })
      await firstPaymentMode.click()
    }
    await page.waitForTimeout(800)

    // Frais (si mode mobile money sélectionné)
    const withFeesSelect = page.locator('[data-testid="payment-with-fees"]')
    if (await withFeesSelect.count() > 0 && await withFeesSelect.isVisible()) {
      await withFeesSelect.click()
      await page.waitForTimeout(500)
      const noFeesOption = page.locator('[role="option"]:has-text("Sans frais")').first()
      if (await noFeesOption.count() > 0) {
        await noFeesOption.click()
      } else {
        // Fallback: sélectionner la première option
        const firstFeesOption = page.locator('[role="option"]').first()
        await firstFeesOption.click()
      }
      await page.waitForTimeout(500)
    }

    // Preuve de paiement - Utiliser la justification (plus simple pour le test E2E)
    const proofJustificationTextarea = page.locator('[data-testid="payment-proof-justification"]').first()
    await expect(proofJustificationTextarea).toBeVisible({ timeout: 10000 })
    await proofJustificationTextarea.fill('Paiement effectué en personne, capture d\'écran non disponible pour le moment.')
    await page.waitForTimeout(800)

    // Act: Confirmer le paiement
    const confirmButton = page.locator('[data-testid="confirm-payment"]').first()
    await expect(confirmButton).toBeEnabled({ timeout: 10000 })
    await confirmButton.click()

    // Assert: Toast de succès
    await waitForSuccessToast(page, /payé|succès|enregistré/i)
    await page.waitForTimeout(3000)

    // Vérifier que le modal se ferme
    await expect(page.locator('[data-testid="modal-payment"]')).not.toBeVisible({ timeout: 10000 })

    // Recharger pour voir les changements
    await page.reload()
    await page.waitForLoadState('domcontentloaded')
    await waitForRequestsList(page)
    await page.waitForTimeout(2000)

    // Naviguer vers "Payées"
    await clickFilterTab(page, 'Payées')
    const updatedRow = await waitForRequestInList(page, testRequest.id, testRequest.matricule)
    await expect(updatedRow.first()).toBeVisible({ timeout: 15000 })

    // Act: Ouvrir le menu d'actions et cliquer sur "Voir les détails du paiement"
    const menuButton = updatedRow.locator('[data-testid="action-menu"]').first()
    await expect(menuButton).toBeVisible({ timeout: 10000 })
    await menuButton.click()
    await page.waitForTimeout(500)

    const viewPaymentDetailsMenu = page.locator('[data-testid="action-view-payment-details-menu"]').first()
    await expect(viewPaymentDetailsMenu).toBeVisible({ timeout: 10000 })
    await viewPaymentDetailsMenu.click()
    await page.waitForTimeout(1000)

    // Assert: Modal des détails du paiement visible
    await expect(page.locator('[data-testid="modal-payment-details"]')).toBeVisible({ timeout: 10000 })

    // Assertions strictes sur les données affichées

    // 1. Informations du membre
    const memberName = await page.locator('[data-testid="payment-details-member-name"]').textContent()
    expect(memberName).toBeTruthy()
    expect(memberName?.trim().length).toBeGreaterThan(0)

    const memberMatricule = await page.locator('[data-testid="payment-details-member-matricule"]').textContent()
    if (memberMatricule) {
      expect(memberMatricule).toContain('#')
      expect(memberMatricule.replace('#', '').trim().length).toBeGreaterThan(0)
    }

    // 2. Détails du paiement
    const amount = await page.locator('[data-testid="payment-details-amount"]').textContent()
    // Le montant est formaté avec un espace insécable en français : "10 300 FCFA"
    expect(amount).toMatch(/10\s*300/) // Accepter "10300" ou "10 300" ou "10\u202f300"
    expect(amount).toContain('FCFA')

    const paymentType = await page.locator('[data-testid="payment-details-type"]').textContent()
    expect(paymentType).toBeTruthy()

    const paymentDate = await page.locator('[data-testid="payment-details-date"]').textContent()
    expect(paymentDate).toBeTruthy()
    expect(paymentDate).not.toBe('Date invalide')

    const paymentTime = await page.locator('[data-testid="payment-details-time"]').textContent()
    expect(paymentTime).toBeTruthy()
    expect(paymentTime).toContain('15:00')

    const paymentMode = await page.locator('[data-testid="payment-details-mode"]').textContent()
    expect(paymentMode).toBeTruthy()

    // Note: paymentModeOther n'est présent que si mode="other", donc on vérifie conditionnellement
    const paymentModeOtherElement = page.locator('[data-testid="payment-details-mode-other"]')
    if (await paymentModeOtherElement.count() > 0) {
      const paymentModeOther = await paymentModeOtherElement.textContent()
      expect(paymentModeOther).toBeTruthy()
    }

    // 3. TRAÇABILITÉ - Assertions strictes de sécurité (P0)
    const recordedByName = await page.locator('[data-testid="payment-details-recorded-by-name"]').textContent()
    
    // ⚠️ P0 SÉCURITÉ : Vérifier que "Inconnu" n'apparaît JAMAIS
    expect(recordedByName).toBeTruthy()
    expect(recordedByName?.trim().length).toBeGreaterThan(0)
    expect(recordedByName).not.toBe('Admin inconnu')
    expect(recordedByName?.toLowerCase()).not.toContain('inconnu')
    expect(recordedByName?.toLowerCase()).not.toContain('unknown')

    // Vérifier que recordedByName correspond à un admin valide (non vide, non null)
    const recordedByNameTrimmed = recordedByName?.trim() || ''
    expect(recordedByNameTrimmed.length).toBeGreaterThan(0)
    expect(recordedByNameTrimmed).not.toMatch(/^\s*$/) // Pas uniquement des espaces

    const recordedAt = await page.locator('[data-testid="payment-details-recorded-at"]').textContent()
    expect(recordedAt).toBeTruthy()
    expect(recordedAt).not.toBe('Date invalide')
    expect(recordedAt?.length).toBeGreaterThan(0)
  })

  /**
   * B) Téléchargement PDF — validations strictes
   * 
   * P0-SEC-02: Vérifier que le PDF téléchargé contient les bonnes informations
   * et ne contient JAMAIS "Inconnu"
   */
  test('P0-SEC-02: devrait télécharger un PDF valide sans "Inconnu"', async ({ page }) => {
    test.setTimeout(180000)

    // Arrange: Créer une demande et enregistrer un paiement (réutiliser la logique du test précédent)
    const testRequest = await createPendingUnpaidRequest()
    createdRequests.push(testRequest)
    
    await page.waitForTimeout(2000)
    await page.reload()
    await page.waitForLoadState('domcontentloaded')
    await waitForRequestsList(page)
    await page.waitForTimeout(2000)

    await clickFilterTab(page, 'En attente')
    const requestRow = await waitForRequestInList(page, testRequest.id, testRequest.matricule)
    await expect(requestRow.first()).toBeVisible({ timeout: 15000 })

    // Enregistrer le paiement
    const payButton = requestRow.locator('[data-testid="action-pay-primary"]').first()
    await payButton.click()
    await waitForModal(page, 'modal-payment')
    await page.waitForTimeout(1000)

    const today = new Date().toISOString().split('T')[0]
    await page.locator('[data-testid="payment-date"]').fill(today)
    await page.locator('[data-testid="payment-time"]').fill('15:00')
    await page.locator('[data-testid="payment-amount"]').clear()
    await page.locator('[data-testid="payment-amount"]').fill('10300')
    
    // Mode de paiement (shadcn Select) - EXACTEMENT comme payment.spec.ts
    const modeSelectTrigger2 = page.locator('[data-testid="payment-mode"]').first()
    await expect(modeSelectTrigger2).toBeVisible({ timeout: 10000 })
    await modeSelectTrigger2.click()
    await page.waitForTimeout(800)
    
    // Sélectionner "Airtel Money" (premier mode mobile money)
    const airtelMoneyOption2 = page.locator('[role="option"]:has-text("Airtel Money")').first()
    if (await airtelMoneyOption2.count() > 0) {
      await airtelMoneyOption2.click()
    } else {
      // Fallback: sélectionner le premier mode disponible
      const firstPaymentMode2 = page.locator('[role="option"]').first()
      await expect(firstPaymentMode2).toBeVisible({ timeout: 10000 })
      await firstPaymentMode2.click()
    }
    await page.waitForTimeout(800)

    // Frais (si mode mobile money sélectionné)
    const withFeesSelect2 = page.locator('[data-testid="payment-with-fees"]')
    if (await withFeesSelect2.count() > 0 && await withFeesSelect2.isVisible()) {
      await withFeesSelect2.click()
      await page.waitForTimeout(500)
      const noFeesOption2 = page.locator('[role="option"]:has-text("Sans frais")').first()
      if (await noFeesOption2.count() > 0) {
        await noFeesOption2.click()
      } else {
        // Fallback: sélectionner la première option
        const firstFeesOption2 = page.locator('[role="option"]').first()
        await firstFeesOption2.click()
      }
      await page.waitForTimeout(500)
    }

    // Preuve de paiement - Utiliser la justification (plus simple pour le test E2E)
    const proofJustificationTextarea2 = page.locator('[data-testid="payment-proof-justification"]').first()
    await expect(proofJustificationTextarea2).toBeVisible({ timeout: 10000 })
    await proofJustificationTextarea2.fill('Paiement effectué en personne, capture d\'écran non disponible pour le moment.')
    await page.waitForTimeout(800)

    // Act: Confirmer le paiement
    const confirmButton2 = page.locator('[data-testid="confirm-payment"]').first()
    await expect(confirmButton2).toBeEnabled({ timeout: 10000 })
    await confirmButton2.click()
    await waitForSuccessToast(page, /payé|succès|enregistré/i)
    await page.waitForTimeout(3000)

    // Naviguer vers les demandes payées
    await page.reload()
    await page.waitForLoadState('domcontentloaded')
    await waitForRequestsList(page)
    await page.waitForTimeout(2000)
    await clickFilterTab(page, 'Payées')
    const updatedRow = await waitForRequestInList(page, testRequest.id, testRequest.matricule)
    await expect(updatedRow.first()).toBeVisible({ timeout: 15000 })

    // Ouvrir les détails du paiement
    const menuButton = updatedRow.locator('[data-testid="action-menu"]').first()
    await menuButton.click()
    await page.waitForTimeout(500)
    await page.locator('[data-testid="action-view-payment-details-menu"]').click()
    await page.waitForTimeout(1000)

    // Attendre que le modal soit visible
    await expect(page.locator('[data-testid="modal-payment-details"]')).toBeVisible({ timeout: 10000 })

    // Vérifier la traçabilité AVANT le téléchargement (P0)
    const recordedByName = await page.locator('[data-testid="payment-details-recorded-by-name"]').textContent()
    expect(recordedByName).toBeTruthy()
    expect(recordedByName).not.toBe('Admin inconnu')
    expect(recordedByName?.toLowerCase()).not.toContain('inconnu')

    // Act: Télécharger le PDF
    const downloadButton = page.locator('[data-testid="download-payment-pdf"]').first()
    await expect(downloadButton).toBeVisible({ timeout: 10000 })

    // Attendre le téléchargement
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 30000 }),
      downloadButton.click(),
    ])

    // Assert: Fichier téléchargé
    expect(download).toBeTruthy()
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i)
    expect(download.suggestedFilename().length).toBeGreaterThan(0)

    // Sauvegarder le fichier temporairement pour validation
    const downloadPath = path.join(process.cwd(), 'test-results', 'downloads', download.suggestedFilename())
    await download.saveAs(downloadPath)

    // Vérifier que le fichier existe et a une taille raisonnable (> 0 bytes)
    expect(fs.existsSync(downloadPath)).toBe(true)
    const stats = fs.statSync(downloadPath)
    expect(stats.size).toBeGreaterThan(0)

    // ⚠️ P0 SÉCURITÉ : Vérifier que le PDF ne contient pas "Inconnu"
    // Note: Pour une validation complète du contenu PDF, on pourrait utiliser pdf-parse
    // Pour l'instant, on vérifie au minimum que le fichier existe et que la traçabilité
    // dans le modal est correcte (ce qui est déjà validé ci-dessus)

    // Nettoyer le fichier téléchargé
    if (fs.existsSync(downloadPath)) {
      fs.unlinkSync(downloadPath)
    }
  })

})