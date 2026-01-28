# Tests E2E - Module Demandes Caisse Imprévue V2

> Plan détaillé des tests End-to-End pour le module Demandes Caisse Imprévue V2  
> **Référence :** `DATA_TESTID.md` pour tous les `data-testid` utilisés

## 📋 Vue d'ensemble

**Objectif** : Valider les parcours utilisateur complets via l'interface web

**Framework** : Playwright  
**Structure** : `e2e/caisse-imprevue-v2/`  
**Référence data-testid** : `DATA_TESTID.md`

**Total estimé** : ~60 cas de test E2E

---

## 🎯 Priorisation

| Priorité | Description | Nombre de tests |
|----------|-------------|-----------------|
| **P0** | Bloquant - Fonctionnalités critiques | ~25 tests |
| **P1** | Important - Fonctionnalités principales | ~25 tests |
| **P2** | Nice to have - Améliorations UX | ~10 tests |

---

## 📁 Structure des Fichiers de Test

```
e2e/caisse-imprevue-v2/
├── helpers.ts              # Helpers partagés (auth, navigation, sélecteurs)
├── fixtures.ts             # Fixtures pour créer/supprimer données de test
├── list.spec.ts            # Tests de la liste (filtres, recherche, pagination)
├── create.spec.ts          # Tests de création (formulaire 3 étapes)
├── details.spec.ts         # Tests de la page de détails
├── actions.spec.ts         # Tests des actions (accepter, refuser, réouvrir, supprimer)
├── contract.spec.ts        # Tests de création de contrat
├── responsive.spec.ts      # Tests responsive (mobile, tablette, desktop)
└── README.md               # Documentation des tests E2E
```

---

## 🧪 1. Tests de la Liste (`list.spec.ts`)

### 1.1 Affichage de la Liste

**P0-CI-01** : Devrait afficher la liste des demandes avec pagination

```typescript
test('P0-CI-01: devrait afficher la liste des demandes avec pagination', async ({ page }) => {
  // Arrange
  await page.goto('/caisse-imprevue/demandes')
  await page.waitForSelector('[data-testid="ci-demand-list-loading"]', { state: 'hidden' })
  
  // Assert
  await expect(page.locator('[data-testid="ci-demand-list-title"]')).toBeVisible()
  await expect(page.locator('[data-testid="ci-demand-list-stats"]')).toBeVisible()
  await expect(page.locator('[data-testid="ci-demand-list-tabs"]')).toBeVisible()
  
  // Vérifier la pagination
  await expect(page.locator('[data-testid="ci-demand-list-pagination"]')).toBeVisible()
  await expect(page.locator('[data-testid="ci-demand-pagination-info"]')).toContainText('Affichant')
})
```

**P0-CI-02** : Devrait afficher les statistiques correctes

```typescript
test('P0-CI-02: devrait afficher les statistiques correctes', async ({ page }) => {
  // Arrange
  await createTestDemands({ pending: 5, approved: 10, rejected: 3 })
  await page.goto('/caisse-imprevue/demandes')
  
  // Assert
  await expect(page.locator('[data-testid="ci-demand-stat-total-value"]')).toContainText('18')
  await expect(page.locator('[data-testid="ci-demand-stat-pending-value"]')).toContainText('5')
  await expect(page.locator('[data-testid="ci-demand-stat-approved-value"]')).toContainText('10')
  await expect(page.locator('[data-testid="ci-demand-stat-rejected-value"]')).toContainText('3')
})
```

**P0-CI-03** : Devrait afficher l'empty state quand aucune demande

```typescript
test('P0-CI-03: devrait afficher l\'empty state quand aucune demande', async ({ page }) => {
  // Arrange
  await deleteAllTestDemands()
  await page.goto('/caisse-imprevue/demandes')
  
  // Assert
  await expect(page.locator('[data-testid="ci-demand-list-empty"]')).toBeVisible()
  await expect(page.locator('[data-testid="ci-demand-list-empty-title"]')).toContainText('Aucune demande trouvée')
  await expect(page.locator('[data-testid="ci-demand-list-empty-create-button"]')).toBeVisible()
})
```

### 1.2 Navigation par Tabs

**P0-CI-04** : Devrait filtrer par statut via les tabs

```typescript
test('P0-CI-04: devrait filtrer par statut via les tabs', async ({ page }) => {
  // Arrange
  await createTestDemands({ pending: 3, approved: 5 })
  await page.goto('/caisse-imprevue/demandes')
  
  // Act - Cliquer sur tab "En attente"
  await page.locator('[data-testid="ci-demand-tab-pending"]').click()
  await page.waitForSelector('[data-testid="ci-demand-list-loading"]', { state: 'hidden' })
  
  // Assert
  const cards = page.locator('[data-testid^="ci-demand-card-"]')
  const count = await cards.count()
  for (let i = 0; i < count; i++) {
    await expect(cards.nth(i).locator('[data-testid$="-status-badge"]')).toContainText('En attente')
  }
})
```

**P0-CI-05** : Devrait afficher toutes les demandes avec le tab "Toutes"

```typescript
test('P0-CI-05: devrait afficher toutes les demandes avec le tab "Toutes"', async ({ page }) => {
  // Arrange
  await createTestDemands({ pending: 2, approved: 2, rejected: 2 })
  await page.goto('/caisse-imprevue/demandes')
  
  // Act
  await page.locator('[data-testid="ci-demand-tab-all"]').click()
  
  // Assert
  const cards = page.locator('[data-testid^="ci-demand-card-"]')
  await expect(cards).toHaveCount(6)
})
```

### 1.3 Recherche

**P0-CI-06** : Devrait rechercher par nom de famille

```typescript
test('P0-CI-06: devrait rechercher par nom de famille', async ({ page }) => {
  // Arrange
  await createTestDemand({ memberLastName: 'Dupont', memberFirstName: 'Jean' })
  await createTestDemand({ memberLastName: 'Martin', memberFirstName: 'Pierre' })
  await page.goto('/caisse-imprevue/demandes')
  
  // Act
  await page.locator('[data-testid="ci-demand-list-search-input"]').fill('Dupont')
  await page.waitForTimeout(500) // Debounce
  
  // Assert
  const cards = page.locator('[data-testid^="ci-demand-card-"]')
  await expect(cards).toHaveCount(1)
  await expect(cards.first().locator('[data-testid$="-member-name"]')).toContainText('Dupont')
})
```

