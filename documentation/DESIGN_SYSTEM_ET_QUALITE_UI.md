# Design System, Responsive Design et Tests E2E

## 🎯 Objectifs

1. **Créer un Design System cohérent** basé sur les couleurs du logo KARA
2. **Améliorer le responsive design** (téléphone, tablette, desktop)
3. **Standardiser l'utilisation de Shadcn UI** (tous les composants doivent utiliser le kit)
4. **Ajouter les tests E2E** pour garantir la qualité
5. **Définir une typographie cohérente**

---

## 🎨 Partie 1 : Design System et Thème Couleur

### 1.1 Analyse des Couleurs du Logo KARA

Basé sur les couleurs utilisées dans le code (`#224D62`, `#CBB171`), voici la palette proposée :

#### Palette Principale

```css
/* Couleurs Principales (basées sur le logo) */
--kara-primary-dark: #224D62;      /* Bleu foncé - Principal */
--kara-primary-light: #CBB171;     /* Or/Doré - Accent */

/* Couleurs Secondaires */
--kara-secondary-dark: #1a3d4f;    /* Bleu très foncé */
--kara-secondary-light: #d4c085;   /* Or clair */

/* Couleurs Neutres */
--kara-neutral-50: #f8f9fa;
--kara-neutral-100: #e9ecef;
--kara-neutral-200: #dee2e6;
--kara-neutral-300: #ced4da;
--kara-neutral-400: #adb5bd;
--kara-neutral-500: #6c757d;
--kara-neutral-600: #495057;
--kara-neutral-700: #343a40;
--kara-neutral-800: #212529;
--kara-neutral-900: #0d1117;

/* Couleurs d'État */
--kara-success: #10b981;           /* Vert */
--kara-success-light: #d1fae5;
--kara-error: #ef4444;             /* Rouge */
--kara-error-light: #fee2e2;
--kara-warning: #f59e0b;           /* Orange */
--kara-warning-light: #fef3c7;
--kara-info: #3b82f6;              /* Bleu */
--kara-info-light: #dbeafe;
```

### 1.2 Configuration Tailwind (tailwind.config.ts)

```typescript
import type { Config } from "tailwindcss"

const config: Config = {
  theme: {
    extend: {
      colors: {
        kara: {
          // Couleurs principales
          primary: {
            dark: '#224D62',
            light: '#CBB171',
            DEFAULT: '#224D62',
          },
          secondary: {
            dark: '#1a3d4f',
            light: '#d4c085',
            DEFAULT: '#CBB171',
          },
          // Neutres
          neutral: {
            50: '#f8f9fa',
            100: '#e9ecef',
            200: '#dee2e6',
            300: '#ced4da',
            400: '#adb5bd',
            500: '#6c757d',
            600: '#495057',
            700: '#343a40',
            800: '#212529',
            900: '#0d1117',
          },
          // États
          success: {
            DEFAULT: '#10b981',
            light: '#d1fae5',
          },
          error: {
            DEFAULT: '#ef4444',
            light: '#fee2e2',
          },
          warning: {
            DEFAULT: '#f59e0b',
            light: '#fef3c7',
          },
          info: {
            DEFAULT: '#3b82f6',
            light: '#dbeafe',
          },
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Typographie cohérente
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      },
      spacing: {
        // Espacements cohérents
        '18': '4.5rem',
        '88': '22rem',
      },
      borderRadius: {
        'kara': '0.5rem',
      },
      boxShadow: {
        'kara': '0 1px 3px 0 rgba(34, 77, 98, 0.1), 0 1px 2px 0 rgba(34, 77, 98, 0.06)',
        'kara-md': '0 4px 6px -1px rgba(34, 77, 98, 0.1), 0 2px 4px -1px rgba(34, 77, 98, 0.06)',
        'kara-lg': '0 10px 15px -3px rgba(34, 77, 98, 0.1), 0 4px 6px -2px rgba(34, 77, 98, 0.05)',
      },
    },
  },
}

export default config
```

