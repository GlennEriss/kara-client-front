# Tests – Code Entremetteur (V2)

## 1. Vue d'ensemble

La fonctionnalité de recherche du code entremetteur nécessite des tests à plusieurs niveaux :
- **Tests unitaires** : Hook, Service, Composant
- **Tests d'intégration** : Composant avec mocks Algolia/Firestore
- **Tests E2E** : Parcours complet utilisateur dans le formulaire

## 2. Tests unitaires

**Note** : Pour plus de détails sur la stratégie de cache, voir [../cache-strategy.md](../cache-strategy.md).

### 2.1 `useIntermediaryCodeSearch`

| ID | Test | Description |
|----|------|-------------|
| UNIT-ICS-01 | Recherche activée | `query.length >= 2` déclenche la recherche |
| UNIT-ICS-02 | Recherche désactivée | `query.length < 2` ne déclenche pas |
| UNIT-ICS-03 | Debounce fonctionne | Attente de 300ms avant recherche |
| UNIT-ICS-04 | Résultats formatés | Format "Nom Prénom (Code)" correct |
| UNIT-ICS-05 | Filtre isActive | Seulement membres actifs retournés |
| UNIT-ICS-06 | Limite 10 résultats | Maximum 10 résultats affichés |
| UNIT-ICS-07 | Cache React Query | Deuxième appel utilise le cache |
| UNIT-ICS-08 | Cache recherche identique | Recherche "Glenn" → Efface → "Glenn" = Cache HIT |
| UNIT-ICS-09 | Cache staleTime | Après 5 min, cache HIT + refetch en arrière-plan |
| UNIT-ICS-10 | Cache gcTime | Après 10 min d'inactivité, cache supprimé |
| UNIT-ICS-11 | Gestion erreurs | Erreur Algolia gérée correctement |

```typescript
// src/domains/memberships/hooks/__tests__/useIntermediaryCodeSearch.test.ts

import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useIntermediaryCodeSearch } from '../useIntermediaryCodeSearch'
import * as MembersAlgoliaService from '@/services/search/MembersAlgoliaSearchService'

vi.mock('@/services/search/MembersAlgoliaSearchService')

describe('useIntermediaryCodeSearch', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })
  
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  
  beforeEach(() => {
    vi.clearAllMocks()
  })
  
  it('UNIT-ICS-01: devrait déclencher la recherche si query >= 2 caractères', async () => {
    vi.mocked(MembersAlgoliaService.getMembersAlgoliaSearchService).mockReturnValue({
      isAvailable: () => true,
      search: vi.fn().mockResolvedValue({
        items: [
          { id: '1234.MK.567890', firstName: 'Jean', lastName: 'Dupont', matricule: '1234.MK.567890' }
        ],
        pagination: { page: 1, totalPages: 1, totalItems: 1, hasNextPage: false, hasPrevPage: false }
      })
    } as any)
    
    const { result } = renderHook(
      () => useIntermediaryCodeSearch({ query: 'Jean' }),
      { wrapper }
    )
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
    
    expect(result.current.data).toBeDefined()
    expect(result.current.data?.items).toHaveLength(1)
  })
  
  it('UNIT-ICS-02: ne devrait pas déclencher la recherche si query < 2 caractères', () => {
    const { result } = renderHook(
      () => useIntermediaryCodeSearch({ query: 'J' }),
      { wrapper }
    )
    
    expect(result.current.isLoading).toBe(false)
    expect(result.current.data).toBeUndefined()
  })
  
  it('UNIT-ICS-04: devrait formater les résultats correctement', async () => {
    vi.mocked(MembersAlgoliaService.getMembersAlgoliaSearchService).mockReturnValue({
      isAvailable: () => true,
      search: vi.fn().mockResolvedValue({
        items: [
          { id: '1234.MK.567890', firstName: 'Jean', lastName: 'Dupont', matricule: '1234.MK.567890' }
        ],
        pagination: { page: 1, totalPages: 1, totalItems: 1, hasNextPage: false, hasPrevPage: false }
      })
    } as any)
    
    const { result } = renderHook(
      () => useIntermediaryCodeSearch({ query: 'Jean' }),
      { wrapper }
    )
    
    await waitFor(() => {
      expect(result.current.data).toBeDefined()
    })
    
    const formatted = result.current.formatResults(result.current.data?.items || [])
    expect(formatted[0].display).toBe('Dupont Jean (1234.MK.567890)')
  })
})
```

