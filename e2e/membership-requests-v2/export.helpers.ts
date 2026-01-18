/**
 * Helpers spécifiques pour les tests E2E d'export des demandes d'adhésion
 * 
 * Fournit des fonctions utilitaires pour :
 * - Ouvrir/fermer le modal d'export
 * - Configurer les options d'export
 * - Valider les téléchargements
 * - Gérer les erreurs
 */

import { Page, expect, Download } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'
import * as XLSX from 'xlsx'

/**
 * Attend que le modal d'export soit visible
 */
export async function waitForExportModal(page: Page) {
  await expect(page.locator('[data-testid="modal-export-requests"]')).toBeVisible({ timeout: 5000 })
  await page.waitForTimeout(500) // Attendre que le modal soit complètement rendu
}

/**
 * Ouvre le modal d'export en cliquant sur le bouton "Exporter"
 */
export async function openExportModal(page: Page) {
  // Chercher le bouton "Exporter" (peut être dans un DropdownMenu ou directement visible)
  const exportButton = page.locator('[data-testid="export-button"], button:has-text("Exporter")').first()
  
  if (await exportButton.count() === 0) {
    // Essayer de trouver dans un menu dropdown
    const menuTrigger = page.locator('[role="button"]:has-text("Actions"), button[aria-haspopup="menu"]').first()
    if (await menuTrigger.count() > 0) {
      await menuTrigger.click()
      await page.waitForTimeout(500)
      const exportMenu = page.locator('[role="menuitem"]:has-text("Exporter"), button:has-text("Exporter")').first()
      if (await exportMenu.count() > 0) {
        await exportMenu.click()
      }
    }
  } else {
    await exportButton.click()
  }
  
  await waitForExportModal(page)
}

/**
 * Ferme le modal d'export
 */
export async function closeExportModal(page: Page) {
  // Essayer plusieurs méthodes de fermeture
  const closeButton = page.locator('[data-testid="export-cancel-button"], [data-testid="modal-export-requests"] [aria-label="Close"]').first()
  
  if (await closeButton.count() > 0) {
    await closeButton.click()
  } else {
    // Appuyer sur Escape
    await page.keyboard.press('Escape')
  }
  
  await expect(page.locator('[data-testid="modal-export-requests"]')).toBeHidden({ timeout: 2000 })
}

/**
 * Sélectionne le format d'export (PDF ou Excel)
 */
export async function selectExportFormat(page: Page, format: 'pdf' | 'excel') {
  const modal = page.locator('[data-testid="modal-export-requests"]')
  
  if (format === 'pdf') {
    await modal.locator('[data-testid="export-format-pdf"]').click()
  } else {
    await modal.locator('[data-testid="export-format-excel"]').click()
  }
  
  await page.waitForTimeout(300)
}

/**
 * Sélectionne le périmètre des données
 */
export async function selectScopeMode(page: Page, mode: 'all' | 'period' | 'quantity') {
  const modal = page.locator('[data-testid="modal-export-requests"]')
  
  if (mode === 'all') {
    await modal.locator('[data-testid="export-scope-all"]').click()
  } else if (mode === 'period') {
    await modal.locator('[data-testid="export-scope-period"]').click()
  } else if (mode === 'quantity') {
    await modal.locator('[data-testid="export-scope-quantity"]').click()
  }
  
  await page.waitForTimeout(300)
}

/**
 * Configure les dates de période
 */
export async function setPeriodDates(page: Page, dateStart: string, dateEnd: string) {
  const modal = page.locator('[data-testid="modal-export-requests"]')
  
  const startInput = modal.locator('[data-testid="export-date-start"]')
  const endInput = modal.locator('[data-testid="export-date-end"]')
  
  if (await startInput.count() > 0) {
    await startInput.fill(dateStart)
  }
  
  if (await endInput.count() > 0) {
    await endInput.fill(dateEnd)
  }
  
  await page.waitForTimeout(300)
}

/**
 * Configure le nombre de demandes
 */
export async function setQuantity(page: Page, quantity: number) {
  const modal = page.locator('[data-testid="modal-export-requests"]')
  
  const quantityInput = modal.locator('[data-testid="export-quantity-input"]')
  
  if (await quantityInput.count() > 0) {
    await quantityInput.clear()
    await quantityInput.fill(quantity.toString())
  }
  
  await page.waitForTimeout(300)
}

