# Tests Unitaires - useCascadingEntityCreation

## 📋 Vue d'ensemble

Tests unitaires exhaustifs pour le hook `useCascadingEntityCreation` qui implémente le pattern **Optimistic Update avec Context-Aware Cache Update**.

## 🎯 Objectifs

Vérifier que le hook :
1. Met à jour le cache de manière optimiste (immédiatement)
2. Met à jour le cache dans le contexte du parent (context-aware)
3. Invalide correctement les queries
4. Force le refetch des queries actives
5. Sélectionne l'entité dans le formulaire
6. Réinitialise les niveaux enfants (cascade reset)
7. Gère correctement les erreurs

## 📝 Tests à implémenter

### Groupe 1 : Optimistic Update (Context-Aware)

#### UNIT-CASC-001 : Mise à jour cache spécifique au parent
**Description** : Vérifier que le cache de la query spécifique au parent est mis à jour

```typescript
it('UNIT-CASC-001: devrait mettre à jour le cache spécifique au parent', async () => {
  const queryClient = new QueryClient()
  const setValue = vi.fn()
  
  const { result } = renderHook(
    () => useCascadingEntityCreation<Commune>({
      queryKey: ['communes'],
      parentContext: {
        key: 'provinceId',
        value: 'province-1',
        getParentId: (commune) => commune.departmentId
      }
    }),
    {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )
    }
  )
  
  // Pré-remplir le cache avec des communes existantes
  queryClient.setQueryData(['communes', 'dept-1'], [
    { id: 'commune-1', name: 'Libreville', departmentId: 'dept-1' }
  ])
  
  const newCommune = { id: 'commune-2', name: 'Nouvelle Ville', departmentId: 'dept-1' }
  
  await act(async () => {
    await result.current.handleEntityCreated(newCommune, setValue)
  })
  
  // Vérifier que le cache spécifique est mis à jour
  const cachedData = queryClient.getQueryData<Commune[]>(['communes', 'dept-1'])
  expect(cachedData).toHaveLength(2)
  expect(cachedData?.some(c => c.id === 'commune-2')).toBe(true)
})
```

**Assertions** :
- `queryClient.getQueryData(['communes', 'dept-1'])` contient la nouvelle commune
- La nouvelle commune est ajoutée sans doublon
- Les communes sont triées par nom

#### UNIT-CASC-002 : Mise à jour cache générique
**Description** : Vérifier que toutes les queries communes sont mises à jour

```typescript
it('UNIT-CASC-002: devrait mettre à jour toutes les queries communes', async () => {
  const queryClient = new QueryClient()
  const setValue = vi.fn()
  
  const { result } = renderHook(
    () => useCascadingEntityCreation<Commune>({
      queryKey: ['communes'],
      sortFn: (a, b) => a.name.localeCompare(b.name, 'fr')
    }),
    {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )
    }
  )
  
  // Pré-remplir plusieurs caches
  queryClient.setQueryData(['communes', 'dept-1'], [
    { id: 'commune-1', name: 'Libreville', departmentId: 'dept-1' }
  ])
  queryClient.setQueryData(['communes', 'dept-2'], [
    { id: 'commune-3', name: 'Ntoum', departmentId: 'dept-2' }
  ])
  
  const newCommune = { id: 'commune-2', name: 'Nouvelle Ville', departmentId: 'dept-1' }
  
  await act(async () => {
    await result.current.handleEntityCreated(newCommune, setValue)
  })
  
  // Vérifier que tous les caches sont mis à jour
  const allQueries = queryClient.getQueriesData({ queryKey: ['communes'] })
  expect(allQueries.length).toBeGreaterThan(0)
  
  // Vérifier que la nouvelle commune est dans au moins un cache
  const hasNewCommune = allQueries.some(([_, data]) => {
    const communes = data as Commune[]
    return communes?.some(c => c.id === 'commune-2')
  })
  expect(hasNewCommune).toBe(true)
})
```

**Assertions** :
- Toutes les queries `['communes']` sont mises à jour
- La nouvelle commune est présente dans les caches appropriés
- Pas de doublons créés

