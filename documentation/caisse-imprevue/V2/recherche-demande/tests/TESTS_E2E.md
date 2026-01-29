# Tests E2E - Recherche des Demandes (searchableText)

> Plan détaillé des tests End-to-End pour la recherche avec `searchableText`.

## 📋 Vue d'ensemble

**Objectif** : Valider les parcours utilisateur complets via l'interface web

**Framework** : Playwright  
**Structure** : `e2e/caisse-imprevue-v2/search.spec.ts` ou `e2e/caisse-imprevue-v2/recherche.spec.ts`

**Référence data-testid** : `demand-search-input` (DemandSearchV2), `ci-demand-*` (demande/tests/DATA_TESTID.md)

**Référence** : [RECHERCHE_ANALYSE.md](../RECHERCHE_ANALYSE.md), [activite/RechercherDemandes.puml](../activite/RechercherDemandes.puml)

---

## 🎯 Priorisation

| Priorité | Description | Nombre |
|----------|-------------|--------|
| **P0** | Bloquant - Recherche par nom, pagination, tabs | ~8 tests |
| **P1** | Important - Recherche + filtres, matricule | ~6 tests |
| **P2** | Nice to have - UX, debounce, clear | ~4 tests |

---

## 📁 Structure des fichiers

```
e2e/caisse-imprevue-v2/
├── helpers.ts              # loginAsAdmin, goToCaisseImprevueDemandes, waitForDemandsList
├── fixtures.ts             # createTestDemand, deleteTestDemand (avec searchableText)
├── list.spec.ts            # Tests liste (inclut recherche)
├── search.spec.ts          # Tests dédiés recherche (NOUVEAU)
└── README.md
```

---

## 🧪 1. Tests de recherche par nom

### P0-RECH-01 : Devrait rechercher par nom de famille

```typescript
test('P0-RECH-01: devrait rechercher par nom de famille', async ({ page }) => {
  // Arrange
  const demand = await createTestDemand({
    memberLastName: 'Dupont',
    memberFirstName: 'Jean',
    memberMatricule: '8438.MK.160126',
    searchableText: 'dupont jean 8438.mk.160126',
  })
  await page.goto('/caisse-imprevue/demandes')
  await waitForDemandsList(page)
  
  // Act
  const searchInput = page.locator('[data-testid="demand-search-input"]')
  await searchInput.fill('Dupont')
  await page.waitForTimeout(400) // Debounce 300ms + marge
  
  // Assert
  const cards = page.locator('[data-testid^="ci-demand-card-"]')
  await expect(cards).toHaveCount(1)
  await expect(cards.first()).toContainText('Dupont')
})
```

### P0-RECH-02 : Devrait rechercher par prénom (si searchableText = lastName firstName matricule)

```typescript
test('P0-RECH-02: devrait rechercher par prénom (préfixe dupont jean)', async ({ page }) => {
  // Avec searchableText "dupont jean 8438", "dupont jean" matche
  const demand = await createTestDemand({
    memberLastName: 'Dupont',
    memberFirstName: 'Jean',
    searchableText: 'dupont jean 8438.mk.160126',
  })
  await page.goto('/caisse-imprevue/demandes')
  await waitForDemandsList(page)
  
  const searchInput = page.locator('[data-testid="demand-search-input"]')
  await searchInput.fill('dupont jean')
  await page.waitForTimeout(400)
  
  const cards = page.locator('[data-testid^="ci-demand-card-"]')
  await expect(cards).toHaveCount(1)
  await expect(cards.first()).toContainText('Jean')
})
```

### P0-RECH-03 : Devrait afficher aucun résultat pour recherche inexistante

```typescript
test('P0-RECH-03: devrait afficher aucun résultat pour recherche inexistante', async ({ page }) => {
  await createTestDemand({ memberLastName: 'Dupont', searchableText: 'dupont jean 8438' })
  await page.goto('/caisse-imprevue/demandes')
  await waitForDemandsList(page)
  
  const searchInput = page.locator('[data-testid="demand-search-input"]')
  await searchInput.fill('NonExistent')
  await page.waitForTimeout(400)
  
  await expect(page.locator('text=Aucune demande trouvée')).toBeVisible()
  await expect(page.locator('[data-testid^="ci-demand-card-"]')).toHaveCount(0)
})
```

### P0-RECH-04 : Devrait ignorer la recherche si < 2 caractères

