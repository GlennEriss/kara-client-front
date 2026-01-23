# Tests – Anniversaires des membres (V2)

## 1. Vue d'ensemble

La fonctionnalité Anniversaires V2 nécessite des tests à plusieurs niveaux :
- **Tests unitaires** : Services, Hooks, Utilitaires
- **Tests d'intégration** : Composants avec mocks Firestore/Algolia
- **Tests E2E** : Parcours complets utilisateur

## 2. Tests unitaires

### 2.1 `BirthdaysService`

| ID | Test | Description |
|----|------|-------------|
| UNIT-BS-01 | `calculateBirthdayInfo` - anniversaire à venir | Membre né le 15/02, aujourd'hui 23/01 → J-23 |
| UNIT-BS-02 | `calculateBirthdayInfo` - anniversaire passé cette année | Membre né le 10/01, aujourd'hui 23/01 → J-352 (année prochaine) |
| UNIT-BS-03 | `calculateBirthdayInfo` - anniversaire aujourd'hui | Membre né le 23/01, aujourd'hui 23/01 → J-0, isToday=true |
| UNIT-BS-04 | `calculateBirthdayInfo` - anniversaire demain | Membre né le 24/01, aujourd'hui 23/01 → J-1, isTomorrow=true |
| UNIT-BS-05 | `calculateDayOfYear` - début d'année | 1er janvier → jour 1 |
| UNIT-BS-06 | `calculateDayOfYear` - fin d'année | 31 décembre → jour 365/366 |
| UNIT-BS-07 | `calculateDayOfYear` - année bissextile | 29 février 2024 → jour 60 |
| UNIT-BS-08 | `transformToBirthdayMember` - transformation complète | User → BirthdayMember avec tous les champs |

```typescript
// src/domains/memberships/services/__tests__/BirthdaysService.test.ts

describe('BirthdaysService', () => {
  describe('calculateBirthdayInfo', () => {
    it('UNIT-BS-01: devrait calculer J-23 pour anniversaire à venir', () => {
      const today = new Date('2026-01-23')
      const birthDate = '1997-02-15'
      
      const result = BirthdaysService.calculateBirthdayInfo(birthDate, today)
      
      expect(result.daysUntil).toBe(23)
      expect(result.age).toBe(29)
      expect(result.isToday).toBe(false)
    })
    
    it('UNIT-BS-02: devrait calculer J-352 pour anniversaire passé cette année', () => {
      const today = new Date('2026-01-23')
      const birthDate = '1990-01-10'
      
      const result = BirthdaysService.calculateBirthdayInfo(birthDate, today)
      
      expect(result.daysUntil).toBe(352) // 10 janvier 2027
      expect(result.nextBirthday.getFullYear()).toBe(2027)
    })
    
    it('UNIT-BS-03: devrait détecter anniversaire aujourd\'hui', () => {
      const today = new Date('2026-01-23')
      const birthDate = '1995-01-23'
      
      const result = BirthdaysService.calculateBirthdayInfo(birthDate, today)
      
      expect(result.daysUntil).toBe(0)
      expect(result.isToday).toBe(true)
      expect(result.age).toBe(31)
    })
  })
  
  describe('calculateDayOfYear', () => {
    it('UNIT-BS-05: devrait retourner 1 pour le 1er janvier', () => {
      const date = new Date('2026-01-01')
      expect(BirthdaysService.calculateDayOfYear(date)).toBe(1)
    })
    
    it('UNIT-BS-06: devrait retourner 365 pour le 31 décembre (année non bissextile)', () => {
      const date = new Date('2026-12-31')
      expect(BirthdaysService.calculateDayOfYear(date)).toBe(365)
    })
  })
})
```

### 2.2 `BirthdaysAlgoliaService`

| ID | Test | Description |
|----|------|-------------|
| UNIT-BAS-01 | `search` - résultats trouvés | Recherche "Dupont" → retourne hits avec birthMonth |
| UNIT-BAS-02 | `search` - aucun résultat | Recherche "XXXXXXX" → hits vide, targetMonth null |
| UNIT-BAS-03 | `search` - filtrage actifs | Vérifie que le filtre isActive:true est appliqué |
| UNIT-BAS-04 | `search` - targetMonth du premier hit | Vérifie que targetMonth = birthMonth du premier résultat |