#### UNIT-CASC-003 : Éviter les doublons
**Description** : Vérifier que si la commune existe déjà, elle n'est pas ajoutée en double

```typescript
it('UNIT-CASC-003: devrait éviter les doublons lors de la mise à jour du cache', async () => {
  const queryClient = new QueryClient()
  const setValue = vi.fn()
  
  const { result } = renderHook(
    () => useCascadingEntityCreation<Commune>({
      queryKey: ['communes']
    }),
    {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )
    }
  )
  
  const existingCommune = { id: 'commune-1', name: 'Libreville', departmentId: 'dept-1' }
  
  // Pré-remplir avec la commune
  queryClient.setQueryData(['communes', 'dept-1'], [existingCommune])
  
  // Essayer d'ajouter la même commune
  await act(async () => {
    await result.current.handleEntityCreated(existingCommune, setValue)
  })
  
  // Vérifier qu'il n'y a pas de doublon
  const cachedData = queryClient.getQueryData<Commune[]>(['communes', 'dept-1'])
  expect(cachedData).toHaveLength(1)
  expect(cachedData?.[0].id).toBe('commune-1')
})
```

**Assertions** :
- Le cache ne contient qu'une seule instance de la commune
- Pas de doublon créé

#### UNIT-CASC-004 : Tri des communes après ajout
**Description** : Vérifier que les communes sont triées après l'ajout

```typescript
it('UNIT-CASC-004: devrait trier les communes après ajout', async () => {
  const queryClient = new QueryClient()
  const setValue = vi.fn()
  
  const { result } = renderHook(
    () => useCascadingEntityCreation<Commune>({
      queryKey: ['communes'],
      sortFn: (a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
    }),
    {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )
    }
  )
  
  // Pré-remplir avec communes non triées
  queryClient.setQueryData(['communes', 'dept-1'], [
    { id: 'commune-1', name: 'Zebreville', departmentId: 'dept-1' },
    { id: 'commune-2', name: 'Alphaville', departmentId: 'dept-1' }
  ])
  
  const newCommune = { id: 'commune-3', name: 'Nouvelle Ville', departmentId: 'dept-1' }
  
  await act(async () => {
    await result.current.handleEntityCreated(newCommune, setValue)
  })
  
  // Vérifier le tri
  const cachedData = queryClient.getQueryData<Commune[]>(['communes', 'dept-1'])
  const names = cachedData?.map(c => c.name) || []
  const sortedNames = [...names].sort((a, b) => 
    a.localeCompare(b, 'fr', { sensitivity: 'base' })
  )
  expect(names).toEqual(sortedNames)
})
```

**Assertions** :
- Les communes sont triées par nom (ordre alphabétique français)
- La nouvelle commune est à la bonne position

### Groupe 2 : Context Check

#### UNIT-CASC-005 : Vérification du contexte parent
**Description** : Vérifier que le hook vérifie que l'entité appartient au contexte parent

```typescript
it('UNIT-CASC-005: devrait vérifier que l\'entité appartient au contexte parent', async () => {
  const queryClient = new QueryClient()
  const setValue = vi.fn()
  const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  
  const { result } = renderHook(
    () => useCascadingEntityCreation<Commune>({
      queryKey: ['communes'],
      parentContext: {
        key: 'provinceId',
        value: 'province-1',
        getParentId: (commune) => commune.departmentId
      }
    }),
    {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )
    }
  )
  
  // Commune d'un département qui n'appartient pas à province-1
  const newCommune = { 
    id: 'commune-2', 
    name: 'Nouvelle Ville', 
    departmentId: 'dept-other' // Département d'une autre province
  }
  
  await act(async () => {
    await result.current.handleEntityCreated(newCommune, setValue)
  })
  
  // Vérifier qu'un avertissement a été loggé
  expect(consoleWarnSpy).toHaveBeenCalledWith(
    expect.stringContaining('does not belong to parent context')
  )
  
  consoleWarnSpy.mockRestore()
})
```

**Assertions** :
- Un avertissement est loggé si l'entité n'appartient pas au contexte
- Le hook continue l'exécution (ne plante pas)

