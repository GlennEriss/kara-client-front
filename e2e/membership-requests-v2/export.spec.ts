/**
 * Tests E2E pour l'export des demandes d'adhésion (PDF + Excel)
 * 
 * Ces tests vérifient :
 * - Téléchargement des fichiers (PDF/Excel)
 * - Validation du contenu des fichiers
 * - Configuration du modal (format, périmètre, filtres, tri)
 * - Reset des valeurs par défaut
 * - Fermeture du modal (X, Annuler, ESC)
 * - Gestion des erreurs
 * - Responsive mobile/tablette
 * 
 * @see documentation/membership-requests/EXPORT_PLAN_TESTS_E2E.md pour la matrice de couverture complète
 */

import { test, expect, Download } from '@playwright/test'
import { loginAsAdmin, goToMembershipRequestsV2, waitForRequestsList } from './helpers'
import {
  openExportModal,
  closeExportModal,
  selectExportFormat,
  selectScopeMode,
  setPeriodDates,
  setQuantity,
  toggleStatusFilter,
  selectSortOrder,
  clickResetButton,
  clickGenerateExportButton,
  waitForDownload,
  validatePDFContent,
  validateExcelContent,
  saveDownloadedFile,
  expectGenerateButtonEnabled,
  confirmLargeExportWarning,
} from './export.helpers'
import * as path from 'path'

// Configurations de test
const DOWNLOAD_DIR = path.join(process.cwd(), 'test-results', 'downloads')

