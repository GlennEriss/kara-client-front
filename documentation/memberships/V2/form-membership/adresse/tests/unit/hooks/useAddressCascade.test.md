# Tests Unitaires - useAddressCascade

## 📋 Vue d'ensemble

Tests unitaires exhaustifs pour le hook `useAddressCascade` qui gère la cascade de sélection d'adresse.

## 🎯 Objectifs

Vérifier que le hook :
1. Charge correctement les données géographiques en cascade
2. Met à jour automatiquement les champs texte du formulaire
3. Réinitialise les niveaux enfants quand un parent change
4. Gère correctement les états de chargement
5. Calcule correctement les IDs et entités sélectionnées

## 📝 Tests à implémenter

### Groupe 1 : Chargement des données

#### UNIT-ADDR-001 : Chargement des provinces
**Description** : Vérifier que les provinces sont chargées au montage

```typescript
it('UNIT-ADDR-001: devrait charger les provinces au montage', async () => {
  const { result } = renderHook(() => useAddressCascade({ form }), { wrapper })
  
  await waitFor(() => {
    expect(result.current.isLoading.provinces).toBe(false)
  })
  
  expect(result.current.selectedEntities.province).toBeUndefined()
  expect(result.current.selectedIds.provinceId).toBe('')
})
```

**Assertions** :
- `isLoading.provinces` passe à `false` après chargement
- `selectedEntities.province` est `undefined` initialement
- `selectedIds.provinceId` est vide initialement

#### UNIT-ADDR-002 : Chargement des départements après sélection province
**Description** : Vérifier que les départements sont chargés quand une province est sélectionnée

```typescript
it('UNIT-ADDR-002: devrait charger les départements après sélection d\'une province', async () => {
  const { result } = renderHook(() => useAddressCascade({ form }), { wrapper })
  
  // Sélectionner une province
  act(() => {
    form.setValue('address.provinceId', 'province-1')
  })
  
  await waitFor(() => {
    expect(result.current.isLoading.departments).toBe(false)
  })
  
  expect(result.current.selectedIds.provinceId).toBe('province-1')
  expect(result.current.selectedEntities.province).toBeDefined()
})
```

**Assertions** :
- `isLoading.departments` passe à `false` après chargement
- `selectedIds.provinceId` est mis à jour
- `selectedEntities.province` contient la province sélectionnée

#### UNIT-ADDR-003 : Chargement des communes après sélection province
**Description** : Vérifier que les communes sont chargées pour tous les départements de la province

```typescript
it('UNIT-ADDR-003: devrait charger les communes de tous les départements de la province', async () => {
  const { result } = renderHook(() => useAddressCascade({ form }), { wrapper })
  
  // Sélectionner une province avec 2 départements
  act(() => {
    form.setValue('address.provinceId', 'province-1')
  })
  
  await waitFor(() => {
    expect(result.current.isLoading.communes).toBe(false)
  })
  
  // Vérifier que toutes les communes des départements sont chargées
  expect(result.current.allCommunes.length).toBeGreaterThan(0)
  expect(result.current.allCommunes.every(c => 
    c.departmentId === 'dept-1' || c.departmentId === 'dept-2'
  )).toBe(true)
})
```

**Assertions** :
- `isLoading.communes` passe à `false` après chargement
- `allCommunes` contient toutes les communes des départements de la province
- Les communes sont triées par nom

#### UNIT-ADDR-004 : Chargement des districts après sélection commune
**Description** : Vérifier que les districts sont chargés quand une commune est sélectionnée

```typescript
it('UNIT-ADDR-004: devrait charger les districts après sélection d\'une commune', async () => {
  const { result } = renderHook(() => useAddressCascade({ form }), { wrapper })
  
  // Sélectionner province puis commune
  act(() => {
    form.setValue('address.provinceId', 'province-1')
    form.setValue('address.communeId', 'commune-1')
  })
  
  await waitFor(() => {
    expect(result.current.isLoading.districts).toBe(false)
  })
  
  expect(result.current.selectedIds.communeId).toBe('commune-1')
  expect(result.current.selectedEntities.commune).toBeDefined()
})
```

**Assertions** :
- `isLoading.districts` passe à `false` après chargement
- `selectedIds.communeId` est mis à jour
- `selectedEntities.commune` contient la commune sélectionnée

#### UNIT-ADDR-005 : Chargement des quarters après sélection district
**Description** : Vérifier que les quarters sont chargés quand un district est sélectionné

