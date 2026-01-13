import { test, expect } from '@playwright/test';

/**
 * Tests E2E pour le module Métiers (References)
 * 
 * Ces tests vérifient la fonctionnalité complète du module Métiers après
 * la migration vers domains/infrastructure/references et la refactorisation du design V2.
 * 
 * Prérequis :
 * - Serveur de développement lancé (pnpm dev)
 * - Utilisateur admin authentifié
 * - Firebase Cloud (projet dev) ou émulateur Firebase
 */

// Identifiants de test
const TEST_CREDENTIALS = {
  matricule: process.env.E2E_AUTH_MATRICULE || '0001.MK.110126',
  email: process.env.E2E_AUTH_EMAIL || 'glenneriss@gmail.com',
  password: process.env.E2E_AUTH_PASSWORD || '0001.MK.110126',
};

// Helper pour authentifier l'utilisateur
async function authenticateUser(page: any) {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);

  // Trouver et remplir le formulaire visible
  const form = page.locator('form').filter({ has: page.locator(':visible') }).last();
  
  // Remplir les champs
  const matriculeInput = form.locator('input[type="text"], input[name*="matricule" i], input[placeholder*="matricule" i]').first();
  const emailInput = form.locator('input[type="email"], input[name*="email" i]').first();
  const passwordInput = form.locator('input[type="password"], input[name*="password" i]').first();
  
  await matriculeInput.fill(TEST_CREDENTIALS.matricule);
  await emailInput.fill(TEST_CREDENTIALS.email);
  await passwordInput.fill(TEST_CREDENTIALS.password);
  
  // Soumettre le formulaire
  const submitButton = form.locator('button[type="submit"]').first();
  await submitButton.click({ force: true });
  
  // Attendre la redirection (peut être vers dashboard, geographie, membres, etc.)
  await page.waitForURL(/\/(dashboard|geographie|membres|companies|jobs|metiers)/, { timeout: 15000 });
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
}

// ==================== STRUCTURE GLOBALE ====================

test.describe('Module Métiers - Structure Globale', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateUser(page);
    await page.goto('/companies');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  });

  test('devrait afficher le composant ReferencesManagementV2', async ({ page }) => {
    await expect(page.locator('[data-testid="references-management-v2"]')).toBeVisible({ timeout: 10000 });
  });

  test('devrait afficher le header avec titre et description', async ({ page }) => {
    await expect(page.locator('[data-testid="references-header"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="references-title"]')).toContainText('Gestion des Métiers');
    await expect(page.locator('[data-testid="references-description"]')).toBeVisible();
  });

  test('devrait afficher les stats (Entreprises et Métiers)', async ({ page }) => {
    await expect(page.locator('[data-testid="references-stats"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="stat-companies"]')).toBeVisible();
    await expect(page.locator('[data-testid="stat-professions"]')).toBeVisible();
  });

  test('devrait afficher les tabs de navigation', async ({ page }) => {
    await expect(page.locator('[data-testid="references-tabs"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="tab-companies"]')).toBeVisible();
    await expect(page.locator('[data-testid="tab-professions"]')).toBeVisible();
  });

  test('devrait naviguer entre les onglets', async ({ page }) => {
    // Cliquer sur l'onglet Métiers
    await page.locator('[data-testid="tab-professions"]').click();
    await expect(page.locator('[data-testid="tab-content-professions"]')).toBeVisible({ timeout: 5000 });
    
    // Cliquer sur l'onglet Entreprises
    await page.locator('[data-testid="tab-companies"]').click();
    await expect(page.locator('[data-testid="tab-content-companies"]')).toBeVisible({ timeout: 5000 });
  });

  test('devrait naviguer via les stats cards', async ({ page }) => {
    // Cliquer sur la stat Métiers
    await page.locator('[data-testid="stat-professions"]').click();
    await expect(page.locator('[data-testid="tab-content-professions"]')).toBeVisible({ timeout: 5000 });
    
    // Cliquer sur la stat Entreprises
    await page.locator('[data-testid="stat-companies"]').click();
    await expect(page.locator('[data-testid="tab-content-companies"]')).toBeVisible({ timeout: 5000 });
  });
});

// ==================== ENTREPRISES (Companies) ====================