```typescript
// src/domains/memberships/services/__tests__/BirthdaysAlgoliaService.test.ts

describe('BirthdaysAlgoliaService', () => {
  beforeEach(() => {
    vi.mock('algoliasearch/lite', () => ({
      liteClient: vi.fn(() => ({
        search: vi.fn().mockResolvedValue({
          results: [{
            hits: [
              { objectID: '1234.MK.567890', firstName: 'Jean', lastName: 'Dupont', birthMonth: 3, birthDay: 15 },
            ],
            nbHits: 1,
          }]
        })
      }))
    }))
  })
  
  it('UNIT-BAS-01: devrait retourner les hits avec birthMonth', async () => {
    const result = await BirthdaysAlgoliaService.search('Dupont')
    
    expect(result.hits).toHaveLength(1)
    expect(result.hits[0].birthMonth).toBe(3)
    expect(result.targetMonth).toBe(3)
  })
  
  it('UNIT-BAS-02: devrait retourner targetMonth null si aucun résultat', async () => {
    // Mock avec résultat vide
    const result = await BirthdaysAlgoliaService.search('XXXXXXX')
    
    expect(result.hits).toHaveLength(0)
    expect(result.targetMonth).toBeNull()
  })
})
```

### 2.3 `useMemberBirthdays`

| ID | Test | Description |
|----|------|-------------|
| UNIT-UMB-01 | Chargement initial | isLoading=true, puis data disponible |
| UNIT-UMB-02 | Pagination | goToNextPage/goToPrevPage fonctionnent |
| UNIT-UMB-03 | Filtrage par mois | Passer months=[1,2] filtre correctement |
| UNIT-UMB-04 | Tri par anniversaire proche | Ordre correct (J-1 avant J-30) |
| UNIT-UMB-05 | Cache React Query | Deuxième appel utilise le cache |

### 2.4 `useBirthdaysByMonth`

| ID | Test | Description |
|----|------|-------------|
| UNIT-UBM-01 | Chargement par mois | month=1 → anniversaires de janvier |
| UNIT-UBM-02 | Cache par mois | Navigation retour utilise le cache |
| UNIT-UBM-03 | Erreur Firestore | Gestion correcte des erreurs |

### 2.5 `useBirthdaySearch`

| ID | Test | Description |
|----|------|-------------|
| UNIT-UBS-01 | Recherche activée | query.length >= 2 déclenche la recherche |
| UNIT-UBS-02 | Recherche désactivée | query.length < 2 ne déclenche pas |
| UNIT-UBS-03 | targetMonth retourné | Premier hit détermine targetMonth |

## 3. Tests d'intégration

### 3.1 `membership-birthdays.integration.test.tsx`

| ID | Scénario | Description |
|----|----------|-------------|
| INT-BIRTHDAYS-01 | Affichage liste paginée | Page charge et affiche 20 cards (5x4) |
| INT-BIRTHDAYS-02 | Recherche Algolia + navigation | Recherche → sélection → navigation vers mois |
| INT-BIRTHDAYS-03 | Filtres par mois | Sélection Jan+Fév → liste filtrée |
| INT-BIRTHDAYS-04 | Vue calendrier | Toggle vers calendrier → affichage correct |
| INT-BIRTHDAYS-05 | Navigation mois calendrier | Mois suivant/précédent avec cache |
| INT-BIRTHDAYS-06 | Export Excel | Génération fichier avec données filtrées |
| INT-BIRTHDAYS-07 | Export PDF | Génération fichier avec données filtrées |

