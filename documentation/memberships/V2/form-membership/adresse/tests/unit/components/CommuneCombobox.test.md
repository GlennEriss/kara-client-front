# Tests Unitaires - CommuneCombobox

## 📋 Vue d'ensemble

Tests unitaires exhaustifs pour le composant `CommuneCombobox` qui gère la sélection de commune avec dépendance sur la province.

## 🎯 Objectifs

Vérifier que le composant :
1. Affiche correctement les états (vide, chargement, sélectionné, erreur)
2. Charge les communes en fonction de la province sélectionnée
3. Filtre et recherche correctement
4. Gère la sélection et la mise à jour du formulaire
5. Réinitialise les niveaux enfants en cascade

## 📝 Tests à implémenter

### Groupe 1 : États du composant

#### UNIT-COMMUNE-001 : État initial (vide)
**Description** : Vérifier l'affichage initial

```typescript
it('UNIT-COMMUNE-001: devrait afficher l\'état initial vide', () => {
  render(<CommuneCombobox form={form} />, { wrapper })
  
  const trigger = screen.getByTestId('step2-address-commune-trigger')
  expect(trigger).toHaveTextContent('Sélectionnez d\'abord une province...')
  expect(trigger).toBeDisabled()
})
```

#### UNIT-COMMUNE-002 : État verrouillé (province non sélectionnée)
**Description** : Vérifier que le composant est verrouillé sans province

```typescript
it('UNIT-COMMUNE-002: devrait être verrouillé si aucune province n\'est sélectionnée', () => {
  render(<CommuneCombobox form={form} />, { wrapper })
  
  const trigger = screen.getByTestId('step2-address-commune-trigger')
  expect(trigger).toBeDisabled()
  expect(screen.getByTestId('step2-address-commune-locked-message')).toBeInTheDocument()
})
```

#### UNIT-COMMUNE-003 : État chargement
**Description** : Vérifier l'affichage pendant le chargement

```typescript
it('UNIT-COMMUNE-003: devrait afficher l\'état de chargement', async () => {
  // Mock pour simuler le chargement
  vi.mocked(useDepartments).mockReturnValue({
    data: [],
    isLoading: true
  })
  
  render(<CommuneCombobox form={form} provinceId="province-1" />, { wrapper })
  
  const trigger = screen.getByTestId('step2-address-commune-trigger')
  expect(trigger).toHaveTextContent('Chargement...')
  expect(screen.getByTestId('step2-address-commune-loading')).toBeInTheDocument()
})
```

#### UNIT-COMMUNE-004 : État sélectionné
**Description** : Vérifier l'affichage quand une commune est sélectionnée

```typescript
it('UNIT-COMMUNE-004: devrait afficher la commune sélectionnée', async () => {
  form.setValue('address.communeId', 'commune-1')
  
  render(<CommuneCombobox form={form} provinceId="province-1" />, { wrapper })
  
  await waitFor(() => {
    const trigger = screen.getByTestId('step2-address-commune-trigger')
    expect(trigger).toHaveTextContent('Libreville')
    expect(screen.getByTestId('step2-address-commune-selected')).toBeInTheDocument()
  })
})
```

### Groupe 2 : Chargement des données

#### UNIT-COMMUNE-005 : Chargement des communes par département
**Description** : Vérifier que les communes sont chargées pour tous les départements de la province

```typescript
it('UNIT-COMMUNE-005: devrait charger les communes de tous les départements de la province', async () => {
  render(<CommuneCombobox form={form} provinceId="province-1" />, { wrapper })
  
  await waitFor(() => {
    expect(screen.getByTestId('step2-address-commune-results')).toBeInTheDocument()
  })
  
  // Vérifier que les communes de tous les départements sont présentes
  const results = screen.getAllByTestId(/step2-address-commune-result-item/)
  expect(results.length).toBeGreaterThan(0)
})
```

#### UNIT-COMMUNE-006 : Agrégation des communes
**Description** : Vérifier que les communes de plusieurs départements sont agrégées

```typescript
it('UNIT-COMMUNE-006: devrait agréger les communes de plusieurs départements', async () => {
  // Province avec 2 départements, chacun avec des communes
  render(<CommuneCombobox form={form} provinceId="province-1" />, { wrapper })
  
  await waitFor(() => {
    const results = screen.getAllByTestId(/step2-address-commune-result-item/)
    // Devrait contenir les communes des 2 départements
    expect(results.length).toBe(6) // 3 + 3
  })
})
```

### Groupe 3 : Recherche et filtrage

