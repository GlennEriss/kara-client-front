# Test IDs - Step2 Adresse

## 🧪 Vue d'ensemble

Liste complète des `data-testid` pour les tests E2E du composant Step2 Adresse.

## 📋 Structure des Test IDs

### Convention de nommage
- Format : `step2-address-[element]-[state]`
- Exemples :
  - `step2-address-province-combobox`
  - `step2-address-commune-selected`
  - `step2-address-progression-bar`

## 🎯 Test IDs par section

### 1. Header et progression

```tsx
// Header principal
data-testid="step2-address-header"
data-testid="step2-address-title"
data-testid="step2-address-subtitle"

// Barre de progression
data-testid="step2-address-progression-bar"
data-testid="step2-address-progression-province"
data-testid="step2-address-progression-commune"
data-testid="step2-address-progression-district"
data-testid="step2-address-progression-quarter"

// Badges de progression
data-testid="step2-address-progression-province-badge"
data-testid="step2-address-progression-commune-badge"
data-testid="step2-address-progression-district-badge"
data-testid="step2-address-progression-quarter-badge"
```

### 2. Province Combobox

```tsx
// Container
data-testid="step2-address-province-container"

// Label
data-testid="step2-address-province-label"

// Combobox
data-testid="step2-address-province-combobox"
data-testid="step2-address-province-trigger"
data-testid="step2-address-province-popover"

// États
data-testid="step2-address-province-placeholder"
data-testid="step2-address-province-selected"
data-testid="step2-address-province-loading"
data-testid="step2-address-province-error"

// Actions
data-testid="step2-address-province-add-button" // Admin seulement
data-testid="step2-address-province-search-input"

// Résultats
data-testid="step2-address-province-results"
data-testid="step2-address-province-result-item"
data-testid="step2-address-province-no-results"

// Hints
data-testid="step2-address-province-hint"
```

### 3. Commune Combobox

```tsx
// Container
data-testid="step2-address-commune-container"

// Label
data-testid="step2-address-commune-label"

// Combobox
data-testid="step2-address-commune-combobox"
data-testid="step2-address-commune-trigger"
data-testid="step2-address-commune-popover"

// États
data-testid="step2-address-commune-placeholder"
data-testid="step2-address-commune-disabled"
data-testid="step2-address-commune-selected"
data-testid="step2-address-commune-loading"
data-testid="step2-address-commune-error"

// Actions
data-testid="step2-address-commune-add-button" // Admin seulement
data-testid="step2-address-commune-search-input"

// Résultats
data-testid="step2-address-commune-results"
data-testid="step2-address-commune-result-item"
data-testid="step2-address-commune-result-count"
data-testid="step2-address-commune-no-results"

// Hints
data-testid="step2-address-commune-hint"
data-testid="step2-address-commune-locked-message"
```

### 4. District Combobox

```tsx
// Container
data-testid="step2-address-district-container"

// Label
data-testid="step2-address-district-label"

// Combobox
data-testid="step2-address-district-combobox"
data-testid="step2-address-district-trigger"
data-testid="step2-address-district-popover"

// États
data-testid="step2-address-district-placeholder"
data-testid="step2-address-district-disabled"
data-testid="step2-address-district-selected"
data-testid="step2-address-district-loading"
data-testid="step2-address-district-error"

// Actions
data-testid="step2-address-district-add-button" // Admin seulement
data-testid="step2-address-district-search-input"

// Résultats
data-testid="step2-address-district-results"
data-testid="step2-address-district-result-item"
data-testid="step2-address-district-no-results"

// Hints
data-testid="step2-address-district-hint"
data-testid="step2-address-district-locked-message"
```

### 5. Quarter Combobox

```tsx
// Container
data-testid="step2-address-quarter-container"

// Label
data-testid="step2-address-quarter-label"

// Combobox
data-testid="step2-address-quarter-combobox"
data-testid="step2-address-quarter-trigger"
data-testid="step2-address-quarter-popover"

// États
data-testid="step2-address-quarter-placeholder"
data-testid="step2-address-quarter-disabled"
data-testid="step2-address-quarter-selected"
data-testid="step2-address-quarter-loading"
data-testid="step2-address-quarter-error"

// Actions
data-testid="step2-address-quarter-add-button" // Admin seulement
data-testid="step2-address-quarter-search-input"

// Résultats
data-testid="step2-address-quarter-results"
data-testid="step2-address-quarter-result-item"
data-testid="step2-address-quarter-no-results"

// Hints
data-testid="step2-address-quarter-hint"
data-testid="step2-address-quarter-locked-message"
```

### 6. Informations complémentaires

```tsx
// Container
data-testid="step2-address-additional-info-container"

// Label
data-testid="step2-address-additional-info-label"

// Textarea
data-testid="step2-address-additional-info-textarea"

// Placeholder
data-testid="step2-address-additional-info-placeholder"

// Hint
data-testid="step2-address-additional-info-hint"

// Badge optionnel
data-testid="step2-address-additional-info-badge"
```