```typescript
// src/domains/memberships/__tests__/integration/membership-birthdays.integration.test.tsx

describe('Anniversaires - Tests d\'intégration', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })
  
  const mockBirthdays: BirthdayMember[] = [
    createBirthdayFixture({ firstName: 'Jean', lastName: 'Dupont', birthMonth: 1, birthDay: 24, daysUntil: 1 }),
    createBirthdayFixture({ firstName: 'Marie', lastName: 'Martin', birthMonth: 1, birthDay: 26, daysUntil: 3 }),
    // ... 18 autres
  ]
  
  beforeEach(() => {
    vi.mocked(BirthdaysRepository.getPaginated).mockResolvedValue({
      data: mockBirthdays,
      pagination: { currentPage: 1, totalPages: 5, totalItems: 100, hasNextPage: true, hasPrevPage: false }
    })
  })
  
  it('INT-BIRTHDAYS-01: devrait afficher 20 cards en grille 5x4', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BirthdaysPage />
      </QueryClientProvider>
    )
    
    await waitFor(() => {
      expect(screen.getAllByTestId(/^birthday-card-/)).toHaveLength(20)
    })
    
    // Vérifier layout grille
    const container = screen.getByTestId('birthdays-grid')
    expect(container).toHaveClass('grid-cols-5')
  })
  
  it('INT-BIRTHDAYS-02: recherche Algolia doit naviguer vers le mois d\'anniversaire', async () => {
    vi.mocked(BirthdaysAlgoliaService.search).mockResolvedValue({
      hits: [{ objectID: '123', firstName: 'Pierre', lastName: 'Ndong', birthMonth: 8, birthDay: 15 }],
      targetMonth: 8
    })
    
    render(
      <QueryClientProvider client={queryClient}>
        <BirthdaysPage />
      </QueryClientProvider>
    )
    
    // Recherche
    const searchInput = screen.getByTestId('member-birthdays-search')
    await userEvent.type(searchInput, 'Ndong')
    
    // Attendre suggestions
    await waitFor(() => {
      expect(screen.getByText('Pierre Ndong')).toBeInTheDocument()
    })
    
    // Sélectionner
    await userEvent.click(screen.getByText('Pierre Ndong'))
    
    // Vérifier navigation vers août
    expect(screen.getByText('Août 2026')).toBeInTheDocument()
  })
  
  it('INT-BIRTHDAYS-03: filtres par mois doivent filtrer la liste', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BirthdaysPage />
      </QueryClientProvider>
    )
    
    // Ouvrir filtres
    await userEvent.click(screen.getByTestId('member-birthdays-month-filter'))
    
    // Sélectionner Janvier et Février
    await userEvent.click(screen.getByText('Janvier'))
    await userEvent.click(screen.getByText('Février'))
    
    // Vérifier que le repository est appelé avec les bons filtres
    await waitFor(() => {
      expect(BirthdaysRepository.getPaginated).toHaveBeenCalledWith(
        expect.objectContaining({ months: [1, 2] })
      )
    })
  })
  
  it('INT-BIRTHDAYS-05: navigation calendrier doit utiliser le cache', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BirthdaysPage />
      </QueryClientProvider>
    )
    
    // Passer en vue calendrier
    await userEvent.click(screen.getByTestId('member-birthdays-view-toggle'))
    
    // Aller au mois suivant (février)
    await userEvent.click(screen.getByText('Mois suivant'))
    expect(BirthdaysRepository.getByMonth).toHaveBeenCalledWith(2, 2026)
    
    // Revenir au mois précédent (janvier)
    await userEvent.click(screen.getByText('Mois précédent'))
    
    // Ne devrait PAS re-fetch (cache hit)
    expect(BirthdaysRepository.getByMonth).toHaveBeenCalledTimes(2) // Initial + février seulement
  })
})
```

## 4. Tests E2E

### 4.1 Scénarios Playwright

| ID | Scénario | Étapes |
|----|----------|--------|
| E2E-BIRTHDAYS-01 | Parcours complet liste | Login → Anniversaires → Scroll → Page 2 → Export |
| E2E-BIRTHDAYS-02 | Recherche et navigation | Login → Recherche "Dupont" → Sélection → Calendrier |
| E2E-BIRTHDAYS-03 | Filtrage multi-mois | Login → Filtres Jan+Mar → Vérifier liste → Reset |

```typescript
// e2e/birthdays.spec.ts

test.describe('Anniversaires E2E', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/memberships/anniversaires')
  })
  
  test('E2E-BIRTHDAYS-01: parcours complet de la liste', async ({ page }) => {
    // Attendre chargement
    await expect(page.getByTestId('birthday-card-').first()).toBeVisible()
    
    // Vérifier 20 cards
    const cards = page.getByTestId(/^birthday-card-/)
    await expect(cards).toHaveCount(20)
    
    // Aller page 2
    await page.getByRole('button', { name: 'Page suivante' }).click()
    await expect(page.getByText('Page 2')).toBeVisible()
    
    // Export Excel
    await page.getByTestId('member-birthdays-export-excel').click()
    
    // Vérifier téléchargement
    const download = await page.waitForEvent('download')
    expect(download.suggestedFilename()).toContain('anniversaires')
  })
  
  test('E2E-BIRTHDAYS-02: recherche et navigation calendrier', async ({ page }) => {
    // Rechercher
    await page.getByTestId('member-birthdays-search').fill('Marie')
    
    // Attendre et sélectionner suggestion
    await page.getByRole('option', { name: /Marie/ }).click()
    
    // Vérifier navigation vers le bon mois
    const monthHeader = page.locator('[data-testid="calendar-month-header"]')
    await expect(monthHeader).toContainText(/Janvier|Février|Mars/) // selon le membre
  })
})
```

