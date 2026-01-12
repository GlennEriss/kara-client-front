import { defineConfig, devices } from '@playwright/test';

/**
 * Configuration Playwright pour les tests E2E KARA
 * 
 * Configuration simplifiée : uniquement Chromium (desktop + mobile)
 * Les autres navigateurs peuvent être ajoutés après `npx playwright install`
 * 
 * @see https://playwright.dev/docs/test-configuration
 */

export default defineConfig({
  testDir: './e2e',
  
  /* Timeout par test */
  timeout: 30 * 1000,
  
  /* Timeout pour les assertions */
  expect: {
    timeout: 5000
  },
  
  /* Exécution en parallèle */
  fullyParallel: true,
  
  /* Échec du build si CI, sinon continuer */
  forbidOnly: !!process.env.CI,
  
  /* Retry seulement en CI */
  retries: process.env.CI ? 2 : 0,
  
  /* Workers */
  workers: process.env.CI ? 1 : 1,
  
  /* Reporter à utiliser */
  reporter: process.env.CI 
    ? [['html'], ['json', { outputFile: 'test-results/results.json' }]]
    : [['html'], ['list']],
  
  /* Options partagées pour tous les projets */
  use: {
    /* URL de base pour les tests */
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',
    
    /* Collecter la trace en cas d'échec */
    trace: 'on-first-retry',
    
    /* Screenshot en cas d'échec */
    screenshot: 'only-on-failure',
    
    /* Vidéo en cas d'échec */
    video: 'retain-on-failure',
  },

  /* Configuration des projets (navigateurs) */
  projects: [
    // Tests Desktop Chrome (principal)
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
      },
    },

    // Tests Mobile Chrome
    {
      name: 'mobile',
      use: { 
        ...devices['Pixel 5'],
      },
    },
  ],

  /* Serveur de développement pour les tests 
   * Note: En local, démarrer le serveur manuellement avec `npm run dev`
   * avant de lancer les tests. En CI, le webServer sera démarré automatiquement.
   */
  ...(process.env.CI ? {
    webServer: {
      command: 'npm run dev',
      url: 'http://localhost:3000',
      reuseExistingServer: false,
      timeout: 120 * 1000,
      stdout: 'ignore',
      stderr: 'pipe',
    }
  } : {}),
});