```typescript
test('P0-RECH-04: devrait ignorer la recherche si moins de 2 caractères', async ({ page }) => {
  await createTestDemand({ memberLastName: 'Dupont', searchableText: 'dupont jean 8438' })
  await createTestDemand({ memberLastName: 'Martin', searchableText: 'martin pierre 9999' })
  await page.goto('/caisse-imprevue/demandes')
  await waitForDemandsList(page)
  
  const searchInput = page.locator('[data-testid="demand-search-input"]')
  await searchInput.fill('D') // 1 caractère
  await page.waitForTimeout(400)
  
  // La liste devrait rester complète (pas de filtre searchableText)
  const cards = page.locator('[data-testid^="ci-demand-card-"]')
  await expect(cards).toHaveCount(2)
})
```

---

## 🧪 2. Tests recherche + tabs

### P0-RECH-05 : Devrait filtrer par tab ET recherche

```typescript
test('P0-RECH-05: devrait filtrer par tab En attente ET recherche', async ({ page }) => {
  await createTestDemand({
    memberLastName: 'Dupont',
    memberFirstName: 'Jean',
    status: 'PENDING',
    searchableText: 'dupont jean 8438',
  })
  await createTestDemand({
    memberLastName: 'Dupont',
    memberFirstName: 'Marie',
    status: 'APPROVED',
    searchableText: 'dupont marie 9999',
  })
  await page.goto('/caisse-imprevue/demandes')
  await waitForDemandsList(page)
  
  // Tab En attente
  await page.locator('[data-testid="ci-demand-tab-pending"]').click()
  await page.waitForTimeout(300)
  
  // Recherche Dupont
  const searchInput = page.locator('[data-testid="demand-search-input"]')
  await searchInput.fill('Dupont')
  await page.waitForTimeout(400)
  
  // Seule la demande PENDING Dupont devrait être visible
  const cards = page.locator('[data-testid^="ci-demand-card-"]')
  await expect(cards).toHaveCount(1)
  await expect(cards.first()).toContainText('En attente')
  await expect(cards.first()).toContainText('Dupont')
})
```

### P0-RECH-06 : Devrait rechercher dans le tab Toutes

```typescript
test('P0-RECH-06: devrait rechercher dans le tab Toutes', async ({ page }) => {
  await createTestDemand({ memberLastName: 'Dupont', searchableText: 'dupont jean 8438', status: 'PENDING' })
  await createTestDemand({ memberLastName: 'Dupont', searchableText: 'dupont marie 9999', status: 'APPROVED' })
  await page.goto('/caisse-imprevue/demandes')
  await waitForDemandsList(page)
  
  await page.locator('[data-testid="ci-demand-tab-all"]').click()
  const searchInput = page.locator('[data-testid="demand-search-input"]')
  await searchInput.fill('Dupont')
  await page.waitForTimeout(400)
  
  const cards = page.locator('[data-testid^="ci-demand-card-"]')
  await expect(cards).toHaveCount(2)
})
```

---

## 🧪 3. Tests pagination avec recherche

### P0-RECH-07 : Devrait paginer les résultats de recherche

```typescript
test('P0-RECH-07: devrait paginer les résultats de recherche', async ({ page }) => {
  // Créer 15 demandes avec searchableText "dupont"
  for (let i = 0; i < 15; i++) {
    await createTestDemand({
      memberLastName: 'Dupont',
      memberFirstName: `Jean${i}`,
      searchableText: `dupont jean${i} 8438`,
    })
  }
  await page.goto('/caisse-imprevue/demandes')
  await waitForDemandsList(page)
  
  const searchInput = page.locator('[data-testid="demand-search-input"]')
  await searchInput.fill('Dupont')
  await page.waitForTimeout(400)
  
  // Page 1 : 10 résultats
  const cardsPage1 = page.locator('[data-testid^="ci-demand-card-"]')
  await expect(cardsPage1).toHaveCount(10)
  
  // Cliquer Suivant
  await page.locator('[data-testid="ci-demand-pagination-next-button"]').click()
  await page.waitForTimeout(500)
  
  // Page 2 : 5 résultats
  const cardsPage2 = page.locator('[data-testid^="ci-demand-card-"]')
  await expect(cardsPage2).toHaveCount(5)
})
```

### P0-RECH-08 : Devrait afficher le total correct avec recherche

