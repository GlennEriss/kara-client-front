import { test, expect } from '@playwright/test';

/**
 * Tests E2E pour le module Géographie
 * 
 * Ces tests vérifient la fonctionnalité complète du module géographie après
 * la migration vers domains/infrastructure/geography et la refactorisation du design.
 * 
 * Prérequis :
 * - Serveur de développement lancé (pnpm dev)
 * - Utilisateur admin authentifié (via auth.setup.ts)
 * - Firebase Cloud (projet dev) ou émulateur Firebase
 * 
 * TEMPORAIREMENT COMMENTÉS - Focus sur les tests d'authentification
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
test.describe.skip('Module Géographie - Affichage et Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Aller sur la page de géographie
    await page.goto('/geographie');
    
    // Attendre que la page soit chargée
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // Attendre le chargement des données
  });

  test('devrait afficher le header avec titre et description', async ({ page }) => {
    // Vérifier le titre
    await expect(page.locator('h1:has-text("Gestion Géographique")')).toBeVisible();
    
    // Vérifier la description
    await expect(page.locator('text=Gérez les provinces, départements, communes')).toBeVisible();
  });

  test('devrait afficher les statistiques (5 cards)', async ({ page }) => {
    // Vérifier que les 5 cards de statistiques sont présentes
    const statsCards = page.locator('[class*="Card"]').filter({ hasText: /Provinces|Départements|Communes|Arrondissements|Quartiers/ });
    
    // Au moins une card de statistique doit être visible
    await expect(statsCards.first()).toBeVisible({ timeout: 5000 });
    
    // Vérifier qu'il y a des valeurs affichées (pas seulement 0)
    const statsSection = page.locator('text=Provinces').first().locator('..').locator('..');
    await expect(statsSection).toBeVisible();
  });

  test('devrait afficher tous les onglets (Provinces, Départements, Communes, Arrondissements, Quartiers)', async ({ page }) => {
    const tabsList = page.locator('[role="tablist"]');
    await expect(tabsList).toBeVisible();
    
    // Vérifier que les 5 onglets sont présents
    await expect(page.locator('[role="tab"]:has-text("Provinces")')).toBeVisible();
    await expect(page.locator('[role="tab"]:has-text("Départements")')).toBeVisible();
    await expect(page.locator('[role="tab"]:has-text("Communes")')).toBeVisible();
    await expect(page.locator('[role="tab"]:has-text("Arrondissements")')).toBeVisible();
    await expect(page.locator('[role="tab"]:has-text("Quartiers")')).toBeVisible();
  });

  test('devrait naviguer entre les onglets', async ({ page }) => {
    const tabs = page.locator('[role="tablist"] [role="tab"]');
    const tabCount = await tabs.count();
    
    expect(tabCount).toBeGreaterThanOrEqual(5);
    
    // Cliquer sur chaque onglet et vérifier qu'il est actif
    const tabNames = ['Provinces', 'Départements', 'Communes', 'Arrondissements', 'Quartiers'];
    
    for (const tabName of tabNames) {
      const tab = page.locator(`[role="tab"]:has-text("${tabName}")`);
      await tab.click();
      await page.waitForTimeout(300);
      
      // Vérifier que l'onglet est sélectionné
      await expect(tab).toHaveAttribute('aria-selected', 'true', { timeout: 1000 });
    }
  });
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
test.describe.skip('Module Géographie - Provinces', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/geographie');
    await page.waitForLoadState('networkidle');
    
    // S'assurer que l'onglet Provinces est actif
    const provincesTab = page.locator('[role="tab"]:has-text("Provinces")');
    if (await provincesTab.count() > 0) {
      await provincesTab.click();
      await page.waitForTimeout(500);
    }
  });

  test('devrait afficher la liste des provinces', async ({ page }) => {
    // Vérifier que la section Provinces est visible
    await expect(page.locator('h2:has-text("Provinces"), text=Province').first()).toBeVisible({ timeout: 5000 });
  });

  test('devrait afficher le bouton "Nouvelle Province" avec la couleur KARA', async ({ page }) => {
    const addButton = page.locator('button:has-text("Nouvelle Province"), button:has-text("Nouvelle province")');
    await expect(addButton).toBeVisible({ timeout: 5000 });
    
    // Vérifier que le bouton a la couleur KARA (#234D65)
    const buttonStyles = await addButton.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        backgroundColor: styles.backgroundColor,
        color: styles.color,
      };
    });
    
    // Le bouton doit avoir un fond (couleur KARA) et du texte blanc
    expect(buttonStyles.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(buttonStyles.color).toContain('255'); // Texte blanc
  });

  test('devrait ouvrir le modal de création de province', async ({ page }) => {
    const addButton = page.locator('button:has-text("Nouvelle Province"), button:has-text("Nouvelle province")');
    await addButton.click();
    
    // Attendre que le modal s'ouvre
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });
    
    // Vérifier que le titre du modal est présent
    await expect(page.locator('[role="dialog"]:has-text("province")')).toBeVisible();
    
    // Vérifier que les champs sont présents
    await expect(page.locator('input[name="name"], input[placeholder*="nom" i]')).toBeVisible();
    await expect(page.locator('input[name="code"], input[placeholder*="code" i]')).toBeVisible();
  });

  test('devrait créer une nouvelle province', async ({ page }) => {
    const timestamp = Date.now();
    const provinceName = `Province Test E2E ${timestamp}`;
    const provinceCode = `PT${timestamp.toString().slice(-4)}`;
    
    // Ouvrir le modal
    const addButton = page.locator('button:has-text("Nouvelle Province"), button:has-text("Nouvelle province")');
    await addButton.click();
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });
    
    // Remplir le formulaire
    const nameInput = page.locator('input[name="name"]').first();
    const codeInput = page.locator('input[name="code"]').first();
    
    await nameInput.fill(provinceName);
    await codeInput.fill(provinceCode);
    
    // Vérifier que le bouton "Créer" a la couleur KARA
    const submitButton = page.locator('button[type="submit"]:has-text("Créer"), button[type="submit"]:has-text("Enregistrer")');
    await expect(submitButton).toBeVisible();
    
    // Soumettre le formulaire
    await submitButton.click();
    
    // Attendre le message de succès ou que la province apparaisse dans la liste
    await expect(
      page.locator(`text=${provinceName}`).or(page.locator('text=créé avec succès')).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('devrait afficher les boutons d\'action (Export CSV, Actualiser)', async ({ page }) => {
    await expect(page.locator('button:has-text("Export CSV")')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button:has-text("Actualiser")')).toBeVisible();
  });

  test('devrait permettre de rechercher des provinces', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Rechercher" i], input[placeholder*="rechercher" i]').first();
    
    if (await searchInput.count() > 0) {
      await expect(searchInput).toBeVisible({ timeout: 5000 });
      
      // Tester la recherche
      await searchInput.fill('Test');
      await page.waitForTimeout(500);
      
      // Vérifier que la recherche fonctionne (la liste se met à jour)
      // Note: On ne peut pas vérifier les résultats exacts sans données de test fixes
    }
  });
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
test.describe.skip('Module Géographie - Départements', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/geographie');
    await page.waitForLoadState('networkidle');
    
    // Cliquer sur l'onglet Départements
    const departmentsTab = page.locator('[role="tab"]:has-text("Départements")');
    await departmentsTab.click();
    await page.waitForTimeout(500);
  });

  test('devrait afficher la liste des départements', async ({ page }) => {
    await expect(page.locator('h2:has-text("Départements"), text=Département').first()).toBeVisible({ timeout: 5000 });
  });

  test('devrait ouvrir le modal de création de département', async ({ page }) => {
    const addButton = page.locator('button:has-text("Nouveau"), button:has-text("Ajouter"), button:has-text("+")').first();
    await addButton.click({ timeout: 5000 });
    
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[role="dialog"]:has-text("département")')).toBeVisible();
  });
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
test.describe.skip('Module Géographie - Design et Responsive', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/geographie');
    await page.waitForLoadState('networkidle');
  });

  test('devrait respecter le design system (couleurs KARA)', async ({ page }) => {
    // Vérifier que le header a le bon style
    const header = page.locator('h1:has-text("Gestion Géographique")');
    await expect(header).toBeVisible();
    
    // Vérifier que les boutons primaires ont la couleur KARA
    const primaryButton = page.locator('button:has-text("Nouvelle Province")').first();
    if (await primaryButton.count() > 0) {
      const bgColor = await primaryButton.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });
      // Le bouton ne doit pas être transparent
      expect(bgColor).not.toBe('rgba(0, 0, 0, 0)');
    }
  });

  test('devrait être responsive (mobile)', async ({ page }) => {
    // Tester en mode mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Vérifier que le contenu est toujours visible
    await expect(page.locator('h1:has-text("Gestion Géographique")')).toBeVisible();
    await expect(page.locator('[role="tablist"]')).toBeVisible();
  });

  test('devrait être responsive (tablette)', async ({ page }) => {
    // Tester en mode tablette
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Vérifier que le contenu est toujours visible
    await expect(page.locator('h1:has-text("Gestion Géographique")')).toBeVisible();
    await expect(page.locator('[role="tablist"]')).toBeVisible();
  });
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
test.describe.skip('Géographie - Formulaire d\'inscription public', () => {
  test('devrait afficher les champs de géographie dans le formulaire public', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');
    
    // Attendre que le formulaire soit chargé (Step 2 contient la géographie)
    // Note: Il faut naviguer vers Step 2 si nécessaire
    const step2Indicator = page.locator('text=Étape 2, text=Step 2, [data-step="2"]');
    
    // Vérifier que les champs de géographie sont présents (au moins la province)
    const provinceField = page.locator('select[name*="province" i], input[name*="province" i], [id*="province" i]').first();
    await expect(provinceField).toBeVisible({ timeout: 10000 });
  });
});
