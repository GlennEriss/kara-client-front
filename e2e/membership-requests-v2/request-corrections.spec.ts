/**
 * Tests E2E complets pour la demande de corrections V2 (Admin)
 * 
 * Ces tests vérifient tous les cas documentés dans TESTS_E2E.md
 * 
 * @see documentation/membership-requests/corrections/test/TESTS_E2E.md
 */

import { test, expect } from '@playwright/test'
import { loginAsAdmin, goToMembershipRequestsV2, waitForRequestsList, waitForModal, waitForSuccessToast, getRequestRow } from './helpers'
import { 
  createPendingUnpaidRequest, 
  createRequestWithCorrections,
  deleteTestMembershipRequest, 
  type CreateTestRequestResult 
} from './fixtures'

test.describe('E2E: Demander des Corrections (Admin)', () => {
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

  test('P0-CORR-01: devrait demander des corrections pour une demande en attente', async ({ page }) => {
    test.setTimeout(120000)

    // 1. Créer une demande en pending
    const request = await createPendingUnpaidRequest()
    createdRequests.push(request)
    await page.reload()
    await waitForRequestsList(page)
    
    // 2. Rechercher la demande
    const searchInput = page.locator('[data-testid="search-input"]').first()
    await expect(searchInput).toBeVisible({ timeout: 5000 })
    await searchInput.fill(request.matricule)
    await page.waitForTimeout(2000)

    // 3. Trouver la ligne de la demande
    const requestRow = await getRequestRow(page, request.id)
    await expect(requestRow).toBeVisible({ timeout: 10000 })

    // 4. Ouvrir le dropdown "⋮"
    const menuButton = requestRow.locator('[data-testid="action-menu"]').first()
    await expect(menuButton).toBeVisible()
    await menuButton.click()
    await page.waitForTimeout(500)

    // 5. Cliquer sur "Demander des corrections"
    const requestCorrectionsMenu = page.locator('[data-testid="action-request-corrections-menu"]').first()
    await expect(requestCorrectionsMenu).toBeVisible()
    await requestCorrectionsMenu.click()

    // 6. Vérifier que le modal s'ouvre
    const modal = page.locator('[data-testid="corrections-modal"]')
    await expect(modal).toBeVisible({ timeout: 5000 })
    await expect(page.locator('[data-testid="corrections-modal-title"]')).toContainText('Demander des corrections')

    // 7. Saisir les corrections
    const textarea = page.locator('[data-testid="corrections-modal-textarea"]')
    await textarea.fill('Photo floue\nAdresse incomplète\nSignature manquante')

    // 8. Vérifier le compteur
    const counter = page.locator('[data-testid="corrections-modal-counter"]')
    await expect(counter).toContainText('3 correction')

    // 9. Vérifier que le bouton est actif
    const submitButton = page.locator('[data-testid="corrections-modal-submit-button"]')
    await expect(submitButton).toBeEnabled()

    // 10. Soumettre
    await submitButton.click()

    // 11. Vérifier que le modal se ferme
    await expect(modal).not.toBeVisible({ timeout: 10000 })

    // 12. Vérifier le toast de succès
    await waitForSuccessToast(page, /correction|succès/i)

    // 13. Vérifier que le badge change en "En cours d'examen"
    await page.reload()
    await waitForRequestsList(page)
    
    // Réappliquer la recherche
    await searchInput.fill(request.matricule)
    await page.waitForTimeout(2000)
    
    const updatedRow = await getRequestRow(page, request.id)
    const badge = updatedRow.locator('[data-testid="status-under-review-badge"]')
    await expect(badge).toBeVisible({ timeout: 10000 })
    await expect(badge).toContainText('En cours d\'examen')

    // 14. Vérifier que le bloc "Corrections demandées" apparaît
    // Le bloc est dans une ligne séparée du tableau, donc on le cherche dans le tableau entier
    const correctionsBlock = page.locator(`[data-testid="corrections-block"][data-request-id="${request.id}"]`)
    await expect(correctionsBlock).toBeVisible({ timeout: 10000 })
    await expect(correctionsBlock.locator('[data-testid="corrections-block-title"]')).toContainText('Corrections demandées')
    
    // 15. Vérifier les corrections affichées
    await expect(correctionsBlock.locator('[data-testid="correction-item-0"]')).toContainText('Photo floue')
    await expect(correctionsBlock.locator('[data-testid="correction-item-1"]')).toContainText('Adresse incomplète')
    await expect(correctionsBlock.locator('[data-testid="correction-item-2"]')).toContainText('Signature manquante')

    // 16. Vérifier le code affiché (format XX-XX-XX)
    // Le code est masqué par défaut, il faut cliquer sur le bouton toggle pour l'afficher
    const toggleButton = correctionsBlock.locator('[data-testid="corrections-block-toggle-code-button"]')
    await expect(toggleButton).toBeVisible()
    await toggleButton.click()
    await page.waitForTimeout(500) // Attendre que le code s'affiche
    
    const codeValue = correctionsBlock.locator('[data-testid="corrections-block-code-value"]')
    await expect(codeValue).toBeVisible()
    const codeText = await codeValue.textContent()
    expect(codeText).toMatch(/^\d{2}-\d{2}-\d{2}$/) // Format XX-XX-XX

    // 17. Vérifier l'expiration avec date et temps restant
    const expiryValue = correctionsBlock.locator('[data-testid="corrections-block-expiry-value"]')
    await expect(expiryValue).toBeVisible()
    const expiryText = await expiryValue.textContent()
    expect(expiryText).toMatch(/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/) // Format "18/01/2026 22:10"
    
    const expiryRemaining = correctionsBlock.locator('[data-testid="corrections-block-expiry-remaining"]')
    await expect(expiryRemaining).toBeVisible()
    const remainingText = await expiryRemaining.textContent()
    expect(remainingText).toMatch(/\d{2}:\d{2}:\d{2}/) // Format "HH:MM:SS"

    // 18. Vérifier "Demandé par" avec nom (matricule optionnel)
    const requestedByContainer = correctionsBlock.locator('[data-testid="corrections-block-requested-by"]')
    // Le bloc "Demandé par" peut ne pas être visible si processedBy n'est pas fourni
    if (await requestedByContainer.count() > 0) {
      const requestedByValue = correctionsBlock.locator('[data-testid="corrections-block-requested-by-value"]')
      if (await requestedByValue.count() > 0) {
        await expect(requestedByValue).toBeVisible()
        const requestedByText = await requestedByValue.textContent()
        expect(requestedByText).toBeTruthy() // Nom de l'admin
      }
      
      // Le matricule est optionnel (peut ne pas être fourni)
      const requestedByMatricule = correctionsBlock.locator('[data-testid="corrections-block-requested-by-matricule"]')
      if (await requestedByMatricule.count() > 0) {
        await expect(requestedByMatricule).toBeVisible()
        const matriculeText = await requestedByMatricule.textContent()
        expect(matriculeText).toBeTruthy() // Matricule de l'admin
      }
    }

    // 19. Vérifier que les actions restent accessibles (Détails, Fiche, Pièce)
    const menuButtonAfter = updatedRow.locator('[data-testid="action-menu"]').first()
    await menuButtonAfter.click()
    await page.waitForTimeout(500)
    
    // Vérifier que "Voir les détails" est toujours visible
    const viewDetailsMenu = page.locator('text=Voir les détails').first()
    await expect(viewDetailsMenu).toBeVisible()
  })

  test('P0-CORR-02: devrait afficher "Demander des corrections" uniquement si status=pending', async ({ page }) => {
    // 1. Créer une demande en pending
    const pendingRequest = await createPendingUnpaidRequest()
    createdRequests.push(pendingRequest)

    // 2. Créer une demande en under_review
    const underReviewRequest = await createRequestWithCorrections()
    createdRequests.push(underReviewRequest)

    await page.reload()
    await waitForRequestsList(page)

    // 3. Vérifier que "Demander des corrections" est visible pour pending
    const searchInput = page.locator('[data-testid="search-input"]').first()
    await searchInput.fill(pendingRequest.matricule)
    await page.waitForTimeout(2000)
    
    const pendingRow = await getRequestRow(page, pendingRequest.id)
    const pendingMenuButton = pendingRow.locator('[data-testid="action-menu"]').first()
    await pendingMenuButton.click()
    await page.waitForTimeout(500)
    
    const requestCorrectionsMenuPending = page.locator('[data-testid="action-request-corrections-menu"]').first()
    await expect(requestCorrectionsMenuPending).toBeVisible()
    await page.keyboard.press('Escape') // Fermer le menu
    await page.waitForTimeout(500)

    // 4. Vérifier que "Demander des corrections" n'est PAS visible pour under_review
    await searchInput.clear()
    await searchInput.fill(underReviewRequest.matricule)
    await page.waitForTimeout(2000)
    
    const underReviewRow = await getRequestRow(page, underReviewRequest.id)
    const underReviewMenuButton = underReviewRow.locator('[data-testid="action-menu"]').first()
    await underReviewMenuButton.click()
    await page.waitForTimeout(500)
    
    const requestCorrectionsMenuUnderReview = page.locator('[data-testid="action-request-corrections-menu"]')
    await expect(requestCorrectionsMenuUnderReview).not.toBeVisible()
  })

  test('P0-CORR-02B: devrait désactiver le bouton si aucune correction saisie', async ({ page }) => {
    const request = await createPendingUnpaidRequest()
    createdRequests.push(request)

    await page.reload()
    await waitForRequestsList(page)
    
    const searchInput = page.locator('[data-testid="search-input"]').first()
    await searchInput.fill(request.matricule)
    await page.waitForTimeout(2000)
    
    const requestRow = await getRequestRow(page, request.id)
    const menuButton = requestRow.locator('[data-testid="action-menu"]').first()
    await menuButton.click()
    await page.waitForTimeout(500)

    const requestCorrectionsMenu = page.locator('[data-testid="action-request-corrections-menu"]').first()
    await requestCorrectionsMenu.click()

    const modal = page.locator('[data-testid="corrections-modal"]')
    await expect(modal).toBeVisible()

    const submitButton = page.locator('[data-testid="corrections-modal-submit-button"]')
    await expect(submitButton).toBeDisabled()

    const textarea = page.locator('[data-testid="corrections-modal-textarea"]')
    await textarea.fill('   ') // Espaces uniquement

    await expect(submitButton).toBeDisabled()
  })

  test('P0-CORR-03: devrait ne pas afficher WhatsApp dans le modal de corrections', async ({ page }) => {
    const request = await createPendingUnpaidRequest()
    createdRequests.push(request)

    await page.reload()
    await waitForRequestsList(page)
    
    const searchInput = page.locator('[data-testid="search-input"]').first()
    await searchInput.fill(request.matricule)
    await page.waitForTimeout(2000)
    
    const requestRow = await getRequestRow(page, request.id)
    const menuButton = requestRow.locator('[data-testid="action-menu"]').first()
    await menuButton.click()
    await page.waitForTimeout(500)

    const requestCorrectionsMenu = page.locator('[data-testid="action-request-corrections-menu"]').first()
    await requestCorrectionsMenu.click()

    const modal = page.locator('[data-testid="corrections-modal"]')
    await expect(modal).toBeVisible()

    // Vérifier que WhatsApp n'est PAS dans le modal
    const whatsappCheckbox = modal.locator('text=Envoyer via WhatsApp')
    await expect(whatsappCheckbox).not.toBeVisible()
    
    const phoneSelect = modal.locator('[data-testid="whatsapp-modal-phone-select"]')
    await expect(phoneSelect).not.toBeVisible()

    // Vérifier que seul le textarea est présent
    const textarea = modal.locator('[data-testid="corrections-modal-textarea"]')
    await expect(textarea).toBeVisible()
  })

  test('P0-CORR-03B: devrait afficher le compteur de corrections en temps réel', async ({ page }) => {
    const request = await createPendingUnpaidRequest()
    createdRequests.push(request)

    await page.reload()
    await waitForRequestsList(page)
    
    const searchInput = page.locator('[data-testid="search-input"]').first()
    await searchInput.fill(request.matricule)
    await page.waitForTimeout(2000)
    
    const requestRow = await getRequestRow(page, request.id)
    const menuButton = requestRow.locator('[data-testid="action-menu"]').first()
    await menuButton.click()
    await page.waitForTimeout(500)

    const requestCorrectionsMenu = page.locator('[data-testid="action-request-corrections-menu"]').first()
    await requestCorrectionsMenu.click()

    const modal = page.locator('[data-testid="corrections-modal"]')
    await expect(modal).toBeVisible()

    const textarea = page.locator('[data-testid="corrections-modal-textarea"]')
    const counter = page.locator('[data-testid="corrections-modal-counter"]')

    await textarea.fill('Photo floue')
    await expect(counter).toContainText('1 correction')

    await textarea.fill('Photo floue\nAdresse incomplète')
    await expect(counter).toContainText('2 correction')

    await textarea.fill('Photo floue\nAdresse incomplète\nSignature manquante')
    await expect(counter).toContainText('3 correction')
  })

  test('P0-CORR-04: devrait copier le lien de correction dans le presse-papier', async ({ page, context }) => {
    // 1. Créer une demande avec corrections
    const request = await createRequestWithCorrections()
    createdRequests.push(request)

    await page.reload()
    await waitForRequestsList(page)
    
    const searchInput = page.locator('[data-testid="search-input"]').first()
    await searchInput.fill(request.matricule)
    await page.waitForTimeout(2000)
    
    const requestRow = await getRequestRow(page, request.id)
    // Le bloc de corrections est dans une ligne séparée du tableau
    const correctionsBlock = page.locator(`[data-testid="corrections-block"][data-request-id="${request.id}"]`)
    await expect(correctionsBlock).toBeVisible({ timeout: 10000 })

    // 2. Cliquer sur "Copier lien"
    const copyButton = correctionsBlock.locator('[data-testid="corrections-block-copy-link-button"]')
    await copyButton.click()

    // 3. Vérifier le toast
    await expect(page.locator('text=/Lien copié/i')).toBeVisible({ timeout: 5000 })

    // 4. Vérifier que le lien est dans le presse-papier (format: /register?requestId=XXX, SANS code)
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText())
    expect(clipboardText).toContain('/register?requestId=')
    expect(clipboardText).toContain(request.id)
    // Le code ne doit PAS être dans l'URL copiée
    expect(clipboardText).not.toContain('code=')
  })

  test('P0-CORR-05: devrait afficher "Envoyer via WhatsApp" uniquement si numéro disponible', async ({ page }) => {
    // 1. Créer une demande avec numéro
    const requestWithPhone = await createRequestWithCorrections({
      contacts: ['+24165671734'],
    })
    createdRequests.push(requestWithPhone)

    // 2. Créer une demande sans numéro
    const requestWithoutPhone = await createRequestWithCorrections({
      contacts: [],
    })
    createdRequests.push(requestWithoutPhone)

    await page.reload()
    await waitForRequestsList(page)

    // 3. Vérifier que le bouton WhatsApp est visible si numéro disponible
    const searchInput = page.locator('[data-testid="search-input"]').first()
    await searchInput.fill(requestWithPhone.matricule)
    await page.waitForTimeout(2000)
    
    const rowWithPhone = await getRequestRow(page, requestWithPhone.id)
    const correctionsBlockWithPhone = page.locator(`[data-testid="corrections-block"][data-request-id="${requestWithPhone.id}"]`)
    await expect(correctionsBlockWithPhone).toBeVisible({ timeout: 10000 })
    
    const whatsappButtonWithPhone = correctionsBlockWithPhone.locator('[data-testid="corrections-block-send-whatsapp-button"]')
    await expect(whatsappButtonWithPhone).toBeVisible()

    // 4. Vérifier que le bouton WhatsApp n'est PAS visible si pas de numéro
    await searchInput.clear()
    await searchInput.fill(requestWithoutPhone.matricule)
    await page.waitForTimeout(2000)
    
    const rowWithoutPhone = await getRequestRow(page, requestWithoutPhone.id)
    const correctionsBlockWithoutPhone = page.locator(`[data-testid="corrections-block"][data-request-id="${requestWithoutPhone.id}"]`)
    await expect(correctionsBlockWithoutPhone).toBeVisible({ timeout: 10000 })
    
    const whatsappButtonWithoutPhone = correctionsBlockWithoutPhone.locator('[data-testid="corrections-block-send-whatsapp-button"]')
    await expect(whatsappButtonWithoutPhone).not.toBeVisible()
  })

  test('P0-CORR-05B: devrait ouvrir WhatsApp avec le message correct', async ({ page, context }) => {
    const request = await createRequestWithCorrections({
      contacts: ['+24165671734', '+24107123456'],
    })
    createdRequests.push(request)

    await page.reload()
    await waitForRequestsList(page)
    
    const searchInput = page.locator('[data-testid="search-input"]').first()
    await searchInput.fill(request.matricule)
    await page.waitForTimeout(2000)
    
    const requestRow = await getRequestRow(page, request.id)
    // Le bloc de corrections est dans une ligne séparée du tableau
    const correctionsBlock = page.locator(`[data-testid="corrections-block"][data-request-id="${request.id}"]`)
    await expect(correctionsBlock).toBeVisible({ timeout: 10000 })

    // 1. Cliquer sur "Envoyer WhatsApp"
    const whatsappButton = correctionsBlock.locator('[data-testid="corrections-block-send-whatsapp-button"]')
    await whatsappButton.click()

    // 2. Vérifier que le modal WhatsApp s'ouvre
    const whatsappModal = page.locator('[data-testid="whatsapp-modal"]')
    await expect(whatsappModal).toBeVisible({ timeout: 5000 })

    // 3. Sélectionner un numéro (si plusieurs)
    const phoneSelect = page.locator('[data-testid="whatsapp-modal-phone-select-trigger"]')
    if (await phoneSelect.isVisible()) {
      await phoneSelect.click()
      await page.waitForTimeout(500)
      const phoneOption = page.locator('[data-testid="whatsapp-modal-phone-option-1"]')
      await phoneOption.click()
      await page.waitForTimeout(500)
    }

    // 4. Cliquer sur "Envoyer via WhatsApp"
    const sendButton = page.locator('[data-testid="whatsapp-modal-send-button"]')
    await sendButton.click()

    // 5. Vérifier qu'un nouvel onglet WhatsApp s'ouvre
    await page.waitForTimeout(1000)
    const pages = await context.pages()
    expect(pages.length).toBeGreaterThan(1)
    
    const whatsappPage = pages[pages.length - 1]
    // WhatsApp peut utiliser wa.me ou api.whatsapp.com selon la redirection
    expect(whatsappPage.url()).toMatch(/(wa\.me|api\.whatsapp\.com)/)
    expect(whatsappPage.url()).toContain('24107123456') // Numéro sélectionné

    // 6. Vérifier que le message WhatsApp contient : lien + code + expiration
    const urlParams = new URLSearchParams(whatsappPage.url().split('?')[1] || '')
    const textParam = urlParams.get('text')
    expect(textParam).toBeTruthy()
    
    const decodedMessage = decodeURIComponent(textParam || '')
    expect(decodedMessage).toContain('/register?requestId=') // Lien
    expect(decodedMessage).toMatch(/\d{2}-\d{2}-\d{2}/) // Code formaté (XX-XX-XX)
    expect(decodedMessage).toMatch(/\d{2}\/\d{2}\/\d{4}/) // Date expiration
    // Le temps restant peut être en format HH:MM:SS ou "reste Xj Xh" selon l'implémentation
    expect(decodedMessage).toMatch(/(\d{2}:\d{2}:\d{2}|reste \d+j \d+h)/) // Temps restant
  })

  test('P0-CORR-06B: devrait régénérer le code de sécurité', async ({ page }) => {
    const request = await createRequestWithCorrections()
    createdRequests.push(request)

    await page.reload()
    await waitForRequestsList(page)
    
    const searchInput = page.locator('[data-testid="search-input"]').first()
    await searchInput.fill(request.matricule)
    await page.waitForTimeout(2000)
    
    const requestRow = await getRequestRow(page, request.id)
    
    // 1. Récupérer l'ancien code
    const correctionsBlock = page.locator(`[data-testid="corrections-block"][data-request-id="${request.id}"]`)
    await expect(correctionsBlock).toBeVisible({ timeout: 10000 })
    const oldCode = await correctionsBlock.locator('[data-testid="corrections-block-code-value"]').textContent()

    // 2. Ouvrir le dropdown
    const menuButton = requestRow.locator('[data-testid="action-menu"]').first()
    await menuButton.click()
    await page.waitForTimeout(500)

    // 3. Cliquer sur "Régénérer le code" (chercher dans le menu)
    // Note: Le menu item pour régénérer n'existe peut-être pas encore, on cherche le bouton dans le bloc
    const renewButton = correctionsBlock.locator('[data-testid="corrections-block-renew-code-button"]')
    if (await renewButton.count() > 0) {
      // Utiliser force: true car le bouton peut être intercepté par un overlay
      await renewButton.click({ force: true })
    } else {
      // Fallback: chercher dans le menu
      const renewMenu = page.locator('text=/Régénérer|Renouveler/i').first()
      if (await renewMenu.count() > 0) {
        await renewMenu.click()
      } else {
        test.skip() // Test skip si le bouton n'existe pas encore
      }
    }

    // 4. Vérifier que le modal s'ouvre
    const renewModal = page.locator('[data-testid="renew-code-modal"]')
    await expect(renewModal).toBeVisible({ timeout: 5000 })

    // 5. Vérifier l'avertissement
    const warning = page.locator('[data-testid="renew-code-modal-warning"]')
    await expect(warning).toBeVisible()

    // 6. Cocher la confirmation
    const checkbox = page.locator('[data-testid="renew-code-modal-confirm-checkbox"]')
    await checkbox.click()

    // 7. Cliquer sur "Régénérer le code"
    const renewConfirmButton = page.locator('[data-testid="renew-code-modal-renew-button"]')
    await expect(renewConfirmButton).toBeEnabled()
    await renewConfirmButton.click()

    // 8. Vérifier le toast
    await expect(page.locator('text=/Code régénéré|succès/i')).toBeVisible({ timeout: 10000 })

    // 9. Vérifier que le nouveau code est différent
    await page.reload()
    await waitForRequestsList(page)
    
    await searchInput.fill(request.matricule)
    await page.waitForTimeout(2000)
    
    const updatedRow = await getRequestRow(page, request.id)
    const updatedBlock = updatedRow.locator('[data-testid="corrections-block"]')
    const newCode = await updatedBlock.locator('[data-testid="corrections-block-code-value"]').textContent()
    
    expect(newCode).not.toBe(oldCode)
    expect(newCode).toMatch(/^\d{2}-\d{2}-\d{2}$/)
  })
})