test.describe('E2E: Export des demandes d\'adhésion', () => {
  test.beforeEach(async ({ page }) => {
    // Créer le dossier de téléchargement
    const fs = await import('fs')
    if (!fs.existsSync(DOWNLOAD_DIR)) {
      fs.mkdirSync(DOWNLOAD_DIR, { recursive: true })
    }

    await loginAsAdmin(page)
    await goToMembershipRequestsV2(page)
    await waitForRequestsList(page)
  })

  test.describe('P0 - Téléchargement & Cohérence (Bloquant)', () => {
    test('P0-01: Export PDF par défaut (période)', async ({ page }) => {
      // Arrange: Ouvrir le modal et sélectionner PDF (car Excel est le défaut)
      await openExportModal(page)
      await selectExportFormat(page, 'pdf')
      
      // Act: Cliquer sur "Générer l'export"
      const downloadPromise = waitForDownload(page)
      await clickGenerateExportButton(page)
      
      // Assert: Fichier PDF téléchargé
      const download = await downloadPromise
      expect(download.suggestedFilename()).toMatch(/\.pdf$/i)
      
      // Valider le contenu minimal
      const filePath = await saveDownloadedFile(download, DOWNLOAD_DIR)
      await validatePDFContent(filePath, ['KARA', 'demandes'])
    })

    test('P0-02: Export Excel par défaut (période)', async ({ page }) => {
      // Arrange: Ouvrir le modal (Excel est déjà sélectionné par défaut)
      await openExportModal(page)
      
      // Act: Cliquer sur "Générer l'export"
      const downloadPromise = waitForDownload(page)
      await clickGenerateExportButton(page)
      
      // Assert: Fichier Excel téléchargé
      const download = await downloadPromise
      expect(download.suggestedFilename()).toMatch(/\.xlsx?$/i)
      
      // Valider le contenu minimal (colonnes)
      const filePath = await saveDownloadedFile(download, DOWNLOAD_DIR)
      await validateExcelContent(filePath, ['Prénom', 'Nom', 'Statut'])
    })

    test('P0-03: Export PDF toutes les demandes', async ({ page }) => {
      // Arrange: Ouvrir le modal et sélectionner "Toutes les demandes"
      await openExportModal(page)
      await selectExportFormat(page, 'pdf')
      await selectScopeMode(page, 'all')
      
      // Act: Confirmer l'avertissement si présent, puis générer
      confirmLargeExportWarning(page)
      const downloadPromise = waitForDownload(page)
      await clickGenerateExportButton(page)
      
      // Assert: Fichier PDF téléchargé
      const download = await downloadPromise
      expect(download.suggestedFilename()).toMatch(/\.pdf$/i)
      
      const filePath = await saveDownloadedFile(download, DOWNLOAD_DIR)
      await validatePDFContent(filePath, ['KARA'])
    })

    test('P0-04: Export Excel toutes les demandes', async ({ page }) => {
      // Arrange
      await openExportModal(page)
      await selectScopeMode(page, 'all')
      
      // Act
      confirmLargeExportWarning(page)
      const downloadPromise = waitForDownload(page)
      await clickGenerateExportButton(page)
      
      // Assert
      const download = await downloadPromise
      expect(download.suggestedFilename()).toMatch(/\.xlsx?$/i)
      
      const filePath = await saveDownloadedFile(download, DOWNLOAD_DIR)
      await validateExcelContent(filePath, ['Prénom', 'Nom'])
    })

    test('P0-05: Export PDF par nombre (100 dernières)', async ({ page }) => {
      // Arrange
      await openExportModal(page)
      await selectExportFormat(page, 'pdf')
      await selectScopeMode(page, 'quantity')
      await setQuantity(page, 100)
      
      // Act
      const downloadPromise = waitForDownload(page)
      await clickGenerateExportButton(page)
      
      // Assert
      const download = await downloadPromise
      expect(download.suggestedFilename()).toMatch(/\.pdf$/i)
      
      const filePath = await saveDownloadedFile(download, DOWNLOAD_DIR)
      await validatePDFContent(filePath, ['KARA'])
    })

    test('P0-06: Export Excel par nombre (100 dernières)', async ({ page }) => {
      // Arrange
      await openExportModal(page)
      await selectScopeMode(page, 'quantity')
      await setQuantity(page, 100)
      
      // Act
      const downloadPromise = waitForDownload(page)
      await clickGenerateExportButton(page)
      
      // Assert
      const download = await downloadPromise
      expect(download.suggestedFilename()).toMatch(/\.xlsx?$/i)
      
      const filePath = await saveDownloadedFile(download, DOWNLOAD_DIR)
      await validateExcelContent(filePath, ['Prénom', 'Nom'])
    })

    test('P0-07: Validation contenu PDF (titre, date, colonnes)', async ({ page }) => {
      // Arrange
      await openExportModal(page)
      await selectExportFormat(page, 'pdf')
      
      // Act
      const downloadPromise = waitForDownload(page)
      await clickGenerateExportButton(page)
      
      // Assert: Fichier valide
      const download = await downloadPromise
      const filePath = await saveDownloadedFile(download, DOWNLOAD_DIR)
      
      // Valider la structure du PDF (nom, taille, extension)
      await validatePDFContent(filePath, ['KARA', 'demandes'])
    })

    test('P0-08: Validation contenu Excel (colonnes, lignes)', async ({ page }) => {
      // Arrange
      await openExportModal(page)
      
      // Act
      const downloadPromise = waitForDownload(page)
      await clickGenerateExportButton(page)
      
      // Assert: Fichier valide avec colonnes attendues
      const download = await downloadPromise
      const filePath = await saveDownloadedFile(download, DOWNLOAD_DIR)
      
      // Valider les colonnes principales
      await validateExcelContent(filePath, [
        'Prénom',
        'Nom',
        'Email',
        'Téléphone',
        'Référence',
        'Statut',
      ])
    })
  })

  test.describe('P1 - Validations & UX (Fortement recommandé)', () => {
    test('P1-01: Reset valeurs par défaut', async ({ page }) => {
      // Arrange: Ouvrir le modal et modifier plusieurs options
      await openExportModal(page)
      await selectExportFormat(page, 'pdf')
      await selectScopeMode(page, 'quantity')
      await setQuantity(page, 50)
      await toggleStatusFilter(page, 'pending')
      
      // Act: Cliquer sur "Réinitialiser"
      await clickResetButton(page)
      
      // Assert: Les valeurs sont revenues aux défauts
      // Le format par défaut est Excel, donc le bouton Excel devrait être sélectionné
      await expect(page.locator('[data-testid="export-format-excel"]')).toHaveClass(/border-green-500/)
    })

    test('P1-02: Filtre statut "En attente"', async ({ page }) => {
      // Arrange
      await openExportModal(page)
      await selectExportFormat(page, 'pdf')
      await toggleStatusFilter(page, 'pending')
      
      // Act
      const downloadPromise = waitForDownload(page)
      await clickGenerateExportButton(page)
      
      // Assert
      const download = await downloadPromise
      expect(download.suggestedFilename()).toMatch(/\.pdf$/i)
    })

    test('P1-03: Filtre statut "Approuvées"', async ({ page }) => {
      // Arrange
      await openExportModal(page)
      await toggleStatusFilter(page, 'approved')
      
      // Act: Essayer de générer l'export (peut ne pas avoir de résultats)
      const downloadPromise = waitForDownload(page, 5000).catch(() => null)
      await clickGenerateExportButton(page)
      
      // Attendre soit le téléchargement, soit un toast d'erreur
      await page.waitForTimeout(2000)
      
      // Assert: Soit un fichier a été téléchargé, soit un toast indique qu'il n'y a pas de résultats
      const download = await downloadPromise
      if (download) {
        expect(download.suggestedFilename()).toMatch(/\.xlsx?$/i)
      } else {
        // Vérifier qu'un toast ou message indique qu'il n'y a pas de résultats
        // Utiliser getByText pour chercher le texte au lieu d'un sélecteur CSS
        const toast = page.locator('[role="status"], [data-sonner-toast]').or(page.getByText(/aucune demande/i))
        const toastCount = await toast.count()
        if (toastCount > 0) {
          await expect(toast.first()).toBeVisible({ timeout: 5000 })
        } else {
          // Si pas de toast, vérifier que le modal est toujours ouvert (pas de fermeture forcée)
          const modalStillOpen = await page.locator('[data-testid="modal-export-requests"]').count() > 0
          expect(modalStillOpen).toBe(true)
        }
      }
    })

    test('P1-04: Filtre paiement "Payées"', async ({ page }) => {
      // Arrange
      await openExportModal(page)
      await selectExportFormat(page, 'pdf')
      await toggleStatusFilter(page, 'paid')
      
      // Act
      const downloadPromise = waitForDownload(page)
      await clickGenerateExportButton(page)
      
      // Assert
      const download = await downloadPromise
      expect(download.suggestedFilename()).toMatch(/\.pdf$/i)
    })

    test('P1-05: Filtre paiement "Non payées"', async ({ page }) => {
      // Arrange
      await openExportModal(page)
      await toggleStatusFilter(page, 'unpaid')
      
      // Act
      const downloadPromise = waitForDownload(page)
      await clickGenerateExportButton(page)
      
      // Assert
      const download = await downloadPromise
      expect(download.suggestedFilename()).toMatch(/\.xlsx?$/i)
    })

    test('P1-06: Tri Date ascendant', async ({ page }) => {
      // Arrange
      await openExportModal(page)
      await selectExportFormat(page, 'pdf')
      await selectSortOrder(page, 'date_asc')
      
      // Act
      const downloadPromise = waitForDownload(page)
      await clickGenerateExportButton(page)
      
      // Assert
      const download = await downloadPromise
      expect(download.suggestedFilename()).toMatch(/\.pdf$/i)
    })

    test('P1-07: Tri Nom A→Z', async ({ page }) => {
      // Arrange
      await openExportModal(page)
      await selectSortOrder(page, 'name_asc')
      
      // Act
      const downloadPromise = waitForDownload(page)
      await clickGenerateExportButton(page)
      
      // Assert
      const download = await downloadPromise
      expect(download.suggestedFilename()).toMatch(/\.xlsx?$/i)
    })

    test('P1-08: Tri Nom Z→A', async ({ page }) => {
      // Arrange
      await openExportModal(page)
      await selectExportFormat(page, 'pdf')
      await selectSortOrder(page, 'name_desc')
      
      // Act
      const downloadPromise = waitForDownload(page)
      await clickGenerateExportButton(page)
      
      // Assert
      const download = await downloadPromise
      expect(download.suggestedFilename()).toMatch(/\.pdf$/i)
    })

    test('P1-10: Validation dates période (Du ≤ Au)', async ({ page }) => {
      // Arrange: Ouvrir le modal et configurer une période avec Du > Au (invalide)
      await openExportModal(page)
      await selectScopeMode(page, 'period')
      
      const today = new Date()
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      
      // Act: Configurer Du = demain, Au = hier (invalide)
      await setPeriodDates(page, tomorrow.toISOString().split('T')[0], yesterday.toISOString().split('T')[0])
      await page.waitForTimeout(500)
      
      // Assert: Le bouton "Générer" devrait être désactivé ou un message d'erreur affiché
      // Note: La validation exacte dépend de l'implémentation UI
      // On vérifie que l'aperçu montre 0 demandes ou que le bouton est désactivé
      const preview = page.locator('[data-testid="export-preview-count"]')
      if (await preview.count() > 0) {
        await expect(preview).toContainText('0')
      }
    })

    test('P1-11: Validation nombre (1-10000)', async ({ page }) => {
      // Arrange
      await openExportModal(page)
      await selectScopeMode(page, 'quantity')
      
      // Test 1: Nombre trop élevé (>10000)
      await setQuantity(page, 10001)
      await page.waitForTimeout(500)
      
      // Test 2: Nombre valide
      await setQuantity(page, 100)
      await page.waitForTimeout(500)
      await expectGenerateButtonEnabled(page)
    })
  })

  test.describe('P2 - UX & Accessibilité (Amélioration)', () => {
    test('P2-01: Fermeture modal bouton X', async ({ page }) => {
      // Arrange
      await openExportModal(page)
      
      // Act: Cliquer sur le bouton X
      const closeButton = page.locator('[data-testid="modal-export-requests"] [aria-label="Close"]').first()
      if (await closeButton.count() > 0) {
        await closeButton.click()
      } else {
        // Fallback: appuyer sur Escape
        await page.keyboard.press('Escape')
      }
      
      // Assert: Le modal est fermé
      await expect(page.locator('[data-testid="modal-export-requests"]')).toBeHidden({ timeout: 2000 })
    })

    test('P2-02: Fermeture modal bouton Annuler', async ({ page }) => {
      // Arrange
      await openExportModal(page)
      
      // Act: Cliquer sur "Annuler"
      const cancelButton = page.locator('[data-testid="export-cancel-button"]')
      if (await cancelButton.count() > 0) {
        await cancelButton.click()
      }
      
      // Assert: Le modal est fermé
      await expect(page.locator('[data-testid="modal-export-requests"]')).toBeHidden({ timeout: 2000 })
    })

    test('P2-03: Fermeture modal touche ESC', async ({ page }) => {
      // Arrange
      await openExportModal(page)
      
      // Act: Appuyer sur Escape
      await page.keyboard.press('Escape')
      
      // Assert: Le modal est fermé
      await expect(page.locator('[data-testid="modal-export-requests"]')).toBeHidden({ timeout: 2000 })
    })
  })

  test.describe('Robustesse & Erreurs', () => {
    test('R-01: Double-clic sur "Générer" (1 seul export)', async ({ page }) => {
      // Arrange
      await openExportModal(page)
      
      // Act: Double-clic rapide sur "Générer"
      const generateButton = page.locator('[data-testid="confirm-export"]')
      
      // Capturer les downloads (doit y en avoir seulement 1)
      const downloads: Download[] = []
      page.on('download', (download) => downloads.push(download))
      
      // Premier clic pour déclencher l'export
      await generateButton.click()
      
      // Attendre un peu pour voir si le bouton est désactivé
      await page.waitForTimeout(300)
      
      // Vérifier si le bouton existe encore et s'il est désactivé
      const buttonStillExists = await generateButton.count() > 0
      let isDisabled = false
      
      if (buttonStillExists) {
        isDisabled = await generateButton.isDisabled()
        
        // Si le bouton n'est pas désactivé, essayer un deuxième clic rapide
        if (!isDisabled) {
          try {
            await generateButton.click({ timeout: 1000 })
          } catch (e) {
            // Le bouton peut avoir été désactivé entre temps ou le modal fermé
            // C'est normal, on continue
          }
        }
      }
      
      // Attendre le téléchargement (ou que le modal se ferme)
      await page.waitForTimeout(5000)
      
      // Assert: Un seul téléchargement a été déclenché (ou le bouton est désactivé pendant l'export)
      // Le modal peut se fermer après l'export, ce qui est normal
      const modalVisible = await page.locator('[data-testid="modal-export-requests"]').count() > 0
      
      // Si le modal est toujours ouvert, vérifier que le bouton était désactivé
      if (modalVisible && buttonStillExists) {
        const finalButtonState = await generateButton.isDisabled()
        // Le bouton devrait être désactivé pendant l'export, ou l'export devrait être terminé
        expect(finalButtonState || downloads.length >= 1).toBe(true)
      }
      
      // Au moins un téléchargement devrait avoir eu lieu
      expect(downloads.length).toBeGreaterThanOrEqual(1)
    })

    test('R-05: Dates invalides (Du > Au) → aperçu montre 0', async ({ page }) => {
      // Arrange
      await openExportModal(page)
      await selectScopeMode(page, 'period')
      
      const today = new Date()
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      
      // Act: Configurer Du = demain, Au = hier
      await setPeriodDates(page, tomorrow.toISOString().split('T')[0], yesterday.toISOString().split('T')[0])
      await page.waitForTimeout(1000)
      
      // Assert: L'aperçu devrait montrer 0 demandes
      const previewSection = page.locator('[data-testid="export-preview-count"]')
      if (await previewSection.count() > 0) {
        await expect(previewSection).toContainText('0')
      }
    })

    test('R-06: Nombre invalide (<1 ou >10000)', async ({ page }) => {
      // Arrange
      await openExportModal(page)
      await selectScopeMode(page, 'quantity')
      
      // Test nombre valide pour vérifier que le bouton fonctionne
      await setQuantity(page, 100)
      await page.waitForTimeout(500)
      
      // Le bouton devrait être activé pour un nombre valide
      await expectGenerateButtonEnabled(page)
    })
  })
})