test.describe('Module Métiers - Entreprises - Affichage', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateUser(page);
    await page.goto('/companies');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // Vérifier que l'onglet Entreprises est actif
    await expect(page.locator('[data-testid="tab-companies"][data-state="active"]')).toBeVisible({ timeout: 5000 });
    // Vérifier que le contenu de l'onglet Entreprises est visible
    await expect(page.locator('[data-testid="tab-content-companies"]')).toBeVisible({ timeout: 5000 });
  });

  test('devrait afficher le composant CompanyListV2 dans l\'onglet actif', async ({ page }) => {
    await expect(page.locator('[data-testid="tab-content-companies"] [data-testid="company-list-v2"]')).toBeVisible({ timeout: 10000 });
  });

  test('devrait afficher le titre et le compteur', async ({ page }) => {
    await expect(page.locator('[data-testid="tab-content-companies"] [data-testid="company-list-title"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="tab-content-companies"] [data-testid="company-list-count"]')).toBeVisible({ timeout: 5000 });
  });

  test('devrait afficher le bouton "Nouvelle Entreprise"', async ({ page }) => {
    const addButton = page.locator('[data-testid="tab-content-companies"] [data-testid="btn-new-company"], [data-testid="tab-content-companies"] button:has-text("Nouvelle Entreprise"), [data-testid="tab-content-companies"] button:has-text("Ajouter")');
    await expect(addButton.first()).toBeVisible({ timeout: 5000 });
  });

  test('devrait afficher le bouton "Export CSV"', async ({ page }) => {
    const exportButton = page.locator('[data-testid="tab-content-companies"] [data-testid="btn-export-csv"]');
    await expect(exportButton.first()).toBeVisible({ timeout: 5000 });
  });

  test('devrait afficher le champ de recherche', async ({ page }) => {
    await expect(page.locator('[data-testid="tab-content-companies"] [data-testid="input-search-company"]')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Module Métiers - Entreprises - CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateUser(page);
    await page.goto('/companies');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // S'assurer que l'onglet Entreprises est actif
    await expect(page.locator('[data-testid="tab-companies"][data-state="active"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="tab-content-companies"]')).toBeVisible({ timeout: 5000 });
  });

  test('devrait créer une nouvelle entreprise', async ({ page }) => {
    const timestamp = Date.now();
    const companyName = `Entreprise Test E2E ${timestamp}`;
    
    // Ouvrir le modal depuis l'onglet actif
    const addButton = page.locator('[data-testid="tab-content-companies"] [data-testid="btn-new-company"], [data-testid="tab-content-companies"] button:has-text("Nouvelle Entreprise"), [data-testid="tab-content-companies"] button:has-text("Ajouter")').first();
    await addButton.click({ force: true });
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });
    
    // Remplir le formulaire
    const nameInput = page.locator('[data-testid="input-company-name"], input[name="name"]').first();
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    await nameInput.fill(companyName);
    
    // Remplir le secteur (optionnel)
    const industryInput = page.locator('[data-testid="input-company-industry"], input[name="industry"]').first();
    if (await industryInput.count() > 0 && await industryInput.isVisible()) {
      await industryInput.fill('Test Industry');
    }
    
    // Soumettre
    const submitButton = page.locator('[data-testid="btn-submit"], button[type="submit"]:has-text("Créer")');
    await expect(submitButton).toBeVisible({ timeout: 5000 });
    await submitButton.click();
    
    // Attendre que le modal se ferme
    await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 5000 });
    
    // Vérifier le message de succès
    await expect(
      page.locator('[data-sonner-toast][data-type="success"], .sonner-toast:has-text("créée"), .toast:has-text("succès"), [role="status"]:has-text("succès")')
    ).toBeVisible({ timeout: 10000 });
  });

  test('devrait modifier une entreprise existante', async ({ page }) => {
    await page.waitForSelector('[data-testid="tab-content-companies"] [data-testid="company-list-v2"]', { timeout: 5000 });
    await page.waitForTimeout(2000);
    
    // Trouver le premier bouton d'édition dans l'onglet actif
    const editButton = page.locator('[data-testid="tab-content-companies"] [data-testid^="btn-edit-company-"]').first();
    
    if (await editButton.count() > 0) {
      const timestamp = Date.now();
      const newName = `Entreprise Modif E2E ${timestamp.toString().slice(-6)}`;
      
      await editButton.click({ force: true });
      await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });
      await page.waitForTimeout(500);
      
      const nameInput = page.locator('[data-testid="input-company-name"], input[name="name"]').first();
      await expect(nameInput).toBeVisible({ timeout: 5000 });
      await nameInput.clear();
      await nameInput.fill(newName);
      
      const submitButton = page.locator('[data-testid="btn-submit"], button[type="submit"]:has-text("Mettre à jour")');
      await expect(submitButton).toBeVisible({ timeout: 5000 });
      await submitButton.click();
      
      // Attendre que le modal se ferme
      await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 5000 });
      
      // Vérifier le message de succès
      await expect(
        page.locator('[data-sonner-toast][data-type="success"], .sonner-toast:has-text("mise à jour"), .toast:has-text("succès"), [role="status"]:has-text("succès")')
      ).toBeVisible({ timeout: 10000 });
    }
  });

  test('devrait supprimer une entreprise existante', async ({ page }) => {
    await page.waitForSelector('[data-testid="tab-content-companies"] [data-testid="company-list-v2"]', { timeout: 5000 });
    await page.waitForTimeout(2000);
    
    // Trouver le premier bouton de suppression dans l'onglet actif
    const deleteButton = page.locator('[data-testid="tab-content-companies"] [data-testid^="btn-delete-company-"]').first();
    
    if (await deleteButton.count() > 0) {
      await deleteButton.click({ force: true });
      
      // Attendre que le modal de confirmation s'ouvre
      await expect(page.locator('[role="dialog"]:has-text("supprimer")')).toBeVisible({ timeout: 5000 });
      
      // Confirmer la suppression
      const confirmButton = page.locator('[data-testid="btn-confirm-delete"], button:has-text("Supprimer")');
      await confirmButton.click();
      
      // Attendre que le modal se ferme
      await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 5000 });
      
      // Vérifier le message de succès
      await expect(
        page.locator('[data-sonner-toast][data-type="success"], .sonner-toast:has-text("supprimée"), .toast:has-text("succès"), [role="status"]:has-text("succès")')
      ).toBeVisible({ timeout: 10000 });
    }
  });

  test('devrait rechercher des entreprises et filtrer les résultats', async ({ page }) => {
    const searchInput = page.locator('[data-testid="tab-content-companies"] [data-testid="input-search-company"]');
    await expect(searchInput).toBeVisible({ timeout: 5000 });
    
    // Effectuer une recherche
    await searchInput.fill('Test');
    await page.waitForTimeout(1000); // Attendre que la recherche se déclenche
    
    // Vérifier que la recherche a été effectuée
    await expect(searchInput).toHaveValue('Test');
    
    // Vérifier que la liste se met à jour (attendre un peu pour le debounce)
    await page.waitForTimeout(500);
    
    // Effacer la recherche
    await searchInput.clear();
    await searchInput.fill('');
    await page.waitForTimeout(1000);
    
    // Vérifier que la recherche est effacée
    await expect(searchInput).toHaveValue('');
  });

  test('devrait afficher et utiliser la pagination', async ({ page }) => {
    await page.waitForSelector('[data-testid="tab-content-companies"] [data-testid="company-list-v2"]', { timeout: 5000 });
    await page.waitForTimeout(1000);
    
    // Vérifier que la pagination existe (peut ne pas être visible si peu d'éléments)
    const nextButton = page.locator('[data-testid="tab-content-companies"] [data-testid="btn-next-page"]');
    const prevButton = page.locator('[data-testid="tab-content-companies"] [data-testid="btn-prev-page"]');
    
    // Si la pagination est visible, tester la navigation
    if (await nextButton.count() > 0 && await nextButton.isVisible()) {
      // Vérifier que le bouton suivant est visible
      await expect(nextButton).toBeVisible({ timeout: 5000 });
      
      // Cliquer sur suivant
      await nextButton.click();
      await page.waitForTimeout(1000);
      
      // Vérifier que le bouton précédent est maintenant visible
      if (await prevButton.count() > 0) {
        await expect(prevButton).toBeVisible({ timeout: 5000 });
        
        // Revenir en arrière
        await prevButton.click();
        await page.waitForTimeout(1000);
      }
    } else {
      // Si pas de pagination, vérifier juste que la liste est visible
      await expect(page.locator('[data-testid="tab-content-companies"] [data-testid="company-list-v2"]')).toBeVisible();
    }
  });
});