### 2.2 `IntermediaryCodeSearch` (Composant)

| ID | Test | Description |
|----|------|-------------|
| UNIT-ICS-COMP-01 | Affichage initial | Champ vide, pas de résultats |
| UNIT-ICS-COMP-02 | Affichage résultats | Liste déroulante avec résultats formatés |
| UNIT-ICS-COMP-03 | Sélection membre | Clic remplit le champ |
| UNIT-ICS-COMP-04 | Validation format | Format XXXX.MK.XXXX validé |
| UNIT-ICS-COMP-05 | Message erreur | Affichage si format invalide |
| UNIT-ICS-COMP-06 | Loading state | Indicateur de chargement pendant recherche |
| UNIT-ICS-COMP-07 | Message "2 caractères" | Affichage si < 2 caractères |

```typescript
// src/domains/memberships/components/form/__tests__/IntermediaryCodeSearch.test.tsx

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IntermediaryCodeSearch } from '../IntermediaryCodeSearch'
import { useForm } from 'react-hook-form'

describe('IntermediaryCodeSearch', () => {
  const TestWrapper = () => {
    const form = useForm({
      defaultValues: { identity: { intermediaryCode: '' } }
    })
    
    return <IntermediaryCodeSearch control={form.control} />
  }
  
  it('UNIT-ICS-COMP-01: devrait afficher le champ vide initialement', () => {
    render(<TestWrapper />)
    
    const input = screen.getByPlaceholderText(/rechercher/i)
    expect(input).toHaveValue('')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })
  
  it('UNIT-ICS-COMP-03: devrait remplir le champ après sélection', async () => {
    const user = userEvent.setup()
    render(<TestWrapper />)
    
    const input = screen.getByPlaceholderText(/rechercher/i)
    await user.type(input, 'Jean')
    
    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument()
    })
    
    const option = screen.getByText(/Dupont Jean \(1234\.MK\.567890\)/i)
    await user.click(option)
    
    expect(input).toHaveValue('1234.MK.567890')
  })
  
  it('UNIT-ICS-COMP-04: devrait valider le format automatiquement', async () => {
    const user = userEvent.setup()
    render(<TestWrapper />)
    
    const input = screen.getByPlaceholderText(/rechercher/i)
    await user.type(input, 'Jean')
    
    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument()
    })
    
    const option = screen.getByText(/Dupont Jean \(1234\.MK\.567890\)/i)
    await user.click(option)
    
    // Vérifier que le champ est validé (pas d'erreur)
    await waitFor(() => {
      expect(screen.queryByText(/format invalide/i)).not.toBeInTheDocument()
    })
  })
})
```

### 2.3 Formatage des résultats

| ID | Test | Description |
|----|------|-------------|
| UNIT-FORMAT-01 | Format standard | "Nom Prénom (Code)" |
| UNIT-FORMAT-02 | Nom/prénom inversés | Vérifier l'ordre |
| UNIT-FORMAT-03 | Code manquant | Gérer si matricule absent |
| UNIT-FORMAT-04 | Caractères spéciaux | Gérer les accents, espaces |

```typescript
// src/domains/memberships/utils/__tests__/formatIntermediaryDisplay.test.ts

import { formatIntermediaryDisplay } from '../formatIntermediaryDisplay'

describe('formatIntermediaryDisplay', () => {
  it('UNIT-FORMAT-01: devrait formater "Nom Prénom (Code)"', () => {
    const member = {
      firstName: 'Jean',
      lastName: 'Dupont',
      matricule: '1234.MK.567890'
    }
    
    expect(formatIntermediaryDisplay(member)).toBe('Dupont Jean (1234.MK.567890)')
  })
  
  it('UNIT-FORMAT-03: devrait gérer le code manquant', () => {
    const member = {
      firstName: 'Jean',
      lastName: 'Dupont',
      matricule: ''
    }
    
    expect(formatIntermediaryDisplay(member)).toBe('Dupont Jean')
  })
})
```

