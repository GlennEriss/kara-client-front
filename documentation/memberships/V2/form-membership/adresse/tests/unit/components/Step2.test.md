# Tests Unitaires - Step2 Component

## 📋 Vue d'ensemble

Tests unitaires exhaustifs pour le composant `Step2` qui gère la saisie d'adresse avec cascade.

## 🎯 Objectifs

Vérifier que le composant :
1. Affiche correctement tous les éléments (header, Combobox, textarea)
2. Gère correctement les modals de création (admin seulement)
3. Appelle les handlers de création avec le pattern Optimistic Update
4. Gère la cascade de sélection
5. Affiche les états corrects (chargement, erreur, succès)

## 📝 Tests à implémenter

### Groupe 1 : Rendu initial

#### UNIT-STEP2-001 : Rendu du composant
**Description** : Vérifier que le composant se rend correctement

```typescript
it('UNIT-STEP2-001: devrait rendre le composant avec tous les éléments', () => {
  render(<Step2 form={form} />, { wrapper })
  
  expect(screen.getByTestId('step2-address-header')).toBeInTheDocument()
  expect(screen.getByTestId('step2-address-province-combobox')).toBeInTheDocument()
  expect(screen.getByTestId('step2-address-commune-combobox')).toBeInTheDocument()
  expect(screen.getByTestId('step2-address-district-combobox')).toBeInTheDocument()
  expect(screen.getByTestId('step2-address-quarter-combobox')).toBeInTheDocument()
  expect(screen.getByTestId('step2-address-additional-info-textarea')).toBeInTheDocument()
})
```

#### UNIT-STEP2-002 : Affichage des boutons d'ajout (admin)
**Description** : Vérifier que les boutons d'ajout sont visibles seulement pour les admins

```typescript
it('UNIT-STEP2-002: devrait afficher les boutons d\'ajout seulement pour les admins', () => {
  vi.mocked(useIsAdminContext).mockReturnValue(true)
  
  render(<Step2 form={form} />, { wrapper })
  
  expect(screen.getByTestId('step2-address-province-add-button')).toBeInTheDocument()
  expect(screen.getByTestId('step2-address-commune-add-button')).toBeInTheDocument()
})

it('UNIT-STEP2-002b: ne devrait pas afficher les boutons d\'ajout pour les non-admins', () => {
  vi.mocked(useIsAdminContext).mockReturnValue(false)
  
  render(<Step2 form={form} />, { wrapper })
  
  expect(screen.queryByTestId('step2-address-province-add-button')).not.toBeInTheDocument()
})
```

### Groupe 2 : Handlers de création

#### UNIT-STEP2-003 : handleCommuneCreated avec Optimistic Update
**Description** : Vérifier que `handleCommuneCreated` utilise le pattern Optimistic Update

```typescript
it('UNIT-STEP2-003: devrait utiliser useCascadingEntityCreation pour handleCommuneCreated', async () => {
  const queryClient = new QueryClient()
  const setValue = vi.fn()
  
  vi.mocked(useQueryClient).mockReturnValue(queryClient)
  form.setValue = setValue
  
  render(<Step2 form={form} />, { 
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  })
  
  const newCommune = { id: 'commune-new', name: 'Nouvelle Ville', departmentId: 'dept-1' }
  
  // Simuler la création via le modal
  const modal = screen.getByTestId('step2-address-modal-commune')
  fireEvent.click(screen.getByTestId('step2-address-commune-add-button'))
  
  // Simuler onSuccess du modal
  await act(async () => {
    // Trouver le modal et déclencher onSuccess
    const modalComponent = screen.getByTestId('step2-address-modal-commune')
    // ... déclencher onSuccess
  })
  
  // Vérifier que le cache a été mis à jour
  await waitFor(() => {
    const cachedData = queryClient.getQueryData<Commune[]>(['communes', 'dept-1'])
    expect(cachedData?.some(c => c.id === 'commune-new')).toBe(true)
  })
  
  // Vérifier que setValue a été appelé
  expect(setValue).toHaveBeenCalledWith('address.communeId', 'commune-new', {
    shouldValidate: true
  })
})
```

**Assertions** :
- Le cache React Query est mis à jour immédiatement (optimistic update)
- `setValue` est appelé avec le bon ID
- Les niveaux enfants sont réinitialisés

#### UNIT-STEP2-004 : handleProvinceCreated
**Description** : Vérifier que `handleProvinceCreated` fonctionne correctement

