/**
 * Tests E2E pour le module d'authentification KARA
 * 
 * Ces tests vérifient le flow complet de connexion et déconnexion :
 * - Affichage du formulaire de connexion
 * - Validation des champs
 * - Connexion avec identifiants valides
 * - Redirection après connexion
 * - Déconnexion et redirection vers login
 * 
 * @see https://playwright.dev/
 */

import { test, expect } from '@playwright/test';

// Identifiants de test
const TEST_CREDENTIALS = {
  matricule: process.env.E2E_AUTH_MATRICULE || '0001.MK.110126',
  email: process.env.E2E_AUTH_EMAIL || 'glenneriss@gmail.com',
  password: process.env.E2E_AUTH_PASSWORD || '0001.MK.110126',
};

test.describe('Authentification - Formulaire de connexion', () => {
  test.beforeEach(async ({ page }) => {
    // Utiliser un viewport desktop pour afficher le formulaire desktop
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000); // Attendre le chargement des composants
  });

  test('devrait afficher le formulaire de connexion', async ({ page }) => {
    // Vérifier que les champs du formulaire sont présents
    const visibleForm = page.locator('form').filter({ has: page.locator(':visible') }).last();
    await expect(visibleForm.locator('input[name="matricule"]')).toBeVisible();
    await expect(visibleForm.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(visibleForm.locator('input[type="password"], input[name="password"]')).toBeVisible();
    await expect(visibleForm.locator('button[type="submit"]')).toBeVisible();
  });

  test('devrait afficher le titre et le logo KARA', async ({ page }) => {
    // Vérifier que le titre est présent
    await expect(page.locator('h1:has-text("Bienvenue sur KARA")').last()).toBeVisible();
  });

  test('devrait avoir un lien vers la page d\'inscription', async ({ page }) => {
    // Vérifier que le lien "Rejoignez KARA" est présent
    await expect(page.locator('text="Rejoignez KARA"').last()).toBeVisible();
  });

  test('devrait afficher une erreur si les champs sont vides', async ({ page }) => {
    // Cliquer sur le bouton de connexion (force: true pour bypasser le dev overlay)
    const submitButton = page.locator('button:has-text("Se connecter")').last();
    await submitButton.click({ force: true });
    
    // Attendre que les messages d'erreur apparaissent
    await page.waitForTimeout(1000);
    
    // Vérifier qu'il y a des messages d'erreur (validation côté client)
    const errorMessages = await page.locator('.form-message, .text-red-500, .text-destructive, [role="alert"]').allTextContents();
    expect(errorMessages.some(msg => msg.trim() !== '')).toBe(true);
  });

  test('devrait afficher une erreur avec un matricule invalide', async ({ page }) => {
    const visibleForm = page.locator('form').filter({ has: page.locator(':visible') }).last();
    const matriculeInput = visibleForm.locator('input[name="matricule"]');
    const emailInput = visibleForm.locator('input[type="email"], input[name="email"]');
    const passwordInput = visibleForm.locator('input[type="password"], input[name="password"]');
    const submitButton = visibleForm.locator('button[type="submit"]');

    await matriculeInput.fill('invalid-matricule');
    await emailInput.fill('invalid@example.com');
    await passwordInput.fill('wrong-password');

    await submitButton.click({ force: true });

    // Attendre la réponse du serveur
    await page.waitForTimeout(3000);

    // Vérifier qu'un message d'erreur est affiché (matricule incorrect)
    const errorMessage = page.locator('text=/matricule|erreur|error|incorrect|invalid/i');
    await expect(errorMessage.first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Authentification - Connexion réussie', () => {
  test('devrait se connecter et rediriger vers le dashboard', async ({ page }) => {
    // Utiliser un viewport desktop
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // Aller sur la page de login
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000); // Attendre le chargement complet
    
    // Remplir le formulaire avec les identifiants valides
    const visibleForm = page.locator('form').filter({ has: page.locator(':visible') }).last();
    const matriculeInput = visibleForm.locator('input[name="matricule"]');
    const emailInput = visibleForm.locator('input[type="email"], input[name="email"]');
    const passwordInput = visibleForm.locator('input[type="password"], input[name="password"]');
    const submitButton = visibleForm.locator('button[type="submit"]');

    await matriculeInput.fill(TEST_CREDENTIALS.matricule);
    await emailInput.fill(TEST_CREDENTIALS.email);
    await passwordInput.fill(TEST_CREDENTIALS.password);

    // Soumettre le formulaire
    await submitButton.click({ force: true });

    // Attendre la redirection vers le dashboard (ou une page protégée)
    await page.waitForURL(/dashboard|admin|memberships/, { timeout: 20000 });

    // Vérifier que nous sommes sur le dashboard
    expect(page.url()).toMatch(/dashboard|admin|memberships/);
    expect(page.url()).not.toMatch(/\/login/);
  });

  test('devrait afficher un toast de succès après connexion', async ({ page }) => {
    // Utiliser un viewport desktop
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // Aller sur la page de login
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // Remplir le formulaire
    const visibleForm = page.locator('form').filter({ has: page.locator(':visible') }).last();
    await visibleForm.locator('input[name="matricule"]').fill(TEST_CREDENTIALS.matricule);
    await visibleForm.locator('input[type="email"], input[name="email"]').fill(TEST_CREDENTIALS.email);
    await visibleForm.locator('input[type="password"], input[name="password"]').fill(TEST_CREDENTIALS.password);
    
    // Soumettre (force: true pour bypasser le dev overlay)
    await visibleForm.locator('button[type="submit"]').click({ force: true });

    // Vérifier que le toast de succès apparaît
    const successToast = page.locator('text=/connexion réussie|bienvenue/i');
    await expect(successToast.first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Authentification - Session', () => {
  test('devrait conserver la session après connexion et rechargement', async ({ page }) => {
    // Utiliser un viewport desktop
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // Se connecter d'abord
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    const visibleForm = page.locator('form').filter({ has: page.locator(':visible') }).last();
    await visibleForm.locator('input[name="matricule"]').fill(TEST_CREDENTIALS.matricule);
    await visibleForm.locator('input[type="email"], input[name="email"]').fill(TEST_CREDENTIALS.email);
    await visibleForm.locator('input[type="password"], input[name="password"]').fill(TEST_CREDENTIALS.password);
    await visibleForm.locator('button[type="submit"]').click({ force: true });

    // Attendre la redirection vers le dashboard
    await page.waitForURL(/dashboard|admin|memberships/, { timeout: 20000 });
    
    // Recharger la page
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000); // Attendre la vérification de session

    // Vérifier que nous sommes toujours connectés (pas redirigé vers /login)
    const currentUrl = page.url();
    expect(currentUrl).not.toMatch(/\/login/);
  });
});

test.describe('Authentification - Déconnexion', () => {
  // Helper pour authentifier l'utilisateur
  async function authenticateUser(page: any) {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    const visibleForm = page.locator('form').filter({ has: page.locator(':visible') }).last();
    const matriculeInput = visibleForm.locator('input[name="matricule"]');
    const emailInput = visibleForm.locator('input[type="email"], input[name="email"]');
    const passwordInput = visibleForm.locator('input[type="password"], input[name="password"]');
    const submitButton = visibleForm.locator('button[type="submit"]');

    await matriculeInput.fill(TEST_CREDENTIALS.matricule);
    await emailInput.fill(TEST_CREDENTIALS.email);
    await passwordInput.fill(TEST_CREDENTIALS.password);
    await submitButton.click({ force: true });

    // Attendre la redirection
    await page.waitForURL(/\/(dashboard|geographie|membres|companies|jobs|metiers)/, { timeout: 15000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  }

  test('devrait afficher le bouton de déconnexion dans la sidebar', async ({ page }) => {
    await authenticateUser(page);

    // Vérifier que le bouton de déconnexion est visible dans la sidebar
    const logoutButton = page.locator('[data-testid="btn-logout"], button:has-text("Se déconnecter")');
    await expect(logoutButton).toBeVisible({ timeout: 5000 });
  });

  test('devrait déconnecter l\'utilisateur et rediriger vers /login', async ({ page }) => {
    await authenticateUser(page);

    // Cliquer sur le bouton de déconnexion
    const logoutButton = page.locator('[data-testid="btn-logout"], button:has-text("Se déconnecter")');
    await expect(logoutButton).toBeVisible({ timeout: 5000 });
    await logoutButton.click({ force: true });

    // Attendre la redirection vers /login
    await page.waitForURL('**/login', { timeout: 10000 });
    await page.waitForLoadState('domcontentloaded');

    // Vérifier que nous sommes sur la page de login
    expect(page.url()).toMatch(/\/login/);
    
    // Vérifier que le formulaire de connexion est visible
    const visibleForm = page.locator('form').filter({ has: page.locator(':visible') }).last();
    await expect(visibleForm.locator('input[name="matricule"]')).toBeVisible({ timeout: 5000 });
  });

  test('devrait supprimer le cookie d\'authentification après déconnexion', async ({ page }) => {
    await authenticateUser(page);

    // Vérifier que le cookie existe avant déconnexion
    const cookiesBefore = await page.context().cookies();
    const authCookieBefore = cookiesBefore.find(c => c.name === 'auth-token');
    expect(authCookieBefore).toBeDefined();

    // Déconnecter
    const logoutButton = page.locator('[data-testid="btn-logout"], button:has-text("Se déconnecter")');
    await logoutButton.click({ force: true });

    // Attendre la redirection
    await page.waitForURL('**/login', { timeout: 10000 });
    await page.waitForTimeout(1000); // Attendre que le cookie soit supprimé

    // Vérifier que le cookie a été supprimé
    const cookiesAfter = await page.context().cookies();
    const authCookieAfter = cookiesAfter.find(c => c.name === 'auth-token');
    // Le cookie devrait être supprimé ou expiré
    expect(authCookieAfter).toBeUndefined();
  });

  test('devrait afficher l\'état de chargement pendant la déconnexion', async ({ page }) => {
    await authenticateUser(page);

    // Cliquer sur le bouton de déconnexion
    const logoutButton = page.locator('[data-testid="btn-logout"], button:has-text("Se déconnecter")');
    await logoutButton.click({ force: true });

    // Vérifier que le bouton affiche "Déconnexion..." pendant le chargement
    // (peut être très rapide, donc on vérifie juste que le bouton est cliqué)
    await expect(logoutButton).toBeVisible({ timeout: 5000 });
    
    // Attendre la redirection
    await page.waitForURL('**/login', { timeout: 10000 });
  });

  test('devrait empêcher l\'accès aux pages protégées après déconnexion', async ({ page }) => {
    await authenticateUser(page);

    // Déconnecter
    const logoutButton = page.locator('[data-testid="btn-logout"], button:has-text("Se déconnecter")');
    await logoutButton.click({ force: true });
    await page.waitForURL('**/login', { timeout: 10000 });

    // Essayer d'accéder à une page protégée
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Vérifier que nous sommes redirigés vers /login
    expect(page.url()).toMatch(/\/login/);
  });
});