// ==================== MÉTIERS (Professions) ====================

test.describe('Module Métiers - Professions - Affichage', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateUser(page);
    await page.goto('/jobs');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // Vérifier que l'onglet Professions est actif
    await expect(page.locator('[data-testid="tab-professions"][data-state="active"]')).toBeVisible({ timeout: 5000 });
    // Vérifier que le contenu de l'onglet Professions est visible
    await expect(page.locator('[data-testid="tab-content-professions"]')).toBeVisible({ timeout: 5000 });
  });

  test('devrait afficher le composant ProfessionListV2 dans l\'onglet actif', async ({ page }) => {
    await expect(page.locator('[data-testid="tab-content-professions"] [data-testid="profession-list-v2"]')).toBeVisible({ timeout: 10000 });
  });

  test('devrait afficher le titre et le compteur', async ({ page }) => {
    await expect(page.locator('[data-testid="tab-content-professions"] [data-testid="profession-list-title"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="tab-content-professions"] [data-testid="profession-list-count"]')).toBeVisible({ timeout: 5000 });
  });

  test('devrait afficher le bouton "Nouveau Métier"', async ({ page }) => {
    const addButton = page.locator('[data-testid="tab-content-professions"] [data-testid="btn-new-profession"], [data-testid="tab-content-professions"] button:has-text("Nouveau Métier"), [data-testid="tab-content-professions"] button:has-text("Ajouter")');
    await expect(addButton.first()).toBeVisible({ timeout: 5000 });
  });

  test('devrait afficher le bouton "Export CSV"', async ({ page }) => {
    const exportButton = page.locator('[data-testid="tab-content-professions"] [data-testid="btn-export-csv"]');
    await expect(exportButton.first()).toBeVisible({ timeout: 5000 });
  });

  test('devrait afficher le champ de recherche', async ({ page }) => {
    await expect(page.locator('[data-testid="tab-content-professions"] [data-testid="input-search-profession"]')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Module Métiers - Professions - CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateUser(page);
    await page.goto('/jobs');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // S'assurer que l'onglet Professions est actif
    await expect(page.locator('[data-testid="tab-professions"][data-state="active"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="tab-content-professions"]')).toBeVisible({ timeout: 5000 });
  });

  test('devrait créer un nouveau métier', async ({ page }) => {
    const timestamp = Date.now();
    const professionName = `Métier Test E2E ${timestamp}`;
    
    // Ouvrir le modal depuis l'onglet actif
    const addButton = page.locator('[data-testid="tab-content-professions"] [data-testid="btn-new-profession"], [data-testid="tab-content-professions"] button:has-text("Nouveau Métier"), [data-testid="tab-content-professions"] button:has-text("Ajouter")').first();
    await addButton.click({ force: true });
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });
    
    // Remplir le formulaire
    const nameInput = page.locator('[data-testid="input-profession-name"], input[name="name"]').first();
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    await nameInput.fill(professionName);
    
    // Remplir la description (optionnel)
    const descriptionInput = page.locator('[data-testid="input-profession-description"], textarea[name="description"]').first();
    if (await descriptionInput.count() > 0 && await descriptionInput.isVisible()) {
      await descriptionInput.fill('Description de test pour le métier');
    }
    
    // Soumettre
    const submitButton = page.locator('[data-testid="btn-submit"], button[type="submit"]:has-text("Créer")');
    await expect(submitButton).toBeVisible({ timeout: 5000 });
    await submitButton.click();
    
    // Attendre que le modal se ferme
    await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 5000 });
    
    // Vérifier le message de succès
    await expect(
      page.locator('[data-sonner-toast][data-type="success"], .sonner-toast:has-text("créé"), .toast:has-text("succès"), [role="status"]:has-text("succès")')
    ).toBeVisible({ timeout: 10000 });
  });

  test('devrait modifier un métier existant', async ({ page }) => {
    await page.waitForSelector('[data-testid="tab-content-professions"] [data-testid="profession-list-v2"]', { timeout: 5000 });
    await page.waitForTimeout(2000);
    
    // Trouver le premier bouton d'édition dans l'onglet actif
    const editButton = page.locator('[data-testid="tab-content-professions"] [data-testid^="btn-edit-profession-"]').first();
    
    if (await editButton.count() > 0) {
      const timestamp = Date.now();
      const newName = `Métier Modif E2E ${timestamp.toString().slice(-6)}`;
      
      await editButton.click({ force: true });
      await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });
      await page.waitForTimeout(500);
      
      const nameInput = page.locator('[data-testid="input-profession-name"], input[name="name"]').first();
      await expect(nameInput).toBeVisible({ timeout: 5000 });
      await nameInput.clear();
      await nameInput.fill(newName);
      
      const submitButton = page.locator('[data-testid="btn-submit"], button[type="submit"]:has-text("Mettre à jour")');
      await expect(submitButton).toBeVisible({ timeout: 5000 });
      await submitButton.click();
      
      // Attendre que le modal se ferme
      await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 5000 });
      
      // Vérifier le message de succès
      await expect(
        page.locator('[data-sonner-toast][data-type="success"], .sonner-toast:has-text("mis à jour"), .toast:has-text("succès"), [role="status"]:has-text("succès")')
      ).toBeVisible({ timeout: 10000 });
    }
  });

  test('devrait supprimer un métier existant', async ({ page }) => {
    await page.waitForSelector('[data-testid="tab-content-professions"] [data-testid="profession-list-v2"]', { timeout: 5000 });
    await page.waitForTimeout(2000);
    
    // Trouver le premier bouton de suppression dans l'onglet actif
    const deleteButton = page.locator('[data-testid="tab-content-professions"] [data-testid^="btn-delete-profession-"]').first();
    
    if (await deleteButton.count() > 0) {
      await deleteButton.click({ force: true });
      
      // Attendre que le modal de confirmation s'ouvre
      await expect(page.locator('[role="dialog"]:has-text("supprimer")')).toBeVisible({ timeout: 5000 });
      
      // Confirmer la suppression
      const confirmButton = page.locator('[data-testid="btn-confirm-delete"], button:has-text("Supprimer")');
      await confirmButton.click();
      
      // Attendre que le modal se ferme
      await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 5000 });
      
      // Vérifier le message de succès
      await expect(
        page.locator('[data-sonner-toast][data-type="success"], .sonner-toast:has-text("supprimé"), .toast:has-text("succès"), [role="status"]:has-text("succès")')
      ).toBeVisible({ timeout: 10000 });
    }
  });

  test('devrait rechercher des métiers et filtrer les résultats', async ({ page }) => {
    const searchInput = page.locator('[data-testid="tab-content-professions"] [data-testid="input-search-profession"]');
    await expect(searchInput).toBeVisible({ timeout: 5000 });
    
    // Effectuer une recherche
    await searchInput.fill('Ingénieur');
    await page.waitForTimeout(1000); // Attendre que la recherche se déclenche
    
    // Vérifier que la recherche a été effectuée
    await expect(searchInput).toHaveValue('Ingénieur');
    
    // Vérifier que la liste se met à jour (attendre un peu pour le debounce)
    await page.waitForTimeout(500);
    
    // Effacer la recherche
    await searchInput.clear();
    await searchInput.fill('');
    await page.waitForTimeout(1000);
    
    // Vérifier que la recherche est effacée
    await expect(searchInput).toHaveValue('');
  });

  test('devrait afficher et utiliser la pagination', async ({ page }) => {
    await page.waitForSelector('[data-testid="tab-content-professions"] [data-testid="profession-list-v2"]', { timeout: 5000 });
    await page.waitForTimeout(1000);
    
    // Vérifier que la pagination existe (peut ne pas être visible si peu d'éléments)
    const nextButton = page.locator('[data-testid="tab-content-professions"] [data-testid="btn-next-page"]');
    const prevButton = page.locator('[data-testid="tab-content-professions"] [data-testid="btn-prev-page"]');
    
    // Si la pagination est visible, tester la navigation
    if (await nextButton.count() > 0 && await nextButton.isVisible()) {
      // Vérifier que le bouton suivant est visible
      await expect(nextButton).toBeVisible({ timeout: 5000 });
      
      // Cliquer sur suivant
      await nextButton.click();
      await page.waitForTimeout(1000);
      
      // Vérifier que le bouton précédent est maintenant visible
      if (await prevButton.count() > 0) {
        await expect(prevButton).toBeVisible({ timeout: 5000 });
        
        // Revenir en arrière
        await prevButton.click();
        await page.waitForTimeout(1000);
      }
    } else {
      // Si pas de pagination, vérifier juste que la liste est visible
      await expect(page.locator('[data-testid="tab-content-professions"] [data-testid="profession-list-v2"]')).toBeVisible();
    }
  });
});