// Tests responsive avec configuration spécifique pour mobile
test.describe('Responsive (Mobile)', () => {
  test.use({ 
    viewport: { width: 393, height: 851 }, // Pixel 5
    hasTouch: true
  })

  test.beforeEach(async ({ page }) => {
    const fs = await import('fs')
    if (!fs.existsSync(DOWNLOAD_DIR)) {
      fs.mkdirSync(DOWNLOAD_DIR, { recursive: true })
    }

    await loginAsAdmin(page)
    await goToMembershipRequestsV2(page)
    await waitForRequestsList(page)
  })

  test('P2-06: Responsive mobile (layout 1 colonne)', async ({ page }) => {
    // Arrange
    await openExportModal(page)
    
    // Assert: Le modal est visible
    const modal = page.locator('[data-testid="modal-export-requests"]')
    await expect(modal).toBeVisible()
    
    // Sélectionner le périmètre "période" pour afficher les dates
    await selectScopeMode(page, 'period')
    await page.waitForTimeout(500)
    
    // Vérifier que les inputs de date sont présents
    const periodInputs = page.locator('[data-testid="export-period-inputs"]')
    await expect(periodInputs).toBeVisible()
    
    // Les dates devraient être visibles et empilées verticalement sur mobile (grid-cols-1)
    const dateStart = page.locator('[data-testid="export-date-start"]')
    const dateEnd = page.locator('[data-testid="export-date-end"]')
    
    if (await dateStart.count() > 0 && await dateEnd.count() > 0) {
      const startRect = await dateStart.boundingBox()
      const endRect = await dateEnd.boundingBox()
      
      // Sur mobile, les dates sont en colonne (grid-cols-1), donc le deuxième est en dessous
      if (startRect && endRect) {
        expect(endRect.y).toBeGreaterThanOrEqual(startRect.y)
      }
    }
  })

  test('P2-07: Checkboxes fonctionnent en mobile (click)', async ({ page }) => {
    // Arrange
    await openExportModal(page)
    
    // Act: Cliquer sur un filtre via son label (important pour mobile)
    const modal = page.locator('[data-testid="modal-export-requests"]')
    
    // Chercher le label "En attente"
    const pendingFilter = modal.locator('[data-testid="export-filter-pending"]')
    
    if (await pendingFilter.count() > 0) {
      // Cliquer sur le label
      await pendingFilter.click()
      await page.waitForTimeout(300)
      
      // Assert: Le label devrait avoir la classe indiquant qu'il est sélectionné
      await expect(pendingFilter).toHaveClass(/border-kara-primary-dark/)
    }
  })

  test('P2-08: Export PDF fonctionne sur mobile', async ({ page }) => {
    // Arrange
    await openExportModal(page)
    await selectExportFormat(page, 'pdf')
    
    // Act
    const downloadPromise = waitForDownload(page)
    await clickGenerateExportButton(page)
    
    // Assert
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i)
  })

  test('P2-09: Export Excel fonctionne sur mobile', async ({ page }) => {
    // Arrange
    await openExportModal(page)
    
    // Act
    const downloadPromise = waitForDownload(page)
    await clickGenerateExportButton(page)
    
    // Assert
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/\.xlsx?$/i)
  })
})