### 1.3 Fichier CSS Global (globals.css)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Couleurs CSS Variables pour compatibilité */
    --kara-primary-dark: #224D62;
    --kara-primary-light: #CBB171;
    
    /* Shadcn variables (override avec couleurs KARA) */
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    
    --primary: 201 60% 25%; /* #224D62 */
    --primary-foreground: 0 0% 100%;
    
    --secondary: 45 50% 70%; /* #CBB171 */
    --secondary-foreground: 222.2 84% 4.9%;
    
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 84% 4.9%;
    
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 201 60% 25%; /* #224D62 */
    
    --radius: 0.5rem;
  }
  
  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    
    /* ... (adaptations dark mode) */
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
    font-feature-settings: "rlig" 1, "calt" 1;
  }
}

/* Typographie cohérente */
@layer base {
  h1, h2, h3, h4, h5, h6 {
    @apply font-semibold text-kara-primary-dark;
  }
  
  h1 {
    @apply text-4xl;
  }
  
  h2 {
    @apply text-3xl;
  }
  
  h3 {
    @apply text-2xl;
  }
  
  h4 {
    @apply text-xl;
  }
  
  h5 {
    @apply text-lg;
  }
  
  h6 {
    @apply text-base;
  }
}
```

### 1.4 Guide de Style - Utilisation des Couleurs

```markdown
# Guide de Style KARA

## Couleurs Principales

### Primary Dark (#224D62)
- **Usage** : Texte principal, boutons principaux, en-têtes
- **Exemple** : Bouton "Valider", titre de page

### Primary Light (#CBB171)
- **Usage** : Accents, hover states, badges importants
- **Exemple** : Icônes, badges de statut

## Règles

1. **Contraste** : Toujours s'assurer d'un ratio de contraste WCAG AA (4.5:1)
2. **Cohérence** : Utiliser les tokens Tailwind (`kara-primary-dark`, `kara-primary-light`)
3. **États** : Hover, focus, disabled doivent utiliser les variantes appropriées
```

---

## 📱 Partie 2 : Responsive Design

### 2.1 Breakpoints Standardisés

```typescript
// src/lib/breakpoints.ts
export const breakpoints = {
  xs: '0px',      // Téléphone portrait
  sm: '640px',    // Téléphone paysage
  md: '768px',    // Tablette
  lg: '1024px',   // Desktop
  xl: '1280px',   // Large desktop
  '2xl': '1536px', // Très large desktop
} as const

export type Breakpoint = keyof typeof breakpoints
```

### 2.2 Classes Tailwind Responsive (Guide)

```markdown
# Responsive Design Guide

## Grilles

### Mobile First
- Base : Mobile (par défaut)
- `sm:` : Téléphone paysage (≥640px)
- `md:` : Tablette (≥768px)
- `lg:` : Desktop (≥1024px)
- `xl:` : Large desktop (≥1280px)

## Exemples

### Grille Responsive
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* 1 colonne mobile, 2 tablette, 3 desktop */}
</div>
```

### Texte Responsive
```tsx
<h1 className="text-2xl md:text-3xl lg:text-4xl">
  Titre
</h1>
```

### Espacement Responsive
```tsx
<div className="p-4 md:p-6 lg:p-8">
  Contenu
</div>
```

### Affichage Conditionnel
```tsx
{/* Visible uniquement sur desktop */}
<div className="hidden lg:block">
  Contenu desktop
</div>

{/* Visible uniquement sur mobile */}
<div className="lg:hidden">
  Contenu mobile
</div>
```
```

### 2.3 Composants Responsive (Patterns)

#### Card Responsive
```tsx
<Card className="w-full max-w-full md:max-w-md lg:max-w-lg mx-auto">
  <CardHeader className="p-4 md:p-6">
    <CardTitle className="text-lg md:text-xl">Titre</CardTitle>
  </CardHeader>
  <CardContent className="p-4 md:p-6">
    Contenu
  </CardContent>
</Card>
```

#### Formulaire Responsive
```tsx
<div className="space-y-4 md:space-y-6">
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {/* Champs côte à côte sur desktop */}
  </div>
</div>
```

#### Navigation Responsive
```tsx
{/* Desktop */}
<nav className="hidden md:flex">
  Menu desktop
</nav>

{/* Mobile */}
<Sheet>
  <SheetTrigger className="md:hidden">
    Menu
  </SheetTrigger>
  <SheetContent>
    Menu mobile
  </SheetContent>
</Sheet>
```

---

## 🧩 Partie 3 : Standardisation Shadcn UI

### 3.1 Inventaire des Composants Shadcn Disponibles