```typescript
it('UNIT-ADDR-005: devrait charger les quarters après sélection d\'un district', async () => {
  const { result } = renderHook(() => useAddressCascade({ form }), { wrapper })
  
  // Sélectionner toute la cascade
  act(() => {
    form.setValue('address.provinceId', 'province-1')
    form.setValue('address.communeId', 'commune-1')
    form.setValue('address.districtId', 'district-1')
  })
  
  await waitFor(() => {
    expect(result.current.isLoading.quarters).toBe(false)
  })
  
  expect(result.current.selectedIds.districtId).toBe('district-1')
  expect(result.current.selectedEntities.district).toBeDefined()
})
```

**Assertions** :
- `isLoading.quarters` passe à `false` après chargement
- `selectedIds.districtId` est mis à jour
- `selectedEntities.district` contient le district sélectionné

### Groupe 2 : Mise à jour automatique des champs texte

#### UNIT-ADDR-006 : Mise à jour du champ province
**Description** : Vérifier que `address.province` est mis à jour quand une province est sélectionnée

```typescript
it('UNIT-ADDR-006: devrait mettre à jour address.province quand une province est sélectionnée', async () => {
  const { result } = renderHook(() => useAddressCascade({ form }), { wrapper })
  
  const province = { id: 'province-1', name: 'Estuaire' }
  
  act(() => {
    form.setValue('address.provinceId', province.id)
  })
  
  await waitFor(() => {
    expect(form.getValues('address.province')).toBe(province.name)
  })
})
```

**Assertions** :
- `address.province` contient le nom de la province sélectionnée
- Mise à jour se fait automatiquement via `useEffect`

#### UNIT-ADDR-007 : Mise à jour du champ city
**Description** : Vérifier que `address.city` est mis à jour quand une commune est sélectionnée

```typescript
it('UNIT-ADDR-007: devrait mettre à jour address.city quand une commune est sélectionnée', async () => {
  const { result } = renderHook(() => useAddressCascade({ form }), { wrapper })
  
  const commune = { id: 'commune-1', name: 'Libreville', departmentId: 'dept-1' }
  
  act(() => {
    form.setValue('address.provinceId', 'province-1')
    form.setValue('address.communeId', commune.id)
  })
  
  await waitFor(() => {
    expect(form.getValues('address.city')).toBe(commune.name)
  })
})
```

**Assertions** :
- `address.city` contient le nom de la commune sélectionnée
- Les champs `address.district` et `address.arrondissement` sont réinitialisés

#### UNIT-ADDR-008 : Réinitialisation des champs enfants
**Description** : Vérifier que les champs enfants sont réinitialisés quand un parent change

```typescript
it('UNIT-ADDR-008: devrait réinitialiser les champs enfants quand un parent change', async () => {
  const { result } = renderHook(() => useAddressCascade({ form }), { wrapper })
  
  // Sélectionner toute la cascade
  act(() => {
    form.setValue('address.provinceId', 'province-1')
    form.setValue('address.communeId', 'commune-1')
    form.setValue('address.districtId', 'district-1')
    form.setValue('address.quarterId', 'quarter-1')
  })
  
  await waitFor(() => {
    expect(form.getValues('address.city')).toBe('Libreville')
    expect(form.getValues('address.arrondissement')).toBe('Akanda')
  })
  
  // Changer la commune
  act(() => {
    form.setValue('address.communeId', 'commune-2')
  })
  
  await waitFor(() => {
    expect(form.getValues('address.district')).toBe('')
    expect(form.getValues('address.arrondissement')).toBe('')
    expect(form.getValues('address.quarterId')).toBe('')
  })
})
```

**Assertions** :
- Quand `communeId` change, `districtId` et `quarterId` sont réinitialisés
- Les champs texte correspondants sont vidés

### Groupe 3 : Réinitialisation en cascade

#### UNIT-ADDR-009 : Réinitialisation commune quand province change
**Description** : Vérifier que la commune est réinitialisée quand la province change

```typescript
it('UNIT-ADDR-009: devrait réinitialiser la commune quand la province change', async () => {
  const { result } = renderHook(() => useAddressCascade({ form }), { wrapper })
  
  // Sélectionner province et commune
  act(() => {
    form.setValue('address.provinceId', 'province-1')
    form.setValue('address.communeId', 'commune-1')
  })
  
  // Changer la province
  act(() => {
    form.setValue('address.provinceId', 'province-2')
  })
  
  await waitFor(() => {
    expect(result.current.selectedIds.communeId).toBe('')
    expect(result.current.selectedIds.districtId).toBe('')
    expect(result.current.selectedIds.quarterId).toBe('')
  })
})
```

