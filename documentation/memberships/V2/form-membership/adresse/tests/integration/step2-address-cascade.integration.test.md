# Tests d'Intégration - Cascade Complète (Step2 Adresse)

## 📋 Vue d'ensemble

Tests d'intégration pour vérifier que la cascade Province → Commune → District → Quarter fonctionne correctement dans le composant Step2 complet.

## 🎯 Objectifs

Vérifier que :
1. La cascade complète fonctionne de bout en bout
2. Les Combobox se déverrouillent correctement
3. Les données sont chargées en cascade
4. Les champs texte sont mis à jour automatiquement
5. Les réinitialisations en cascade fonctionnent

## 📝 Tests à implémenter

### INT-CASCADE-001 : Cascade complète de sélection
**Description** : Sélectionner tous les niveaux dans l'ordre

```typescript
it('INT-CASCADE-001: devrait permettre la sélection complète de la cascade', async () => {
  const user = userEvent.setup()
  
  render(<Step2 form={form} />, { wrapper })
  
  // 1. Sélectionner une province
  await user.click(screen.getByTestId('step2-address-province-trigger'))
  await waitFor(() => {
    expect(screen.getByTestId('step2-address-province-results')).toBeInTheDocument()
  })
  await user.click(screen.getByText('Estuaire'))
  
  await waitFor(() => {
    expect(form.getValues('address.provinceId')).toBe('province-1')
    expect(form.getValues('address.province')).toBe('Estuaire')
  })
  
  // 2. Vérifier que la commune est déverrouillée
  const communeCombobox = screen.getByTestId('step2-address-commune-trigger')
  await waitFor(() => {
    expect(communeCombobox).not.toBeDisabled()
  })
  
  // 3. Sélectionner une commune
  await user.click(communeCombobox)
  await waitFor(() => {
    expect(screen.getByTestId('step2-address-commune-results')).toBeInTheDocument()
  })
  await user.click(screen.getByText('Libreville'))
  
  await waitFor(() => {
    expect(form.getValues('address.communeId')).toBe('commune-1')
    expect(form.getValues('address.city')).toBe('Libreville')
  })
  
  // 4. Vérifier que le district est déverrouillé
  const districtCombobox = screen.getByTestId('step2-address-district-trigger')
  await waitFor(() => {
    expect(districtCombobox).not.toBeDisabled()
  })
  
  // 5. Sélectionner un district
  await user.click(districtCombobox)
  await waitFor(() => {
    expect(screen.getByTestId('step2-address-district-results')).toBeInTheDocument()
  })
  await user.click(screen.getByText('Akanda'))
  
  await waitFor(() => {
    expect(form.getValues('address.districtId')).toBe('district-1')
    expect(form.getValues('address.arrondissement')).toBe('Akanda')
  })
  
  // 6. Vérifier que le quarter est déverrouillé
  const quarterCombobox = screen.getByTestId('step2-address-quarter-trigger')
  await waitFor(() => {
    expect(quarterCombobox).not.toBeDisabled()
  })
  
  // 7. Sélectionner un quarter
  await user.click(quarterCombobox)
  await waitFor(() => {
    expect(screen.getByTestId('step2-address-quarter-results')).toBeInTheDocument()
  })
  await user.click(screen.getByText('Akanda Centre'))
  
  await waitFor(() => {
    expect(form.getValues('address.quarterId')).toBe('quarter-1')
    expect(form.getValues('address.district')).toBe('Akanda Centre')
  })
  
  // 8. Vérifier que le résumé apparaît
  await waitFor(() => {
    expect(screen.getByTestId('step2-address-summary-container')).toBeInTheDocument()
  })
})
```

### INT-CASCADE-002 : Réinitialisation en cascade
**Description** : Changer la province doit réinitialiser tous les niveaux enfants

```typescript
it('INT-CASCADE-002: devrait réinitialiser tous les niveaux enfants quand la province change', async () => {
  const user = userEvent.setup()
  
  // Sélectionner toute la cascade
  await selectFullCascade(user, form)
  
  // Changer la province
  await user.click(screen.getByTestId('step2-address-province-trigger'))
  await user.click(screen.getByText('Haut-Ogooué'))
  
  await waitFor(() => {
    // Vérifier que tous les niveaux enfants sont réinitialisés
    expect(form.getValues('address.communeId')).toBe('')
    expect(form.getValues('address.districtId')).toBe('')
    expect(form.getValues('address.quarterId')).toBe('')
    expect(form.getValues('address.city')).toBe('')
    expect(form.getValues('address.arrondissement')).toBe('')
    expect(form.getValues('address.district')).toBe('')
  })
  
  // Vérifier que les Combobox sont verrouillées
  expect(screen.getByTestId('step2-address-commune-trigger')).toBeDisabled()
  expect(screen.getByTestId('step2-address-district-trigger')).toBeDisabled()
  expect(screen.getByTestId('step2-address-quarter-trigger')).toBeDisabled()
})
```

### INT-CASCADE-003 : Chargement des données en cascade
**Description** : Vérifier que les données sont chargées dans le bon ordre

```typescript
it('INT-CASCADE-003: devrait charger les données dans le bon ordre de cascade', async () => {
  const loadOrder: string[] = []
  
  // Mock pour tracker l'ordre de chargement
  vi.mocked(useProvinces).mockImplementation(() => {
    loadOrder.push('provinces')
    return { data: mockProvinces, isLoading: false }
  })
  
  vi.mocked(useDepartments).mockImplementation((provinceId) => {
    if (provinceId) {
      loadOrder.push('departments')
    }
    return { data: mockDepartments, isLoading: false }
  })
  
  render(<Step2 form={form} />, { wrapper })
  
  // Sélectionner une province
  await userEvent.click(screen.getByTestId('step2-address-province-trigger'))
  await userEvent.click(screen.getByText('Estuaire'))
  
  await waitFor(() => {
    // Vérifier l'ordre de chargement
    expect(loadOrder).toEqual(['provinces', 'departments'])
  })
})
```

## 📊 Couverture cible

| Métrique | Cible |
|----------|-------|
| Scénarios | 100% |
| Cas limites | ≥90% |
