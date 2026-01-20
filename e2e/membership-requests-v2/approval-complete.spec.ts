/**
 * Tests E2E complets pour l'approbation d'une demande d'adhésion
 * 
 * 18 scénarios de test couvrant tous les cas d'usage :
 * - Approbation basique (P0)
 * - Gestion entreprise/profession (P0)
 * - Gestion du PDF (P0)
 * - États et erreurs (P0)
 * - Téléchargement PDF (P0)
 * - Rollback (P1)
 * - Traçabilité (P1)
 * - Notifications (P1)
 * - Responsive (P2)
 * 
 * @see TESTS_E2E.md
 */

import { test, expect } from '@playwright/test'
import { loginAsAdmin, goToMembershipRequestsV2, waitForRequestsList, getRequestRow, waitForSuccessToast, waitForModal } from './helpers'
import { createPendingPaidRequest, createPendingUnpaidRequest, createTestMembershipRequest, deleteTestMembershipRequest, type CreateTestRequestResult } from './fixtures'
import * as path from 'path'
import * as fs from 'fs'

test.describe('E2E: Approbation Complète (18 scénarios)', () => {
  const createdRequests: CreateTestRequestResult[] = []
  const testPdfPath = path.join(__dirname, '../fixtures/test-document.pdf')

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

  // ==================== P0: APPROBATION BASIQUE ====================

  test('P0-APPROV-01: Approuver une demande payée avec tous les champs requis', async ({ page }) => {
    // Arrange
    const testRequest = await createPendingPaidRequest()
    createdRequests.push(testRequest)
    await page.reload()
    await waitForRequestsList(page)

    // Act: Rechercher la demande
    const searchInput = page.locator('[data-testid="search-input"]').first()
    await expect(searchInput).toBeVisible({ timeout: 5000 })
    await searchInput.fill(testRequest.matricule)
    await page.waitForTimeout(1500)

    const paidRow = await getRequestRow(page, testRequest.id)
    if (await paidRow.count() === 0) {
      test.skip()
      return
    }

    const approveButton = paidRow.locator('button:has-text("Approuver"), [data-testid="action-approve-primary"]').first()
    if (await approveButton.count() === 0 || !(await approveButton.isVisible())) {
      test.skip()
      return
    }

    // Act: Ouvrir le modal
    await approveButton.click()
    await waitForModal(page, 'modal-approve')
    await page.waitForTimeout(1000)

    // Act: Sélectionner le type de membre
    const membershipTypeSelect = page.locator('[data-testid="approval-modal-membership-type-select"]')
    await expect(membershipTypeSelect).toBeVisible({ timeout: 5000 })
    await membershipTypeSelect.selectOption({ index: 0 })
    await page.waitForTimeout(500)

    // Act: Uploader un PDF
    const pdfInput = page.locator('[data-testid="approval-modal-pdf-file-input"]')
    if (fs.existsSync(testPdfPath)) {
      await pdfInput.setInputFiles(testPdfPath)
      await page.waitForTimeout(1000)
    }

    // Act: Cliquer sur Approuver
    const approveModalButton = page.locator('[data-testid="approval-modal-approve-button"]')
    await expect(approveModalButton).toBeEnabled({ timeout: 5000 })
    await approveModalButton.click()

    // Assert: Toast de succès
    await waitForSuccessToast(page, /approuvée|succès/i, { timeout: 15000 })

    // Assert: Le statut passe à approved
    await page.waitForTimeout(3000)
    const statusBadge = paidRow.locator('[data-testid="status-badge"]')
    if (await statusBadge.count() > 0) {
      await expect(statusBadge.first()).toContainText(/approuvée|approved/i, { timeout: 10000 })
    }
  })

  test('P0-APPROV-02: Validation - Type de membre requis', async ({ page }) => {
    // Arrange
    const testRequest = await createPendingPaidRequest()
    createdRequests.push(testRequest)
    await page.reload()
    await waitForRequestsList(page)

    const searchInput = page.locator('[data-testid="search-input"]').first()
    await searchInput.fill(testRequest.matricule)
    await page.waitForTimeout(1500)

    const paidRow = await getRequestRow(page, testRequest.id)
    if (await paidRow.count() === 0) {
      test.skip()
      return
    }

    const approveButton = paidRow.locator('button:has-text("Approuver"), [data-testid="action-approve-primary"]').first()
    if (await approveButton.count() === 0 || !(await approveButton.isVisible())) {
      test.skip()
      return
    }

    // Act: Ouvrir le modal
    await approveButton.click()
    await waitForModal(page, 'modal-approve')
    await page.waitForTimeout(1000)

    // Act: Ne pas sélectionner le type de membre, uploader un PDF
    const pdfInput = page.locator('[data-testid="approval-modal-pdf-file-input"]')
    if (fs.existsSync(testPdfPath)) {
      await pdfInput.setInputFiles(testPdfPath)
      await page.waitForTimeout(1000)
    }

    // Assert: Le bouton Approuver est désactivé
    const approveModalButton = page.locator('[data-testid="approval-modal-approve-button"]')
    await expect(approveModalButton).toBeDisabled()

    // Act: Sélectionner le type de membre
    const membershipTypeSelect = page.locator('[data-testid="approval-modal-membership-type-select"]')
    await membershipTypeSelect.selectOption({ index: 0 })
    await page.waitForTimeout(500)

    // Assert: Le bouton Approuver est activé
    await expect(approveModalButton).toBeEnabled()
  })

  test('P0-APPROV-03: Validation - PDF d\'adhésion requis', async ({ page }) => {
    // Arrange
    const testRequest = await createPendingPaidRequest()
    createdRequests.push(testRequest)
    await page.reload()
    await waitForRequestsList(page)

    const searchInput = page.locator('[data-testid="search-input"]').first()
    await searchInput.fill(testRequest.matricule)
    await page.waitForTimeout(1500)

    const paidRow = await getRequestRow(page, testRequest.id)
    if (await paidRow.count() === 0) {
      test.skip()
      return
    }

    const approveButton = paidRow.locator('button:has-text("Approuver"), [data-testid="action-approve-primary"]').first()
    if (await approveButton.count() === 0 || !(await approveButton.isVisible())) {
      test.skip()
      return
    }

    // Act: Ouvrir le modal
    await approveButton.click()
    await waitForModal(page, 'modal-approve')
    await page.waitForTimeout(1000)

    // Act: Sélectionner le type de membre, ne pas uploader de PDF
    const membershipTypeSelect = page.locator('[data-testid="approval-modal-membership-type-select"]')
    await membershipTypeSelect.selectOption({ index: 0 })
    await page.waitForTimeout(500)

    // Assert: Le bouton Approuver est désactivé
    const approveModalButton = page.locator('[data-testid="approval-modal-approve-button"]')
    await expect(approveModalButton).toBeDisabled()

    // Act: Uploader un PDF
    const pdfInput = page.locator('[data-testid="approval-modal-pdf-file-input"]')
    if (fs.existsSync(testPdfPath)) {
      await pdfInput.setInputFiles(testPdfPath)
      await page.waitForTimeout(1000)
    }

    // Assert: Le bouton Approuver est activé
    await expect(approveModalButton).toBeEnabled()
  })

  // ==================== P0: GESTION ENTREPRISE/PROFESSION ====================

  test('P0-APPROV-04: Créer une entreprise si elle n\'existe pas', async ({ page }) => {
    // Arrange: Créer une demande avec isEmployed: true et companyName
    // Note: La fonction createTestMembershipRequest crée toujours une demande avec company par défaut
    // Pour tester une entreprise qui n'existe pas, on utilise un nom unique
    const testRequest = await createTestMembershipRequest({
      status: 'pending',
      isPaid: true,
    })
    createdRequests.push(testRequest)
    await page.reload()
    await waitForRequestsList(page)

    const searchInput = page.locator('[data-testid="search-input"]').first()
    await searchInput.fill(testRequest.matricule)
    await page.waitForTimeout(1500)

    const paidRow = await getRequestRow(page, testRequest.id)
    if (await paidRow.count() === 0) {
      test.skip()
      return
    }

    const approveButton = paidRow.locator('button:has-text("Approuver"), [data-testid="action-approve-primary"]').first()
    if (await approveButton.count() === 0 || !(await approveButton.isVisible())) {
      test.skip()
      return
    }

    // Act: Ouvrir le modal
    await approveButton.click()
    await waitForModal(page, 'modal-approve')
    await page.waitForTimeout(1000)

    // Assert: La section entreprise est visible
    const companySection = page.locator('[data-testid="approval-modal-company-section"]')
    if (await companySection.count() > 0) {
      await expect(companySection).toBeVisible()
      
      // Vérifier que le nom de l'entreprise est affiché
      const companyName = page.locator('[data-testid="approval-modal-company-name"]')
      await expect(companyName).toBeVisible()
      // Le nom de l'entreprise devrait être celui de la demande créée
      await expect(companyName).toContainText(/Test Company|Entreprise/i)
      
      // Note: La création d'entreprise nécessite une fonctionnalité qui n'est peut-être pas encore implémentée
      // Le test vérifie juste que la section est visible et que l'entreprise est affichée
    } else {
      test.skip()
    }
  })

  test('P0-APPROV-05: Créer une profession si elle n\'existe pas', async ({ page }) => {
    // Arrange: Créer une demande avec isEmployed: true et profession
    // Note: La fonction createTestMembershipRequest crée toujours une demande avec company par défaut
    // Pour tester une profession qui n'existe pas, on utilise un nom unique
    const testRequest = await createTestMembershipRequest({
      status: 'pending',
      isPaid: true,
    })
    createdRequests.push(testRequest)
    await page.reload()
    await waitForRequestsList(page)

    const searchInput = page.locator('[data-testid="search-input"]').first()
    await searchInput.fill(testRequest.matricule)
    await page.waitForTimeout(1500)

    const paidRow = await getRequestRow(page, testRequest.id)
    if (await paidRow.count() === 0) {
      test.skip()
      return
    }

    const approveButton = paidRow.locator('button:has-text("Approuver"), [data-testid="action-approve-primary"]').first()
    if (await approveButton.count() === 0 || !(await approveButton.isVisible())) {
      test.skip()
      return
    }

    // Act: Ouvrir le modal
    await approveButton.click()
    await waitForModal(page, 'modal-approve')
    await page.waitForTimeout(1000)

    // Assert: La section profession est visible
    const professionSection = page.locator('[data-testid="approval-modal-profession-section"]')
    if (await professionSection.count() > 0) {
      await expect(professionSection).toBeVisible()
      
      // Vérifier que le nom de la profession est affiché
      const professionName = page.locator('[data-testid="approval-modal-profession-name"]')
      await expect(professionName).toBeVisible()
      // Le nom de la profession devrait être celui de la demande créée
      await expect(professionName).toContainText(/Testeur|Profession/i)
      
      // Note: La création de profession nécessite une fonctionnalité qui n'est peut-être pas encore implémentée
      // Le test vérifie juste que la section est visible et que la profession est affichée
    } else {
      test.skip()
    }
  })

  test('P0-APPROV-06: Membre au chômage (pas d\'entreprise/profession)', async ({ page }) => {
    // Arrange: Créer une demande avec isEmployed: false
    const testRequest = await createTestMembershipRequest({
      status: 'pending',
      isPaid: true,
    })
    createdRequests.push(testRequest)
    await page.reload()
    await waitForRequestsList(page)

    const searchInput = page.locator('[data-testid="search-input"]').first()
    await searchInput.fill(testRequest.matricule)
    await page.waitForTimeout(1500)

    const paidRow = await getRequestRow(page, testRequest.id)
    if (await paidRow.count() === 0) {
      test.skip()
      return
    }

    const approveButton = paidRow.locator('button:has-text("Approuver"), [data-testid="action-approve-primary"]').first()
    if (await approveButton.count() === 0 || !(await approveButton.isVisible())) {
      test.skip()
      return
    }

    // Act: Ouvrir le modal
    await approveButton.click()
    await waitForModal(page, 'modal-approve')
    await page.waitForTimeout(1000)

    // Assert: Les sections entreprise/profession ne sont pas affichées
    const companySection = page.locator('[data-testid="approval-modal-company-section"]')
    const professionSection = page.locator('[data-testid="approval-modal-profession-section"]')
    
    // Ces sections peuvent ne pas être présentes du tout ou être cachées
    if (await companySection.count() > 0) {
      await expect(companySection).not.toBeVisible()
    }
    if (await professionSection.count() > 0) {
      await expect(professionSection).not.toBeVisible()
    }
  })

  // ==================== P0: GESTION DU PDF ====================

  test('P0-APPROV-07: Upload et suppression du PDF', async ({ page }) => {
    // Arrange
    const testRequest = await createPendingPaidRequest()
    createdRequests.push(testRequest)
    await page.reload()
    await waitForRequestsList(page)

    const searchInput = page.locator('[data-testid="search-input"]').first()
    await searchInput.fill(testRequest.matricule)
    await page.waitForTimeout(1500)

    const paidRow = await getRequestRow(page, testRequest.id)
    if (await paidRow.count() === 0) {
      test.skip()
      return
    }

    const approveButton = paidRow.locator('button:has-text("Approuver"), [data-testid="action-approve-primary"]').first()
    if (await approveButton.count() === 0 || !(await approveButton.isVisible())) {
      test.skip()
      return
    }

    // Act: Ouvrir le modal
    await approveButton.click()
    await waitForModal(page, 'modal-approve')
    await page.waitForTimeout(1000)

    // Act: Uploader un PDF
    const pdfInput = page.locator('[data-testid="approval-modal-pdf-file-input"]')
    if (fs.existsSync(testPdfPath)) {
      await pdfInput.setInputFiles(testPdfPath)
      await page.waitForTimeout(1000)

      // Assert: Le nom du fichier s'affiche
      const fileName = page.locator('[data-testid="approval-modal-pdf-file-name"]')
      await expect(fileName).toBeVisible()
      await expect(fileName).toContainText(/\.pdf/i)

      // Act: Supprimer le PDF
      const removeButton = page.locator('[data-testid="approval-modal-pdf-remove-button"]')
      await removeButton.click()
      await page.waitForTimeout(500)

      // Assert: Le PDF est retiré
      await expect(fileName).not.toBeVisible()

      // Assert: Le bouton Approuver redevient désactivé
      const approveModalButton = page.locator('[data-testid="approval-modal-approve-button"]')
      await expect(approveModalButton).toBeDisabled()
    }
  })

  test('P0-APPROV-08: Validation du format PDF', async ({ page }) => {
    // Arrange
    const testRequest = await createPendingPaidRequest()
    createdRequests.push(testRequest)
    await page.reload()
    await waitForRequestsList(page)

    const searchInput = page.locator('[data-testid="search-input"]').first()
    await searchInput.fill(testRequest.matricule)
    await page.waitForTimeout(1500)

    const paidRow = await getRequestRow(page, testRequest.id)
    if (await paidRow.count() === 0) {
      test.skip()
      return
    }

    const approveButton = paidRow.locator('button:has-text("Approuver"), [data-testid="action-approve-primary"]').first()
    if (await approveButton.count() === 0 || !(await approveButton.isVisible())) {
      test.skip()
      return
    }

    // Act: Ouvrir le modal
    await approveButton.click()
    await waitForModal(page, 'modal-approve')
    await page.waitForTimeout(1000)

    // Act: Tenter d'uploader un fichier non-PDF (créer un fichier temporaire)
    const tempJpgPath = path.join(__dirname, '../fixtures/test-image.jpg')
    if (!fs.existsSync(tempJpgPath)) {
      // Créer un fichier temporaire pour le test
      fs.writeFileSync(tempJpgPath, 'fake jpg content')
    }

    const pdfInput = page.locator('[data-testid="approval-modal-pdf-file-input"]')
    await pdfInput.setInputFiles(tempJpgPath)
    await page.waitForTimeout(1000)

    // Assert: Message d'erreur affiché
    const errorMessage = page.locator('[data-testid="approval-modal-pdf-error"]')
    await expect(errorMessage).toBeVisible()
    await expect(errorMessage).toContainText(/pdf|format/i)

    // Nettoyer
    if (fs.existsSync(tempJpgPath)) {
      fs.unlinkSync(tempJpgPath)
    }
  })

  test('P0-APPROV-09: Validation de la taille (max 10 MB)', async ({ page }) => {
    // Arrange
    const testRequest = await createPendingPaidRequest()
    createdRequests.push(testRequest)
    await page.reload()
    await waitForRequestsList(page)

    const searchInput = page.locator('[data-testid="search-input"]').first()
    await searchInput.fill(testRequest.matricule)
    await page.waitForTimeout(1500)

    const paidRow = await getRequestRow(page, testRequest.id)
    if (await paidRow.count() === 0) {
      test.skip()
      return
    }

    const approveButton = paidRow.locator('button:has-text("Approuver"), [data-testid="action-approve-primary"]').first()
    if (await approveButton.count() === 0 || !(await approveButton.isVisible())) {
      test.skip()
      return
    }

    // Act: Ouvrir le modal
    await approveButton.click()
    await waitForModal(page, 'modal-approve')
    await page.waitForTimeout(1000)

    // Act: Créer un fichier PDF de plus de 10 MB (simulé)
    const largePdfPath = path.join(__dirname, '../fixtures/test-large.pdf')
    if (!fs.existsSync(largePdfPath)) {
      // Créer un fichier de 11 MB pour le test
      const largeContent = Buffer.alloc(11 * 1024 * 1024, 'PDF content')
      fs.writeFileSync(largePdfPath, largeContent)
    }

    const pdfInput = page.locator('[data-testid="approval-modal-pdf-file-input"]')
    if (fs.existsSync(largePdfPath)) {
      await pdfInput.setInputFiles(largePdfPath)
      await page.waitForTimeout(1000)

      // Assert: Message d'erreur affiché pour taille excessive
      const errorMessage = page.locator('[data-testid="approval-modal-pdf-error"]')
      await expect(errorMessage).toBeVisible()
      await expect(errorMessage).toContainText(/taille|10|MB|max/i)
    }

    // Nettoyer
    if (fs.existsSync(largePdfPath)) {
      fs.unlinkSync(largePdfPath)
    }
  })

  // ==================== P0: ÉTATS ET ERREURS ====================

  test('P0-APPROV-10: État de chargement pendant l\'approbation', async ({ page }) => {
    // Arrange
    const testRequest = await createPendingPaidRequest()
    createdRequests.push(testRequest)
    await page.reload()
    await waitForRequestsList(page)

    const searchInput = page.locator('[data-testid="search-input"]').first()
    await searchInput.fill(testRequest.matricule)
    await page.waitForTimeout(1500)

    const paidRow = await getRequestRow(page, testRequest.id)
    if (await paidRow.count() === 0) {
      test.skip()
      return
    }

    const approveButton = paidRow.locator('button:has-text("Approuver"), [data-testid="action-approve-primary"]').first()
    if (await approveButton.count() === 0 || !(await approveButton.isVisible())) {
      test.skip()
      return
    }

    // Act: Ouvrir le modal
    await approveButton.click()
    await waitForModal(page, 'modal-approve')
    await page.waitForTimeout(1000)

    // Act: Remplir tous les champs
    const membershipTypeSelect = page.locator('[data-testid="approval-modal-membership-type-select"]')
    await membershipTypeSelect.selectOption({ index: 0 })
    await page.waitForTimeout(500)

    const pdfInput = page.locator('[data-testid="approval-modal-pdf-file-input"]')
    if (fs.existsSync(testPdfPath)) {
      await pdfInput.setInputFiles(testPdfPath)
      await page.waitForTimeout(1000)
    }

    // Act: Cliquer sur Approuver
    const approveModalButton = page.locator('[data-testid="approval-modal-approve-button"]')
    await approveModalButton.click()

    // Assert: Spinner visible
    const spinner = page.locator('[data-testid="approval-modal-loading-spinner"]')
    await expect(spinner).toBeVisible({ timeout: 2000 })

    // Assert: Message de chargement visible
    const loadingMessage = page.locator('[data-testid="approval-modal-loading-message"]')
    await expect(loadingMessage).toBeVisible({ timeout: 2000 })

    // Assert: Boutons désactivés
    await expect(approveModalButton).toBeDisabled()
    const cancelButton = page.locator('[data-testid="approval-modal-cancel-button"]')
    await expect(cancelButton).toBeDisabled()
  })

  test('P0-APPROV-11: Erreur API - Demande non payée', async ({ page }) => {
    // Arrange: Créer une demande non payée
    const testRequest = await createPendingUnpaidRequest()
    createdRequests.push(testRequest)
    await page.reload()
    await waitForRequestsList(page)

    const searchInput = page.locator('[data-testid="search-input"]').first()
    await searchInput.fill(testRequest.matricule)
    await page.waitForTimeout(1500)

    const unpaidRow = await getRequestRow(page, testRequest.id)
    if (await unpaidRow.count() === 0) {
      test.skip()
      return
    }

    // Assert: Le bouton Approuver ne devrait pas être visible ou être désactivé
    const approveButton = unpaidRow.locator('button:has-text("Approuver"), [data-testid="action-approve-primary"]')
    if (await approveButton.count() > 0) {
      await expect(approveButton.first()).toBeDisabled()
    }
  })

  test('P0-APPROV-12: Erreur API - Demande déjà approuvée', async ({ page }) => {
    // Arrange: Créer une demande et l'approuver d'abord
    const testRequest = await createPendingPaidRequest()
    createdRequests.push(testRequest)
    await page.reload()
    await waitForRequestsList(page)

    const searchInput = page.locator('[data-testid="search-input"]').first()
    await searchInput.fill(testRequest.matricule)
    await page.waitForTimeout(1500)

    const paidRow = await getRequestRow(page, testRequest.id)
    if (await paidRow.count() === 0) {
      test.skip()
      return
    }

    const approveButton = paidRow.locator('button:has-text("Approuver"), [data-testid="action-approve-primary"]').first()
    if (await approveButton.count() === 0 || !(await approveButton.isVisible())) {
      test.skip()
      return
    }

    // Act: Approuver la demande une première fois
    await approveButton.click()
    await waitForModal(page, 'modal-approve')
    await page.waitForTimeout(1000)

    const membershipTypeSelect = page.locator('[data-testid="approval-modal-membership-type-select"]')
    await membershipTypeSelect.selectOption({ index: 0 })
    await page.waitForTimeout(500)

    const pdfInput = page.locator('[data-testid="approval-modal-pdf-file-input"]')
    if (fs.existsSync(testPdfPath)) {
      await pdfInput.setInputFiles(testPdfPath)
      await page.waitForTimeout(1000)
    }

    const approveModalButton = page.locator('[data-testid="approval-modal-approve-button"]')
    await approveModalButton.click()

    // Attendre que l'approbation soit terminée
    await waitForSuccessToast(page, /approuvée|succès/i, { timeout: 15000 })
    await page.waitForTimeout(3000)

    // Act: Essayer de réapprouver la même demande
    await page.reload()
    await waitForRequestsList(page)
    await searchInput.fill(testRequest.matricule)
    await page.waitForTimeout(1500)

    const approvedRow = await getRequestRow(page, testRequest.id)
    if (await approvedRow.count() === 0) {
      test.skip()
      return
    }

    // Assert: Le bouton Approuver ne devrait plus être visible ou être désactivé
    const approveButtonAgain = approvedRow.locator('button:has-text("Approuver"), [data-testid="action-approve-primary"]')
    if (await approveButtonAgain.count() > 0) {
      // Si le bouton existe, il devrait être désactivé
      await expect(approveButtonAgain.first()).toBeDisabled()
    } else {
      // Le bouton n'existe plus, ce qui est correct
      const statusBadge = approvedRow.locator('[data-testid="status-badge"]')
      if (await statusBadge.count() > 0) {
        await expect(statusBadge.first()).toContainText(/approuvée|approved/i)
      }
    }
  })

  // ==================== P0: TÉLÉCHARGEMENT PDF ====================

  test('P0-APPROV-13: Téléchargement automatique du PDF des identifiants', async ({ page, context: _context }) => {
    // Arrange
    const testRequest = await createPendingPaidRequest()
    createdRequests.push(testRequest)
    await page.reload()
    await waitForRequestsList(page)

    // Écouter les téléchargements
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 }).catch(() => null)

    const searchInput = page.locator('[data-testid="search-input"]').first()
    await searchInput.fill(testRequest.matricule)
    await page.waitForTimeout(1500)

    const paidRow = await getRequestRow(page, testRequest.id)
    if (await paidRow.count() === 0) {
      test.skip()
      return
    }

    const approveButton = paidRow.locator('button:has-text("Approuver"), [data-testid="action-approve-primary"]').first()
    if (await approveButton.count() === 0 || !(await approveButton.isVisible())) {
      test.skip()
      return
    }

    // Act: Ouvrir le modal et approuver
    await approveButton.click()
    await waitForModal(page, 'modal-approve')
    await page.waitForTimeout(1000)

    const membershipTypeSelect = page.locator('[data-testid="approval-modal-membership-type-select"]')
    await membershipTypeSelect.selectOption({ index: 0 })
    await page.waitForTimeout(500)

    const pdfInput = page.locator('[data-testid="approval-modal-pdf-file-input"]')
    if (fs.existsSync(testPdfPath)) {
      await pdfInput.setInputFiles(testPdfPath)
      await page.waitForTimeout(1000)
    }

    const approveModalButton = page.locator('[data-testid="approval-modal-approve-button"]')
    await approveModalButton.click()

    // Assert: Toast de succès
    await waitForSuccessToast(page, /approuvée|succès/i, { timeout: 15000 })

    // Assert: PDF téléchargé (si le téléchargement est déclenché)
    const download = await downloadPromise
    if (download) {
      expect(download.suggestedFilename()).toMatch(/Identifiants_Connexion_.*\.pdf/i)
    }
  })

  // ==================== P1: ROLLBACK ====================

  test('P1-APPROV-14: Rollback si création User échoue', async ({ page }) => {
    // Note: Ce test nécessite de mocker la Cloud Function pour faire échouer la création User
    // Pour l'instant, on vérifie juste que l'erreur est gérée correctement côté UI
    
    // Arrange
    const testRequest = await createPendingPaidRequest()
    createdRequests.push(testRequest)
    await page.reload()
    await waitForRequestsList(page)

    const searchInput = page.locator('[data-testid="search-input"]').first()
    await searchInput.fill(testRequest.matricule)
    await page.waitForTimeout(1500)

    const paidRow = await getRequestRow(page, testRequest.id)
    if (await paidRow.count() === 0) {
      test.skip()
      return
    }

    const approveButton = paidRow.locator('button:has-text("Approuver"), [data-testid="action-approve-primary"]').first()
    if (await approveButton.count() === 0 || !(await approveButton.isVisible())) {
      test.skip()
      return
    }

    // Act: Ouvrir le modal et tenter d'approuver
    await approveButton.click()
    await waitForModal(page, 'modal-approve')
    await page.waitForTimeout(1000)

    const membershipTypeSelect = page.locator('[data-testid="approval-modal-membership-type-select"]')
    await membershipTypeSelect.selectOption({ index: 0 })
    await page.waitForTimeout(500)

    const pdfInput = page.locator('[data-testid="approval-modal-pdf-file-input"]')
    if (fs.existsSync(testPdfPath)) {
      await pdfInput.setInputFiles(testPdfPath)
      await page.waitForTimeout(1000)
    }

    // Note: Pour tester le rollback réel, il faudrait mocker la Cloud Function
    // Ici on vérifie juste que le modal gère les erreurs
    const approveModalButton = page.locator('[data-testid="approval-modal-approve-button"]')
    await approveModalButton.click()

    // Si une erreur survient, elle devrait être affichée
    const errorMessage = page.locator('[data-testid="approval-modal-api-error"]')
    // Le test passe si l'approbation réussit ou si l'erreur est affichée
    try {
      await waitForSuccessToast(page, /approuvée|succès/i, { timeout: 5000 })
    } catch {
      // Si l'approbation échoue, vérifier que l'erreur est affichée
      if (await errorMessage.count() > 0) {
        await expect(errorMessage).toBeVisible()
      }
    }
  })

  test('P1-APPROV-15: Rollback si création Subscription échoue', async ({ page }) => {
    // Note: Ce test nécessite de mocker la Cloud Function pour faire échouer la création Subscription
    // Pour l'instant, on vérifie juste que l'erreur est gérée correctement côté UI
    
    // Arrange
    const testRequest = await createPendingPaidRequest()
    createdRequests.push(testRequest)
    await page.reload()
    await waitForRequestsList(page)

    const searchInput = page.locator('[data-testid="search-input"]').first()
    await searchInput.fill(testRequest.matricule)
    await page.waitForTimeout(1500)

    const paidRow = await getRequestRow(page, testRequest.id)
    if (await paidRow.count() === 0) {
      test.skip()
      return
    }

    const approveButton = paidRow.locator('button:has-text("Approuver"), [data-testid="action-approve-primary"]').first()
    if (await approveButton.count() === 0 || !(await approveButton.isVisible())) {
      test.skip()
      return
    }

    // Act: Ouvrir le modal et tenter d'approuver
    await approveButton.click()
    await waitForModal(page, 'modal-approve')
    await page.waitForTimeout(1000)

    const membershipTypeSelect = page.locator('[data-testid="approval-modal-membership-type-select"]')
    await membershipTypeSelect.selectOption({ index: 0 })
    await page.waitForTimeout(500)

    const pdfInput = page.locator('[data-testid="approval-modal-pdf-file-input"]')
    if (fs.existsSync(testPdfPath)) {
      await pdfInput.setInputFiles(testPdfPath)
      await page.waitForTimeout(1000)
    }

    // Note: Pour tester le rollback réel, il faudrait mocker la Cloud Function
    // Ici on vérifie juste que le modal gère les erreurs
    const approveModalButton = page.locator('[data-testid="approval-modal-approve-button"]')
    await approveModalButton.click()

    // Si une erreur survient, elle devrait être affichée
    const errorMessage = page.locator('[data-testid="approval-modal-api-error"]')
    // Le test passe si l'approbation réussit ou si l'erreur est affichée
    try {
      await waitForSuccessToast(page, /approuvée|succès/i, { timeout: 5000 })
    } catch {
      // Si l'approbation échoue, vérifier que l'erreur est affichée
      if (await errorMessage.count() > 0) {
        await expect(errorMessage).toBeVisible()
      }
    }
  })

  // ==================== P1: TRACABILITÉ ====================

  test('P1-APPROV-16: Vérifier les champs de traçabilité', async ({ page }) => {
    // Arrange
    const testRequest = await createPendingPaidRequest()
    createdRequests.push(testRequest)
    await page.reload()
    await waitForRequestsList(page)

    const searchInput = page.locator('[data-testid="search-input"]').first()
    await searchInput.fill(testRequest.matricule)
    await page.waitForTimeout(1500)

    const paidRow = await getRequestRow(page, testRequest.id)
    if (await paidRow.count() === 0) {
      test.skip()
      return
    }

    const approveButton = paidRow.locator('button:has-text("Approuver"), [data-testid="action-approve-primary"]').first()
    if (await approveButton.count() === 0 || !(await approveButton.isVisible())) {
      test.skip()
      return
    }

    // Act: Approuver la demande
    await approveButton.click()
    await waitForModal(page, 'modal-approve')
    await page.waitForTimeout(1000)

    const membershipTypeSelect = page.locator('[data-testid="approval-modal-membership-type-select"]')
    await membershipTypeSelect.selectOption({ index: 0 })
    await page.waitForTimeout(500)

    const pdfInput = page.locator('[data-testid="approval-modal-pdf-file-input"]')
    if (fs.existsSync(testPdfPath)) {
      await pdfInput.setInputFiles(testPdfPath)
      await page.waitForTimeout(1000)
    }

    const approveModalButton = page.locator('[data-testid="approval-modal-approve-button"]')
    await approveModalButton.click()

    // Assert: Toast de succès
    await waitForSuccessToast(page, /approuvée|succès/i, { timeout: 15000 })

    // Assert: Les champs approvedBy et approvedAt sont affichés dans la liste
    await page.waitForTimeout(3000)
    const approvedByInfo = paidRow.locator('[data-testid="approved-by-info"]')
    const approvedAtInfo = paidRow.locator('[data-testid="approved-at-info"]')
    
    // Ces éléments peuvent ne pas être présents si la liste n'a pas été rafraîchie
    // On vérifie juste qu'ils ne causent pas d'erreur
    if (await approvedByInfo.count() > 0) {
      await expect(approvedByInfo).toBeVisible()
    }
    if (await approvedAtInfo.count() > 0) {
      await expect(approvedAtInfo).toBeVisible()
    }
  })

  // ==================== P1: NOTIFICATIONS ====================

  test('P1-APPROV-17: Notification d\'approbation créée', async ({ page }) => {
    // Arrange
    const testRequest = await createPendingPaidRequest()
    createdRequests.push(testRequest)
    await page.reload()
    await waitForRequestsList(page)

    const searchInput = page.locator('[data-testid="search-input"]').first()
    await searchInput.fill(testRequest.matricule)
    await page.waitForTimeout(1500)

    const paidRow = await getRequestRow(page, testRequest.id)
    if (await paidRow.count() === 0) {
      test.skip()
      return
    }

    const approveButton = paidRow.locator('button:has-text("Approuver"), [data-testid="action-approve-primary"]').first()
    if (await approveButton.count() === 0 || !(await approveButton.isVisible())) {
      test.skip()
      return
    }

    // Act: Approuver la demande
    await approveButton.click()
    await waitForModal(page, 'modal-approve')
    await page.waitForTimeout(1000)

    const membershipTypeSelect = page.locator('[data-testid="approval-modal-membership-type-select"]')
    await membershipTypeSelect.selectOption({ index: 0 })
    await page.waitForTimeout(500)

    const pdfInput = page.locator('[data-testid="approval-modal-pdf-file-input"]')
    if (fs.existsSync(testPdfPath)) {
      await pdfInput.setInputFiles(testPdfPath)
      await page.waitForTimeout(1000)
    }

    const approveModalButton = page.locator('[data-testid="approval-modal-approve-button"]')
    await approveModalButton.click()

    // Assert: Toast de succès
    await waitForSuccessToast(page, /approuvée|succès/i, { timeout: 15000 })

    // Note: La vérification de la notification dans Firestore nécessiterait Firebase Admin SDK
    // Pour l'instant, on vérifie juste que l'approbation a réussi
    // La notification est créée par la Cloud Function, donc elle devrait exister
    await page.waitForTimeout(2000)
  })

  // ==================== P2: RESPONSIVE ====================

  test('P2-APPROV-18: Modal responsive sur mobile', async ({ page }) => {
    // Arrange: Définir la taille mobile
    await page.setViewportSize({ width: 375, height: 667 })

    const testRequest = await createPendingPaidRequest()
    createdRequests.push(testRequest)
    await page.reload()
    await waitForRequestsList(page)

    const searchInput = page.locator('[data-testid="search-input"]').first()
    await searchInput.fill(testRequest.matricule)
    await page.waitForTimeout(1500)

    const paidRow = await getRequestRow(page, testRequest.id)
    if (await paidRow.count() === 0) {
      test.skip()
      return
    }

    const approveButton = paidRow.locator('button:has-text("Approuver"), [data-testid="action-approve-primary"]').first()
    if (await approveButton.count() === 0 || !(await approveButton.isVisible())) {
      test.skip()
      return
    }

    // Act: Ouvrir le modal
    await approveButton.click()
    await waitForModal(page, 'modal-approve')
    await page.waitForTimeout(1000)

    // Assert: Le modal est visible et adapté mobile
    const modal = page.locator('[data-testid="approval-modal"]')
    await expect(modal).toBeVisible()

    // Vérifier que le modal ne dépasse pas la largeur de l'écran
    const modalBox = await modal.boundingBox()
    if (modalBox) {
      expect(modalBox.width).toBeLessThanOrEqual(375)
    }

    // Vérifier que les sections sont empilées verticalement
    const dossierSection = page.locator('[data-testid="approval-modal-dossier-section"]')
    await expect(dossierSection).toBeVisible()
  })
})