## 5. data-testid

| Élément | data-testid |
|---------|-------------|
| Conteneur page | `member-birthdays-container` |
| Grille de cards | `birthdays-grid` |
| Champ recherche | `member-birthdays-search` |
| Filtres mois | `member-birthdays-month-filter` |
| Bouton filtre mois X | `month-filter-{month}` |
| Bouton réinitialiser | `member-birthdays-reset-filters` |
| Toggle vue | `member-birthdays-view-toggle` |
| Card membre | `birthday-card-{matricule}` |
| Pagination | `member-birthdays-pagination` |
| Bouton page suivante | `pagination-next` |
| Bouton page précédente | `pagination-prev` |
| Export Excel | `member-birthdays-export-excel` |
| Export PDF | `member-birthdays-export-pdf` |
| Calendrier | `birthdays-calendar` |
| Header mois calendrier | `calendar-month-header` |
| Jour calendrier | `calendar-day-{day}` |
| Badge anniversaire | `birthday-badge-{matricule}` |

## 6. Mocks

### 6.1 Mock BirthdaysRepository

```typescript
// src/domains/memberships/repositories/__mocks__/BirthdaysRepository.ts

export const BirthdaysRepository = {
  getInstance: vi.fn(() => ({
    getPaginated: vi.fn(),
    getByMonth: vi.fn(),
  })),
  getPaginated: vi.fn(),
  getByMonth: vi.fn(),
}
```

### 6.2 Mock Algolia

```typescript
// src/services/search/__mocks__/BirthdaysAlgoliaService.ts

export const BirthdaysAlgoliaService = {
  search: vi.fn().mockResolvedValue({
    hits: [],
    targetMonth: null,
  }),
}
```

### 6.3 Fixture de données

```typescript
// src/domains/memberships/__tests__/fixtures/birthdayFixtures.ts

export function createBirthdayFixture(overrides: Partial<BirthdayMember> = {}): BirthdayMember {
  return {
    id: `user-${Math.random().toString(36).substr(2, 9)}`,
    matricule: `${Math.floor(1000 + Math.random() * 9000)}.MK.${Math.floor(100000 + Math.random() * 900000)}`,
    firstName: 'Jean',
    lastName: 'Dupont',
    photoURL: 'https://example.com/photo.jpg',
    birthDate: '1990-01-15',
    birthMonth: 1,
    birthDay: 15,
    nextBirthday: new Date('2026-01-15'),
    daysUntil: 0,
    age: 36,
    isToday: false,
    isTomorrow: false,
    isThisWeek: true,
    ...overrides,
  }
}

export function createPaginatedBirthdaysFixture(
  count: number = 20,
  page: number = 1
): PaginatedBirthdays {
  const data = Array.from({ length: count }, (_, i) => 
    createBirthdayFixture({
      firstName: `Membre${i + 1}`,
      daysUntil: i + 1,
    })
  )
  
  return {
    data,
    pagination: {
      currentPage: page,
      totalPages: 5,
      totalItems: 100,
      hasNextPage: page < 5,
      hasPrevPage: page > 1,
    }
  }
}
```

## 7. Couverture cible

| Module | Lignes | Fonctions | Branches | Statements |
|--------|--------|-----------|----------|------------|
| `BirthdaysService` | ≥90% | ≥90% | ≥85% | ≥90% |
| `BirthdaysAlgoliaService` | ≥85% | ≥90% | ≥80% | ≥85% |
| `BirthdaysRepository` | ≥80% | ≥85% | ≥75% | ≥80% |
| `useMemberBirthdays` | ≥85% | ≥90% | ≥80% | ≥85% |
| `useBirthdaysByMonth` | ≥85% | ≥90% | ≥80% | ≥85% |
| `useBirthdaySearch` | ≥85% | ≥90% | ≥80% | ≥85% |
| **Global hooks/** | ≥80% | ≥80% | ≥80% | ≥80% |

## 8. Checklist de tests

### 8.1 Tests unitaires

- [ ] `BirthdaysService.test.ts`
- [ ] `BirthdaysAlgoliaService.test.ts`
- [ ] `BirthdaysRepository.test.ts`
- [ ] `useMemberBirthdays.test.tsx`
- [ ] `useBirthdaysByMonth.test.tsx`
- [ ] `useBirthdaySearch.test.tsx`

### 8.2 Tests d'intégration

- [ ] `membership-birthdays.integration.test.tsx`

### 8.3 Tests E2E

- [ ] `e2e/birthdays.spec.ts`