#### UNIT-CASC-006 : Pas de contexte parent
**Description** : Vérifier que le hook fonctionne sans contexte parent

```typescript
it('UNIT-CASC-006: devrait fonctionner sans contexte parent', async () => {
  const queryClient = new QueryClient()
  const setValue = vi.fn()
  
  const { result } = renderHook(
    () => useCascadingEntityCreation<Commune>({
      queryKey: ['communes']
      // Pas de parentContext
    }),
    {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )
    }
  )
  
  const newCommune = { id: 'commune-2', name: 'Nouvelle Ville', departmentId: 'dept-1' }
  
  await act(async () => {
    await result.current.handleEntityCreated(newCommune, setValue)
  })
  
  // Vérifier que le cache générique est mis à jour
  const allQueries = queryClient.getQueriesData({ queryKey: ['communes'] })
  expect(allQueries.length).toBeGreaterThan(0)
  
  // Vérifier que setValue a été appelé
  expect(setValue).toHaveBeenCalledWith('commune-2')
})
```

**Assertions** :
- Le hook fonctionne sans contexte parent
- Le cache générique est mis à jour
- `setValue` est appelé

### Groupe 3 : Invalidation et Refetch

#### UNIT-CASC-007 : Invalidation des queries
**Description** : Vérifier que toutes les queries sont invalidées

```typescript
it('UNIT-CASC-007: devrait invalider toutes les queries communes', async () => {
  const queryClient = new QueryClient()
  const setValue = vi.fn()
  const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
  
  const { result } = renderHook(
    () => useCascadingEntityCreation<Commune>({
      queryKey: ['communes']
    }),
    {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )
    }
  )
  
  const newCommune = { id: 'commune-2', name: 'Nouvelle Ville', departmentId: 'dept-1' }
  
  await act(async () => {
    await result.current.handleEntityCreated(newCommune, setValue)
  })
  
  // Vérifier que invalidateQueries a été appelé
  expect(invalidateSpy).toHaveBeenCalledWith({
    queryKey: ['communes'],
    exact: false
  })
})
```

**Assertions** :
- `invalidateQueries` est appelé avec `exact: false`
- Toutes les sous-queries sont invalidées

#### UNIT-CASC-008 : Refetch explicite des queries actives
**Description** : Vérifier que les queries actives sont refetchées

```typescript
it('UNIT-CASC-008: devrait refetch les queries actives', async () => {
  const queryClient = new QueryClient()
  const setValue = vi.fn()
  const refetchSpy = vi.spyOn(queryClient, 'refetchQueries')
  
  const { result } = renderHook(
    () => useCascadingEntityCreation<Commune>({
      queryKey: ['communes']
    }),
    {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )
    }
  )
  
  const newCommune = { id: 'commune-2', name: 'Nouvelle Ville', departmentId: 'dept-1' }
  
  await act(async () => {
    await result.current.handleEntityCreated(newCommune, setValue)
  })
  
  // Vérifier que refetchQueries a été appelé
  expect(refetchSpy).toHaveBeenCalledWith({
    queryKey: ['communes'],
    exact: false,
    type: 'active'
  })
})
```

**Assertions** :
- `refetchQueries` est appelé avec `type: 'active'`
- Seulement les queries actives sont refetchées

### Groupe 4 : Sélection et Cascade Reset

#### UNIT-CASC-009 : Sélection de l'entité
**Description** : Vérifier que `setValue` est appelé avec le bon ID

```typescript
it('UNIT-CASC-009: devrait sélectionner l\'entité dans le formulaire', async () => {
  const queryClient = new QueryClient()
  const setValue = vi.fn()
  
  const { result } = renderHook(
    () => useCascadingEntityCreation<Commune>({
      queryKey: ['communes']
    }),
    {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )
    }
  )
  
  const newCommune = { id: 'commune-2', name: 'Nouvelle Ville', departmentId: 'dept-1' }
  
  await act(async () => {
    await result.current.handleEntityCreated(newCommune, setValue)
  })
  
  // Vérifier que setValue a été appelé avec le bon ID
  expect(setValue).toHaveBeenCalledWith('commune-2')
})
```