Liste des composants à utiliser exclusivement :

```
src/components/ui/
├── button.tsx           ✅ À utiliser partout
├── card.tsx             ✅ À utiliser partout
├── input.tsx            ✅ À utiliser partout
├── label.tsx            ✅ À utiliser partout
├── select.tsx           ✅ À utiliser partout
├── dialog.tsx           ✅ À utiliser partout
├── dropdown-menu.tsx    ✅ À utiliser partout
├── tabs.tsx             ✅ À utiliser partout
├── table.tsx            ✅ À utiliser partout
├── badge.tsx            ✅ À utiliser partout
├── alert.tsx            ✅ À utiliser partout
├── toast.tsx            ✅ À utiliser partout
├── form.tsx             ✅ À utiliser partout
├── sheet.tsx            ✅ Pour mobile menu
└── ...
```

### 3.2 Règles d'Utilisation

1. **Interdiction d'utiliser des boutons HTML natifs** (`<button>` sans composant)
2. **Tous les formulaires** doivent utiliser `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage`
3. **Toutes les cartes** doivent utiliser `Card`, `CardHeader`, `CardTitle`, `CardContent`, `CardFooter`
4. **Tous les inputs** doivent utiliser `Input`, `Label` de shadcn
5. **Toutes les modales** doivent utiliser `Dialog`
6. **Tous les menus mobiles** doivent utiliser `Sheet`

### 3.3 Variantes de Boutons Standardisées

```typescript
// src/components/ui/button.tsx (à vérifier/mettre à jour)

// Variantes standard :
- default (primary) : bg-kara-primary-dark
- secondary : bg-kara-primary-light
- destructive : bg-kara-error
- outline : border-kara-primary-dark
- ghost : transparent
- link : lien stylé

// Tailles standard :
- sm : small
- default : medium
- lg : large
- icon : pour boutons icônes uniquement
```

### 3.4 Typographie Standardisée

```typescript
// src/components/ui/typography.tsx (à créer)

export const Typography = {
  h1: "text-4xl font-bold text-kara-primary-dark",
  h2: "text-3xl font-semibold text-kara-primary-dark",
  h3: "text-2xl font-semibold text-kara-primary-dark",
  h4: "text-xl font-semibold text-kara-primary-dark",
  h5: "text-lg font-semibold text-kara-primary-dark",
  h6: "text-base font-semibold text-kara-primary-dark",
  body: "text-base text-foreground",
  bodySmall: "text-sm text-muted-foreground",
  caption: "text-xs text-muted-foreground",
} as const
```

---

## 🧪 Partie 4 : Tests E2E

### 4.1 Choix de l'Outil : Playwright (Recommandé)

**Pourquoi Playwright ?**
- ✅ Support multi-navigateurs (Chrome, Firefox, Safari)
- ✅ Excellent support mobile (device emulation)
- ✅ Tests rapides et fiables
- ✅ Excellent debugging
- ✅ Intégration facile avec CI/CD

### 4.2 Installation

```bash
npm install -D @playwright/test
npx playwright install
```

### 4.3 Configuration (playwright.config.ts)

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    // Mobile
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

### 4.4 Structure des Tests E2E

```
tests/
└── e2e/
    ├── auth/
    │   ├── login.spec.ts
    │   └── register.spec.ts
    ├── membership/
    │   ├── create-request.spec.ts
    │   └── view-request.spec.ts
    ├── financial/
    │   ├── caisse-speciale.spec.ts
    │   └── credit-speciale.spec.ts
    ├── fixtures/
    │   └── auth.setup.ts
    └── helpers/
        └── test-helpers.ts
```

### 4.5 Exemples de Tests E2E

#### Test de Connexion
```typescript
// tests/e2e/auth/login.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Login', () => {
  test('should login successfully', async ({ page }) => {
    await page.goto('/login')
    
    await page.fill('[name="matricule"]', 'TEST001')
    await page.fill('[name="email"]', 'test@example.com')
    await page.fill('[name="password"]', 'password123')
    
    await page.click('button[type="submit"]')
    
    await expect(page).toHaveURL('/dashboard')
    await expect(page.locator('text=Dashboard')).toBeVisible()
  })
  
  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login')
    
    await page.fill('[name="matricule"]', 'INVALID')
    await page.fill('[name="email"]', 'invalid@example.com')
    await page.fill('[name="password"]', 'wrong')
    
    await page.click('button[type="submit"]')
    
    await expect(page.locator('text=Matricule ou email incorrect')).toBeVisible()
  })
})
```