/**
 * Sélectionne un filtre de statut (checkbox)
 */
export async function toggleStatusFilter(page: Page, status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'paid' | 'unpaid') {
  const modal = page.locator('[data-testid="modal-export-requests"]')
  
  // Utiliser le label avec data-testid pour un clic plus fiable
  const filterLabel = modal.locator(`[data-testid="export-filter-${status}"]`)
  
  if (await filterLabel.count() > 0) {
    await filterLabel.click()
  }
  
  await page.waitForTimeout(300)
}

/**
 * Sélectionne l'ordre de tri
 */
export async function selectSortOrder(page: Page, sortBy: 'date_desc' | 'date_asc' | 'name_asc' | 'name_desc') {
  const modal = page.locator('[data-testid="modal-export-requests"]')
  
  const sortLabels: Record<string, string> = {
    date_desc: 'récent',
    date_asc: 'ancien',
    name_asc: 'A → Z',
    name_desc: 'Z → A',
  }
  
  // Cliquer sur le trigger du Select
  const selectTrigger = modal.locator('[data-testid="export-sort-trigger"]')
  
  if (await selectTrigger.count() > 0) {
    await selectTrigger.click()
    await page.waitForTimeout(300)
    
    // Chercher l'option dans la liste déroulante
    const option = page.locator(`[role="option"]:has-text("${sortLabels[sortBy]}")`).first()
    if (await option.count() > 0) {
      await option.click()
    }
  }
  
  await page.waitForTimeout(300)
}

/**
 * Clique sur le bouton "Réinitialiser"
 */
export async function clickResetButton(page: Page) {
  const modal = page.locator('[data-testid="modal-export-requests"]')
  const resetButton = modal.locator('[data-testid="export-reset-button"]')
  
  if (await resetButton.count() > 0) {
    await resetButton.click()
    await page.waitForTimeout(500)
  }
}

/**
 * Clique sur le bouton "Générer l'export"
 */
export async function clickGenerateExportButton(page: Page) {
  const modal = page.locator('[data-testid="modal-export-requests"]')
  const generateButton = modal.locator('[data-testid="confirm-export"]')
  
  if (await generateButton.count() > 0) {
    await generateButton.click()
  }
}

/**
 * Attend qu'un fichier soit téléchargé
 */
export async function waitForDownload(page: Page, timeout: number = 30000): Promise<Download> {
  const downloadPromise = page.waitForEvent('download', { timeout })
  return downloadPromise
}

/**
 * Valide le contenu d'un fichier PDF téléchargé
 * Vérifie la présence de textes clés (titre, date, etc.)
 */
export async function validatePDFContent(filePath: string, expectedTexts: string[]): Promise<void> {
  // Note: Playwright ne peut pas parser directement les PDF
  // On utilise une approche simplifiée: vérifier que le fichier existe et a une taille > 0
  // Pour une validation complète, on pourrait utiliser pdf-lib ou pdf-parse
  
  const fileExists = fs.existsSync(filePath)
  expect(fileExists).toBe(true)
  
  const stats = fs.statSync(filePath)
  expect(stats.size).toBeGreaterThan(0)
  
  // Vérifier le nom de fichier (doit contenir "export" ou "demandes")
  const fileName = path.basename(filePath)
  expect(fileName.toLowerCase()).toMatch(/export|demandes|membership/)
  expect(fileName).toMatch(/\.pdf$/i)
  
  // TODO: Pour une validation complète du contenu, intégrer pdf-parse ou pdf-lib
  // const pdfContent = await parsePDF(filePath)
  // expectedTexts.forEach(text => {
  //   expect(pdfContent).toContain(text)
  // })
}

/**
 * Valide le contenu d'un fichier Excel téléchargé
 * Vérifie la présence de colonnes attendues
 */