**P0-CI-07** : Devrait rechercher par prénom

```typescript
test('P0-CI-07: devrait rechercher par prénom', async ({ page }) => {
  // Arrange
  await createTestDemand({ memberLastName: 'Dupont', memberFirstName: 'Jean' })
  await createTestDemand({ memberLastName: 'Dupont', memberFirstName: 'Pierre' })
  await page.goto('/caisse-imprevue/demandes')
  
  // Act
  await page.locator('[data-testid="ci-demand-list-search-input"]').fill('Jean')
  await page.waitForTimeout(500)
  
  // Assert
  const cards = page.locator('[data-testid^="ci-demand-card-"]')
  await expect(cards).toHaveCount(1)
  await expect(cards.first().locator('[data-testid$="-member-name"]')).toContainText('Jean')
})
```

**P0-CI-08** : Devrait afficher aucun résultat pour recherche inexistante

```typescript
test('P0-CI-08: devrait afficher aucun résultat pour recherche inexistante', async ({ page }) => {
  // Arrange
  await createTestDemand({ memberLastName: 'Dupont' })
  await page.goto('/caisse-imprevue/demandes')
  
  // Act
  await page.locator('[data-testid="ci-demand-list-search-input"]').fill('NonExistent')
  await page.waitForTimeout(500)
  
  // Assert
  await expect(page.locator('[data-testid="ci-demand-list-empty"]')).toBeVisible()
})
```

### 1.4 Filtres