**Assertions** :
- `setValue` est appelé avec l'ID de la nouvelle entité
- L'appel se fait APRÈS la mise à jour du cache

#### UNIT-CASC-010 : Cascade Reset
**Description** : Vérifier que `resetChildren` est appelé pour réinitialiser les niveaux enfants

```typescript
it('UNIT-CASC-010: devrait réinitialiser les niveaux enfants', async () => {
  const queryClient = new QueryClient()
  const setValue = vi.fn()
  const resetChildren = vi.fn()
  
  const { result } = renderHook(
    () => useCascadingEntityCreation<Commune>({
      queryKey: ['communes'],
      resetChildren
    }),
    {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )
    }
  )
  
  const newCommune = { id: 'commune-2', name: 'Nouvelle Ville', departmentId: 'dept-1' }
  
  await act(async () => {
    await result.current.handleEntityCreated(newCommune, setValue)
  })
  
  // Vérifier que resetChildren a été appelé
  expect(resetChildren).toHaveBeenCalledTimes(1)
})
```

**Assertions** :
- `resetChildren` est appelé une fois
- L'appel se fait APRÈS la sélection

#### UNIT-CASC-011 : Pas de resetChildren si non fourni
**Description** : Vérifier que le hook fonctionne sans `resetChildren`

```typescript
it('UNIT-CASC-011: devrait fonctionner sans resetChildren', async () => {
  const queryClient = new QueryClient()
  const setValue = vi.fn()
  
  const { result } = renderHook(
    () => useCascadingEntityCreation<Commune>({
      queryKey: ['communes']
      // Pas de resetChildren
    }),
    {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )
    }
  )
  
  const newCommune = { id: 'commune-2', name: 'Nouvelle Ville', departmentId: 'dept-1' }
  
  // Ne devrait pas planter
  await act(async () => {
    await result.current.handleEntityCreated(newCommune, setValue)
  })
  
  expect(setValue).toHaveBeenCalledWith('commune-2')
})
```

**Assertions** :
- Le hook ne plante pas sans `resetChildren`
- `setValue` est toujours appelé

### Groupe 5 : Filtrage personnalisé

#### UNIT-CASC-012 : Filtrage personnalisé
**Description** : Vérifier que `filterFn` est utilisée si fournie

```typescript
it('UNIT-CASC-012: devrait utiliser filterFn si fournie', async () => {
  const queryClient = new QueryClient()
  const setValue = vi.fn()
  const filterFn = vi.fn((old, newEntity) => [...old, newEntity])
  
  const { result } = renderHook(
    () => useCascadingEntityCreation<Commune>({
      queryKey: ['communes'],
      filterFn
    }),
    {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )
    }
  )
  
  queryClient.setQueryData(['communes', 'dept-1'], [
    { id: 'commune-1', name: 'Libreville', departmentId: 'dept-1' }
  ])
  
  const newCommune = { id: 'commune-2', name: 'Nouvelle Ville', departmentId: 'dept-1' }
  
  await act(async () => {
    await result.current.handleEntityCreated(newCommune, setValue)
  })
  
  // Vérifier que filterFn a été appelée
  expect(filterFn).toHaveBeenCalledWith(
    expect.arrayContaining([expect.objectContaining({ id: 'commune-1' })]),
    newCommune,
    undefined // parentContext value
  )
})
```

**Assertions** :
- `filterFn` est appelée avec les bons paramètres
- Le résultat de `filterFn` est utilisé pour mettre à jour le cache

### Groupe 6 : Cas limites et erreurs

#### UNIT-CASC-013 : Cache vide
**Description** : Vérifier que le hook fonctionne si le cache est vide

```typescript
it('UNIT-CASC-013: devrait fonctionner si le cache est vide', async () => {
  const queryClient = new QueryClient()
  const setValue = vi.fn()
  
  const { result } = renderHook(
    () => useCascadingEntityCreation<Commune>({
      queryKey: ['communes']
    }),
    {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )
    }
  )
  
  const newCommune = { id: 'commune-1', name: 'Nouvelle Ville', departmentId: 'dept-1' }
  
  await act(async () => {
    await result.current.handleEntityCreated(newCommune, setValue)
  })
  
  // Vérifier que le cache contient la nouvelle commune
  const cachedData = queryClient.getQueryData<Commune[]>(['communes', 'dept-1'])
  expect(cachedData).toEqual([newCommune])
})
```