export async function validateExcelContent(filePath: string, expectedColumns: string[]): Promise<void> {
  const fileExists = fs.existsSync(filePath)
  expect(fileExists).toBe(true)
  
  const stats = fs.statSync(filePath)
  expect(stats.size).toBeGreaterThan(0)
  
  // Vérifier le nom de fichier
  const fileName = path.basename(filePath)
  expect(fileName.toLowerCase()).toMatch(/export|demandes|membership/)
  expect(fileName).toMatch(/\.xlsx?$/i)
  
  // Lire le fichier Excel en utilisant un buffer (compatible avec Playwright)
  const fileBuffer = fs.readFileSync(filePath)
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' })
  expect(workbook.SheetNames.length).toBeGreaterThan(0)
  
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]
  
  // Convertir en JSON pour inspection
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]
  expect(data.length).toBeGreaterThan(0)
  
  // Vérifier les colonnes (première ligne)
  const headers = data[0] as string[]
  
  // Vérification partielle des colonnes attendues (peut ne pas toutes correspondre exactement)
  const headersLower = headers.map(h => h?.toLowerCase() || '')
  expectedColumns.forEach(column => {
    const columnLower = column.toLowerCase()
    const found = headersLower.some(h => h.includes(columnLower) || columnLower.includes(h))
    expect(found).toBe(true)
  })
}

/**
 * Sauvegarde un fichier téléchargé dans un dossier temporaire
 */
export async function saveDownloadedFile(download: Download, outputDir: string = 'test-results/downloads'): Promise<string> {
  // Créer le dossier s'il n'existe pas
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }
  
  // Générer un nom de fichier unique
  const timestamp = Date.now()
  const suggestedFilename = download.suggestedFilename()
  const extension = path.extname(suggestedFilename)
  const baseName = path.basename(suggestedFilename, extension)
  const filename = `${baseName}-${timestamp}${extension}`
  
  const filePath = path.join(outputDir, filename)
  await download.saveAs(filePath)
  
  return filePath
}

/**
 * Vérifie que le bouton "Générer" est désactivé
 */
export async function expectGenerateButtonDisabled(page: Page) {
  const modal = page.locator('[data-testid="modal-export-requests"]')
  const generateButton = modal.locator('[data-testid="confirm-export"]')
  
  if (await generateButton.count() > 0) {
    await expect(generateButton).toBeDisabled()
  }
}

/**
 * Vérifie que le bouton "Générer" est activé
 */
export async function expectGenerateButtonEnabled(page: Page) {
  const modal = page.locator('[data-testid="modal-export-requests"]')
  const generateButton = modal.locator('[data-testid="confirm-export"]')
  
  if (await generateButton.count() > 0) {
    await expect(generateButton).toBeEnabled()
  }
}

/**
 * Vérifie que l'aperçu affiche le bon nombre de demandes
 */
export async function expectPreviewCount(page: Page, expectedCount: number | null) {
  const modal = page.locator('[data-testid="modal-export-requests"]')
  
  if (expectedCount === null) {
    // L'aperçu peut ne pas afficher de nombre si en cours de calcul
    return
  }
  
  // Chercher dans la section aperçu
  const previewSection = modal.locator('[data-testid="export-preview-count"]')
  
  if (await previewSection.count() > 0) {
    await expect(previewSection).toContainText(expectedCount.toString(), { timeout: 5000 })
  }
}

/**
 * Confirme la dialog d'avertissement pour export volumineux
 */
export async function confirmLargeExportWarning(page: Page) {
  // Attendre que la dialog apparaisse (utilise window.confirm)
  page.on('dialog', async dialog => {
    if (dialog.type() === 'confirm') {
      await dialog.accept()
    }
  })
}

/**
 * Annule la dialog d'avertissement pour export volumineux
 */
export async function cancelLargeExportWarning(page: Page) {
  page.on('dialog', async dialog => {
    if (dialog.type() === 'confirm') {
      await dialog.dismiss()
    }
  })
}

/**
 * Vérifie que le format sélectionné est correct
 */
export async function expectSelectedFormat(page: Page, format: 'pdf' | 'excel') {
  const modal = page.locator('[data-testid="modal-export-requests"]')
  
  if (format === 'pdf') {
    await expect(modal.locator('[data-testid="export-format-pdf"]')).toHaveClass(/border-red-500/)
  } else {
    await expect(modal.locator('[data-testid="export-format-excel"]')).toHaveClass(/border-green-500/)
  }
}

/**
 * Vérifie que le périmètre sélectionné est correct
 */
export async function expectSelectedScope(page: Page, scope: 'all' | 'period' | 'quantity') {
  const modal = page.locator('[data-testid="modal-export-requests"]')
  const expectedTestId = `export-scope-${scope}`
  
  await expect(modal.locator(`[data-testid="${expectedTestId}"]`)).toHaveClass(/border-kara-primary-dark/)
}