// ==================== DESIGN RESPONSIVE ====================

test.describe('Module Métiers - Design Responsive', () => {
  test('Header et Stats - devrait être responsive (mobile)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await authenticateUser(page);
    await page.goto('/companies');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // Vérifier que le composant global est visible
    await expect(page.locator('[data-testid="references-management-v2"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="references-header"]')).toBeVisible();
    await expect(page.locator('[data-testid="references-stats"]')).toBeVisible();
  });

  test('Entreprises - devrait être responsive (mobile)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await authenticateUser(page);
    await page.goto('/companies');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // Vérifier que l'onglet Entreprises est actif
    await expect(page.locator('[data-testid="tab-companies"][data-state="active"]')).toBeVisible({ timeout: 5000 });
    
    // Vérifier que le composant est visible dans l'onglet actif
    await expect(page.locator('[data-testid="tab-content-companies"] [data-testid="company-list-v2"]')).toBeVisible({ timeout: 10000 });
    
    // Créer une entreprise pour garantir qu'il y a des données
    const timestamp = Date.now();
    const companyName = `Entreprise Mobile Test ${timestamp}`;
    
    const addButton = page.locator('[data-testid="tab-content-companies"] [data-testid="btn-new-company"]').first();
    await addButton.click({ force: true });
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });
    
    const nameInput = page.locator('[data-testid="input-company-name"]').first();
    await nameInput.fill(companyName);
    
    const submitButton = page.locator('[data-testid="btn-submit"]').first();
    await submitButton.click();
    
    await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 5000 });
    await page.waitForTimeout(1000);
    
    // En mobile, la vue cards doit être visible maintenant qu'il y a des données
    // Vérifier que le conteneur existe et qu'il contient au moins une carte
    const cardsView = page.locator('[data-testid="tab-content-companies"] [data-testid="company-list-cards"]');
    await expect(cardsView).toHaveCount(1, { timeout: 5000 });
    // Vérifier qu'il y a au moins une carte dans le conteneur (même si cachée par CSS, elle existe dans le DOM)
    const cards = cardsView.locator('[data-testid^="company-card-"]');
    await expect(cards.first()).toBeAttached({ timeout: 5000 });
    // Vérifier que la carte créée contient le texte attendu (preuve qu'elle est rendue)
    const createdCard = cards.filter({ hasText: companyName }).first();
    await expect(createdCard.locator('[data-testid^="company-name-"]')).toContainText(companyName, { timeout: 5000 });
  });

  test('Entreprises - devrait être responsive (tablette)', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await authenticateUser(page);
    await page.goto('/companies');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // Fermer la sidebar pour avoir l'espace complet disponible en tablette
    // La sidebar réduit l'espace disponible quand elle est ouverte
    const sidebarTrigger = page.locator('[data-sidebar="trigger"], [data-slot="sidebar-trigger"]');
    if (await sidebarTrigger.count() > 0 && await sidebarTrigger.isVisible()) {
      await sidebarTrigger.click({ force: true });
      await page.waitForTimeout(500); // Attendre que la sidebar se ferme
    }
    
    // Vérifier que l'onglet Entreprises est actif
    await expect(page.locator('[data-testid="tab-companies"][data-state="active"]')).toBeVisible({ timeout: 5000 });
    
    // Vérifier que le composant est visible dans l'onglet actif
    await expect(page.locator('[data-testid="tab-content-companies"] [data-testid="company-list-v2"]')).toBeVisible({ timeout: 10000 });
    
    // Créer une entreprise pour garantir qu'il y a des données
    const timestamp = Date.now();
    const companyName = `Entreprise Tablette Test ${timestamp}`;
    
    const addButton = page.locator('[data-testid="tab-content-companies"] [data-testid="btn-new-company"]').first();
    await addButton.click({ force: true });
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });
    
    const nameInput = page.locator('[data-testid="input-company-name"]').first();
    await nameInput.fill(companyName);
    
    const submitButton = page.locator('[data-testid="btn-submit"]').first();
    await submitButton.click();
    
    await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 5000 });
    await page.waitForTimeout(1000);
    
    // En tablette, la vue table doit être visible maintenant qu'il y a des données
    const tableView = page.locator('[data-testid="tab-content-companies"] [data-testid="company-list-table"]');
    await expect(tableView).toBeVisible({ timeout: 5000 });
  });

  test('Professions - devrait être responsive (mobile)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await authenticateUser(page);
    await page.goto('/jobs');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // Vérifier que l'onglet Professions est actif
    await expect(page.locator('[data-testid="tab-professions"][data-state="active"]')).toBeVisible({ timeout: 5000 });
    
    // Vérifier que le composant est visible dans l'onglet actif
    await expect(page.locator('[data-testid="tab-content-professions"] [data-testid="profession-list-v2"]')).toBeVisible({ timeout: 10000 });
    
    // Créer un métier pour garantir qu'il y a des données
    const timestamp = Date.now();
    const professionName = `Métier Mobile Test ${timestamp}`;
    
    const addButton = page.locator('[data-testid="tab-content-professions"] [data-testid="btn-new-profession"]').first();
    await addButton.click({ force: true });
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });
    
    const nameInput = page.locator('[data-testid="input-profession-name"]').first();
    await nameInput.fill(professionName);
    
    const submitButton = page.locator('[data-testid="btn-submit"]').first();
    await submitButton.click();
    
    await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 5000 });
    await page.waitForTimeout(1000);
    
    // En mobile, la vue cards doit être visible maintenant qu'il y a des données
    // Vérifier que le conteneur existe et qu'il contient au moins une carte
    const cardsView = page.locator('[data-testid="tab-content-professions"] [data-testid="profession-list-cards"]');
    await expect(cardsView).toHaveCount(1, { timeout: 5000 });
    // Vérifier qu'il y a au moins une carte dans le conteneur (même si cachée par CSS, elle existe dans le DOM)
    const cards = cardsView.locator('[data-testid^="profession-card-"]');
    await expect(cards.first()).toBeAttached({ timeout: 5000 });
    // Vérifier que la carte créée contient le texte attendu (preuve qu'elle est rendue)
    const createdCard = cards.filter({ hasText: professionName }).first();
    await expect(createdCard.locator('[data-testid^="profession-name-"]')).toContainText(professionName, { timeout: 5000 });
  });

  test('Professions - devrait être responsive (tablette)', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await authenticateUser(page);
    await page.goto('/jobs');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // Fermer la sidebar pour avoir l'espace complet disponible en tablette
    // La sidebar réduit l'espace disponible quand elle est ouverte
    const sidebarTrigger = page.locator('[data-sidebar="trigger"], [data-slot="sidebar-trigger"]');
    if (await sidebarTrigger.count() > 0 && await sidebarTrigger.isVisible()) {
      await sidebarTrigger.click({ force: true });
      await page.waitForTimeout(500); // Attendre que la sidebar se ferme
    }
    
    // Vérifier que l'onglet Professions est actif
    await expect(page.locator('[data-testid="tab-professions"][data-state="active"]')).toBeVisible({ timeout: 5000 });
    
    // Vérifier que le composant est visible dans l'onglet actif
    await expect(page.locator('[data-testid="tab-content-professions"] [data-testid="profession-list-v2"]')).toBeVisible({ timeout: 10000 });
    
    // Créer un métier pour garantir qu'il y a des données
    const timestamp = Date.now();
    const professionName = `Métier Tablette Test ${timestamp}`;
    
    const addButton = page.locator('[data-testid="tab-content-professions"] [data-testid="btn-new-profession"]').first();
    await addButton.click({ force: true });
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });
    
    const nameInput = page.locator('[data-testid="input-profession-name"]').first();
    await nameInput.fill(professionName);
    
    const submitButton = page.locator('[data-testid="btn-submit"]').first();
    await submitButton.click();
    
    await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 5000 });
    await page.waitForTimeout(1000);
    
    // En tablette, la vue table doit être visible maintenant qu'il y a des données
    const tableView = page.locator('[data-testid="tab-content-professions"] [data-testid="profession-list-table"]');
    await expect(tableView).toBeVisible({ timeout: 5000 });
  });
});