## 3. Tests d'intégration

### 3.1 Intégration dans `IdentityStepV2`

| ID | Scénario | Description |
|----|----------|-------------|
| INT-ICS-01 | Recherche et sélection | Recherche → sélection → validation étape 1 |
| INT-ICS-02 | Validation formulaire | Le code est validé dans le schéma Zod |
| INT-ICS-03 | Navigation étape suivante | Après sélection, peut passer à l'étape 2 |
| INT-ICS-04 | Erreur Algolia | Fallback ou message d'erreur affiché |
| INT-ICS-05 | Cache React Query | Deuxième recherche utilise le cache |

```typescript
// src/domains/memberships/__tests__/integration/intermediary-code-search.integration.test.tsx

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import IdentityStepV2 from '@/domains/auth/registration/components/steps/IdentityStepV2'
import * as MembersAlgoliaService from '@/services/search/MembersAlgoliaSearchService'

vi.mock('@/services/search/MembersAlgoliaSearchService')

describe('IntermediaryCodeSearch - Intégration', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })
  
  beforeEach(() => {
    vi.mocked(MembersAlgoliaService.getMembersAlgoliaSearchService).mockReturnValue({
      isAvailable: () => true,
      search: vi.fn().mockResolvedValue({
        items: [
          { id: '1234.MK.567890', firstName: 'Jean', lastName: 'Dupont', matricule: '1234.MK.567890', isActive: true }
        ],
        pagination: { page: 1, totalPages: 1, totalItems: 1, hasNextPage: false, hasPrevPage: false }
      })
    } as any)
  })
  
  it('INT-ICS-01: recherche et sélection doivent fonctionner dans IdentityStepV2', async () => {
    const user = userEvent.setup()
    
    render(
      <QueryClientProvider client={queryClient}>
        <IdentityStepV2 />
      </QueryClientProvider>
    )
    
    // Trouver le champ code entremetteur
    const intermediaryInput = screen.getByLabelText(/qui vous a référé/i)
    
    // Taper pour déclencher la recherche
    await user.type(intermediaryInput, 'Jean')
    
    // Attendre les résultats
    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument()
    })
    
    // Sélectionner un résultat
    const option = screen.getByText(/Dupont Jean \(1234\.MK\.567890\)/i)
    await user.click(option)
    
    // Vérifier que le champ est rempli
    await waitFor(() => {
      expect(intermediaryInput).toHaveValue('1234.MK.567890')
    })
    
    // Vérifier que l'étape peut être validée
    const nextButton = screen.getByRole('button', { name: /suivant/i })
    expect(nextButton).not.toBeDisabled()
  })
  
  it('INT-ICS-04: erreur Algolia doit être gérée', async () => {
    vi.mocked(MembersAlgoliaService.getMembersAlgoliaSearchService).mockReturnValue({
      isAvailable: () => true,
      search: vi.fn().mockRejectedValue(new Error('Algolia error'))
    } as any)
    
    const user = userEvent.setup()
    
    render(
      <QueryClientProvider client={queryClient}>
        <IdentityStepV2 />
      </QueryClientProvider>
    )
    
    const intermediaryInput = screen.getByLabelText(/qui vous a référé/i)
    await user.type(intermediaryInput, 'Jean')
    
    // Attendre le message d'erreur ou le fallback
    await waitFor(() => {
      expect(screen.getByText(/erreur|indisponible/i)).toBeInTheDocument()
    }, { timeout: 3000 })
  })
})
```

## 4. Tests E2E

### 4.1 Scénarios Playwright

| ID | Scénario | Étapes |
|----|----------|--------|
| E2E-ICS-01 | Recherche et sélection | Login → /memberships/add → Recherche → Sélection → Validation |
| E2E-ICS-02 | Recherche sans résultat | Login → Recherche "XXXXXXX" → Vérifier message vide |
| E2E-ICS-03 | Validation format | Login → Saisie manuelle invalide → Vérifier erreur |
| E2E-ICS-04 | Effacement sélection | Login → Sélection → Clear → Vérifier état initial |
| E2E-ICS-05 | Navigation clavier | Login → Recherche → Flèches → Entrée → Validation |
| E2E-ICS-06 | Responsive mobile | Login → Viewport 375px → Vérifier tailles et layout |
| E2E-ICS-07 | Responsive tablette | Login → Viewport 768px → Vérifier tailles et layout |
| E2E-ICS-08 | Responsive desktop | Login → Viewport 1280px → Vérifier tailles et layout |