```typescript
test('P0-RECH-08: devrait afficher le total correct avec recherche', async ({ page }) => {
  for (let i = 0; i < 5; i++) {
    await createTestDemand({ memberLastName: 'Dupont', searchableText: `dupont jean${i} 8438` })
  }
  await createTestDemand({ memberLastName: 'Martin', searchableText: 'martin pierre 9999' })
  await page.goto('/caisse-imprevue/demandes')
  await waitForDemandsList(page)
  
  const searchInput = page.locator('[data-testid="demand-search-input"]')
  await searchInput.fill('Dupont')
  await page.waitForTimeout(400)
  
  // Vérifier le total (5 résultats pour "Dupont")
  await expect(page.locator('text=/5.*résultat/')).toBeVisible()
})
```

---

## 🧪 4. Tests recherche + filtres

### P1-RECH-09 : Devrait combiner recherche + filtre fréquence

```typescript
test('P1-RECH-09: devrait combiner recherche et filtre fréquence', async ({ page }) => {
  await createTestDemand({
    memberLastName: 'Dupont',
    paymentFrequency: 'MONTHLY',
    searchableText: 'dupont jean 8438',
  })
  await createTestDemand({
    memberLastName: 'Dupont',
    paymentFrequency: 'DAILY',
    searchableText: 'dupont marie 9999',
  })
  await page.goto('/caisse-imprevue/demandes')
  await waitForDemandsList(page)
  
  await page.locator('[data-testid="demand-search-input"]').fill('Dupont')
  await page.waitForTimeout(300)
  await page.locator('[data-testid="ci-demand-filter-frequency-trigger"]').click()
  await page.locator('[data-testid="ci-demand-filter-frequency-monthly"]').click()
  await page.waitForTimeout(400)
  
  const cards = page.locator('[data-testid^="ci-demand-card-"]')
  await expect(cards).toHaveCount(1)
  await expect(cards.first()).toContainText(/Mensuelle|MONTHLY/i)
})
```

### P1-RECH-10 : Devrait effacer la recherche et afficher la liste complète

```typescript
test('P1-RECH-10: devrait effacer la recherche et afficher la liste complète', async ({ page }) => {
  await createTestDemand({ memberLastName: 'Dupont', searchableText: 'dupont jean 8438' })
  await createTestDemand({ memberLastName: 'Martin', searchableText: 'martin pierre 9999' })
  await page.goto('/caisse-imprevue/demandes')
  await waitForDemandsList(page)
  
  const searchInput = page.locator('[data-testid="demand-search-input"]')
  await searchInput.fill('Dupont')
  await page.waitForTimeout(400)
  await expect(page.locator('[data-testid^="ci-demand-card-"]')).toHaveCount(1)
  
  // Effacer (bouton X ou clear)
  await page.locator('button[aria-label="Effacer"], button:has(svg)').first().click()
  await page.waitForTimeout(400)
  
  await expect(page.locator('[data-testid^="ci-demand-card-"]')).toHaveCount(2)
  await expect(searchInput).toHaveValue('')
})
```

---

## 🧪 5. Tests UX et debounce

### P2-RECH-11 : Devrait appliquer le debounce (300ms)

```typescript
test('P2-RECH-11: devrait appliquer le debounce avant la recherche', async ({ page }) => {
  await createTestDemand({ memberLastName: 'Dupont', searchableText: 'dupont jean 8438' })
  await page.goto('/caisse-imprevue/demandes')
  await waitForDemandsList(page)
  
  const searchInput = page.locator('[data-testid="demand-search-input"]')
  
  // Taper rapidement D, u, p, o, n, t
  await searchInput.type('Dupont', { delay: 50 })
  
  // Attendre debounce 300ms
  await page.waitForTimeout(350)
  
  const cards = page.locator('[data-testid^="ci-demand-card-"]')
  await expect(cards).toHaveCount(1)
})
```

### P2-RECH-12 : Devrait être insensible à la casse

```typescript
test('P2-RECH-12: devrait être insensible à la casse', async ({ page }) => {
  await createTestDemand({ memberLastName: 'Dupont', searchableText: 'dupont jean 8438' })
  await page.goto('/caisse-imprevue/demandes')
  await waitForDemandsList(page)
  
  const searchInput = page.locator('[data-testid="demand-search-input"]')
  await searchInput.fill('DUPONT')
  await page.waitForTimeout(400)
  
  const cards = page.locator('[data-testid^="ci-demand-card-"]')
  await expect(cards).toHaveCount(1)
})
```

### P2-RECH-13 : Devrait gérer les accents (normalisation)

