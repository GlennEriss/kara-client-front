# Tests d'Intégration - Recherche des Demandes (searchableText)

> Plan détaillé des tests d'intégration pour la recherche avec `searchableText`.

## 📋 Vue d'ensemble

**Objectif** : Tester l'interaction entre plusieurs unités (ListDemandesV2 ↔ DemandSearchV2 ↔ useCaisseImprevueDemands ↔ DemandCIRepository ↔ Firestore)

**Framework** : Vitest + React Testing Library + MSW ou mocks Firestore  
**Structure** : `src/domains/financial/caisse-imprevue/__tests__/integration/`

**Référence** : [RECHERCHE_ANALYSE.md](../RECHERCHE_ANALYSE.md), [sequence/SEQ_RechercherDemandes.puml](../sequence/SEQ_RechercherDemandes.puml)

---

## 🎯 Flux testés

1. **ListDemandesV2 + DemandSearchV2** : État searchQuery → effectiveFilters → useCaisseImprevueDemands
2. **useCaisseImprevueDemands** : searchQuery dans filters → CaisseImprevueService.getPaginatedDemands → DemandCIRepository.getPaginated
3. **Cache React Query** : queryKey inclut searchQuery, invalidation correcte
4. **Pagination** : searchQuery + pagination cursor-based

---

## 🧪 1. Flux complet : Recherche intégrée à la liste

### IT-RECH-01 : Devrait filtrer la liste quand l'utilisateur tape dans la recherche

```typescript
describe('IT-RECH-01: Recherche intégrée à la liste', () => {
  it('devrait filtrer la liste quand searchQuery est saisi', async () => {
    // Arrange
    const mockDemands = [
      createDemandFixture({ id: '1', memberLastName: 'Dupont', memberFirstName: 'Jean', searchableText: 'dupont jean 8438' }),
      createDemandFixture({ id: '2', memberLastName: 'Martin', memberFirstName: 'Pierre', searchableText: 'martin pierre 9999' }),
    ]
    mockFirestoreGetPaginated.mockResolvedValue({
      items: [mockDemands[0]],
      pagination: { page: 1, total: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
    })
    
    render(
      <QueryClientProvider client={queryClient}>
        <ListDemandesV2 />
      </QueryClientProvider>
    )
    
    // Act - Saisir dans la recherche
    const searchInput = screen.getByTestId('demand-search-input')
    await userEvent.type(searchInput, 'Dupont')
    
    // Attendre debounce 300ms + refetch
    await waitFor(() => {
      expect(mockFirestoreGetPaginated).toHaveBeenCalledWith(
        expect.objectContaining({ searchQuery: expect.any(String) }),
        expect.any(Object),
        expect.any(Object)
      )
    }, { timeout: 500 })
    
    // Assert
    await waitFor(() => {
      expect(screen.getByText(/Dupont/)).toBeInTheDocument()
      expect(screen.queryByText(/Martin/)).not.toBeInTheDocument()
    })
  })
})
```

### IT-RECH-02 : Devrait combiner recherche + tab statut

```typescript
describe('IT-RECH-02: Recherche + tab statut', () => {
  it('devrait filtrer par searchQuery ET statut du tab actif', async () => {
    // Arrange
    mockFirestoreGetPaginated.mockResolvedValue({
      items: [createDemandFixture({ memberLastName: 'Dupont', status: 'PENDING' })],
      pagination: { page: 1, total: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
    })
    
    render(
      <QueryClientProvider client={queryClient}>
        <ListDemandesV2 />
      </QueryClientProvider>
    )
    
    // Act - Sélectionner tab "En attente" puis rechercher
    await userEvent.click(screen.getByRole('tab', { name: /En attente/i }))
    await userEvent.type(screen.getByTestId('demand-search-input'), 'Dupont')
    
    await waitFor(() => {
      expect(mockFirestoreGetPaginated).toHaveBeenCalledWith(
        expect.objectContaining({
          searchQuery: expect.stringContaining('dupont'),
          status: 'PENDING',
        }),
        expect.any(Object),
        expect.any(Object)
      )
    }, { timeout: 500 })
  })
})
```

### IT-RECH-03 : Devrait combiner recherche + filtre fréquence