**P1-CI-09** : Devrait filtrer par date (aujourd'hui)

```typescript
test('P1-CI-09: devrait filtrer par date (aujourd\'hui)', async ({ page }) => {
  // Arrange
  const today = new Date()
  await createTestDemand({ createdAt: today })
  await createTestDemand({ createdAt: new Date(today.getTime() - 86400000) }) // Hier
  await page.goto('/caisse-imprevue/demandes')
  
  // Act
  await page.locator('[data-testid="ci-demand-filter-date-trigger"]').click()
  await page.locator('[data-testid="ci-demand-filter-date-today"]').click()
  await page.waitForSelector('[data-testid="ci-demand-list-loading"]', { state: 'hidden' })
  
  // Assert
  const cards = page.locator('[data-testid^="ci-demand-card-"]')
  await expect(cards).toHaveCount(1)
})
```

**P1-CI-10** : Devrait filtrer par fréquence de paiement

```typescript
test('P1-CI-10: devrait filtrer par fréquence de paiement', async ({ page }) => {
  // Arrange
  await createTestDemand({ paymentFrequency: 'MONTHLY' })
  await createTestDemand({ paymentFrequency: 'DAILY' })
  await page.goto('/caisse-imprevue/demandes')
  
  // Act
  await page.locator('[data-testid="ci-demand-filter-frequency-trigger"]').click()
  await page.locator('[data-testid="ci-demand-filter-frequency-monthly"]').click()
  await page.waitForSelector('[data-testid="ci-demand-list-loading"]', { state: 'hidden' })
  
  // Assert
  const cards = page.locator('[data-testid^="ci-demand-card-"]')
  await expect(cards).toHaveCount(1)
})
```

**P1-CI-11** : Devrait réinitialiser les filtres

```typescript
test('P1-CI-11: devrait réinitialiser les filtres', async ({ page }) => {
  // Arrange
  await createTestDemands({ pending: 3, approved: 3 })
  await page.goto('/caisse-imprevue/demandes')
  await page.locator('[data-testid="ci-demand-tab-pending"]').click()
  await page.locator('[data-testid="ci-demand-list-search-input"]').fill('Test')
  
  // Act
  await page.locator('[data-testid="ci-demand-filters-reset-button"]').click()
  await page.waitForSelector('[data-testid="ci-demand-list-loading"]', { state: 'hidden' })
  
  // Assert
  await expect(page.locator('[data-testid="ci-demand-list-search-input"]')).toHaveValue('')
  const cards = page.locator('[data-testid^="ci-demand-card-"]')
  await expect(cards).toHaveCount(6) // Toutes les demandes
})
```

### 1.5 Tri

**P1-CI-12** : Devrait trier par date (récent)

```typescript
test('P1-CI-12: devrait trier par date (récent)', async ({ page }) => {
  // Arrange
  const demand1 = await createTestDemand({ createdAt: new Date('2024-01-01') })
  const demand2 = await createTestDemand({ createdAt: new Date('2024-01-02') })
  await page.goto('/caisse-imprevue/demandes')
  
  // Act
  await page.locator('[data-testid="ci-demand-filter-sort-trigger"]').click()
  await page.locator('[data-testid="ci-demand-sort-date-desc"]').click()
  await page.waitForSelector('[data-testid="ci-demand-list-loading"]', { state: 'hidden' })
  
  // Assert
  const firstCard = page.locator('[data-testid^="ci-demand-card-"]').first()
  await expect(firstCard).toHaveAttribute('data-testid', `ci-demand-card-${demand2.id}`)
})
```

**P1-CI-13** : Devrait trier par nom (A-Z)

```typescript
test('P1-CI-13: devrait trier par nom (A-Z)', async ({ page }) => {
  // Arrange
  await createTestDemand({ memberLastName: 'Zulu' })
  await createTestDemand({ memberLastName: 'Alpha' })
  await page.goto('/caisse-imprevue/demandes')
  
  // Act
  await page.locator('[data-testid="ci-demand-filter-sort-trigger"]').click()
  await page.locator('[data-testid="ci-demand-sort-name-asc"]').click()
  await page.waitForSelector('[data-testid="ci-demand-list-loading"]', { state: 'hidden' })
  
  // Assert
  const firstCard = page.locator('[data-testid^="ci-demand-card-"]').first()
  await expect(firstCard.locator('[data-testid$="-member-name"]')).toContainText('Alpha')
})
```

### 1.6 Pagination

**P0-CI-14** : Devrait naviguer à la page suivante

```typescript
test('P0-CI-14: devrait naviguer à la page suivante', async ({ page }) => {
  // Arrange
  await createMultipleTestDemands(25)
  await page.goto('/caisse-imprevue/demandes')
  
  // Act
  await page.locator('[data-testid="ci-demand-pagination-next-button"]').click()
  await page.waitForSelector('[data-testid="ci-demand-list-loading"]', { state: 'hidden' })
  
  // Assert
  await expect(page.locator('[data-testid="ci-demand-pagination-info"]')).toContainText('11-20')
  await expect(page.locator('[data-testid="ci-demand-pagination-page-2"]')).toHaveClass(/active/)
})
```

**P0-CI-15** : Devrait naviguer à une page spécifique

```typescript
test('P0-CI-15: devrait naviguer à une page spécifique', async ({ page }) => {
  // Arrange
  await createMultipleTestDemands(35)
  await page.goto('/caisse-imprevue/demandes')
  
  // Act
  await page.locator('[data-testid="ci-demand-pagination-page-3"]').click()
  await page.waitForSelector('[data-testid="ci-demand-list-loading"]', { state: 'hidden' })
  
  // Assert
  await expect(page.locator('[data-testid="ci-demand-pagination-info"]')).toContainText('21-30')
})
```

**P0-CI-16** : Devrait naviguer à la page précédente

```typescript
test('P0-CI-16: devrait naviguer à la page précédente', async ({ page }) => {
  // Arrange
  await createMultipleTestDemands(25)
  await page.goto('/caisse-imprevue/demandes')
  await page.locator('[data-testid="ci-demand-pagination-next-button"]').click()
  await page.waitForSelector('[data-testid="ci-demand-list-loading"]', { state: 'hidden' })
  
  // Act
  await page.locator('[data-testid="ci-demand-pagination-prev-button"]').click()
  await page.waitForSelector('[data-testid="ci-demand-list-loading"]', { state: 'hidden' })
  
  // Assert
  await expect(page.locator('[data-testid="ci-demand-pagination-info"]')).toContainText('1-10')
})
```

### 1.7 Toggle Vue Liste/Cards

**P2-CI-17** : Devrait basculer entre vue liste et vue cards

```typescript
test('P2-CI-17: devrait basculer entre vue liste et vue cards', async ({ page }) => {
  // Arrange
  await createMultipleTestDemands(5)
  await page.goto('/caisse-imprevue/demandes')
  
  // Act - Basculer vers vue liste
  await page.locator('[data-testid="ci-demand-view-list"]').click()
  
  // Assert
  await expect(page.locator('[data-testid="ci-demand-list-table"]')).toBeVisible()
  
  // Act - Basculer vers vue cards
  await page.locator('[data-testid="ci-demand-view-cards"]').click()
  
  // Assert
  await expect(page.locator('[data-testid^="ci-demand-card-"]').first()).toBeVisible()
})
```

---

## 🧪 2. Tests de Création (`create.spec.ts`)

### 2.1 Navigation vers le Formulaire

**P0-CI-18** : Devrait naviguer vers le formulaire de création

```typescript
test('P0-CI-18: devrait naviguer vers le formulaire de création', async ({ page }) => {
  // Arrange
  await page.goto('/caisse-imprevue/demandes')
  
  // Act
  await page.locator('[data-testid="ci-demand-list-new-button"]').click()
  
  // Assert
  await expect(page).toHaveURL(/\/caisse-imprevue\/demandes\/add/)
  await expect(page.locator('[data-testid="ci-demand-form-title"]')).toBeVisible()
  await expect(page.locator('[data-testid="ci-demand-form-step-1"]')).toHaveClass(/active/)
})
```

### 2.2 Étape 1 : Membre + Motif

**P0-CI-19** : Devrait rechercher et sélectionner un membre

```typescript
test('P0-CI-19: devrait rechercher et sélectionner un membre', async ({ page }) => {
  // Arrange
  const member = await createTestMember({ lastName: 'Dupont', firstName: 'Jean' })
  await page.goto('/caisse-imprevue/demandes/add')
  
  // Act
  await page.locator('[data-testid="ci-demand-form-step1-member-search-input"]').fill('Dupont')
  await page.waitForTimeout(500) // Debounce
  
  // Assert - Vérifier les résultats
  await expect(page.locator('[data-testid="ci-demand-form-step1-member-results"]')).toBeVisible()
  await expect(page.locator(`[data-testid="ci-demand-form-step1-member-result-${member.id}"]`)).toBeVisible()
  
  // Act - Sélectionner le membre
  await page.locator(`[data-testid="ci-demand-form-step1-member-result-${member.id}"]`).click()
  
  // Assert
  await expect(page.locator('[data-testid="ci-demand-form-step1-member-selected"]')).toBeVisible()
  await expect(page.locator('[data-testid="ci-demand-form-step1-member-selected-name"]')).toContainText('Dupont')
})
```

**P0-CI-20** : Devrait afficher "Aucun membre trouvé" si aucun résultat

```typescript
test('P0-CI-20: devrait afficher "Aucun membre trouvé" si aucun résultat', async ({ page }) => {
  // Arrange
  await page.goto('/caisse-imprevue/demandes/add')
  
  // Act
  await page.locator('[data-testid="ci-demand-form-step1-member-search-input"]').fill('NonExistentMember')
  await page.waitForTimeout(500)
  
  // Assert
  await expect(page.locator('[data-testid="ci-demand-form-step1-member-results-empty"]')).toBeVisible()
  await expect(page.locator('[data-testid="ci-demand-form-step1-member-results-empty"]')).toContainText('Aucun membre trouvé')
})
```

**P0-CI-21** : Devrait valider le motif (minimum 10 caractères)

```typescript
test('P0-CI-21: devrait valider le motif (minimum 10 caractères)', async ({ page }) => {
  // Arrange
  const member = await createTestMember()
  await page.goto('/caisse-imprevue/demandes/add')
  await selectMember(page, member.id)
  
  // Act - Saisir un motif trop court
  await page.locator('[data-testid="ci-demand-form-step1-cause-textarea"]').fill('Court')
  await page.locator('[data-testid="ci-demand-form-step1-next-button"]').click()
  
  // Assert
  await expect(page.locator('[data-testid="ci-demand-form-step1-cause-error"]')).toBeVisible()
  await expect(page.locator('[data-testid="ci-demand-form-step1-cause-error"]')).toContainText('10 caractères')
})
```

**P0-CI-22** : Devrait afficher le compteur de caractères

```typescript
test('P0-CI-22: devrait afficher le compteur de caractères', async ({ page }) => {
  // Arrange
  await page.goto('/caisse-imprevue/demandes/add')
  
  // Act
  await page.locator('[data-testid="ci-demand-form-step1-cause-textarea"]').fill('Motif de test avec plus de 10 caractères')
  
  // Assert
  await expect(page.locator('[data-testid="ci-demand-form-step1-cause-counter"]')).toBeVisible()
  await expect(page.locator('[data-testid="ci-demand-form-step1-cause-counter"]')).toContainText('/500')
})
```

**P0-CI-23** : Devrait passer à l'étape 2 avec des données valides

```typescript
test('P0-CI-23: devrait passer à l\'étape 2 avec des données valides', async ({ page }) => {
  // Arrange
  const member = await createTestMember()
  await page.goto('/caisse-imprevue/demandes/add')
  await selectMember(page, member.id)
  await page.locator('[data-testid="ci-demand-form-step1-cause-textarea"]').fill('Motif valide avec plus de 10 caractères minimum requis')
  
  // Act
  await page.locator('[data-testid="ci-demand-form-step1-next-button"]').click()
  
  // Assert
  await expect(page.locator('[data-testid="ci-demand-form-step-2"]')).toHaveClass(/active/)
  await expect(page.locator('[data-testid="ci-demand-form-step-1"]')).toHaveClass(/completed/)
})
```

### 2.3 Étape 2 : Forfait + Fréquence

**P0-CI-24** : Devrait charger et afficher les forfaits

```typescript
test('P0-CI-24: devrait charger et afficher les forfaits', async ({ page }) => {
  // Arrange
  const subscription = await createTestSubscriptionCI({ code: 'FORFAIT-A', amountPerMonth: 10000 })
  await navigateToStep2(page)
  
  // Assert
  await expect(page.locator('[data-testid="ci-demand-form-step2-subscriptions-loading"]')).toBeHidden()
  await expect(page.locator(`[data-testid="ci-demand-form-step2-subscription-${subscription.id}"]`)).toBeVisible()
  await expect(page.locator(`[data-testid="ci-demand-form-step2-subscription-${subscription.id}-amount"]`)).toContainText('10000')
})
```

**P0-CI-25** : Devrait sélectionner un forfait

```typescript
test('P0-CI-25: devrait sélectionner un forfait', async ({ page }) => {
  // Arrange
  const subscription = await createTestSubscriptionCI()
  await navigateToStep2(page)
  
  // Act
  await page.locator(`[data-testid="ci-demand-form-step2-subscription-${subscription.id}-select-button"]`).click()
  
  // Assert
  await expect(page.locator(`[data-testid="ci-demand-form-step2-subscription-${subscription.id}"]`)).toHaveClass(/selected/)
})
```

**P0-CI-26** : Devrait sélectionner la fréquence mensuelle

```typescript
test('P0-CI-26: devrait sélectionner la fréquence mensuelle', async ({ page }) => {
  // Arrange
  await navigateToStep2(page)
  await selectSubscription(page, 'sub-1')
  
  // Act
  await page.locator('[data-testid="ci-demand-form-step2-frequency-monthly-radio"]').click()
  
  // Assert
  await expect(page.locator('[data-testid="ci-demand-form-step2-frequency-monthly-radio"]')).toBeChecked()
})
```

**P0-CI-27** : Devrait sélectionner la fréquence journalière

```typescript
test('P0-CI-27: devrait sélectionner la fréquence journalière', async ({ page }) => {
  // Arrange
  await navigateToStep2(page)
  await selectSubscription(page, 'sub-1')
  
  // Act
  await page.locator('[data-testid="ci-demand-form-step2-frequency-daily-radio"]').click()
  
  // Assert
  await expect(page.locator('[data-testid="ci-demand-form-step2-frequency-daily-radio"]')).toBeChecked()
})
```

**P0-CI-28** : Devrait sélectionner une date souhaitée

```typescript
test('P0-CI-28: devrait sélectionner une date souhaitée', async ({ page }) => {
  // Arrange
  await navigateToStep2(page)
  await selectSubscription(page, 'sub-1')
  await page.locator('[data-testid="ci-demand-form-step2-frequency-monthly-radio"]').click()
  
  // Act
  const futureDate = new Date()
  futureDate.setMonth(futureDate.getMonth() + 1)
  await page.locator('[data-testid="ci-demand-form-step2-date-picker"]').click()
  // Sélectionner la date dans le calendrier (implémentation dépend du composant DatePicker)
  
  // Assert
  await expect(page.locator('[data-testid="ci-demand-form-step2-date-picker"]')).not.toBeEmpty()
})
```

**P0-CI-29** : Devrait passer à l'étape 3 avec des données valides

```typescript
test('P0-CI-29: devrait passer à l\'étape 3 avec des données valides', async ({ page }) => {
  // Arrange
  await navigateToStep2(page)
  await selectSubscription(page, 'sub-1')
  await page.locator('[data-testid="ci-demand-form-step2-frequency-monthly-radio"]').click()
  await selectDate(page, new Date())
  
  // Act
  await page.locator('[data-testid="ci-demand-form-step2-next-button"]').click()
  
  // Assert
  await expect(page.locator('[data-testid="ci-demand-form-step-3"]')).toHaveClass(/active/)
  await expect(page.locator('[data-testid="ci-demand-form-step-2"]')).toHaveClass(/completed/)
})
```

**P0-CI-30** : Devrait revenir à l'étape 1 depuis l'étape 2

```typescript
test('P0-CI-30: devrait revenir à l\'étape 1 depuis l\'étape 2', async ({ page }) => {
  // Arrange
  await navigateToStep2(page)
  
  // Act
  await page.locator('[data-testid="ci-demand-form-step2-prev-button"]').click()
  
  // Assert
  await expect(page.locator('[data-testid="ci-demand-form-step-1"]')).toHaveClass(/active/)
  await expect(page.locator('[data-testid="ci-demand-form-step-2"]')).not.toHaveClass(/active/)
})
```

### 2.4 Étape 3 : Contact d'Urgence

**P0-CI-31** : Devrait sélectionner un membre comme contact d'urgence

```typescript
test('P0-CI-31: devrait sélectionner un membre comme contact d\'urgence', async ({ page }) => {
  // Arrange
  const member = await createTestMember({ lastName: 'Contact', firstName: 'Test' })
  await navigateToStep3(page)
  
  // Act - Sélectionner l'onglet "Sélectionner membre"
  await page.locator('[data-testid="ci-demand-form-step3-contact-tab-member"]').click()
  await page.locator('[data-testid="ci-demand-form-step3-contact-member-search-input"]').fill('Contact')
  await page.waitForTimeout(500)
  
  // Assert
  await expect(page.locator(`[data-testid="ci-demand-form-step3-contact-member-result-${member.id}"]`)).toBeVisible()
  
  // Act - Sélectionner le membre
  await page.locator(`[data-testid="ci-demand-form-step3-contact-member-result-${member.id}"]`).click()
  
  // Assert
  await expect(page.locator('[data-testid="ci-demand-form-step3-contact-member-selected"]')).toBeVisible()
})
```

**P0-CI-32** : Devrait exclure le membre sélectionné à l'étape 1 des résultats

```typescript
test('P0-CI-32: devrait exclure le membre sélectionné à l\'étape 1 des résultats', async ({ page }) => {
  // Arrange
  const member = await createTestMember({ lastName: 'Dupont' })
  await page.goto('/caisse-imprevue/demandes/add')
  await selectMember(page, member.id)
  await fillStep1(page, 'Motif valide avec plus de 10 caractères')
  await navigateToStep2(page)
  await fillStep2(page)
  await navigateToStep3(page)
  
  // Act
  await page.locator('[data-testid="ci-demand-form-step3-contact-tab-member"]').click()
  await page.locator('[data-testid="ci-demand-form-step3-contact-member-search-input"]').fill('Dupont')
  await page.waitForTimeout(500)
  
  // Assert
  await expect(page.locator(`[data-testid="ci-demand-form-step3-contact-member-result-${member.id}"]`)).not.toBeVisible()
})
```

**P0-CI-33** : Devrait saisir manuellement les informations du contact

```typescript
test('P0-CI-33: devrait saisir manuellement les informations du contact', async ({ page }) => {
  // Arrange
  await navigateToStep3(page)
  
  // Act - Sélectionner l'onglet "Saisir manuellement"
  await page.locator('[data-testid="ci-demand-form-step3-contact-tab-manual"]').click()
  await page.locator('[data-testid="ci-demand-form-step3-contact-lastname-input"]').fill('Dupont')
  await page.locator('[data-testid="ci-demand-form-step3-contact-firstname-input"]').fill('Jean')
  await page.locator('[data-testid="ci-demand-form-step3-contact-phone1-input"]').fill('+24165671734')
  await page.locator('[data-testid="ci-demand-form-step3-contact-relationship-trigger"]').click()
  await page.locator('[data-testid="ci-demand-form-step3-contact-relationship-family"]').click()
  await page.locator('[data-testid="ci-demand-form-step3-contact-typeid-trigger"]').click()
  await page.locator('[data-testid="ci-demand-form-step3-contact-typeid-cni"]').click()
  await page.locator('[data-testid="ci-demand-form-step3-contact-idnumber-input"]').fill('123456789')
  
  // Assert
  await expect(page.locator('[data-testid="ci-demand-form-step3-contact-lastname-input"]')).toHaveValue('Dupont')
  await expect(page.locator('[data-testid="ci-demand-form-step3-contact-phone1-input"]')).toHaveValue('+24165671734')
})
```

**P0-CI-34** : Devrait uploader une photo de pièce d'identité

```typescript
test('P0-CI-34: devrait uploader une photo de pièce d\'identité', async ({ page }) => {
  // Arrange
  await navigateToStep3(page)
  await page.locator('[data-testid="ci-demand-form-step3-contact-tab-manual"]').click()
  await fillContactForm(page)
  
  // Act
  const fileInput = page.locator('[data-testid="ci-demand-form-step3-contact-document-input"]')
  await fileInput.setInputFiles('tests/fixtures/test-id-photo.jpg')
  
  // Assert
  await expect(page.locator('[data-testid="ci-demand-form-step3-contact-document-preview"]')).toBeVisible()
})
```

**P0-CI-35** : Devrait créer la demande avec succès

```typescript
test('P0-CI-35: devrait créer la demande avec succès', async ({ page }) => {
  // Arrange
  const member = await createTestMember()
  const subscription = await createTestSubscriptionCI()
  await page.goto('/caisse-imprevue/demandes/add')
  await selectMember(page, member.id)
  await fillStep1(page, 'Motif valide avec plus de 10 caractères minimum requis')
  await navigateToStep2(page)
  await selectSubscription(page, subscription.id)
  await page.locator('[data-testid="ci-demand-form-step2-frequency-monthly-radio"]').click()
  await selectDate(page, new Date())
  await navigateToStep3(page)
  await fillContactFormManually(page)
  
  // Act
  await page.locator('[data-testid="ci-demand-form-step3-submit-button"]').click()
  await page.waitForURL(/\/caisse-imprevue\/demandes\/[a-zA-Z0-9]+/)
  
  // Assert
  await expect(page).toHaveURL(/\/caisse-imprevue\/demandes\/[a-zA-Z0-9]+/)
  await expect(page.locator('[data-testid="ci-demand-detail-title"]')).toBeVisible()
})
```

**P0-CI-36** : Devrait valider les champs obligatoires de l'étape 3

```typescript
test('P0-CI-36: devrait valider les champs obligatoires de l\'étape 3', async ({ page }) => {
  // Arrange
  await navigateToStep3(page)
  
  // Act - Essayer de soumettre sans remplir les champs
  await page.locator('[data-testid="ci-demand-form-step3-submit-button"]').click()
  
  // Assert
  await expect(page.locator('[data-testid="ci-demand-form-step3-contact-lastname-input"]')).toHaveAttribute('aria-invalid', 'true')
  await expect(page.locator('[data-testid="ci-demand-form-step3-contact-phone1-input"]')).toHaveAttribute('aria-invalid', 'true')
})
```

---

## 🧪 3. Tests de la Page de Détails (`details.spec.ts`)

### 3.1 Affichage des Détails

**P0-CI-37** : Devrait afficher toutes les informations de la demande

```typescript
test('P0-CI-37: devrait afficher toutes les informations de la demande', async ({ page }) => {
  // Arrange
  const demand = await createTestDemand({
    memberLastName: 'Dupont',
    memberFirstName: 'Jean',
    cause: 'Motif de test',
    paymentFrequency: 'MONTHLY'
  })
  
  // Act
  await page.goto(`/caisse-imprevue/demandes/${demand.id}`)
  
  // Assert
  await expect(page.locator('[data-testid="ci-demand-detail-title"]')).toBeVisible()
  await expect(page.locator('[data-testid="ci-demand-detail-member-card"]')).toBeVisible()
  await expect(page.locator('[data-testid="ci-demand-detail-member-name-value"]')).toContainText('Dupont')
  await expect(page.locator('[data-testid="ci-demand-detail-cause-card"]')).toBeVisible()
  await expect(page.locator('[data-testid="ci-demand-detail-cause-text"]')).toContainText('Motif de test')
  await expect(page.locator('[data-testid="ci-demand-detail-subscription-card"]')).toBeVisible()
  await expect(page.locator('[data-testid="ci-demand-detail-contact-card"]')).toBeVisible()
})
```

**P0-CI-38** : Devrait afficher le tableau de versements

```typescript
test('P0-CI-38: devrait afficher le tableau de versements', async ({ page }) => {
  // Arrange
  const demand = await createTestDemand({
    subscriptionCIAmountPerMonth: 10000,
    subscriptionCIDuration: 12,
    paymentFrequency: 'MONTHLY'
  })
  
  // Act
  await page.goto(`/caisse-imprevue/demandes/${demand.id}`)
  
  // Assert
  await expect(page.locator('[data-testid="ci-demand-detail-payment-schedule-card"]')).toBeVisible()
  await expect(page.locator('[data-testid="ci-demand-detail-payment-schedule-table"]')).toBeVisible()
  await expect(page.locator('[data-testid="ci-demand-payment-table-header-month"]')).toBeVisible()
  await expect(page.locator('[data-testid="ci-demand-payment-table-header-amount"]')).toBeVisible()
  
  // Vérifier les lignes de versement
  const rows = page.locator('[data-testid^="ci-demand-payment-table-row-"]')
  await expect(rows).toHaveCount(12) // 12 mois
  
  // Vérifier le total
  await expect(page.locator('[data-testid="ci-demand-payment-table-total-amount"]')).toContainText('120000')
})
```

**P0-CI-39** : Devrait afficher le badge de statut correct

```typescript
test('P0-CI-39: devrait afficher le badge de statut correct', async ({ page }) => {
  // Arrange
  const demand = await createTestDemand({ status: 'PENDING' })
  
  // Act
  await page.goto(`/caisse-imprevue/demandes/${demand.id}`)
  
  // Assert
  await expect(page.locator('[data-testid="ci-demand-detail-status-badge"]')).toBeVisible()
  await expect(page.locator('[data-testid="ci-demand-detail-status-badge"]')).toContainText('En attente')
})
```

**P0-CI-40** : Devrait afficher les actions selon le statut

```typescript
test('P0-CI-40: devrait afficher les actions selon le statut', async ({ page }) => {
  // Arrange - Demande PENDING
  const pendingDemand = await createTestDemand({ status: 'PENDING' })
  await page.goto(`/caisse-imprevue/demandes/${pendingDemand.id}`)
  
  // Assert
  await expect(page.locator('[data-testid="ci-demand-detail-approve-button"]')).toBeVisible()
  await expect(page.locator('[data-testid="ci-demand-detail-reject-button"]')).toBeVisible()
  
  // Arrange - Demande APPROVED
  const approvedDemand = await createTestDemand({ status: 'APPROVED' })
  await page.goto(`/caisse-imprevue/demandes/${approvedDemand.id}`)
  
  // Assert
  await expect(page.locator('[data-testid="ci-demand-detail-create-contract-button"]')).toBeVisible()
  
  // Arrange - Demande REJECTED
  const rejectedDemand = await createTestDemand({ status: 'REJECTED' })
  await page.goto(`/caisse-imprevue/demandes/${rejectedDemand.id}`)
  
  // Assert
  await expect(page.locator('[data-testid="ci-demand-detail-reopen-button"]')).toBeVisible()
  await expect(page.locator('[data-testid="ci-demand-detail-delete-button"]')).toBeVisible()
})
```

---

## 🧪 4. Tests des Actions (`actions.spec.ts`)

### 4.1 Accepter une Demande

**P0-CI-41** : Devrait accepter une demande avec une raison valide

```typescript
test('P0-CI-41: devrait accepter une demande avec une raison valide', async ({ page }) => {
  // Arrange
  const demand = await createTestDemand({ status: 'PENDING' })
  await page.goto(`/caisse-imprevue/demandes/${demand.id}`)
  
  // Act
  await page.locator('[data-testid="ci-demand-detail-approve-button"]').click()
  await expect(page.locator('[data-testid="ci-demand-approve-modal"]')).toBeVisible()
  await page.locator('[data-testid="ci-demand-approve-modal-reason-textarea"]').fill('Raison d\'acceptation valide avec plus de 10 caractères')
  await page.locator('[data-testid="ci-demand-approve-modal-submit-button"]').click()
  
  // Assert
  await page.waitForSelector('[data-testid="ci-demand-approve-modal"]', { state: 'hidden' })
  await expect(page.locator('[data-testid="ci-demand-detail-status-badge"]')).toContainText('Acceptée')
})
```

**P0-CI-42** : Devrait valider la raison d'acceptation (minimum 10 caractères)

```typescript
test('P0-CI-42: devrait valider la raison d\'acceptation (minimum 10 caractères)', async ({ page }) => {
  // Arrange
  const demand = await createTestDemand({ status: 'PENDING' })
  await page.goto(`/caisse-imprevue/demandes/${demand.id}`)
  
  // Act
  await page.locator('[data-testid="ci-demand-detail-approve-button"]').click()
  await page.locator('[data-testid="ci-demand-approve-modal-reason-textarea"]').fill('Court')
  await page.locator('[data-testid="ci-demand-approve-modal-submit-button"]').click()
  
  // Assert
  await expect(page.locator('[data-testid="ci-demand-approve-modal-reason-error"]')).toBeVisible()
  await expect(page.locator('[data-testid="ci-demand-approve-modal"]')).toBeVisible() // Modal toujours ouvert
})
```

### 4.2 Refuser une Demande

**P0-CI-43** : Devrait refuser une demande avec une raison valide

```typescript
test('P0-CI-43: devrait refuser une demande avec une raison valide', async ({ page }) => {
  // Arrange
  const demand = await createTestDemand({ status: 'PENDING' })
  await page.goto(`/caisse-imprevue/demandes/${demand.id}`)
  
  // Act
  await page.locator('[data-testid="ci-demand-detail-reject-button"]').click()
  await expect(page.locator('[data-testid="ci-demand-reject-modal"]')).toBeVisible()
  await page.locator('[data-testid="ci-demand-reject-modal-reason-textarea"]').fill('Raison de refus valide avec plus de 10 caractères')
  await page.locator('[data-testid="ci-demand-reject-modal-submit-button"]').click()
  
  // Assert
  await page.waitForSelector('[data-testid="ci-demand-reject-modal"]', { state: 'hidden' })
  await expect(page.locator('[data-testid="ci-demand-detail-status-badge"]')).toContainText('Refusée')
})
```

### 4.3 Réouvrir une Demande

**P0-CI-44** : Devrait réouvrir une demande refusée

```typescript
test('P0-CI-44: devrait réouvrir une demande refusée', async ({ page }) => {
  // Arrange
  const demand = await createTestDemand({ status: 'REJECTED' })
  await page.goto(`/caisse-imprevue/demandes/${demand.id}`)
  
  // Act
  await page.locator('[data-testid="ci-demand-detail-reopen-button"]').click()
  await expect(page.locator('[data-testid="ci-demand-reopen-modal"]')).toBeVisible()
  await page.locator('[data-testid="ci-demand-reopen-modal-reason-textarea"]').fill('Raison de réouverture valide avec plus de 10 caractères')
  await page.locator('[data-testid="ci-demand-reopen-modal-submit-button"]').click()
  
  // Assert
  await page.waitForSelector('[data-testid="ci-demand-reopen-modal"]', { state: 'hidden' })
  await expect(page.locator('[data-testid="ci-demand-detail-status-badge"]')).toContainText('Réouverte')
})
```

### 4.4 Supprimer une Demande

**P0-CI-45** : Devrait supprimer une demande refusée

```typescript
test('P0-CI-45: devrait supprimer une demande refusée', async ({ page }) => {
  // Arrange
  const demand = await createTestDemand({ status: 'REJECTED' })
  await page.goto(`/caisse-imprevue/demandes/${demand.id}`)
  
  // Act
  await page.locator('[data-testid="ci-demand-detail-delete-button"]').click()
  await expect(page.locator('[data-testid="ci-demand-delete-modal"]')).toBeVisible()
  await expect(page.locator('[data-testid="ci-demand-delete-modal-warning"]')).toBeVisible()
  await page.locator('[data-testid="ci-demand-delete-modal-submit-button"]').click()
  
  // Assert
  await page.waitForURL(/\/caisse-imprevue\/demandes$/)
  await expect(page.locator('[data-testid="ci-demand-list-title"]')).toBeVisible()
})
```

**P0-CI-46** : Devrait annuler la suppression

```typescript
test('P0-CI-46: devrait annuler la suppression', async ({ page }) => {
  // Arrange
  const demand = await createTestDemand({ status: 'REJECTED' })
  await page.goto(`/caisse-imprevue/demandes/${demand.id}`)
  
  // Act
  await page.locator('[data-testid="ci-demand-detail-delete-button"]').click()
  await page.locator('[data-testid="ci-demand-delete-modal-cancel-button"]').click()
  
  // Assert
  await expect(page.locator('[data-testid="ci-demand-delete-modal"]')).toBeHidden()
  await expect(page).toHaveURL(`/caisse-imprevue/demandes/${demand.id}`)
})
```

---

## 🧪 5. Tests de Création de Contrat (`contract.spec.ts`)

**P0-CI-47** : Devrait créer un contrat depuis une demande acceptée

```typescript
test('P0-CI-47: devrait créer un contrat depuis une demande acceptée', async ({ page }) => {
  // Arrange
  const demand = await createTestDemand({ status: 'APPROVED' })
  await page.goto(`/caisse-imprevue/demandes/${demand.id}`)
  
  // Act
  await page.locator('[data-testid="ci-demand-detail-create-contract-button"]').click()
  await expect(page.locator('[data-testid="ci-demand-create-contract-modal"]')).toBeVisible()
  
  // Sélectionner une date de début
  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() + 1)
  await page.locator('[data-testid="ci-demand-create-contract-modal-date-picker"]').click()
  // Sélectionner la date dans le calendrier
  
  await page.locator('[data-testid="ci-demand-create-contract-modal-submit-button"]').click()
  
  // Assert
  await page.waitForSelector('[data-testid="ci-demand-create-contract-modal"]', { state: 'hidden' })
  await expect(page.locator('[data-testid="ci-demand-detail-status-badge"]')).toContainText('Convertie')
})
```

---

## 🧪 6. Tests Responsive (`responsive.spec.ts`)

### 6.1 Mobile (< 768px)

**P1-CI-48** : Devrait afficher correctement la liste sur mobile

```typescript
test('P1-CI-48: devrait afficher correctement la liste sur mobile', async ({ page }) => {
  // Arrange
  await page.setViewportSize({ width: 375, height: 667 }) // iPhone SE
  await createMultipleTestDemands(5)
  await page.goto('/caisse-imprevue/demandes')
  
  // Assert
  await expect(page.locator('[data-testid="ci-demand-list-title"]')).toBeVisible()
  await expect(page.locator('[data-testid="ci-demand-list-stats"]')).toBeVisible()
  // Sur mobile, la vue cards devrait être par défaut
  await expect(page.locator('[data-testid^="ci-demand-card-"]').first()).toBeVisible()
})
```

**P1-CI-49** : Devrait afficher correctement le formulaire de création sur mobile

```typescript
test('P1-CI-49: devrait afficher correctement le formulaire de création sur mobile', async ({ page }) => {
  // Arrange
  await page.setViewportSize({ width: 375, height: 667 })
  await page.goto('/caisse-imprevue/demandes/add')
  
  // Assert
  await expect(page.locator('[data-testid="ci-demand-form-title"]')).toBeVisible()
  await expect(page.locator('[data-testid="ci-demand-form-step-1"]')).toBeVisible()
  // Les étapes devraient être empilées verticalement sur mobile
})
```

### 6.2 Tablette (768px - 1024px)

**P1-CI-50** : Devrait afficher correctement la liste sur tablette

```typescript
test('P1-CI-50: devrait afficher correctement la liste sur tablette', async ({ page }) => {
  // Arrange
  await page.setViewportSize({ width: 768, height: 1024 }) // iPad
  await createMultipleTestDemands(10)
  await page.goto('/caisse-imprevue/demandes')
  
  // Assert
  await expect(page.locator('[data-testid="ci-demand-list-title"]')).toBeVisible()
  // Sur tablette, on peut avoir soit cards soit table selon la préférence
})
```

### 6.3 Desktop (> 1024px)

**P1-CI-51** : Devrait afficher correctement la liste sur desktop

```typescript
test('P1-CI-51: devrait afficher correctement la liste sur desktop', async ({ page }) => {
  // Arrange
  await page.setViewportSize({ width: 1920, height: 1080 })
  await createMultipleTestDemands(15)
  await page.goto('/caisse-imprevue/demandes')
  
  // Assert
  await expect(page.locator('[data-testid="ci-demand-list-title"]')).toBeVisible()
  await expect(page.locator('[data-testid="ci-demand-list-table"]')).toBeVisible() // Table par défaut sur desktop
})
```

---

## 🧪 7. Tests de Navigation (`navigation.spec.ts`)

**P1-CI-52** : Devrait naviguer depuis la liste vers les détails

```typescript
test('P1-CI-52: devrait naviguer depuis la liste vers les détails', async ({ page }) => {
  // Arrange
  const demand = await createTestDemand()
  await page.goto('/caisse-imprevue/demandes')
  
  // Act
  await page.locator(`[data-testid="ci-demand-card-${demand.id}-details-button"]`).click()
  
  // Assert
  await expect(page).toHaveURL(`/caisse-imprevue/demandes/${demand.id}`)
  await expect(page.locator('[data-testid="ci-demand-detail-title"]')).toBeVisible()
})
```

**P1-CI-53** : Devrait revenir à la liste depuis les détails

```typescript
test('P1-CI-53: devrait revenir à la liste depuis les détails', async ({ page }) => {
  // Arrange
  const demand = await createTestDemand()
  await page.goto(`/caisse-imprevue/demandes/${demand.id}`)
  
  // Act
  await page.locator('[data-testid="ci-demand-detail-back-button"]').click()
  
  // Assert
  await expect(page).toHaveURL('/caisse-imprevue/demandes')
  await expect(page.locator('[data-testid="ci-demand-list-title"]')).toBeVisible()
})
```

**P1-CI-54** : Devrait utiliser le breadcrumb pour naviguer

```typescript
test('P1-CI-54: devrait utiliser le breadcrumb pour naviguer', async ({ page }) => {
  // Arrange
  const demand = await createTestDemand()
  await page.goto(`/caisse-imprevue/demandes/${demand.id}`)
  
  // Act
  await page.locator('[data-testid="ci-demand-detail-breadcrumb-list"]').click()
  
  // Assert
  await expect(page).toHaveURL('/caisse-imprevue/demandes')
})
```

---

## 📊 Matrice de Couverture

| Fonctionnalité | Tests P0 | Tests P1 | Tests P2 | Total |
|----------------|----------|----------|----------|-------|
| **Liste** | 6 | 7 | 1 | 14 |
| **Création** | 18 | 0 | 0 | 18 |
| **Détails** | 4 | 0 | 0 | 4 |
| **Actions** | 6 | 0 | 0 | 6 |
| **Contrat** | 1 | 0 | 0 | 1 |
| **Responsive** | 0 | 4 | 0 | 4 |
| **Navigation** | 0 | 3 | 0 | 3 |
| **TOTAL** | **35** | **14** | **1** | **50** |

---

## ✅ Checklist d'Implémentation

- [ ] Créer le dossier `e2e/caisse-imprevue-v2/`
- [ ] Créer `helpers.ts` avec les helpers partagés
- [ ] Créer `fixtures.ts` pour les données de test
- [ ] Implémenter `list.spec.ts` (14 tests)
- [ ] Implémenter `create.spec.ts` (18 tests)
- [ ] Implémenter `details.spec.ts` (4 tests)
- [ ] Implémenter `actions.spec.ts` (6 tests)
- [ ] Implémenter `contract.spec.ts` (1 test)
- [ ] Implémenter `responsive.spec.ts` (4 tests)
- [ ] Implémenter `navigation.spec.ts` (3 tests)
- [ ] Ajouter tous les `data-testid` dans les composants (référence : `DATA_TESTID.md`)
- [ ] Vérifier que tous les tests passent
- [ ] Documenter les helpers dans `README.md`

---

## 🔧 Helpers à Créer (`helpers.ts`)

```typescript
// Navigation
export async function navigateToDemandsList(page: Page) { ... }
export async function navigateToCreateForm(page: Page) { ... }
export async function navigateToDemandDetails(page: Page, demandId: string) { ... }

// Sélection de membres
export async function selectMember(page: Page, memberId: string) { ... }
export async function searchMember(page: Page, query: string) { ... }

// Formulaire
export async function fillStep1(page: Page, cause: string) { ... }
export async function navigateToStep2(page: Page) { ... }
export async function fillStep2(page: Page) { ... }
export async function navigateToStep3(page: Page) { ... }
export async function fillContactFormManually(page: Page) { ... }

// Actions
export async function approveDemand(page: Page, reason: string) { ... }
export async function rejectDemand(page: Page, reason: string) { ... }
export async function reopenDemand(page: Page, reason: string) { ... }
export async function deleteDemand(page: Page) { ... }
```

---

## 📚 Références

- **Data-testid** : `DATA_TESTID.md`
- **Tests unitaires** : `TESTS_UNITAIRES.md`
- **Tests d'intégration** : `TESTS_INTEGRATION.md`
- **Solutions proposées** : `../SOLUTIONS_PROPOSEES.md`
- **Wireframes** : `../ui/WIREFRAME_*.md`

---

**Date de création** : 2026-01-27  
**Version** : V2  
**Auteur** : Senior QA