```typescript
test('P2-RECH-13: devrait gérer les accents (François → francois)', async ({ page }) => {
  await createTestDemand({
    memberLastName: 'François',
    memberFirstName: 'José',
    searchableText: 'francois jose 8438',
  })
  await page.goto('/caisse-imprevue/demandes')
  await waitForDemandsList(page)
  
  const searchInput = page.locator('[data-testid="demand-search-input"]')
  await searchInput.fill('François')
  await page.waitForTimeout(400)
  
  const cards = page.locator('[data-testid^="ci-demand-card-"]')
  await expect(cards).toHaveCount(1)
})
```

### P2-RECH-14 : Devrait réinitialiser la page à 1 quand on change de recherche

```typescript
test('P2-RECH-14: devrait réinitialiser la page à 1 quand on change de recherche', async ({ page }) => {
  for (let i = 0; i < 15; i++) {
    await createTestDemand({ memberLastName: 'Dupont', searchableText: `dupont jean${i} 8438` })
  }
  await page.goto('/caisse-imprevue/demandes')
  await waitForDemandsList(page)
  
  const searchInput = page.locator('[data-testid="demand-search-input"]')
  await searchInput.fill('Dupont')
  await page.waitForTimeout(400)
  
  await page.locator('[data-testid="ci-demand-pagination-next-button"]').click()
  await page.waitForTimeout(500)
  
  // Changer la recherche
  await searchInput.fill('Dupont ')
  await page.waitForTimeout(400)
  
  // Devrait être revenu à la page 1
  await expect(page.locator('[data-testid="ci-demand-pagination-page-1"]')).toHaveClass(/active/)
})
```

---

## 📊 Résumé

| ID | Description | Priorité |
|----|-------------|----------|
| P0-RECH-01 | Recherche par nom de famille | P0 |
| P0-RECH-02 | Recherche par prénom (préfixe) | P0 |
| P0-RECH-03 | Aucun résultat | P0 |
| P0-RECH-04 | Ignorer si < 2 caractères | P0 |
| P0-RECH-05 | Recherche + tab statut | P0 |
| P0-RECH-06 | Recherche dans tab Toutes | P0 |
| P0-RECH-07 | Pagination avec recherche | P0 |
| P0-RECH-08 | Total correct | P0 |
| P1-RECH-09 | Recherche + filtre fréquence | P1 |
| P1-RECH-10 | Effacer recherche | P1 |
| P2-RECH-11 | Debounce 300ms | P2 |
| P2-RECH-12 | Insensible à la casse | P2 |
| P2-RECH-13 | Gestion des accents | P2 |
| P2-RECH-14 | Reset page sur changement recherche | P2 |
| **TOTAL** | **14 tests** | |

---

## 🔧 Helpers et fixtures

### helpers.ts

```typescript
export async function goToCaisseImprevueDemandes(page: Page) {
  await page.goto('/caisse-imprevue/demandes')
}

export async function waitForDemandsList(page: Page) {
  await page.waitForSelector('[data-testid="ci-demand-list-loading"]', { state: 'hidden', timeout: 10000 }).catch(() => {})
  await page.waitForTimeout(500)
}
```

### fixtures.ts

```typescript
export async function createTestDemand(overrides?: Partial<CaisseImprevueDemand>) {
  const demand = {
    memberLastName: 'Test',
    memberFirstName: 'User',
    memberMatricule: '8438.MK.160126',
    searchableText: 'test user 8438.mk.160126',
    status: 'PENDING',
    ...overrides,
  }
  if (!demand.searchableText && (demand.memberLastName || demand.memberFirstName || demand.memberMatricule)) {
    demand.searchableText = generateDemandSearchableText(
      demand.memberLastName || '',
      demand.memberFirstName || '',
      demand.memberMatricule || ''
    )
  }
  return await DemandCIRepository.getInstance().create(demand as any, demand.memberMatricule)
}
```

---

## ✅ Checklist

- [ ] Créer `e2e/caisse-imprevue-v2/search.spec.ts` ou `recherche.spec.ts`
- [ ] Créer helpers `goToCaisseImprevueDemands`, `waitForDemandsList`
- [ ] Créer fixture `createTestDemand` avec `searchableText`
- [ ] S'assurer que `data-testid="demand-search-input"` est présent dans DemandSearchV2
- [ ] Exécuter `pnpm exec playwright test e2e/caisse-imprevue-v2/search.spec.ts`
- [ ] Vérifier que les index Firestore sont déployés avant les tests E2E