```typescript
it('UNIT-STEP2-004: devrait gérer la création d\'une province', async () => {
  const queryClient = new QueryClient()
  const setValue = vi.fn()
  const toastSpy = vi.spyOn(toast, 'success')
  
  vi.mocked(useQueryClient).mockReturnValue(queryClient)
  form.setValue = setValue
  
  render(<Step2 form={form} />, { 
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  })
  
  const newProvince = { id: 'province-new', name: 'Nouvelle Province' }
  
  // Simuler la création
  await act(async () => {
    // Déclencher handleProvinceCreated
  })
  
  // Vérifier l'invalidation
  expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
    queryKey: ['provinces']
  })
  
  // Vérifier setValue
  expect(setValue).toHaveBeenCalledWith('address.provinceId', 'province-new', {
    shouldValidate: true
  })
  
  // Vérifier le toast
  expect(toastSpy).toHaveBeenCalledWith(
    expect.stringContaining('Nouvelle Province')
  )
})
```

### Groupe 3 : Cascade de sélection

#### UNIT-STEP2-005 : Cascade Province → Commune
**Description** : Vérifier que la sélection d'une province déverrouille la commune

```typescript
it('UNIT-STEP2-005: devrait déverrouiller la commune après sélection d\'une province', async () => {
  render(<Step2 form={form} />, { wrapper })
  
  // Initialement, commune est verrouillée
  const communeCombobox = screen.getByTestId('step2-address-commune-combobox')
  expect(communeCombobox).toBeDisabled()
  
  // Sélectionner une province
  await userEvent.click(screen.getByTestId('step2-address-province-trigger'))
  await userEvent.click(screen.getByText('Estuaire'))
  
  // Vérifier que la commune est déverrouillée
  await waitFor(() => {
    expect(communeCombobox).not.toBeDisabled()
  })
})
```

#### UNIT-STEP2-006 : Cascade Commune → District
**Description** : Vérifier que la sélection d'une commune déverrouille le district

```typescript
it('UNIT-STEP2-006: devrait déverrouiller le district après sélection d\'une commune', async () => {
  render(<Step2 form={form} />, { wrapper })
  
  // Sélectionner province et commune
  await selectProvince('Estuaire')
  await selectCommune('Libreville')
  
  // Vérifier que le district est déverrouillé
  const districtCombobox = screen.getByTestId('step2-address-district-combobox')
  await waitFor(() => {
    expect(districtCombobox).not.toBeDisabled()
  })
})
```

### Groupe 4 : Modals

#### UNIT-STEP2-007 : Ouverture modal commune
**Description** : Vérifier que le modal s'ouvre au clic sur le bouton d'ajout

```typescript
it('UNIT-STEP2-007: devrait ouvrir le modal de création de commune', async () => {
  vi.mocked(useIsAdminContext).mockReturnValue(true)
  
  render(<Step2 form={form} />, { wrapper })
  
  const addButton = screen.getByTestId('step2-address-commune-add-button')
  await userEvent.click(addButton)
  
  await waitFor(() => {
    expect(screen.getByTestId('step2-address-modal-commune')).toBeVisible()
  })
})
```

#### UNIT-STEP2-008 : Fermeture modal
**Description** : Vérifier que le modal se ferme correctement

```typescript
it('UNIT-STEP2-008: devrait fermer le modal au clic sur Annuler', async () => {
  vi.mocked(useIsAdminContext).mockReturnValue(true)
  
  render(<Step2 form={form} />, { wrapper })
  
  // Ouvrir le modal
  await userEvent.click(screen.getByTestId('step2-address-commune-add-button'))
  
  // Fermer le modal
  await userEvent.click(screen.getByTestId('step2-address-modal-commune-close-button'))
  
  await waitFor(() => {
    expect(screen.queryByTestId('step2-address-modal-commune')).not.toBeVisible()
  })
})
```

## 🛠️ Setup des tests

### Mocks nécessaires

```typescript
// Mock useIsAdminContext
vi.mock('@/hooks/useIsAdminContext', () => ({
  useIsAdminContext: vi.fn(() => false)
}))

// Mock useQueryClient
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query')
  return {
    ...actual,
    useQueryClient: vi.fn(() => new QueryClient())
  }
})

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}))

// Mock modals
vi.mock('@/domains/infrastructure/geography/components/modals/AddCommuneModal', () => ({
  default: ({ open, onSuccess }: any) => (
    open ? (
      <div data-testid="step2-address-modal-commune">
        <button onClick={() => onSuccess({ id: 'commune-new', name: 'Test' })}>
          Simuler création
        </button>
      </div>
    ) : null
  )
}))
```

## 📊 Couverture cible

| Métrique | Cible |
|----------|-------|
| Lignes | ≥85% |
| Fonctions | ≥90% |
| Branches | ≥80% |
| Statements | ≥85% |