```typescript
describe('IT-RECH-03: Recherche + filtre fréquence', () => {
  it('devrait filtrer par searchQuery ET paymentFrequency', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ListDemandesV2 />
      </QueryClientProvider>
    )
    
    // Act - Appliquer filtre fréquence puis rechercher
    await userEvent.click(screen.getByRole('button', { name: /Fréquence/i }))
    await userEvent.click(screen.getByRole('option', { name: /Mensuelle/i }))
    await userEvent.type(screen.getByTestId('demand-search-input'), 'Dupont')
    
    await waitFor(() => {
      expect(mockFirestoreGetPaginated).toHaveBeenCalledWith(
        expect.objectContaining({
          searchQuery: expect.any(String),
          paymentFrequency: 'MONTHLY',
        }),
        expect.any(Object),
        expect.any(Object)
      )
    }, { timeout: 500 })
  })
})
```

### IT-RECH-04 : Devrait réinitialiser la page à 1 quand searchQuery change

```typescript
describe('IT-RECH-04: Reset pagination sur recherche', () => {
  it('devrait remettre page à 1 quand searchQuery change', async () => {
    mockFirestoreGetPaginated.mockResolvedValue({
      items: Array(10).fill(null).map((_, i) => createDemandFixture({ id: String(i) })),
      pagination: { page: 1, total: 25, totalPages: 3, hasNextPage: true, hasPreviousPage: false, nextCursor: '10' },
    })
    
    render(
      <QueryClientProvider client={queryClient}>
        <ListDemandesV2 />
      </QueryClientProvider>
    )
    
    // Aller à la page 2
    await userEvent.click(screen.getByRole('button', { name: /Suivant/i }))
    await waitFor(() => expect(mockFirestoreGetPaginated).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({ page: 2 }), expect.any(Object)))
    
    // Changer la recherche
    await userEvent.type(screen.getByTestId('demand-search-input'), 'Dupont')
    
    await waitFor(() => {
      expect(mockFirestoreGetPaginated).toHaveBeenLastCalledWith(
        expect.any(Object),
        expect.objectContaining({ page: 1 }),
        expect.any(Object)
      )
    }, { timeout: 500 })
  })
})
```

### IT-RECH-05 : Devrait utiliser le cache React Query pour la même recherche

```typescript
describe('IT-RECH-05: Cache React Query', () => {
  it('devrait réutiliser le cache pour la même searchQuery + filters', async () => {
    const getPaginatedSpy = vi.spyOn(DemandCIRepository.getInstance(), 'getPaginated')
    
    render(
      <QueryClientProvider client={queryClient}>
        <ListDemandesV2 />
      </QueryClientProvider>
    )
    
    // Première recherche
    await userEvent.type(screen.getByTestId('demand-search-input'), 'Dupont')
    await waitFor(() => expect(getPaginatedSpy).toHaveBeenCalled())
    const callCount1 = getPaginatedSpy.mock.calls.length
    
    // Changer de tab puis revenir (même searchQuery)
    await userEvent.click(screen.getByRole('tab', { name: /Toutes/i }))
    await userEvent.click(screen.getByRole('tab', { name: /En attente/i }))
    
    // La requête devrait être refaite car filters ont changé (status)
    await waitFor(() => expect(getPaginatedSpy.mock.calls.length).toBeGreaterThan(callCount1))
    
    getPaginatedSpy.mockRestore()
  })
})
```

### IT-RECH-06 : Devrait afficher le total correct avec searchQuery

```typescript
describe('IT-RECH-06: Total avec recherche', () => {
  it('devrait afficher le total filtré par searchQuery', async () => {
    mockFirestoreGetPaginated.mockResolvedValue({
      items: [createDemandFixture({ memberLastName: 'Dupont' })],
      pagination: { page: 1, total: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
    })
    
    render(
      <QueryClientProvider client={queryClient}>
        <ListDemandesV2 />
      </QueryClientProvider>
    )
    
    await userEvent.type(screen.getByTestId('demand-search-input'), 'Dupont')
    
    await waitFor(() => {
      expect(screen.getByText(/1/)).toBeInTheDocument()
      expect(screen.getByText(/résultat/)).toBeInTheDocument()
    }, { timeout: 500 })
  })
})
```