**Note** : Tous les `data-testid` utilisés sont documentés dans [../ui/test-ids.md](../ui/test-ids.md).

```typescript
// e2e/intermediary-code-search.spec.ts

import { test, expect } from '@playwright/test'

test.describe('Code Entremetteur - E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login')
    await page.fill('input[name="email"]', 'admin@kara.gab')
    await page.fill('input[name="password"]', 'password')
    await page.click('button[type="submit"]')
    await page.waitForURL('/memberships')
  })
  
  test('E2E-ICS-01: parcours complet de recherche et sélection', async ({ page }) => {
    // Aller au formulaire d'ajout
    await page.goto('/memberships/add')
    
    // Attendre l'étape 1
    await expect(page.getByText(/informations d'identité/i)).toBeVisible()
    
    // 1. Vérifier la présence du composant
    await expect(page.getByTestId('intermediary-code-search-container')).toBeVisible()
    
    // 2. Vérifier le hint initial
    await expect(page.getByTestId('intermediary-code-search-hint')).toBeVisible()
    await expect(page.getByTestId('intermediary-code-search-hint')).toContainText('Tapez au moins 2 caractères')
    
    // 3. Taper dans le champ
    const input = page.getByTestId('intermediary-code-search-input')
    await input.fill('Jean')
    await expect(input).toHaveValue('Jean')
    
    // 4. Attendre les résultats (vérifier que le loading disparaît)
    await expect(page.getByTestId('intermediary-code-search-loading')).not.toBeVisible({ timeout: 5000 })
    await expect(page.getByTestId('intermediary-code-search-results')).toBeVisible()
    
    // 5. Vérifier qu'il y a des résultats
    const results = page.locator('[data-testid^="intermediary-code-search-option-"]')
    await expect(results.first()).toBeVisible()
    
    // 6. Sélectionner un résultat spécifique
    const option = page.getByTestId('intermediary-code-search-option-1228.MK.0058')
    await option.click()
    
    // 7. Vérifier la validation
    await expect(page.getByTestId('intermediary-code-search-validated')).toBeVisible()
    await expect(page.getByTestId('intermediary-code-search-check-icon')).toBeVisible()
    await expect(input).toHaveValue('1228.MK.0058')
    
    // 8. Vérifier que l'étape peut être validée
    const nextButton = page.getByRole('button', { name: /suivant/i })
    await expect(nextButton).not.toBeDisabled()
  })
  
  test('E2E-ICS-02: recherche sans résultat', async ({ page }) => {
    await page.goto('/memberships/add')
    
    const input = page.getByTestId('intermediary-code-search-input')
    await input.fill('XXXXXXX')
    
    // Attendre le message "Aucun résultat"
    await expect(page.getByTestId('intermediary-code-search-empty')).toBeVisible({ timeout: 5000 })
    await expect(page.getByTestId('intermediary-code-search-empty')).toContainText('Aucun résultat')
  })
  
  test('E2E-ICS-03: validation format manuel', async ({ page }) => {
    await page.goto('/memberships/add')
    
    const input = page.getByTestId('intermediary-code-search-input')
    
    // Saisir un format invalide manuellement
    await input.fill('1234.ABC.5678')
    
    // Essayer de valider (cliquer ailleurs ou soumettre)
    await input.blur()
    
    // Vérifier l'erreur
    await expect(page.getByTestId('intermediary-code-search-error')).toBeVisible()
    await expect(page.getByTestId('intermediary-code-search-error')).toContainText('Format requis')
  })
  
  test('E2E-ICS-04: effacement de la sélection', async ({ page }) => {
    await page.goto('/memberships/add')
    
    // Sélectionner d'abord un membre
    const input = page.getByTestId('intermediary-code-search-input')
    await input.fill('Jean')
    await page.waitForSelector('[data-testid^="intermediary-code-search-option-"]', { timeout: 5000 })
    await page.getByTestId('intermediary-code-search-option-1228.MK.0058').click()
    
    // Vérifier la sélection
    await expect(input).toHaveValue('1228.MK.0058')
    await expect(page.getByTestId('intermediary-code-search-validated')).toBeVisible()
    
    // Effacer (si bouton clear présent)
    const clearButton = page.getByTestId('intermediary-code-search-clear')
    if (await clearButton.isVisible()) {
      await clearButton.click()
      
      // Vérifier que c'est vide
      await expect(input).toHaveValue('')
      await expect(page.getByTestId('intermediary-code-search-validated')).not.toBeVisible()
      await expect(page.getByTestId('intermediary-code-search-hint')).toBeVisible()
    }
  })
  
  test('E2E-ICS-05: navigation dans les résultats avec clavier', async ({ page }) => {
    await page.goto('/memberships/add')
    
    const input = page.getByTestId('intermediary-code-search-input')
    await input.fill('Jean')
    
    // Attendre les résultats
    await expect(page.getByTestId('intermediary-code-search-results')).toBeVisible()
    
    // Utiliser les flèches pour naviguer
    await input.press('ArrowDown')
    await input.press('ArrowDown')
    await input.press('Enter')
    
    // Vérifier qu'un résultat a été sélectionné
    await expect(page.getByTestId('intermediary-code-search-validated')).toBeVisible()
  })
  
  test('E2E-ICS-06: responsive mobile', async ({ page }) => {
    // Simuler un appareil mobile
    await page.setViewportSize({ width: 375, height: 667 }) // iPhone SE
    
    await page.goto('/memberships/add')
    
    const container = page.getByTestId('intermediary-code-search-container')
    await expect(container).toBeVisible()
    
    // Vérifier que le composant prend 100% de la largeur
    const containerBox = await container.boundingBox()
    expect(containerBox?.width).toBeGreaterThan(300) // Presque toute la largeur
    
    // Vérifier les tailles de texte (mobile)
    const label = page.locator('label').filter({ hasText: /qui vous a référé/i })
    await expect(label).toHaveCSS('font-size', '12px') // text-xs sur mobile
    
    const input = page.getByTestId('intermediary-code-search-input')
    await expect(input).toHaveCSS('font-size', '14px') // text-sm
  })
  
  test('E2E-ICS-07: responsive tablette', async ({ page }) => {
    // Simuler une tablette
    await page.setViewportSize({ width: 768, height: 1024 }) // iPad
    
    await page.goto('/memberships/add')
    
    const container = page.getByTestId('intermediary-code-search-container')
    await expect(container).toBeVisible()
    
    // Vérifier les tailles de texte (tablette)
    const label = page.locator('label').filter({ hasText: /qui vous a référé/i })
    await expect(label).toHaveCSS('font-size', '14px') // text-sm sur tablette
  })
  
  test('E2E-ICS-08: responsive desktop', async ({ page }) => {
    // Simuler un desktop
    await page.setViewportSize({ width: 1280, height: 720 }) // Desktop
    
    await page.goto('/memberships/add')
    
    const container = page.getByTestId('intermediary-code-search-container')
    await expect(container).toBeVisible()
    
    // Vérifier les tailles de texte (desktop)
    const label = page.locator('label').filter({ hasText: /qui vous a référé/i })
    await expect(label).toHaveCSS('font-size', '14px') // text-sm sur desktop
    
    // Tester la recherche et vérifier que la liste s'affiche correctement
    const input = page.getByTestId('intermediary-code-search-input')
    await input.fill('Jean')
    
    await expect(page.getByTestId('intermediary-code-search-results')).toBeVisible()
    
    // Vérifier que la liste a une max-height de 300px sur desktop
    const results = page.getByTestId('intermediary-code-search-results')
    const resultsBox = await results.boundingBox()
    expect(resultsBox?.height).toBeLessThanOrEqual(300)
  })
  
  test('E2E-ICS-04: navigation après sélection', async ({ page }) => {
    await page.goto('/memberships/add')
    
    // Remplir les champs obligatoires de l'étape 1
    await page.fill('input[name="identity.firstName"]', 'Test')
    await page.fill('input[name="identity.lastName"]', 'User')
    // ... autres champs ...
    
    // Rechercher et sélectionner le code entremetteur
    const intermediaryField = page.getByLabel(/qui vous a référé/i)
    await intermediaryField.fill('Jean')
    await page.waitForSelector('[role="listbox"]', { timeout: 5000 })
    await page.locator('[role="option"]').first().click()
    
    // Valider l'étape 1
    await page.getByRole('button', { name: /suivant/i }).click()
    
    // Vérifier la navigation vers l'étape 2
    await expect(page.getByText(/adresse/i)).toBeVisible()
  })
})
```