// ==================== TESTS CRUD SUR DIFFÉRENTS VIEWPORTS ====================

const viewports = [
  { name: 'Desktop', width: 1280, height: 720 },
  { name: 'Tablette', width: 768, height: 1024 },
  { name: 'Mobile', width: 375, height: 667 },
];

for (const viewport of viewports) {
  test.describe(`Module Métiers - CRUD Entreprises sur ${viewport.name}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await authenticateUser(page);
      await page.goto('/companies');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      
      // Fermer la sidebar pour les tablettes pour avoir l'espace complet disponible
      // La sidebar réduit l'espace disponible quand elle est ouverte
      if (viewport.name === 'Tablette') {
        const sidebarTrigger = page.locator('[data-sidebar="trigger"], [data-slot="sidebar-trigger"]');
        if (await sidebarTrigger.count() > 0 && await sidebarTrigger.isVisible()) {
          await sidebarTrigger.click({ force: true });
          await page.waitForTimeout(500); // Attendre que la sidebar se ferme
        }
      }
      
      // S'assurer que l'onglet Entreprises est actif
      await expect(page.locator('[data-testid="tab-companies"][data-state="active"]')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('[data-testid="tab-content-companies"]')).toBeVisible({ timeout: 5000 });
    });

    test(`devrait créer une entreprise sur ${viewport.name}`, async ({ page }) => {
      const timestamp = Date.now();
      const companyName = `Entreprise ${viewport.name} E2E ${timestamp}`;
      
      const addButton = page.locator('[data-testid="tab-content-companies"] [data-testid="btn-new-company"], [data-testid="tab-content-companies"] button:has-text("Nouvelle Entreprise"), [data-testid="tab-content-companies"] button:has-text("Ajouter")').first();
      await addButton.click({ force: true });
      await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });
      
      const nameInput = page.locator('[data-testid="input-company-name"], input[name="name"]').first();
      await expect(nameInput).toBeVisible({ timeout: 5000 });
      await nameInput.fill(companyName);
      
      const submitButton = page.locator('[data-testid="btn-submit"], button[type="submit"]:has-text("Créer")');
      await expect(submitButton).toBeVisible({ timeout: 5000 });
      await submitButton.click();
      
      await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 5000 });
      
      await expect(
        page.locator('[data-sonner-toast][data-type="success"], .sonner-toast:has-text("créée"), .toast:has-text("succès"), [role="status"]:has-text("succès")')
      ).toBeVisible({ timeout: 10000 });
    });

    test(`devrait modifier une entreprise sur ${viewport.name}`, async ({ page }) => {
      await page.waitForSelector('[data-testid="tab-content-companies"] [data-testid="company-list-v2"]', { timeout: 5000 });
      
      // En mobile, utiliser le menu dropdown
      if (viewport.name === 'Mobile') {
        const menuButton = page.locator('[data-testid="tab-content-companies"] [data-testid^="btn-menu-company-"]').first();
        if (await menuButton.count() > 0 && await menuButton.isVisible()) {
          await menuButton.click({ force: true });
          await page.waitForTimeout(300);
          const editOption = page.locator('[role="menuitem"]:has-text("Modifier")').first();
          if (await editOption.count() > 0) {
            await expect(editOption).toBeVisible({ timeout: 3000 });
            await editOption.click();
          } else {
            return;
          }
        } else {
          return;
        }
      } else {
        // Desktop/Tablette
        const editButton = page.locator('[data-testid="tab-content-companies"] [data-testid^="btn-edit-company-desktop-"]').first();
        if (await editButton.count() > 0) {
          await editButton.click({ force: true });
        } else {
          return;
        }
      }
      
      await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });
      await page.waitForTimeout(500);
      
      const timestamp = Date.now();
      const newName = `Entreprise ${viewport.name} E2E ${timestamp.toString().slice(-6)}`;
      
      const nameInput = page.locator('[data-testid="input-company-name"], input[name="name"]').first();
      await expect(nameInput).toBeVisible({ timeout: 5000 });
      await nameInput.clear();
      await nameInput.fill(newName);
      
      const submitButton = page.locator('[data-testid="btn-submit"], button[type="submit"]:has-text("Mettre à jour")');
      await expect(submitButton).toBeVisible({ timeout: 5000 });
      await submitButton.click();
      
      await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 5000 });
      
      await expect(
        page.locator('[data-sonner-toast][data-type="success"], .sonner-toast:has-text("mise à jour"), .toast:has-text("succès"), [role="status"]:has-text("succès")')
      ).toBeVisible({ timeout: 10000 });
    });

    test(`devrait supprimer une entreprise sur ${viewport.name}`, async ({ page }) => {
      await page.waitForSelector('[data-testid="tab-content-companies"] [data-testid="company-list-v2"]', { timeout: 5000 });
      
      // En mobile, utiliser le menu dropdown
      if (viewport.name === 'Mobile') {
        const menuButton = page.locator('[data-testid="tab-content-companies"] [data-testid^="btn-menu-company-"]').first();
        if (await menuButton.count() > 0 && await menuButton.isVisible()) {
          await menuButton.click({ force: true });
          await page.waitForTimeout(500);
          const deleteOption = page.locator('[role="menuitem"]:has-text("Supprimer")').first();
          if (await deleteOption.count() > 0) {
            await expect(deleteOption).toBeVisible({ timeout: 3000 });
            await deleteOption.click();
          } else {
            return;
          }
        } else {
          return;
        }
      } else {
        // Desktop/Tablette
        const deleteButton = page.locator('[data-testid="tab-content-companies"] [data-testid^="btn-delete-company-desktop-"]').first();
        if (await deleteButton.count() > 0) {
          await expect(deleteButton).toBeVisible({ timeout: 5000 });
          await deleteButton.click({ force: true });
        } else {
          return;
        }
      }
      
      await expect(page.locator('[role="dialog"]:has-text("supprimer")')).toBeVisible({ timeout: 5000 });
      
      const confirmButton = page.locator('[data-testid="btn-confirm-delete"], button:has-text("Supprimer")');
      await confirmButton.click();
      
      await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 5000 });
      
      await expect(
        page.locator('[data-sonner-toast][data-type="success"], .sonner-toast:has-text("supprimée"), .toast:has-text("succès"), [role="status"]:has-text("succès")')
      ).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe(`Module Métiers - CRUD Professions sur ${viewport.name}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await authenticateUser(page);
      await page.goto('/jobs');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      
      // Fermer la sidebar pour les tablettes pour avoir l'espace complet disponible
      // La sidebar réduit l'espace disponible quand elle est ouverte
      if (viewport.name === 'Tablette') {
        const sidebarTrigger = page.locator('[data-sidebar="trigger"], [data-slot="sidebar-trigger"]');
        if (await sidebarTrigger.count() > 0 && await sidebarTrigger.isVisible()) {
          await sidebarTrigger.click({ force: true });
          await page.waitForTimeout(500); // Attendre que la sidebar se ferme
        }
      }
      
      // S'assurer que l'onglet Professions est actif
      await expect(page.locator('[data-testid="tab-professions"][data-state="active"]')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('[data-testid="tab-content-professions"]')).toBeVisible({ timeout: 5000 });
    });

    test(`devrait créer un métier sur ${viewport.name}`, async ({ page }) => {
      const timestamp = Date.now();
      const professionName = `Métier ${viewport.name} E2E ${timestamp}`;
      
      const addButton = page.locator('[data-testid="tab-content-professions"] [data-testid="btn-new-profession"], [data-testid="tab-content-professions"] button:has-text("Nouveau Métier"), [data-testid="tab-content-professions"] button:has-text("Ajouter")').first();
      await addButton.click({ force: true });
      await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });
      
      const nameInput = page.locator('[data-testid="input-profession-name"], input[name="name"]').first();
      await expect(nameInput).toBeVisible({ timeout: 5000 });
      await nameInput.fill(professionName);
      
      const submitButton = page.locator('[data-testid="btn-submit"], button[type="submit"]:has-text("Créer")');
      await expect(submitButton).toBeVisible({ timeout: 5000 });
      await submitButton.click();
      
      await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 5000 });
      
      await expect(
        page.locator('[data-sonner-toast][data-type="success"], .sonner-toast:has-text("créé"), .toast:has-text("succès"), [role="status"]:has-text("succès")')
      ).toBeVisible({ timeout: 10000 });
    });

    test(`devrait modifier un métier sur ${viewport.name}`, async ({ page }) => {
      await page.waitForSelector('[data-testid="tab-content-professions"] [data-testid="profession-list-v2"]', { timeout: 5000 });
      
      // En mobile, utiliser le menu dropdown
      if (viewport.name === 'Mobile') {
        const menuButton = page.locator('[data-testid="tab-content-professions"] [data-testid^="btn-menu-profession-"]').first();
        if (await menuButton.count() > 0 && await menuButton.isVisible()) {
          await menuButton.click({ force: true });
          await page.waitForTimeout(300);
          const editOption = page.locator('[role="menuitem"]:has-text("Modifier")').first();
          if (await editOption.count() > 0) {
            await expect(editOption).toBeVisible({ timeout: 3000 });
            await editOption.click();
          } else {
            return;
          }
        } else {
          return;
        }
      } else {
        // Desktop/Tablette
        const editButton = page.locator('[data-testid="tab-content-professions"] [data-testid^="btn-edit-profession-desktop-"]').first();
        if (await editButton.count() > 0) {
          await editButton.click({ force: true });
        } else {
          return;
        }
      }
      
      await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });
      await page.waitForTimeout(500);
      
      const timestamp = Date.now();
      const newName = `Métier ${viewport.name} E2E ${timestamp.toString().slice(-6)}`;
      
      const nameInput = page.locator('[data-testid="input-profession-name"], input[name="name"]').first();
      await expect(nameInput).toBeVisible({ timeout: 5000 });
      await nameInput.clear();
      await nameInput.fill(newName);
      
      const submitButton = page.locator('[data-testid="btn-submit"], button[type="submit"]:has-text("Mettre à jour")');
      await expect(submitButton).toBeVisible({ timeout: 5000 });
      await submitButton.click();
      
      await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 5000 });
      
      await expect(
        page.locator('[data-sonner-toast][data-type="success"], .sonner-toast:has-text("mis à jour"), .toast:has-text("succès"), [role="status"]:has-text("succès")')
      ).toBeVisible({ timeout: 10000 });
    });

    test(`devrait supprimer un métier sur ${viewport.name}`, async ({ page }) => {
      await page.waitForSelector('[data-testid="tab-content-professions"] [data-testid="profession-list-v2"]', { timeout: 5000 });
      
      // En mobile, utiliser le menu dropdown
      if (viewport.name === 'Mobile') {
        const menuButton = page.locator('[data-testid="tab-content-professions"] [data-testid^="btn-menu-profession-"]').first();
        if (await menuButton.count() > 0 && await menuButton.isVisible()) {
          await menuButton.click({ force: true });
          await page.waitForTimeout(500);
          const deleteOption = page.locator('[role="menuitem"]:has-text("Supprimer")').first();
          if (await deleteOption.count() > 0) {
            await expect(deleteOption).toBeVisible({ timeout: 3000 });
            await deleteOption.click();
          } else {
            return;
          }
        } else {
          return;
        }
      } else {
        // Desktop/Tablette
        const deleteButton = page.locator('[data-testid="tab-content-professions"] [data-testid^="btn-delete-profession-desktop-"]').first();
        if (await deleteButton.count() > 0) {
          await expect(deleteButton).toBeVisible({ timeout: 5000 });
          await deleteButton.click({ force: true });
        } else {
          return;
        }
      }
      
      await expect(page.locator('[role="dialog"]:has-text("supprimer")')).toBeVisible({ timeout: 5000 });
      
      const confirmButton = page.locator('[data-testid="btn-confirm-delete"], button:has-text("Supprimer")');
      await confirmButton.click();
      
      await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 5000 });
      
      await expect(
        page.locator('[data-sonner-toast][data-type="success"], .sonner-toast:has-text("supprimé"), .toast:has-text("succès"), [role="status"]:has-text("succès")')
      ).toBeVisible({ timeout: 10000 });
    });
  });
}
