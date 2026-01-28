# Tests d'Intégration - Optimistic Update (Step2 Adresse)

## 📋 Vue d'ensemble

Tests d'intégration pour vérifier que le pattern **Optimistic Update avec Context-Aware Cache Update** fonctionne correctement lors de la création d'entités.

## 🎯 Objectifs

Vérifier que :
1. Le cache est mis à jour **immédiatement** après création
2. La nouvelle entité apparaît **instantanément** dans le Combobox
3. L'entité est **sélectionnée automatiquement**
4. Les niveaux enfants sont **réinitialisés**
5. La synchronisation cache-formulaire est **parfaite**

## 📝 Tests à implémenter

### INT-OPT-001 : Création commune avec Optimistic Update
**Description** : Vérifier que la création d'une commune met à jour le cache immédiatement

```typescript
it('INT-OPT-001: devrait mettre à jour le cache immédiatement après création d\'une commune', async () => {
  const user = userEvent.setup()
  const queryClient = new QueryClient()
  
  render(
    <QueryClientProvider client={queryClient}>
      <Step2 form={form} />
    </QueryClientProvider>
  )
  
  // Sélectionner une province
  await selectProvince(user, 'Estuaire')
  
  // Pré-remplir le cache avec des communes existantes
  queryClient.setQueryData(['communes', 'dept-1'], [
    { id: 'commune-1', name: 'Libreville', departmentId: 'dept-1' }
  ])
  
  // Ouvrir le modal de création
  await user.click(screen.getByTestId('step2-address-commune-add-button'))
  
  // Remplir et soumettre le formulaire
  await user.type(screen.getByLabelText(/nom de la commune/i), 'Nouvelle Ville')
  await user.selectOptions(screen.getByLabelText(/département/i), 'dept-1')
  await user.click(screen.getByTestId('step2-address-modal-commune-submit-button'))
  
  // Vérifier que le cache est mis à jour IMMÉDIATEMENT (avant même le refetch)
  const cachedData = queryClient.getQueryData<Commune[]>(['communes', 'dept-1'])
  expect(cachedData?.some(c => c.name === 'Nouvelle Ville')).toBe(true)
  
  // Vérifier que la commune apparaît dans le Combobox
  await waitFor(() => {
    const trigger = screen.getByTestId('step2-address-commune-trigger')
    expect(trigger).toHaveTextContent('Nouvelle Ville')
  })
  
  // Vérifier que la commune est sélectionnée
  expect(form.getValues('address.communeId')).toBeTruthy()
})
```

### INT-OPT-002 : Synchronisation cache-formulaire
**Description** : Vérifier que le formulaire et le cache sont synchronisés

```typescript
it('INT-OPT-002: devrait synchroniser parfaitement le cache et le formulaire', async () => {
  const user = userEvent.setup()
  const queryClient = new QueryClient()
  
  render(
    <QueryClientProvider client={queryClient}>
      <Step2 form={form} />
    </QueryClientProvider>
  )
  
  await selectProvince(user, 'Estuaire')
  
  // Créer une commune
  const newCommune = await createCommuneViaModal(user, {
    name: 'Nouvelle Ville',
    departmentId: 'dept-1'
  })
  
  // Vérifier la synchronisation
  await waitFor(() => {
    // 1. Cache mis à jour
    const cachedData = queryClient.getQueryData<Commune[]>(['communes', 'dept-1'])
    expect(cachedData?.some(c => c.id === newCommune.id)).toBe(true)
    
    // 2. Formulaire mis à jour
    expect(form.getValues('address.communeId')).toBe(newCommune.id)
    
    // 3. Combobox affiche la nouvelle commune
    const trigger = screen.getByTestId('step2-address-commune-trigger')
    expect(trigger).toHaveTextContent('Nouvelle Ville')
    
    // 4. useAddressCascade trouve la commune
    // (via selectedEntities.commune)
  })
})
```

### INT-OPT-003 : Cascade Reset après création
**Description** : Vérifier que les niveaux enfants sont réinitialisés après création

```typescript
it('INT-OPT-003: devrait réinitialiser les niveaux enfants après création d\'une commune', async () => {
  const user = userEvent.setup()
  
  // Sélectionner toute la cascade
  await selectProvince(user, 'Estuaire')
  await selectCommune(user, 'Libreville')
  await selectDistrict(user, 'Akanda')
  await selectQuarter(user, 'Akanda Centre')
  
  // Vérifier que tout est sélectionné
  expect(form.getValues('address.quarterId')).toBe('quarter-1')
  
  // Créer une nouvelle commune
  await createCommuneViaModal(user, {
    name: 'Nouvelle Ville',
    departmentId: 'dept-1'
  })
  
  // Vérifier que district et quarter sont réinitialisés
  await waitFor(() => {
    expect(form.getValues('address.districtId')).toBe('')
    expect(form.getValues('address.quarterId')).toBe('')
    expect(form.getValues('address.arrondissement')).toBe('')
    expect(form.getValues('address.district')).toBe('')
  })
  
  // Vérifier que les Combobox sont verrouillées
  expect(screen.getByTestId('step2-address-district-trigger')).toBeDisabled()
  expect(screen.getByTestId('step2-address-quarter-trigger')).toBeDisabled()
})
```

### INT-OPT-004 : Context-Aware Update
**Description** : Vérifier que le cache est mis à jour dans le contexte du parent