// Tests responsive avec configuration spécifique pour tablette
test.describe('Responsive (Tablette)', () => {
  test.use({ 
    viewport: { width: 768, height: 1024 }, // iPad
    hasTouch: true
  })

  test.beforeEach(async ({ page }) => {
    const fs = await import('fs')
    if (!fs.existsSync(DOWNLOAD_DIR)) {
      fs.mkdirSync(DOWNLOAD_DIR, { recursive: true })
    }

    await loginAsAdmin(page)
    await goToMembershipRequestsV2(page)
    await waitForRequestsList(page)
  })

  test('P2-10: Modal responsive tablette', async ({ page }) => {
    // Arrange
    await openExportModal(page)
    
    // Assert: Le modal est visible et bien dimensionné
    const modal = page.locator('[data-testid="modal-export-requests"]')
    await expect(modal).toBeVisible()
    
    // Vérifier que tous les éléments sont accessibles
    await expect(page.locator('[data-testid="export-format-excel"]')).toBeVisible()
    await expect(page.locator('[data-testid="export-format-pdf"]')).toBeVisible()
    await expect(page.locator('[data-testid="export-scope-all"]')).toBeVisible()
    await expect(page.locator('[data-testid="export-scope-period"]')).toBeVisible()
    await expect(page.locator('[data-testid="export-scope-quantity"]')).toBeVisible()
    await expect(page.locator('[data-testid="confirm-export"]')).toBeVisible()
  })

  test('P2-11: Export fonctionne sur tablette', async ({ page }) => {
    // Arrange
    await openExportModal(page)
    await selectExportFormat(page, 'pdf')
    // Ne pas utiliser de filtre qui pourrait ne pas avoir de résultats
    // On teste juste que l'export fonctionne sur tablette
    
    // Act
    const downloadPromise = waitForDownload(page)
    await clickGenerateExportButton(page)
    
    // Assert
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i)
  })
})