### 7. Résumé de l'adresse

```tsx
// Container (affiché quand tout est sélectionné)
data-testid="step2-address-summary-container"

// Titre
data-testid="step2-address-summary-title"

// Hiérarchie
data-testid="step2-address-summary-hierarchy"

// Informations complémentaires
data-testid="step2-address-summary-additional-info"

// Message de validation
data-testid="step2-address-summary-validation-message"
```

### 8. Modals (Admin seulement)

```tsx
// Modal Province
data-testid="step2-address-modal-province"
data-testid="step2-address-modal-province-open-button"
data-testid="step2-address-modal-province-close-button"
data-testid="step2-address-modal-province-submit-button"

// Modal Commune
data-testid="step2-address-modal-commune"
data-testid="step2-address-modal-commune-open-button"
data-testid="step2-address-modal-commune-close-button"
data-testid="step2-address-modal-commune-submit-button"

// Modal District
data-testid="step2-address-modal-district"
data-testid="step2-address-modal-district-open-button"
data-testid="step2-address-modal-district-close-button"
data-testid="step2-address-modal-district-submit-button"

// Modal Quarter
data-testid="step2-address-modal-quarter"
data-testid="step2-address-modal-quarter-open-button"
data-testid="step2-address-modal-quarter-close-button"
data-testid="step2-address-modal-quarter-submit-button"
```

## 📝 Exemples d'utilisation dans les tests

### Test : Sélectionner une province

```typescript
// 1. Vérifier que le Combobox est visible
await expect(page.getByTestId('step2-address-province-combobox')).toBeVisible()

// 2. Cliquer sur le trigger
await page.getByTestId('step2-address-province-trigger').click()

// 3. Rechercher une province
await page.getByTestId('step2-address-province-search-input').fill('Estuaire')

// 4. Sélectionner le premier résultat
await page.getByTestId('step2-address-province-result-item').first().click()

// 5. Vérifier que la province est sélectionnée
await expect(page.getByTestId('step2-address-province-selected')).toContainText('Estuaire')

// 6. Vérifier que le badge de progression est mis à jour
await expect(page.getByTestId('step2-address-progression-province-badge')).toHaveClass(/success/)
```

### Test : Cascade de sélection

```typescript
// 1. Sélectionner une province
await selectProvince('Estuaire')

// 2. Vérifier que la commune est déverrouillée
await expect(page.getByTestId('step2-address-commune-combobox')).not.toBeDisabled()

// 3. Sélectionner une commune
await selectCommune('Libreville')

// 4. Vérifier que le district est déverrouillé
await expect(page.getByTestId('step2-address-district-combobox')).not.toBeDisabled()

// 5. Vérifier que les niveaux précédents sont verrouillés
await expect(page.getByTestId('step2-address-quarter-combobox')).toBeDisabled()
```

### Test : Création d'une commune (Admin)

```typescript
// 1. Vérifier que le bouton d'ajout est visible (admin)
await expect(page.getByTestId('step2-address-commune-add-button')).toBeVisible()

// 2. Cliquer sur le bouton d'ajout
await page.getByTestId('step2-address-commune-add-button').click()

// 3. Vérifier que le modal s'ouvre
await expect(page.getByTestId('step2-address-modal-commune')).toBeVisible()

// 4. Remplir le formulaire
await page.fill('[name="name"]', 'Nouvelle Ville')
await page.selectOption('[name="departmentId"]', 'dept-id')

// 5. Soumettre
await page.getByTestId('step2-address-modal-commune-submit-button').click()

// 6. Vérifier que la commune est sélectionnée
await expect(page.getByTestId('step2-address-commune-selected')).toContainText('Nouvelle Ville')
```

### Test : Validation complète

```typescript
// 1. Sélectionner tous les niveaux
await selectProvince('Estuaire')
await selectCommune('Libreville')
await selectDistrict('Akanda')
await selectQuarter('Akanda Centre')

// 2. Vérifier que le résumé apparaît
await expect(page.getByTestId('step2-address-summary-container')).toBeVisible()

// 3. Vérifier la hiérarchie
await expect(page.getByTestId('step2-address-summary-hierarchy')).toContainText('Estuaire > Libreville > Akanda > Akanda Centre')

// 4. Vérifier le message de validation
await expect(page.getByTestId('step2-address-summary-validation-message')).toContainText('Adresse complète')
```

## 🎯 Bonnes pratiques

1. **Nommage cohérent** : Utiliser le préfixe `step2-address-` pour tous les IDs
2. **Hiérarchie claire** : `[section]-[element]-[state]`
3. **États explicites** : Séparer les IDs par état (selected, loading, error)
4. **Accessibilité** : Les IDs doivent correspondre aux labels ARIA
5. **Maintenance** : Documenter chaque ID dans ce fichier

## 📚 Références

- [Documentation principale](../README.md)
- [Wireframes](./wireframe-etat-initial.md)
- [Tests E2E](../../../../tests/)