```typescript
it('INT-OPT-004: devrait mettre à jour le cache dans le contexte du parent', async () => {
  const user = userEvent.setup()
  const queryClient = new QueryClient()
  
  render(
    <QueryClientProvider client={queryClient}>
      <Step2 form={form} />
    </QueryClientProvider>
  )
  
  // Sélectionner une province (contexte parent)
  await selectProvince(user, 'Estuaire')
  
  // Créer une commune dans dept-1 (qui appartient à Estuaire)
  const newCommune = await createCommuneViaModal(user, {
    name: 'Nouvelle Ville',
    departmentId: 'dept-1' // Département de Estuaire
  })
  
  // Vérifier que le cache spécifique est mis à jour
  await waitFor(() => {
    const specificCache = queryClient.getQueryData<Commune[]>(['communes', 'dept-1'])
    expect(specificCache?.some(c => c.id === newCommune.id)).toBe(true)
  })
  
  // Vérifier que le cache générique est aussi mis à jour
  const allQueries = queryClient.getQueriesData({ queryKey: ['communes'] })
  const hasNewCommune = allQueries.some(([_, data]) => {
    const communes = data as Commune[]
    return communes?.some(c => c.id === newCommune.id)
  })
  expect(hasNewCommune).toBe(true)
})
```

### INT-OPT-005 : Invalidation et Refetch
**Description** : Vérifier que l'invalidation et le refetch fonctionnent correctement

```typescript
it('INT-OPT-005: devrait invalider et refetch les queries après création', async () => {
  const user = userEvent.setup()
  const queryClient = new QueryClient()
  const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
  const refetchSpy = vi.spyOn(queryClient, 'refetchQueries')
  
  render(
    <QueryClientProvider client={queryClient}>
      <Step2 form={form} />
    </QueryClientProvider>
  )
  
  await selectProvince(user, 'Estuaire')
  
  // Créer une commune
  await createCommuneViaModal(user, {
    name: 'Nouvelle Ville',
    departmentId: 'dept-1'
  })
  
  // Vérifier que invalidateQueries a été appelé
  await waitFor(() => {
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['communes'],
      exact: false
    })
  })
  
  // Vérifier que refetchQueries a été appelé
  await waitFor(() => {
    expect(refetchSpy).toHaveBeenCalledWith({
      queryKey: ['communes'],
      exact: false,
      type: 'active'
    })
  })
})
```

### INT-OPT-006 : Apparition immédiate dans Combobox
**Description** : Vérifier que la nouvelle commune apparaît immédiatement dans le Combobox

```typescript
it('INT-OPT-006: devrait afficher la nouvelle commune immédiatement dans le Combobox', async () => {
  const user = userEvent.setup()
  const queryClient = new QueryClient()
  
  render(
    <QueryClientProvider client={queryClient}>
      <Step2 form={form} />
    </QueryClientProvider>
  )
  
  await selectProvince(user, 'Estuaire')
  
  // Ouvrir le Combobox pour voir les communes existantes
  await user.click(screen.getByTestId('step2-address-commune-trigger'))
  await waitFor(() => {
    const results = screen.getAllByTestId(/step2-address-commune-result-item/)
    expect(results.length).toBe(1) // Seulement Libreville
  })
  
  // Fermer le Combobox
  await user.press('Escape')
  
  // Créer une nouvelle commune
  await createCommuneViaModal(user, {
    name: 'Nouvelle Ville',
    departmentId: 'dept-1'
  })
  
  // Rouvrir le Combobox
  await user.click(screen.getByTestId('step2-address-commune-trigger'))
  
  // Vérifier que la nouvelle commune est présente IMMÉDIATEMENT
  await waitFor(() => {
    const results = screen.getAllByTestId(/step2-address-commune-result-item/)
    expect(results.length).toBe(2) // Libreville + Nouvelle Ville
    expect(screen.getByText('Nouvelle Ville')).toBeInTheDocument()
  })
})
```

## 🛠️ Helpers de test

```typescript
// Helper pour sélectionner une province
async function selectProvince(user: UserEvent, provinceName: string) {
  await user.click(screen.getByTestId('step2-address-province-trigger'))
  await waitFor(() => {
    expect(screen.getByTestId('step2-address-province-results')).toBeInTheDocument()
  })
  await user.click(screen.getByText(provinceName))
}

// Helper pour créer une commune via modal
async function createCommuneViaModal(
  user: UserEvent, 
  data: { name: string; departmentId: string }
) {
  await user.click(screen.getByTestId('step2-address-commune-add-button'))
  await waitFor(() => {
    expect(screen.getByTestId('step2-address-modal-commune')).toBeVisible()
  })
  
  await user.type(screen.getByLabelText(/nom de la commune/i), data.name)
  await user.selectOptions(screen.getByLabelText(/département/i), data.departmentId)
  await user.click(screen.getByTestId('step2-address-modal-commune-submit-button'))
  
  await waitFor(() => {
    expect(screen.queryByTestId('step2-address-modal-commune')).not.toBeVisible()
  })
  
  // Retourner la commune créée (mock)
  return {
    id: 'commune-new',
    name: data.name,
    departmentId: data.departmentId
  }
}
```

## 📊 Couverture cible

| Métrique | Cible |
|----------|-------|
| Scénarios Optimistic Update | 100% |
| Cas limites | ≥90% |
