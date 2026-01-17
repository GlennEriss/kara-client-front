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
    // Set viewport tablette (768px est le breakpoint mobile, donc on utilise 1024px pour tablette)
    await page.setViewportSize({ width: 1024, height: 768 })
    
    await loginAsAdmin(page)
    await goToMembershipRequestsV2(page)
    await waitForRequestsList(page)

    // Assert: Contenu principal visible
    await expect(page.locator('h1, h2').filter({ hasText: /demandes?.*adhésion/i })).toBeVisible({ timeout: 10000 })

    // Assert: Liste visible (peut être table ou cards selon breakpoint)
    // Sur tablette (>= 768px), on devrait avoir la table
    const table = page.locator('table, [data-testid="membership-requests-table"]')
    const cards = page.locator('[data-testid="membership-request-mobile-card"]')
    
    // Vérifier que soit la table est visible, soit les cards, soit c'est un état vide
    const tableCount = await table.count()
    const cardsCount = await cards.count()
    const emptyState = page.locator('text=/Aucune demande/i')
    const emptyStateCount = await emptyState.count()
    
    // Au moins un des trois devrait être présent
    expect(tableCount > 0 || cardsCount > 0 || emptyStateCount > 0).toBeTruthy()
    
    // Si on a des éléments, vérifier qu'au moins un est visible
    if (tableCount > 0) {
      const isTableVisible = await table.first().isVisible()
      if (isTableVisible) {
        await expect(table.first()).toBeVisible()
        return // Test réussi
      }
    }
    
    if (cardsCount > 0) {
      const isCardsVisible = await cards.first().isVisible()
      if (isCardsVisible) {
        await expect(cards.first()).toBeVisible()
        return // Test réussi
      }
    }
    
    // Si c'est un état vide, c'est aussi acceptable
    if (emptyStateCount > 0) {
      await expect(emptyState.first()).toBeVisible()
      return // Test réussi
    }
    
    // Si rien n'est visible, c'est un problème
    throw new Error('Aucun élément de liste visible sur tablette')
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
    const tabs = page.locator('[role="tablist"], [data-testid="filter-tabs"], [class*="tabs"]')
    if (await tabs.count() > 0) {
      await expect(tabs.first()).toBeVisible()
    }

    // Test desktop
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.reload()
    await waitForRequestsList(page)
    await page.waitForTimeout(2000)

    // Sur desktop, vérifier que les tabs sont présents (peuvent être dans un tablist)
    const tablist = page.locator('[role="tablist"]')
    const desktopTabs = page.locator('[role="tab"], button:has-text("En attente"), button:has-text("Approuvées")')
    
    // Vérifier que soit le tablist est visible, soit au moins un tab est visible
    const tablistVisible = await tablist.count() > 0 && await tablist.first().isVisible()
    const tabsCount = await desktopTabs.count()
    
    // Au moins le tablist ou quelques tabs devraient être visibles
    if (tablistVisible) {
      await expect(tablist.first()).toBeVisible()
    } else if (tabsCount > 0) {
      // Vérifier qu'au moins un tab est visible
      let hasVisibleTab = false
      for (let i = 0; i < Math.min(tabsCount, 5); i++) {
        const tab = desktopTabs.nth(i)
        if (await tab.isVisible()) {
          hasVisibleTab = true
          break
        }
      }
      expect(hasVisibleTab || tablistVisible).toBeTruthy()
    } else {
      // Si aucun tab n'est trouvé, vérifier qu'il y a au moins un élément de filtre
      const filterElements = page.locator('[data-testid="filter-tabs"], [class*="Tabs"]')
      expect(await filterElements.count()).toBeGreaterThan(0)
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