**Assertions** :
- `communeId`, `districtId`, `quarterId` sont réinitialisés
- Les entités sélectionnées sont `undefined`

#### UNIT-ADDR-010 : Réinitialisation district quand commune change
**Description** : Vérifier que le district est réinitialisé quand la commune change

```typescript
it('UNIT-ADDR-010: devrait réinitialiser le district quand la commune change', async () => {
  const { result } = renderHook(() => useAddressCascade({ form }), { wrapper })
  
  // Sélectionner commune et district
  act(() => {
    form.setValue('address.provinceId', 'province-1')
    form.setValue('address.communeId', 'commune-1')
    form.setValue('address.districtId', 'district-1')
  })
  
  // Changer la commune
  act(() => {
    form.setValue('address.communeId', 'commune-2')
  })
  
  await waitFor(() => {
    expect(result.current.selectedIds.districtId).toBe('')
    expect(result.current.selectedIds.quarterId).toBe('')
  })
})
```

**Assertions** :
- `districtId` et `quarterId` sont réinitialisés
- `communeId` reste à la nouvelle valeur

#### UNIT-ADDR-011 : Réinitialisation quarter quand district change
**Description** : Vérifier que le quarter est réinitialisé quand le district change

```typescript
it('UNIT-ADDR-011: devrait réinitialiser le quarter quand le district change', async () => {
  const { result } = renderHook(() => useAddressCascade({ form }), { wrapper })
  
  // Sélectionner district et quarter
  act(() => {
    form.setValue('address.provinceId', 'province-1')
    form.setValue('address.communeId', 'commune-1')
    form.setValue('address.districtId', 'district-1')
    form.setValue('address.quarterId', 'quarter-1')
  })
  
  // Changer le district
  act(() => {
    form.setValue('address.districtId', 'district-2')
  })
  
  await waitFor(() => {
    expect(result.current.selectedIds.quarterId).toBe('')
  })
})
```

**Assertions** :
- `quarterId` est réinitialisé
- `districtId` reste à la nouvelle valeur

### Groupe 4 : États de chargement

#### UNIT-ADDR-012 : États de chargement corrects
**Description** : Vérifier que les états de chargement sont correctement gérés

```typescript
it('UNIT-ADDR-012: devrait gérer correctement les états de chargement', async () => {
  const { result } = renderHook(() => useAddressCascade({ form }), { wrapper })
  
  // Initialement, provinces en chargement
  expect(result.current.isLoading.provinces).toBe(true)
  
  await waitFor(() => {
    expect(result.current.isLoading.provinces).toBe(false)
  })
  
  // Sélectionner une province
  act(() => {
    form.setValue('address.provinceId', 'province-1')
  })
  
  // Départements et communes en chargement
  expect(result.current.isLoading.departments).toBe(true)
  expect(result.current.isLoading.communes).toBe(true)
  
  await waitFor(() => {
    expect(result.current.isLoading.departments).toBe(false)
    expect(result.current.isLoading.communes).toBe(false)
  })
})
```

**Assertions** :
- `isLoading.provinces` passe à `false` après chargement initial
- `isLoading.departments` et `isLoading.communes` passent à `true` puis `false`
- Les états sont synchronisés avec les queries React Query

### Groupe 5 : Calcul des entités sélectionnées

#### UNIT-ADDR-013 : Trouver la province sélectionnée
**Description** : Vérifier que `selectedEntities.province` est correctement calculé

```typescript
it('UNIT-ADDR-013: devrait trouver la province sélectionnée depuis l\'ID', async () => {
  const { result } = renderHook(() => useAddressCascade({ form }), { wrapper })
  
  const province = { id: 'province-1', name: 'Estuaire' }
  
  act(() => {
    form.setValue('address.provinceId', province.id)
  })
  
  await waitFor(() => {
    expect(result.current.selectedEntities.province).toBeDefined()
    expect(result.current.selectedEntities.province?.id).toBe(province.id)
    expect(result.current.selectedEntities.province?.name).toBe(province.name)
  })
})
```

