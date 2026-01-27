# Tests Unitaires - Combobox Communs (Province, District, Quarter)

## 📋 Vue d'ensemble

Tests communs pour les Combobox qui suivent le même pattern que `CommuneCombobox` :
- `ProvinceCombobox` : Pas de dépendance parent
- `DistrictCombobox` : Dépend de la commune
- `QuarterCombobox` : Dépend du district

## 🎯 Pattern commun

Toutes les Combobox partagent :
1. États : vide, chargement, sélectionné, erreur, verrouillé
2. Recherche et filtrage
3. Sélection et mise à jour du formulaire
4. Réinitialisation des niveaux enfants
5. Bouton d'ajout (admin)

## 📝 Tests à implémenter

### ProvinceCombobox

#### UNIT-PROV-001 : Sélection sans dépendance
**Description** : Province n'a pas de dépendance parent, doit être toujours activée

```typescript
it('UNIT-PROV-001: devrait être toujours activée (pas de dépendance parent)', () => {
  render(<ProvinceCombobox form={form} />, { wrapper })
  
  const trigger = screen.getByTestId('step2-address-province-trigger')
  expect(trigger).not.toBeDisabled()
})
```

#### UNIT-PROV-002 : Réinitialisation en cascade
**Description** : Sélectionner une province doit réinitialiser commune, district, quarter

```typescript
it('UNIT-PROV-002: devrait réinitialiser tous les niveaux enfants', async () => {
  const setValue = vi.fn()
  form.setValue = setValue
  
  // Pré-remplir les niveaux enfants
  form.setValue('address.communeId', 'commune-1')
  form.setValue('address.districtId', 'district-1')
  form.setValue('address.quarterId', 'quarter-1')
  
  render(<ProvinceCombobox form={form} />, { wrapper })
  
  await userEvent.click(screen.getByTestId('step2-address-province-trigger'))
  await userEvent.click(screen.getByText('Estuaire'))
  
  await waitFor(() => {
    expect(setValue).toHaveBeenCalledWith('address.communeId', '', {
      shouldValidate: true
    })
    expect(setValue).toHaveBeenCalledWith('address.districtId', '', {
      shouldValidate: true
    })
    expect(setValue).toHaveBeenCalledWith('address.quarterId', '', {
      shouldValidate: true
    })
  })
})
```

### DistrictCombobox

#### UNIT-DIST-001 : Dépendance de la commune
**Description** : District doit être verrouillé sans commune

```typescript
it('UNIT-DIST-001: devrait être verrouillé sans commune sélectionnée', () => {
  render(<DistrictCombobox form={form} />, { wrapper })
  
  const trigger = screen.getByTestId('step2-address-district-trigger')
  expect(trigger).toBeDisabled()
  expect(screen.getByTestId('step2-address-district-locked-message')).toBeInTheDocument()
})
```

#### UNIT-DIST-002 : Chargement des districts par commune
**Description** : Vérifier que les districts sont chargés pour la commune sélectionnée

```typescript
it('UNIT-DIST-002: devrait charger les districts de la commune sélectionnée', async () => {
  form.setValue('address.communeId', 'commune-1')
  
  render(<DistrictCombobox form={form} communeId="commune-1" />, { wrapper })
  
  await waitFor(() => {
    expect(screen.getByTestId('step2-address-district-trigger')).not.toBeDisabled()
  })
  
  await userEvent.click(screen.getByTestId('step2-address-district-trigger'))
  
  await waitFor(() => {
    const results = screen.getAllByTestId(/step2-address-district-result-item/)
    expect(results.length).toBeGreaterThan(0)
  })
})
```

### QuarterCombobox

#### UNIT-QUARTER-001 : Dépendance du district
**Description** : Quarter doit être verrouillé sans district

```typescript
it('UNIT-QUARTER-001: devrait être verrouillé sans district sélectionné', () => {
  render(<QuarterCombobox form={form} />, { wrapper })
  
  const trigger = screen.getByTestId('step2-address-quarter-trigger')
  expect(trigger).toBeDisabled()
  expect(screen.getByTestId('step2-address-quarter-locked-message')).toBeInTheDocument()
})
```

#### UNIT-QUARTER-002 : Chargement des quarters par district
**Description** : Vérifier que les quarters sont chargés pour le district sélectionné

```typescript
it('UNIT-QUARTER-002: devrait charger les quarters du district sélectionné', async () => {
  form.setValue('address.districtId', 'district-1')
  
  render(<QuarterCombobox form={form} districtId="district-1" />, { wrapper })
  
  await waitFor(() => {
    expect(screen.getByTestId('step2-address-quarter-trigger')).not.toBeDisabled()
  })
  
  await userEvent.click(screen.getByTestId('step2-address-quarter-trigger'))
  
  await waitFor(() => {
    const results = screen.getAllByTestId(/step2-address-quarter-result-item/)
    expect(results.length).toBeGreaterThan(0)
  })
})
```

## 📊 Couverture cible

| Métrique | Cible |
|----------|-------|
| Lignes | ≥85% |
| Fonctions | ≥90% |
| Branches | ≥80% |
| Statements | ≥85% |

## ✅ Checklist

### ProvinceCombobox
- [ ] UNIT-PROV-001 : Sélection sans dépendance
- [ ] UNIT-PROV-002 : Réinitialisation en cascade
- [ ] Tests de recherche et sélection (similaires à CommuneCombobox)

### DistrictCombobox
- [ ] UNIT-DIST-001 : Dépendance de la commune
- [ ] UNIT-DIST-002 : Chargement des districts
- [ ] Tests de recherche et sélection (similaires à CommuneCombobox)

### QuarterCombobox
- [ ] UNIT-QUARTER-001 : Dépendance du district
- [ ] UNIT-QUARTER-002 : Chargement des quarters
- [ ] Tests de recherche et sélection (similaires à CommuneCombobox)