## 5. data-testid

### 5.1 Documentation complète

**Voir** : [../ui/test-ids.md](../ui/test-ids.md) pour la liste complète des `data-testid` et leur utilisation détaillée.

### 5.2 Liste rapide

| Élément | data-testid | Usage |
|---------|-------------|-------|
| Conteneur principal | `intermediary-code-search-container` | Vérifier la présence du composant |
| Champ de recherche | `intermediary-code-search-input` | Taper la recherche, vérifier la valeur |
| Icône de recherche | `intermediary-code-search-icon` | Vérifier la présence de l'icône |
| Liste déroulante | `intermediary-code-search-results` | Vérifier l'affichage des résultats |
| Option résultat | `intermediary-code-search-option-{matricule}` | Cliquer sur un résultat spécifique |
| État de chargement | `intermediary-code-search-loading` | Vérifier l'état de chargement |
| Message vide | `intermediary-code-search-empty` | Vérifier qu'aucun résultat n'est trouvé |
| Message hint | `intermediary-code-search-hint` | Vérifier l'affichage du hint |
| État validé | `intermediary-code-search-validated` | Vérifier qu'un membre est sélectionné |
| Icône validation | `intermediary-code-search-check-icon` | Vérifier l'affichage de la validation |
| Message erreur | `intermediary-code-search-error` | Vérifier l'affichage des erreurs |
| Bouton clear | `intermediary-code-search-clear` | Tester la réinitialisation |