**Assertions** :
- `selectedEntities.province` contient la province correspondant à `provinceId`
- Les propriétés sont correctes

#### UNIT-ADDR-014 : Trouver la commune sélectionnée
**Description** : Vérifier que `selectedEntities.commune` est correctement calculé depuis `allCommunes`

```typescript
it('UNIT-ADDR-014: devrait trouver la commune sélectionnée depuis allCommunes', async () => {
  const { result } = renderHook(() => useAddressCascade({ form }), { wrapper })
  
  const commune = { id: 'commune-1', name: 'Libreville', departmentId: 'dept-1' }
  
  act(() => {
    form.setValue('address.provinceId', 'province-1')
    form.setValue('address.communeId', commune.id)
  })
  
  await waitFor(() => {
    expect(result.current.allCommunes.length).toBeGreaterThan(0)
    expect(result.current.selectedEntities.commune).toBeDefined()
    expect(result.current.selectedEntities.commune?.id).toBe(commune.id)
    expect(result.current.selectedEntities.commune?.name).toBe(commune.name)
  })
})
```

**Assertions** :
- `allCommunes` contient la commune
- `selectedEntities.commune` est trouvé depuis `allCommunes.find()`
- Les propriétés sont correctes

#### UNIT-ADDR-015 : Trouver le district sélectionné
**Description** : Vérifier que `selectedEntities.district` est correctement calculé

```typescript
it('UNIT-ADDR-015: devrait trouver le district sélectionné depuis l\'ID', async () => {
  const { result } = renderHook(() => useAddressCascade({ form }), { wrapper })
  
  const district = { id: 'district-1', name: 'Akanda', communeId: 'commune-1' }
  
  act(() => {
    form.setValue('address.provinceId', 'province-1')
    form.setValue('address.communeId', 'commune-1')
    form.setValue('address.districtId', district.id)
  })
  
  await waitFor(() => {
    expect(result.current.selectedEntities.district).toBeDefined()
    expect(result.current.selectedEntities.district?.id).toBe(district.id)
    expect(result.current.selectedEntities.district?.name).toBe(district.name)
  })
})
```

**Assertions** :
- `selectedEntities.district` contient le district correspondant à `districtId`
- Les propriétés sont correctes

#### UNIT-ADDR-016 : Trouver le quarter sélectionné
**Description** : Vérifier que `selectedEntities.quarter` est correctement calculé

```typescript
it('UNIT-ADDR-016: devrait trouver le quarter sélectionné depuis l\'ID', async () => {
  const { result } = renderHook(() => useAddressCascade({ form }), { wrapper })
  
  const quarter = { id: 'quarter-1', name: 'Akanda Centre', districtId: 'district-1' }
  
  act(() => {
    form.setValue('address.provinceId', 'province-1')
    form.setValue('address.communeId', 'commune-1')
    form.setValue('address.districtId', 'district-1')
    form.setValue('address.quarterId', quarter.id)
  })
  
  await waitFor(() => {
    expect(result.current.selectedEntities.quarter).toBeDefined()
    expect(result.current.selectedEntities.quarter?.id).toBe(quarter.id)
    expect(result.current.selectedEntities.quarter?.name).toBe(quarter.name)
  })
})
```

**Assertions** :
- `selectedEntities.quarter` contient le quarter correspondant à `quarterId`
- Les propriétés sont correctes

### Groupe 6 : Agrégation des communes

#### UNIT-ADDR-017 : Agrégation des communes de plusieurs départements
**Description** : Vérifier que `allCommunes` agrège correctement les communes de tous les départements

```typescript
it('UNIT-ADDR-017: devrait agréger les communes de tous les départements de la province', async () => {
  const { result } = renderHook(() => useAddressCascade({ form }), { wrapper })
  
  // Province avec 2 départements, chacun avec 3 communes
  act(() => {
    form.setValue('address.provinceId', 'province-1')
  })
  
  await waitFor(() => {
    expect(result.current.isLoading.communes).toBe(false)
  })
  
  // Vérifier que toutes les communes sont présentes
  expect(result.current.allCommunes.length).toBe(6) // 3 + 3
  
  // Vérifier qu'il n'y a pas de doublons
  const uniqueIds = new Set(result.current.allCommunes.map(c => c.id))
  expect(uniqueIds.size).toBe(result.current.allCommunes.length)
  
  // Vérifier le tri alphabétique
  const names = result.current.allCommunes.map(c => c.name)
  const sortedNames = [...names].sort((a, b) => 
    a.localeCompare(b, 'fr', { sensitivity: 'base' })
  )
  expect(names).toEqual(sortedNames)
})
```