### IT-RECH-07 : Devrait effacer la recherche et afficher la liste complète

```typescript
describe('IT-RECH-07: Effacer la recherche', () => {
  it('devrait afficher la liste complète quand on efface la recherche', async () => {
    mockFirestoreGetPaginated
      .mockResolvedValueOnce({
        items: [createDemandFixture({ memberLastName: 'Dupont' })],
        pagination: { page: 1, total: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
      })
      .mockResolvedValueOnce({
        items: [
          createDemandFixture({ memberLastName: 'Dupont' }),
          createDemandFixture({ memberLastName: 'Martin' }),
        ],
        pagination: { page: 1, total: 2, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
      })
    
    render(
      <QueryClientProvider client={queryClient}>
        <ListDemandesV2 />
      </QueryClientProvider>
    )
    
    await userEvent.type(screen.getByTestId('demand-search-input'), 'Dupont')
    await waitFor(() => expect(mockFirestoreGetPaginated).toHaveBeenCalledWith(expect.objectContaining({ searchQuery: expect.any(String) }), expect.any(Object), expect.any(Object)))
    
    // Effacer
    await userEvent.click(screen.getByRole('button', { name: /clear|effacer|×/i }))
    
    await waitFor(() => {
      expect(mockFirestoreGetPaginated).toHaveBeenLastCalledWith(
        expect.not.objectContaining({ searchQuery: expect.any(String) }),
        expect.any(Object),
        expect.any(Object)
      )
    })
  })
})
```

### IT-RECH-08 : Devrait paginer les résultats de recherche

```typescript
describe('IT-RECH-08: Pagination avec recherche', () => {
  it('devrait afficher la page 2 des résultats de recherche', async () => {
    mockFirestoreGetPaginated
      .mockResolvedValueOnce({
        items: Array(10).fill(null).map((_, i) => createDemandFixture({ id: String(i), memberLastName: 'Dupont' })),
        pagination: { page: 1, total: 15, totalPages: 2, hasNextPage: true, hasPreviousPage: false, nextCursor: '10' },
      })
      .mockResolvedValueOnce({
        items: Array(5).fill(null).map((_, i) => createDemandFixture({ id: String(10 + i), memberLastName: 'Dupont' })),
        pagination: { page: 2, total: 15, totalPages: 2, hasNextPage: false, hasPreviousPage: true, previousCursor: '0' },
      })
    
    render(
      <QueryClientProvider client={queryClient}>
        <ListDemandesV2 />
      </QueryClientProvider>
    )
    
    await userEvent.type(screen.getByTestId('demand-search-input'), 'Dupont')
    await waitFor(() => expect(mockFirestoreGetPaginated).toHaveBeenCalled())
    
    await userEvent.click(screen.getByRole('button', { name: /Suivant/i }))
    
    await waitFor(() => {
      expect(mockFirestoreGetPaginated).toHaveBeenLastCalledWith(
        expect.objectContaining({ searchQuery: expect.any(String) }),
        expect.objectContaining({ page: 2, cursor: expect.any(String) }),
        expect.any(Object)
      )
    })
  })
})
```

---

## 📊 Résumé

| ID | Description | Priorité |
|----|-------------|----------|
| IT-RECH-01 | Recherche filtre la liste | P0 |
| IT-RECH-02 | Recherche + tab statut | P0 |
| IT-RECH-03 | Recherche + filtre fréquence | P1 |
| IT-RECH-04 | Reset page à 1 sur recherche | P0 |
| IT-RECH-05 | Cache React Query | P1 |
| IT-RECH-06 | Total correct avec recherche | P0 |
| IT-RECH-07 | Effacer recherche → liste complète | P0 |
| IT-RECH-08 | Pagination avec recherche | P0 |
| **TOTAL** | **8 tests** | |

---

## ✅ Checklist

- [ ] Créer mocks Firestore pour getPaginated avec searchQuery
- [ ] Créer fixtures avec searchableText
- [ ] Implémenter IT-RECH-01 à IT-RECH-08
- [ ] Vérifier que ListDemandesV2 et DemandSearchV2 sont connectés (searchQuery dans effectiveFilters)
- [ ] Exécuter `pnpm test` et vérifier que tous les tests passent
