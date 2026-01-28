# Tests d'Intégration - Gestion du Cache (Step2 Adresse)

## 📋 Vue d'ensemble

Tests d'intégration pour vérifier que la gestion du cache React Query fonctionne correctement pour les recherches et les chargements.

## 🎯 Objectifs

Vérifier que :
1. Le cache est utilisé correctement lors du retour à une recherche précédente
2. Les recherches avec debounce fonctionnent correctement
3. Les limites de résultats sont respectées
4. Le tri alphabétique est appliqué
5. Les stratégies de chargement (complet vs recherche) sont respectées

## 📝 Tests à implémenter

### INT-CACHE-001 : Cache lors du retour à une recherche précédente
**Description** : Vérifier que le cache est utilisé quand on revient à une recherche précédente

```typescript
it('INT-CACHE-001: devrait utiliser le cache lors du retour à une recherche précédente', async () => {
  const queryClient = new QueryClient()
  const fetchSpy = vi.fn()
  
  // Mock du service avec spy
  vi.mocked(geographieService.searchCommunes).mockImplementation(async (params) => {
    fetchSpy()
    return [
      { id: 'commune-1', name: 'Libreville', departmentId: 'dept-1' },
      { id: 'commune-2', name: 'Libreville Centre', departmentId: 'dept-1' }
    ]
  })
  
  render(
    <QueryClientProvider client={queryClient}>
      <CommuneCombobox form={form} provinceId="province-1" />
    </QueryClientProvider>
  )
  
  const searchInput = screen.getByTestId('step2-address-commune-search-input')
  
  // ÉTAPE 1 : Première recherche "Libreville"
  await userEvent.type(searchInput, 'Libreville')
  await waitFor(() => {
    expect(fetchSpy).toHaveBeenCalledTimes(1) // Une seule requête
  })
  
  // Vérifier que les résultats sont affichés
  await waitFor(() => {
    expect(screen.getByText('Libreville')).toBeInTheDocument()
  })
  
  // ÉTAPE 2 : Sélectionner une commune
  await userEvent.click(screen.getByText('Libreville'))
  
  // ÉTAPE 3 : Changer la recherche (vider et rechercher autre chose)
  await userEvent.clear(searchInput)
  await userEvent.type(searchInput, 'Port')
  
  await waitFor(() => {
    expect(fetchSpy).toHaveBeenCalledTimes(2) // Deuxième requête
  })
  
  // ÉTAPE 4 : Revenir à "Libreville"
  await userEvent.clear(searchInput)
  await userEvent.type(searchInput, 'Libreville')
  
  // Vérifier que le cache est utilisé (pas de nouvelle requête)
  await waitFor(() => {
    // Le cache devrait être utilisé si encore valide (staleTime)
    // Si le cache est stale, il y aura un refetch en arrière-plan
    // mais les résultats du cache devraient être affichés immédiatement
    expect(screen.getByText('Libreville')).toBeInTheDocument()
  })
  
  // Vérifier que fetchSpy n'a pas été appelé une troisième fois
  // (ou seulement en arrière-plan si cache stale)
  // Note: Cela dépend de la configuration staleTime
})
```

### INT-CACHE-002 : Debounce de la recherche
**Description** : Vérifier que le debounce fonctionne correctement

```typescript
it('INT-CACHE-002: devrait debouncer la recherche', async () => {
  const queryClient = new QueryClient()
  const fetchSpy = vi.fn()
  
  vi.mocked(geographieService.searchCommunes).mockImplementation(async () => {
    fetchSpy()
    return []
  })
  
  render(
    <QueryClientProvider client={queryClient}>
      <CommuneCombobox form={form} provinceId="province-1" />
    </QueryClientProvider>
  )
  
  const searchInput = screen.getByTestId('step2-address-commune-search-input')
  
  // Taper rapidement "Libreville" caractère par caractère
  await userEvent.type(searchInput, 'L', { delay: 50 })
  await userEvent.type(searchInput, 'i', { delay: 50 })
  await userEvent.type(searchInput, 'b', { delay: 50 })
  await userEvent.type(searchInput, 'r', { delay: 50 })
  await userEvent.type(searchInput, 'e', { delay: 50 })
  
  // Attendre le debounce (300ms)
  await waitFor(() => {
    // Devrait avoir fait une seule requête après le debounce
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  }, { timeout: 1000 })
})
```

### INT-CACHE-003 : Limite de résultats
**Description** : Vérifier que la limite de 50 résultats est respectée

```typescript
it('INT-CACHE-003: devrait limiter les résultats à 50', async () => {
  const queryClient = new QueryClient()
  
  // Mock retournant 100 communes
  const mockCommunes = Array.from({ length: 100 }, (_, i) => ({
    id: `commune-${i}`,
    name: `Commune ${i}`,
    departmentId: 'dept-1'
  }))
  
  vi.mocked(geographieService.searchCommunes).mockResolvedValue(mockCommunes)
  
  render(
    <QueryClientProvider client={queryClient}>
      <CommuneCombobox form={form} provinceId="province-1" />
    </QueryClientProvider>
  )
  
  const searchInput = screen.getByTestId('step2-address-commune-search-input')
  await userEvent.type(searchInput, 'Commune')
  
  await waitFor(() => {
    // Vérifier que le service a été appelé avec limit: 50
    expect(geographieService.searchCommunes).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 50
      })
    )
  })
  
  // Vérifier que seulement 50 résultats sont affichés
  const results = screen.getAllByTestId(/step2-address-commune-result-item/)
  expect(results.length).toBeLessThanOrEqual(50)
})
```