**Assertions** :
- `allCommunes` contient toutes les communes de tous les départements
- Pas de doublons (vérification par ID)
- Les communes sont triées par nom (ordre alphabétique français)

#### UNIT-ADDR-018 : Gestion des communes vides
**Description** : Vérifier que `allCommunes` est un tableau vide si aucune commune n'est disponible

```typescript
it('UNIT-ADDR-018: devrait retourner un tableau vide si aucune commune n\'est disponible', async () => {
  const { result } = renderHook(() => useAddressCascade({ form }), { wrapper })
  
  // Province sans départements ou départements sans communes
  act(() => {
    form.setValue('address.provinceId', 'province-empty')
  })
  
  await waitFor(() => {
    expect(result.current.isLoading.communes).toBe(false)
  })
  
  expect(result.current.allCommunes).toEqual([])
})
```

**Assertions** :
- `allCommunes` est un tableau vide
- Pas d'erreur levée

### Groupe 7 : Désactivation de la mise à jour automatique

#### UNIT-ADDR-019 : Désactiver autoUpdateTextFields
**Description** : Vérifier que `autoUpdateTextFields: false` désactive la mise à jour automatique

```typescript
it('UNIT-ADDR-019: devrait ne pas mettre à jour les champs texte si autoUpdateTextFields est false', async () => {
  const { result } = renderHook(
    () => useAddressCascade({ form, autoUpdateTextFields: false }),
    { wrapper }
  )
  
  const province = { id: 'province-1', name: 'Estuaire' }
  
  act(() => {
    form.setValue('address.provinceId', province.id)
  })
  
  await waitFor(() => {
    expect(result.current.selectedEntities.province).toBeDefined()
  })
  
  // Vérifier que le champ texte n'a pas été mis à jour
  expect(form.getValues('address.province')).toBe('')
})
```

**Assertions** :
- `address.province` reste vide
- Les autres champs texte ne sont pas mis à jour non plus

### Groupe 8 : Cas limites et erreurs

#### UNIT-ADDR-020 : Province invalide
**Description** : Vérifier que le hook gère correctement une province ID invalide

```typescript
it('UNIT-ADDR-020: devrait gérer correctement une province ID invalide', async () => {
  const { result } = renderHook(() => useAddressCascade({ form }), { wrapper })
  
  act(() => {
    form.setValue('address.provinceId', 'invalid-province-id')
  })
  
  await waitFor(() => {
    expect(result.current.isLoading.provinces).toBe(false)
  })
  
  expect(result.current.selectedEntities.province).toBeUndefined()
  expect(result.current.selectedIds.provinceId).toBe('invalid-province-id')
})
```

**Assertions** :
- `selectedEntities.province` est `undefined`
- `selectedIds.provinceId` contient l'ID invalide
- Pas d'erreur levée

#### UNIT-ADDR-021 : Commune invalide
**Description** : Vérifier que le hook gère correctement une commune ID invalide

```typescript
it('UNIT-ADDR-021: devrait gérer correctement une commune ID invalide', async () => {
  const { result } = renderHook(() => useAddressCascade({ form }), { wrapper })
  
  act(() => {
    form.setValue('address.provinceId', 'province-1')
    form.setValue('address.communeId', 'invalid-commune-id')
  })
  
  await waitFor(() => {
    expect(result.current.isLoading.communes).toBe(false)
  })
  
  expect(result.current.selectedEntities.commune).toBeUndefined()
  expect(result.current.selectedIds.communeId).toBe('invalid-commune-id')
})
```

**Assertions** :
- `selectedEntities.commune` est `undefined`
- `selectedIds.communeId` contient l'ID invalide
- Pas d'erreur levée

#### UNIT-ADDR-022 : Erreur de chargement des départements
**Description** : Vérifier que le hook gère correctement une erreur lors du chargement des départements

```typescript
it('UNIT-ADDR-022: devrait gérer correctement une erreur lors du chargement des départements', async () => {
  // Mock pour simuler une erreur
  vi.mocked(useDepartments).mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: true,
    error: new Error('Failed to load departments')
  })
  
  const { result } = renderHook(() => useAddressCascade({ form }), { wrapper })
  
  act(() => {
    form.setValue('address.provinceId', 'province-1')
  })
  
  await waitFor(() => {
    expect(result.current.isLoading.departments).toBe(false)
  })
  
  // Le hook ne devrait pas planter
  expect(result.current.selectedIds.provinceId).toBe('province-1')
  expect(result.current.allCommunes).toEqual([])
})
```