### 5.3 Format du matricule dans l'ID

Le matricule dans l'ID doit être **sans espaces** :

```typescript
// ✅ Bon
data-testid="intermediary-code-search-option-1228.MK.0058"

// ❌ Mauvais
data-testid="intermediary-code-search-option-1228. MK. 0058"
```

## 6. Mocks

### 6.1 Mock MembersAlgoliaSearchService

```typescript
// src/services/search/__mocks__/MembersAlgoliaSearchService.ts

export const getMembersAlgoliaSearchService = vi.fn(() => ({
  isAvailable: vi.fn(() => true),
  search: vi.fn().mockResolvedValue({
    items: [],
    pagination: { page: 1, totalPages: 0, totalItems: 0, hasNextPage: false, hasPrevPage: false }
  })
}))
```

### 6.2 Fixture de données

```typescript
// src/domains/memberships/__tests__/fixtures/intermediaryFixtures.ts

export function createIntermediaryMemberFixture(overrides: Partial<User> = {}): User {
  return {
    id: '1234.MK.567890',
    firstName: 'Jean',
    lastName: 'Dupont',
    matricule: '1234.MK.567890',
    isActive: true,
    ...overrides
  }
}
```

## 7. Couverture cible

| Module | Lignes | Fonctions | Branches | Statements |
|--------|--------|-----------|----------|------------|
| `useIntermediaryCodeSearch` | ≥85% | ≥90% | ≥80% | ≥85% |
| `IntermediaryCodeSearch` | ≥80% | ≥85% | ≥75% | ≥80% |
| `formatIntermediaryDisplay` | ≥90% | ≥95% | ≥85% | ≥90% |

## 8. Checklist de tests

### 8.1 Tests unitaires

- [ ] `useIntermediaryCodeSearch.test.ts`
- [ ] `IntermediaryCodeSearch.test.tsx`
- [ ] `formatIntermediaryDisplay.test.ts`

### 8.2 Tests d'intégration

- [ ] `intermediary-code-search.integration.test.tsx`

### 8.3 Tests E2E

- [ ] `e2e/intermediary-code-search.spec.ts`