**Assertions** :
- Le cache est créé avec la nouvelle commune
- Pas d'erreur levée

#### UNIT-CASC-014 : Erreur lors de l'invalidation
**Description** : Vérifier que le hook gère les erreurs d'invalidation

```typescript
it('UNIT-CASC-014: devrait gérer les erreurs lors de l\'invalidation', async () => {
  const queryClient = new QueryClient()
  const setValue = vi.fn()
  
  // Mock pour simuler une erreur
  vi.spyOn(queryClient, 'invalidateQueries').mockRejectedValue(new Error('Invalidation failed'))
  
  const { result } = renderHook(
    () => useCascadingEntityCreation<Commune>({
      queryKey: ['communes']
    }),
    {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )
    }
  )
  
  const newCommune = { id: 'commune-1', name: 'Nouvelle Ville', departmentId: 'dept-1' }
  
  // Ne devrait pas planter
  await act(async () => {
    await expect(
      result.current.handleEntityCreated(newCommune, setValue)
    ).rejects.toThrow('Invalidation failed')
  })
})
```

**Assertions** :
- L'erreur est propagée (pas silencieuse)
- Le hook ne plante pas de manière inattendue

#### UNIT-CASC-015 : Erreur lors du refetch
**Description** : Vérifier que le hook gère les erreurs de refetch

```typescript
it('UNIT-CASC-015: devrait gérer les erreurs lors du refetch', async () => {
  const queryClient = new QueryClient()
  const setValue = vi.fn()
  
  // Mock pour simuler une erreur
  vi.spyOn(queryClient, 'refetchQueries').mockRejectedValue(new Error('Refetch failed'))
  
  const { result } = renderHook(
    () => useCascadingEntityCreation<Commune>({
      queryKey: ['communes']
    }),
    {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )
    }
  )
  
  const newCommune = { id: 'commune-1', name: 'Nouvelle Ville', departmentId: 'dept-1' }
  
  // Ne devrait pas planter
  await act(async () => {
    await expect(
      result.current.handleEntityCreated(newCommune, setValue)
    ).rejects.toThrow('Refetch failed')
  })
})
```

**Assertions** :
- L'erreur est propagée
- Le cache a quand même été mis à jour (optimistic update)

## 🛠️ Setup des tests

### Mocks nécessaires

```typescript
// Mock QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, cacheTime: 0 }
  }
})

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
)
```

### Fixtures de données

```typescript
const mockCommune: Commune = {
  id: 'commune-1',
  name: 'Libreville',
  departmentId: 'dept-1',
  postalCode: '24100',
  alias: 'LBV',
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: 'user-1'
}
```

## 📊 Couverture cible

| Métrique | Cible |
|----------|-------|
| Lignes | ≥90% |
| Fonctions | ≥95% |
| Branches | ≥85% |
| Statements | ≥90% |

## ✅ Checklist

- [ ] UNIT-CASC-001 : Mise à jour cache spécifique
- [ ] UNIT-CASC-002 : Mise à jour cache générique
- [ ] UNIT-CASC-003 : Éviter les doublons
- [ ] UNIT-CASC-004 : Tri des communes
- [ ] UNIT-CASC-005 : Vérification contexte parent
- [ ] UNIT-CASC-006 : Pas de contexte parent
- [ ] UNIT-CASC-007 : Invalidation des queries
- [ ] UNIT-CASC-008 : Refetch explicite
- [ ] UNIT-CASC-009 : Sélection de l'entité
- [ ] UNIT-CASC-010 : Cascade Reset
- [ ] UNIT-CASC-011 : Pas de resetChildren
- [ ] UNIT-CASC-012 : Filtrage personnalisé
- [ ] UNIT-CASC-013 : Cache vide
- [ ] UNIT-CASC-014 : Erreur invalidation
- [ ] UNIT-CASC-015 : Erreur refetch