**Assertions** :
- Le hook ne plante pas
- `allCommunes` est un tableau vide
- `isLoading.departments` passe à `false`

## 🛠️ Setup des tests

### Mocks nécessaires

```typescript
// Mock React Query
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

// Mock hooks géographie
vi.mock('@/domains/infrastructure/geography/hooks/useGeographie', () => ({
  useProvinces: vi.fn(() => ({
    data: mockProvinces,
    isLoading: false
  })),
  useDepartments: vi.fn(() => ({
    data: mockDepartments,
    isLoading: false
  })),
  useDistricts: vi.fn(() => ({
    data: mockDistricts,
    isLoading: false
  })),
  useQuarters: vi.fn(() => ({
    data: mockQuarters,
    isLoading: false
  }))
}))

// Mock ServiceFactory
vi.mock('@/factories/ServiceFactory', () => ({
  ServiceFactory: {
    getGeographieService: vi.fn(() => ({
      getCommunesByDepartmentId: vi.fn((id) => 
        Promise.resolve(mockCommunes.filter(c => c.departmentId === id))
      )
    }))
  }
}))
```

### Fixtures de données

```typescript
const mockProvinces = [
  { id: 'province-1', name: 'Estuaire', code: 'G1' },
  { id: 'province-2', name: 'Haut-Ogooué', code: 'G2' }
]

const mockDepartments = [
  { id: 'dept-1', name: 'Libreville', provinceId: 'province-1' },
  { id: 'dept-2', name: 'Ntoum', provinceId: 'province-1' }
]

const mockCommunes = [
  { id: 'commune-1', name: 'Libreville', departmentId: 'dept-1', postalCode: '24100' },
  { id: 'commune-2', name: 'Port-Gentil', departmentId: 'dept-1', postalCode: '24101' },
  { id: 'commune-3', name: 'Ntoum', departmentId: 'dept-2', postalCode: '24102' }
]

const mockDistricts = [
  { id: 'district-1', name: 'Akanda', communeId: 'commune-1' },
  { id: 'district-2', name: 'Owendo', communeId: 'commune-1' }
]

const mockQuarters = [
  { id: 'quarter-1', name: 'Akanda Centre', districtId: 'district-1' },
  { id: 'quarter-2', name: 'Akanda Sud', districtId: 'district-1' }
]
```

## 📊 Couverture cible

| Métrique | Cible |
|----------|-------|
| Lignes | ≥90% |
| Fonctions | ≥95% |
| Branches | ≥85% |
| Statements | ≥90% |

## ✅ Checklist

- [ ] UNIT-ADDR-001 : Chargement des provinces
- [ ] UNIT-ADDR-002 : Chargement des départements
- [ ] UNIT-ADDR-003 : Chargement des communes
- [ ] UNIT-ADDR-004 : Chargement des districts
- [ ] UNIT-ADDR-005 : Chargement des quarters
- [ ] UNIT-ADDR-006 : Mise à jour champ province
- [ ] UNIT-ADDR-007 : Mise à jour champ city
- [ ] UNIT-ADDR-008 : Réinitialisation champs enfants
- [ ] UNIT-ADDR-009 : Réinitialisation commune
- [ ] UNIT-ADDR-010 : Réinitialisation district
- [ ] UNIT-ADDR-011 : Réinitialisation quarter
- [ ] UNIT-ADDR-012 : États de chargement
- [ ] UNIT-ADDR-013 : Trouver province sélectionnée
- [ ] UNIT-ADDR-014 : Trouver commune sélectionnée
- [ ] UNIT-ADDR-015 : Trouver district sélectionné
- [ ] UNIT-ADDR-016 : Trouver quarter sélectionné
- [ ] UNIT-ADDR-017 : Agrégation communes
- [ ] UNIT-ADDR-018 : Communes vides
- [ ] UNIT-ADDR-019 : Désactiver autoUpdateTextFields
- [ ] UNIT-ADDR-020 : Province invalide
- [ ] UNIT-ADDR-021 : Commune invalide
- [ ] UNIT-ADDR-022 : Erreur chargement départements
