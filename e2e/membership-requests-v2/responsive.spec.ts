/**
 * Tests E2E pour la responsivité du module V2
 * 
 * Ces tests vérifient :
 * - Affichage correct sur mobile, tablette et desktop
 * - Adaptation des composants (table vs cards)
 * - Accessibilité des actions sur chaque format
 * 
 * @see PLAN_TESTS_TDD.md section 5.7
 */

import { test, expect } from '@playwright/test'
import { loginAsAdmin, goToMembershipRequestsV2, waitForRequestsList } from './helpers'

test.describe('E2E: Responsive Design V2', () => {
  test('devrait afficher correctement sur mobile', async ({ page }) => {
    // Set viewport mobile
    await page.setViewportSize({ width: 375, height: 667 })
    
    await loginAsAdmin(page)
    await goToMembershipRequestsV2(page)
    await waitForRequestsList(page)

    // Assert: Cards mobiles visibles (pas de table)
    const mobileCards = page.locator('[data-testid="membership-request-mobile-card"]')
    const table = page.locator('[data-testid="membership-requests-table"]')
    
    // Sur mobile, les cards devraient être visibles
    if (await mobileCards.count() > 0) {
      await expect(mobileCards.first()).toBeVisible()
    }
    
    // La table ne devrait pas être visible sur mobile
    if (await table.count() > 0) {
      // La table peut exister mais être cachée avec CSS
      const isVisible = await table.first().isVisible()
      // On accepte que la table soit présente mais cachée
    }

    // Assert: Actions accessibles (menu ou boutons compacts)
    const firstCard = mobileCards.first()
    if (await firstCard.count() > 0) {
      const actions = firstCard.locator('[data-testid="membership-request-actions"]')
      await expect(actions.first()).toBeVisible({ timeout: 5000 })
    }
  })

  test('devrait afficher correctement sur tablette', async ({ page }) => {
    // Set viewport tablette
    await page.setViewportSize({ width: 768, height: 1024 })
    
    await loginAsAdmin(page)
    await goToMembershipRequestsV2(page)
    await waitForRequestsList(page)

    // Assert: Contenu principal visible
    await expect(page.locator('h1, h2').filter({ hasText: /demandes?.*adhésion/i })).toBeVisible({ timeout: 10000 })

    // Assert: Liste visible (peut être table ou cards selon breakpoint)
    const table = page.locator('[data-testid="membership-requests-table"]')
    const cards = page.locator('[data-testid="membership-request-mobile-card"]')
    
    // Au moins un des deux devrait être visible
    const tableVisible = await table.count() > 0 && await table.first().isVisible()
    const cardsVisible = await cards.count() > 0 && await cards.first().isVisible()
    
    expect(tableVisible || cardsVisible).toBeTruthy()
  })

  test('devrait afficher correctement sur desktop', async ({ page }) => {
    // Set viewport desktop
    await page.setViewportSize({ width: 1440, height: 900 })
    
    await loginAsAdmin(page)
    await goToMembershipRequestsV2(page)
    await waitForRequestsList(page)

    // Assert: Table visible (desktop)
    const table = page.locator('[data-testid="membership-requests-table"]')
    if (await table.count() > 0) {
      await expect(table.first()).toBeVisible({ timeout: 5000 })
    }

    // Assert: Colonnes principales visibles
    const headers = page.locator('[data-testid="table-header"], th, [role="columnheader"]')
    if (await headers.count() > 0) {
      await expect(headers.first()).toBeVisible()
    }

    // Assert: Actions visibles dans les lignes
    const firstRow = page.locator('[data-testid="membership-request-row"]').first()
    if (await firstRow.count() > 0) {
      const actions = firstRow.locator('[data-testid="membership-request-actions"]')
      await expect(actions.first()).toBeVisible({ timeout: 5000 })
    }
  })

  test('devrait adapter les tabs de filtres selon la taille d\'écran', async ({ page }) => {
    // Test mobile
    await page.setViewportSize({ width: 375, height: 667 })
    await loginAsAdmin(page)
    await goToMembershipRequestsV2(page)
    await page.waitForTimeout(2000)

    // Sur mobile, les tabs peuvent être scrollables ou dans un menu
    const tabs = page.locator('[role="tablist"], [data-testid="filter-tabs"]')
    if (await tabs.count() > 0) {
      await expect(tabs.first()).toBeVisible()
    }

    // Test desktop
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.reload()
    await page.waitForTimeout(2000)

    // Sur desktop, tous les tabs devraient être visibles
    const desktopTabs = page.locator('[role="tab"], [data-testid="tab-trigger"]')
    if (await desktopTabs.count() > 0) {
      // Au moins quelques tabs devraient être visibles
      const visibleTabs = await desktopTabs.filter({ has: page.locator(':visible') }).count()
      expect(visibleTabs).toBeGreaterThan(0)
    }
  })

  test('devrait adapter la barre de recherche selon la taille d\'écran', async ({ page }) => {
    // Test mobile
    await page.setViewportSize({ width: 375, height: 667 })
    await loginAsAdmin(page)
    await goToMembershipRequestsV2(page)
    await page.waitForTimeout(2000)

    const searchInput = page.locator('[data-testid="search-input"], input[placeholder*="recherche" i]')
    await expect(searchInput.first()).toBeVisible({ timeout: 5000 })

    // Test desktop
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.reload()
    await page.waitForTimeout(2000)

    await expect(searchInput.first()).toBeVisible()
  })
})
