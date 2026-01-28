# Tests d'Intégration - Création d'Entités (Step2 Adresse)

## 📋 Vue d'ensemble

Tests d'intégration pour vérifier que la création d'entités géographiques (Province, Commune, District, Quarter) fonctionne correctement dans le contexte complet de Step2.

## 🎯 Objectifs

Vérifier que :
1. Les modals de création s'ouvrent et se ferment correctement
2. La création d'entités met à jour le cache et le formulaire
3. Les nouvelles entités sont sélectionnées automatiquement
4. Les erreurs de création sont gérées correctement
5. Les validations fonctionnent (département requis, etc.)

## 📝 Tests à implémenter

### INT-CREATE-001 : Création d'une province
**Description** : Vérifier que la création d'une province fonctionne

```typescript
it('INT-CREATE-001: devrait créer une province et la sélectionner automatiquement', async () => {
  const user = userEvent.setup()
  const queryClient = new QueryClient()
  
  render(
    <QueryClientProvider client={queryClient}>
      <Step2 form={form} />
    </QueryClientProvider>
  )
  
  // Ouvrir le modal
  await user.click(screen.getByTestId('step2-address-province-add-button'))
  await waitFor(() => {
    expect(screen.getByTestId('step2-address-modal-province')).toBeVisible()
  })
  
  // Remplir le formulaire
  await user.type(screen.getByLabelText(/nom de la province/i), 'Nouvelle Province')
  await user.type(screen.getByLabelText(/code/i), 'NPROV')
  
  // Soumettre
  await user.click(screen.getByTestId('step2-address-modal-province-submit-button'))
  
  // Vérifier que le modal se ferme
  await waitFor(() => {
    expect(screen.queryByTestId('step2-address-modal-province')).not.toBeVisible()
  })
  
  // Vérifier que la province est sélectionnée
  await waitFor(() => {
    expect(form.getValues('address.provinceId')).toBeTruthy()
    expect(form.getValues('address.province')).toBe('Nouvelle Province')
  })
  
  // Vérifier le toast
  expect(toast.success).toHaveBeenCalledWith(
    expect.stringContaining('Nouvelle Province')
  )
})
```

### INT-CREATE-002 : Création d'une commune avec contexte
**Description** : Vérifier que la création d'une commune utilise le contexte de la province

```typescript
it('INT-CREATE-002: devrait créer une commune dans le contexte de la province sélectionnée', async () => {
  const user = userEvent.setup()
  const queryClient = new QueryClient()
  
  render(
    <QueryClientProvider client={queryClient}>
      <Step2 form={form} />
    </QueryClientProvider>
  )
  
  // Sélectionner une province
  await selectProvince(user, 'Estuaire')
  
  // Ouvrir le modal de création de commune
  await user.click(screen.getByTestId('step2-address-commune-add-button'))
  
  // Vérifier que le modal reçoit le provinceId
  await waitFor(() => {
    const modal = screen.getByTestId('step2-address-modal-commune')
    expect(modal).toBeVisible()
  })
  
  // Remplir le formulaire
  await user.type(screen.getByLabelText(/nom de la commune/i), 'Nouvelle Ville')
  await user.selectOptions(screen.getByLabelText(/département/i), 'dept-1')
  await user.type(screen.getByLabelText(/code postal/i), '24100')
  
  // Soumettre
  await user.click(screen.getByTestId('step2-address-modal-commune-submit-button'))
  
  // Vérifier que la commune est créée et sélectionnée
  await waitFor(() => {
    expect(form.getValues('address.communeId')).toBeTruthy()
    expect(form.getValues('address.city')).toBe('Nouvelle Ville')
  })
  
  // Vérifier que le cache est mis à jour
  const cachedData = queryClient.getQueryData<Commune[]>(['communes', 'dept-1'])
  expect(cachedData?.some(c => c.name === 'Nouvelle Ville')).toBe(true)
})
```

### INT-CREATE-003 : Validation du formulaire de création
**Description** : Vérifier que les validations fonctionnent dans les modals

```typescript
it('INT-CREATE-003: devrait valider le formulaire de création de commune', async () => {
  const user = userEvent.setup()
  
  render(<Step2 form={form} />, { wrapper })
  
  await selectProvince(user, 'Estuaire')
  await user.click(screen.getByTestId('step2-address-commune-add-button'))
  
  // Essayer de soumettre sans remplir
  await user.click(screen.getByTestId('step2-address-modal-commune-submit-button'))
  
  // Vérifier les erreurs de validation
  await waitFor(() => {
    expect(screen.getByText(/nom.*requis/i)).toBeInTheDocument()
    expect(screen.getByText(/département.*requis/i)).toBeInTheDocument()
  })
  
  // Le bouton submit devrait être désactivé
  expect(screen.getByTestId('step2-address-modal-commune-submit-button')).toBeDisabled()
})
```

### INT-CREATE-004 : Gestion des erreurs de création
**Description** : Vérifier que les erreurs sont gérées correctement

```typescript
it('INT-CREATE-004: devrait gérer les erreurs lors de la création', async () => {
  const user = userEvent.setup()
  
  // Mock pour simuler une erreur
  vi.mocked(useCommuneMutations).mockReturnValue({
    create: {
      mutateAsync: vi.fn().mockRejectedValue(new Error('Erreur de création'))
    }
  } as any)
  
  render(<Step2 form={form} />, { wrapper })
  
  await selectProvince(user, 'Estuaire')
  await user.click(screen.getByTestId('step2-address-commune-add-button'))
  
  // Remplir et soumettre
  await user.type(screen.getByLabelText(/nom de la commune/i), 'Nouvelle Ville')
  await user.selectOptions(screen.getByLabelText(/département/i), 'dept-1')
  await user.click(screen.getByTestId('step2-address-modal-commune-submit-button'))
  
  // Vérifier que l'erreur est affichée
  await waitFor(() => {
    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining('Erreur')
    )
  })
  
  // Le modal ne devrait pas se fermer
  expect(screen.getByTestId('step2-address-modal-commune')).toBeVisible()
})
```

### INT-CREATE-005 : Création en cascade (département puis commune)
**Description** : Vérifier que l'on peut créer un département puis une commune dans le même flux

```typescript
it('INT-CREATE-005: devrait permettre la création en cascade (département puis commune)', async () => {
  const user = userEvent.setup()
  
  render(<Step2 form={form} />, { wrapper })
  
  await selectProvince(user, 'Estuaire')
  
  // Ouvrir le modal de création de commune
  await user.click(screen.getByTestId('step2-address-commune-add-button'))
  
  // Dans le modal, ouvrir le modal de création de département
  await user.click(screen.getByTestId('step2-address-modal-commune-add-department-button'))
  
  // Créer un département
  await user.type(screen.getByLabelText(/nom du département/i), 'Nouveau Département')
  await user.click(screen.getByTestId('step2-address-modal-department-submit-button'))
  
  // Vérifier que le département est sélectionné dans le formulaire de commune
  await waitFor(() => {
    const deptSelect = screen.getByLabelText(/département/i)
    expect(deptSelect).toHaveValue('dept-new')
  })
  
  // Créer la commune
  await user.type(screen.getByLabelText(/nom de la commune/i), 'Nouvelle Ville')
  await user.click(screen.getByTestId('step2-address-modal-commune-submit-button'))
  
  // Vérifier que la commune est créée et sélectionnée
  await waitFor(() => {
    expect(form.getValues('address.communeId')).toBeTruthy()
  })
})
```

## 📊 Couverture cible

| Métrique | Cible |
|----------|-------|
| Scénarios de création | 100% |
| Cas limites | ≥90% |