#### UNIT-COMMUNE-007 : Recherche par nom
**Description** : Vérifier que la recherche filtre correctement par nom

```typescript
it('UNIT-COMMUNE-007: devrait filtrer les communes par nom', async () => {
  render(<CommuneCombobox form={form} provinceId="province-1" />, { wrapper })
  
  // Ouvrir le popover
  await userEvent.click(screen.getByTestId('step2-address-commune-trigger'))
  
  // Rechercher
  const searchInput = screen.getByTestId('step2-address-commune-search-input')
  await userEvent.type(searchInput, 'Libre')
  
  await waitFor(() => {
    const results = screen.getAllByTestId(/step2-address-commune-result-item/)
    expect(results.length).toBe(1)
    expect(results[0]).toHaveTextContent('Libreville')
  })
})
```

#### UNIT-COMMUNE-008 : Recherche par code postal
**Description** : Vérifier que la recherche filtre aussi par code postal

```typescript
it('UNIT-COMMUNE-008: devrait filtrer les communes par code postal', async () => {
  render(<CommuneCombobox form={form} provinceId="province-1" />, { wrapper })
  
  await userEvent.click(screen.getByTestId('step2-address-commune-trigger'))
  
  const searchInput = screen.getByTestId('step2-address-commune-search-input')
  await userEvent.type(searchInput, '24100')
  
  await waitFor(() => {
    const results = screen.getAllByTestId(/step2-address-commune-result-item/)
    expect(results[0]).toHaveTextContent('Libreville')
  })
})
```

### Groupe 4 : Sélection et cascade

#### UNIT-COMMUNE-009 : Sélection d'une commune
**Description** : Vérifier que la sélection met à jour le formulaire

```typescript
it('UNIT-COMMUNE-009: devrait mettre à jour le formulaire lors de la sélection', async () => {
  const setValue = vi.fn()
  form.setValue = setValue
  
  render(<CommuneCombobox form={form} provinceId="province-1" />, { wrapper })
  
  await userEvent.click(screen.getByTestId('step2-address-commune-trigger'))
  await userEvent.click(screen.getByText('Libreville'))
  
  await waitFor(() => {
    expect(setValue).toHaveBeenCalledWith('address.communeId', 'commune-1', {
      shouldValidate: true
    })
  })
})
```

#### UNIT-COMMUNE-010 : Réinitialisation des niveaux enfants
**Description** : Vérifier que district et quarter sont réinitialisés

```typescript
it('UNIT-COMMUNE-010: devrait réinitialiser les niveaux enfants lors de la sélection', async () => {
  const setValue = vi.fn()
  form.setValue = setValue
  
  // Pré-remplir district et quarter
  form.setValue('address.districtId', 'district-1')
  form.setValue('address.quarterId', 'quarter-1')
  
  render(<CommuneCombobox form={form} provinceId="province-1" />, { wrapper })
  
  await userEvent.click(screen.getByTestId('step2-address-commune-trigger'))
  await userEvent.click(screen.getByText('Libreville'))
  
  await waitFor(() => {
    expect(setValue).toHaveBeenCalledWith('address.districtId', '', {
      shouldValidate: true
    })
    expect(setValue).toHaveBeenCalledWith('address.quarterId', '', {
      shouldValidate: true
    })
  })
})
```

### Groupe 5 : Bouton d'ajout (Admin)

#### UNIT-COMMUNE-011 : Affichage du bouton d'ajout
**Description** : Vérifier que le bouton est visible pour les admins

```typescript
it('UNIT-COMMUNE-011: devrait afficher le bouton d\'ajout pour les admins', () => {
  render(
    <CommuneCombobox 
      form={form} 
      provinceId="province-1" 
      onAddNew={() => {}}
    />, 
    { wrapper }
  )
  
  expect(screen.getByTestId('step2-address-commune-add-button')).toBeInTheDocument()
})
```

#### UNIT-COMMUNE-012 : Désactivation du bouton sans province
**Description** : Vérifier que le bouton est désactivé sans province

```typescript
it('UNIT-COMMUNE-012: devrait désactiver le bouton d\'ajout sans province', () => {
  render(
    <CommuneCombobox 
      form={form} 
      onAddNew={() => {}}
    />, 
    { wrapper }
  )
  
  const addButton = screen.getByTestId('step2-address-commune-add-button')
  expect(addButton).toBeDisabled()
})
```

## 📊 Couverture cible

| Métrique | Cible |
|----------|-------|
| Lignes | ≥85% |
| Fonctions | ≥90% |
| Branches | ≥80% |
| Statements | ≥85% |