#### Test Responsive (Mobile)
```typescript
// tests/e2e/responsive/mobile-menu.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Mobile Navigation', () => {
  test.use({ viewport: { width: 375, height: 667 } }) // iPhone SE
  
  test('should open mobile menu', async ({ page }) => {
    await page.goto('/dashboard')
    
    const menuButton = page.locator('[aria-label="Menu"]')
    await expect(menuButton).toBeVisible()
    
    await menuButton.click()
    
    await expect(page.locator('text=Accueil')).toBeVisible()
    await expect(page.locator('text=Paramètres')).toBeVisible()
  })
})
```

#### Test de Formulaire (Registration)
```typescript
// tests/e2e/membership/create-request.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Membership Request', () => {
  test('should create membership request', async ({ page }) => {
    await page.goto('/register')
    
    // Step 1: Identity
    await page.fill('[name="identity.firstName"]', 'Jean')
    await page.fill('[name="identity.lastName"]', 'Dupont')
    await page.fill('[name="identity.birthDate"]', '1990-01-01')
    await page.click('button:has-text("Suivant")')
    
    // Step 2: Address
    await page.selectOption('[name="address.provinceId"]', 'province-id')
    await page.selectOption('[name="address.communeId"]', 'commune-id')
    await page.click('button:has-text("Suivant")')
    
    // Step 3: Company (optional)
    await page.click('button:has-text("Suivant")')
    
    // Step 4: Documents
    // ... upload documents
    
    // Submit
    await page.click('button:has-text("Soumettre")')
    
    await expect(page.locator('text=Demande créée avec succès')).toBeVisible()
  })
})
```

### 4.6 Scripts package.json

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:report": "playwright show-report"
  }
}
```

### 4.7 Tests Prioritaires à Implémenter

1. **Authentification**
   - Connexion admin
   - Connexion membre
   - Déconnexion

2. **Membership**
   - Création de demande d'adhésion (flux complet)
   - Visualisation des demandes (admin)
   - Validation/Rejet de demande

3. **Navigation**
   - Menu mobile (responsive)
   - Navigation entre pages

4. **Formulaires**
   - Validation des formulaires
   - Messages d'erreur
   - Soumission

5. **Responsive**
   - Affichage mobile (< 768px)
   - Affichage tablette (768px - 1024px)
   - Affichage desktop (> 1024px)

---

## ✅ Plan d'Action

### Phase 1 : Design System (Semaine 1-2)

- [ ] Configurer Tailwind avec les couleurs KARA
- [ ] Mettre à jour `globals.css` avec les variables CSS
- [ ] Créer un fichier de documentation des couleurs
- [ ] Auditer tous les composants pour remplacer les couleurs en dur
- [ ] Créer les variantes de boutons standardisées

### Phase 2 : Responsive Design (Semaine 3-4)

- [ ] Auditer toutes les pages pour le responsive
- [ ] Créer un guide responsive
- [ ] Refactoriser les composants non-responsives
- [ ] Tester sur différents devices
- [ ] Créer des composants responsive réutilisables

### Phase 3 : Shadcn UI Standardisation (Semaine 5-6)

- [ ] Inventorier tous les composants qui n'utilisent pas shadcn
- [ ] Remplacer progressivement (composant par composant)
- [ ] Créer des variantes standardisées
- [ ] Documenter les patterns d'utilisation
- [ ] Créer des exemples de composants

### Phase 4 : Tests E2E (Semaine 7-8)

- [ ] Installer Playwright
- [ ] Configurer Playwright
- [ ] Créer les tests d'authentification
- [ ] Créer les tests de flux principaux
- [ ] Créer les tests responsive
- [ ] Intégrer dans CI/CD

---

## 📚 Ressources

- [Shadcn UI Documentation](https://ui.shadcn.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Playwright Documentation](https://playwright.dev/)
- [WCAG Contrast Checker](https://webaim.org/resources/contrastchecker/)

---

**Note** : Cette restructuration doit être faite progressivement pour ne pas casser l'application en production.