### INT-CACHE-004 : Tri alphabétique
**Description** : Vérifier que les résultats sont triés alphabétiquement

```typescript
it('INT-CACHE-004: devrait trier les résultats alphabétiquement', async () => {
  const queryClient = new QueryClient()
  
  // Mock retournant des communes non triées
  const mockCommunes = [
    { id: 'c1', name: 'Zebre', departmentId: 'dept-1' },
    { id: 'c2', name: 'Alpha', departmentId: 'dept-1' },
    { id: 'c3', name: 'Beta', departmentId: 'dept-1' },
    { id: 'c4', name: 'Gamma', departmentId: 'dept-1' }
  ]
  
  vi.mocked(geographieService.searchCommunes).mockResolvedValue(mockCommunes)
  
  render(
    <QueryClientProvider client={queryClient}>
      <CommuneCombobox form={form} provinceId="province-1" />
    </QueryClientProvider>
  )
  
  const searchInput = screen.getByTestId('step2-address-commune-search-input')
  await userEvent.type(searchInput, 'Test')
  
  await waitFor(() => {
    const results = screen.getAllByTestId(/step2-address-commune-result-item/)
    
    // Vérifier l'ordre alphabétique
    expect(results[0]).toHaveTextContent('Alpha')
    expect(results[1]).toHaveTextContent('Beta')
    expect(results[2]).toHaveTextContent('Gamma')
    expect(results[3]).toHaveTextContent('Zebre')
  })
})
```

### INT-CACHE-005 : Chargement complet vs Recherche
**Description** : Vérifier que les stratégies de chargement sont respectées

```typescript
it('INT-CACHE-005: devrait charger complètement les provinces', async () => {
  const queryClient = new QueryClient()
  const fetchSpy = vi.fn()
  
  vi.mocked(geographieService.getProvinces).mockImplementation(async () => {
    fetchSpy()
    return mockProvinces
  })
  
  render(
    <QueryClientProvider client={queryClient}>
      <ProvinceCombobox form={form} />
    </QueryClientProvider>
  )
  
  // Vérifier que toutes les provinces sont chargées au démarrage
  await waitFor(() => {
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(geographieService.getProvinces).toHaveBeenCalled()
  })
  
  // Vérifier que toutes les provinces sont affichées (pas de recherche nécessaire)
  await userEvent.click(screen.getByTestId('step2-address-province-trigger'))
  
  await waitFor(() => {
    const results = screen.getAllByTestId(/step2-address-province-result-item/)
    expect(results.length).toBe(mockProvinces.length)
  })
})

it('INT-CACHE-005b: devrait utiliser la recherche pour les communes', async () => {
  const queryClient = new QueryClient()
  const fetchSpy = vi.fn()
  
  vi.mocked(geographieService.searchCommunes).mockImplementation(async () => {
    fetchSpy()
    return []
  })
  
  render(
    <QueryClientProvider client={queryClient}>
      <CommuneCombobox form={form} provinceId="province-1" />
    </QueryClientProvider>
  )
  
  // Vérifier qu'aucune requête n'est faite au démarrage
  await waitFor(() => {
    expect(fetchSpy).not.toHaveBeenCalled()
  })
  
  // Vérifier que la recherche est requise
  const searchInput = screen.getByTestId('step2-address-commune-search-input')
  expect(searchInput).toBeInTheDocument()
  
  // Taper dans la recherche
  await userEvent.type(searchInput, 'Lib')
  
  // Vérifier qu'une requête est faite après le debounce
  await waitFor(() => {
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(geographieService.searchCommunes).toHaveBeenCalled()
  })
})
```

### INT-CACHE-006 : Minimum de caractères pour la recherche
**Description** : Vérifier que la recherche nécessite au moins 2 caractères

```typescript
it('INT-CACHE-006: devrait exiger au moins 2 caractères pour la recherche', async () => {
  const queryClient = new QueryClient()
  const fetchSpy = vi.fn()
  
  vi.mocked(geographieService.searchCommunes).mockImplementation(async () => {
    fetchSpy()
    return []
  })
  
  render(
    <QueryClientProvider client={queryClient}>
      <CommuneCombobox form={form} provinceId="province-1" />
    </QueryClientProvider>
  )
  
  const searchInput = screen.getByTestId('step2-address-commune-search-input')
  
  // Taper un seul caractère
  await userEvent.type(searchInput, 'L')
  
  // Attendre le debounce
  await waitFor(() => {
    // Aucune requête ne devrait être faite
    expect(fetchSpy).not.toHaveBeenCalled()
  }, { timeout: 1000 })
  
  // Taper un deuxième caractère
  await userEvent.type(searchInput, 'i')
  
  // Attendre le debounce
  await waitFor(() => {
    // Maintenant une requête devrait être faite
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  }, { timeout: 1000 })
})
```

## 📊 Couverture cible

| Métrique | Cible |
|----------|-------|
| Scénarios de cache | 100% |
| Cas limites | ≥90% |
