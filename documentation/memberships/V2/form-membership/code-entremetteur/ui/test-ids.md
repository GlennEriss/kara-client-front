# IDs de Tests E2E – Code Entremetteur

## 1. Vue d'ensemble

Ce document liste tous les `data-testid` utilisés dans le composant `IntermediaryCodeSearch` et leur utilisation dans les tests E2E Playwright.

## 2. Structure des IDs

### Convention de nommage

```
intermediary-code-search-{element}-{state?}
```

**Exemples** :
- `intermediary-code-search-input` : Champ de recherche principal
- `intermediary-code-search-results` : Liste déroulante des résultats
- `intermediary-code-search-option-{matricule}` : Option individuelle dans la liste

## 3. Liste complète des IDs

### 3.1 Conteneur principal

| ID | Élément | Description | Usage dans tests |
|----|---------|-------------|------------------|
| `intermediary-code-search-container` | `<div>` | Conteneur principal du composant | Vérifier la présence du composant |

**Exemple d'utilisation** :
```typescript
// Test E2E
await expect(page.getByTestId('intermediary-code-search-container')).toBeVisible()
```

### 3.2 Champ de recherche

| ID | Élément | Description | Usage dans tests |
|----|---------|-------------|------------------|
| `intermediary-code-search-input` | `<input>` | Champ de saisie principal | Taper la recherche, vérifier la valeur |

**Exemple d'utilisation** :
```typescript
// Test E2E - Recherche
const input = page.getByTestId('intermediary-code-search-input')
await input.fill('Jean')
await expect(input).toHaveValue('Jean')
```

### 3.3 Icône de recherche

| ID | Élément | Description | Usage dans tests |
|----|---------|-------------|------------------|
| `intermediary-code-search-icon` | `<svg>` | Icône de recherche (Hash) | Vérifier la présence de l'icône |

**Exemple d'utilisation** :
```typescript
// Test E2E - Vérification visuelle
await expect(page.getByTestId('intermediary-code-search-icon')).toBeVisible()
```

### 3.4 Liste déroulante (Popover)

| ID | Élément | Description | Usage dans tests |
|----|---------|-------------|------------------|
| `intermediary-code-search-results` | `<div>` | Conteneur de la liste déroulante | Vérifier l'affichage des résultats |

**Exemple d'utilisation** :
```typescript
// Test E2E - Attendre les résultats
await expect(page.getByTestId('intermediary-code-search-results')).toBeVisible()
```

### 3.5 Options de résultats

| ID | Élément | Description | Usage dans tests |
|----|---------|-------------|------------------|
| `intermediary-code-search-option-{matricule}` | `<div>` | Option individuelle dans la liste | Cliquer sur un résultat spécifique |

**Format** : `intermediary-code-search-option-1228.MK.0058`

**Exemple d'utilisation** :
```typescript
// Test E2E - Sélection d'un résultat
const option = page.getByTestId('intermediary-code-search-option-1228.MK.0058')
await option.click()
```

### 3.6 État de chargement

| ID | Élément | Description | Usage dans tests |
|----|---------|-------------|------------------|
| `intermediary-code-search-loading` | `<div>` | Indicateur de chargement | Vérifier l'état de chargement |

**Exemple d'utilisation** :
```typescript
// Test E2E - Vérifier le chargement
await expect(page.getByTestId('intermediary-code-search-loading')).toBeVisible()
// Attendre la fin du chargement
await expect(page.getByTestId('intermediary-code-search-loading')).not.toBeVisible()
```

### 3.7 État vide (aucun résultat)

| ID | Élément | Description | Usage dans tests |
|----|---------|-------------|------------------|
| `intermediary-code-search-empty` | `<div>` | Message "Aucun résultat" | Vérifier qu'aucun résultat n'est trouvé |

**Exemple d'utilisation** :
```typescript
// Test E2E - Recherche sans résultat
await input.fill('XXXXXXX')
await expect(page.getByTestId('intermediary-code-search-empty')).toBeVisible()
await expect(page.getByTestId('intermediary-code-search-empty')).toContainText('Aucun résultat')
```

### 3.8 Message hint

| ID | Élément | Description | Usage dans tests |
|----|---------|-------------|------------------|
| `intermediary-code-search-hint` | `<p>` | Message d'aide ("Tapez au moins 2 caractères") | Vérifier l'affichage du hint |

**Exemple d'utilisation** :
```typescript
// Test E2E - Vérifier le hint initial
await expect(page.getByTestId('intermediary-code-search-hint')).toBeVisible()
await expect(page.getByTestId('intermediary-code-search-hint')).toContainText('Tapez au moins 2 caractères')
```

### 3.9 État validé

| ID | Élément | Description | Usage dans tests |
|----|---------|-------------|------------------|
| `intermediary-code-search-validated` | `<div>` | Conteneur avec validation visuelle | Vérifier qu'un membre est sélectionné |

**Exemple d'utilisation** :
```typescript
// Test E2E - Vérifier la validation
await option.click()
await expect(page.getByTestId('intermediary-code-search-validated')).toBeVisible()
```

### 3.10 Icône de validation

| ID | Élément | Description | Usage dans tests |
|----|---------|-------------|------------------|
| `intermediary-code-search-check-icon` | `<svg>` | Icône de validation (CheckCircle) | Vérifier l'affichage de la validation |

**Exemple d'utilisation** :
```typescript
// Test E2E - Vérifier l'icône de validation
await expect(page.getByTestId('intermediary-code-search-check-icon')).toBeVisible()
```

### 3.11 Message d'erreur

| ID | Élément | Description | Usage dans tests |
|----|---------|-------------|------------------|
| `intermediary-code-search-error` | `<div>` | Message d'erreur | Vérifier l'affichage des erreurs |

**Exemple d'utilisation** :
```typescript
// Test E2E - Vérifier l'erreur
await expect(page.getByTestId('intermediary-code-search-error')).toBeVisible()
await expect(page.getByTestId('intermediary-code-search-error')).toContainText('Format requis')
```

### 3.12 Bouton de fermeture (optionnel)

| ID | Élément | Description | Usage dans tests |
|----|---------|-------------|------------------|
| `intermediary-code-search-clear` | `<button>` | Bouton pour effacer la sélection | Tester la réinitialisation |

**Exemple d'utilisation** :
```typescript
// Test E2E - Effacer la sélection
await page.getByTestId('intermediary-code-search-clear').click()
await expect(input).toHaveValue('')
```

## 4. Mapping avec les tests E2E

### 4.1 Scénario : Recherche et sélection

```typescript
// e2e/intermediary-code-search.spec.ts

test('E2E-ICS-01: recherche et sélection d\'un membre', async ({ page }) => {
  // 1. Vérifier la présence du composant
  await expect(page.getByTestId('intermediary-code-search-container')).toBeVisible()
  
  // 2. Vérifier le hint initial
  await expect(page.getByTestId('intermediary-code-search-hint')).toBeVisible()
  
  // 3. Taper dans le champ
  const input = page.getByTestId('intermediary-code-search-input')
  await input.fill('Jean')
  
  // 4. Attendre les résultats (vérifier que le loading disparaît)
  await expect(page.getByTestId('intermediary-code-search-loading')).not.toBeVisible()
  await expect(page.getByTestId('intermediary-code-search-results')).toBeVisible()
  
  // 5. Sélectionner un résultat
  const option = page.getByTestId('intermediary-code-search-option-1228.MK.0058')
  await option.click()
  
  // 6. Vérifier la validation
  await expect(page.getByTestId('intermediary-code-search-validated')).toBeVisible()
  await expect(page.getByTestId('intermediary-code-search-check-icon')).toBeVisible()
  await expect(input).toHaveValue('1228.MK.0058')
})
```

### 4.2 Scénario : Recherche sans résultat

```typescript
test('E2E-ICS-02: recherche sans résultat', async ({ page }) => {
  const input = page.getByTestId('intermediary-code-search-input')
  await input.fill('XXXXXXX')
  
  // Attendre le message "Aucun résultat"
  await expect(page.getByTestId('intermediary-code-search-empty')).toBeVisible()
  await expect(page.getByTestId('intermediary-code-search-empty')).toContainText('Aucun résultat')
})
```

### 4.3 Scénario : Validation du format

```typescript
test('E2E-ICS-03: validation du format', async ({ page }) => {
  const input = page.getByTestId('intermediary-code-search-input')
  
  // Saisir un format invalide manuellement
  await input.fill('1234.ABC.5678')
  
  // Essayer de valider (cliquer ailleurs ou soumettre)
  await input.blur()
  
  // Vérifier l'erreur
  await expect(page.getByTestId('intermediary-code-search-error')).toBeVisible()
  await expect(page.getByTestId('intermediary-code-search-error')).toContainText('Format requis')
})
```

### 4.4 Scénario : Effacement de la sélection

```typescript
test('E2E-ICS-04: effacement de la sélection', async ({ page }) => {
  // Sélectionner d'abord un membre
  const input = page.getByTestId('intermediary-code-search-input')
  await input.fill('Jean')
  await page.getByTestId('intermediary-code-search-option-1228.MK.0058').click()
  
  // Vérifier la sélection
  await expect(input).toHaveValue('1228.MK.0058')
  
  // Effacer
  await page.getByTestId('intermediary-code-search-clear').click()
  
  // Vérifier que c'est vide
  await expect(input).toHaveValue('')
  await expect(page.getByTestId('intermediary-code-search-validated')).not.toBeVisible()
})
```

## 5. Tableau récapitulatif

| ID | Élément | Visible quand | Utilisé dans test |
|----|---------|---------------|-------------------|
| `intermediary-code-search-container` | Conteneur | Toujours | E2E-ICS-01 |
| `intermediary-code-search-input` | Input | Toujours | Tous les tests |
| `intermediary-code-search-icon` | Icône | Toujours | E2E-ICS-01 |
| `intermediary-code-search-hint` | Hint | État initial | E2E-ICS-01 |
| `intermediary-code-search-results` | Liste | Recherche active | E2E-ICS-01, E2E-ICS-02 |
| `intermediary-code-search-loading` | Loading | Recherche en cours | E2E-ICS-01 |
| `intermediary-code-search-empty` | Message vide | Aucun résultat | E2E-ICS-02 |
| `intermediary-code-search-option-{matricule}` | Option | Résultats affichés | E2E-ICS-01, E2E-ICS-04 |
| `intermediary-code-search-validated` | Validation | Membre sélectionné | E2E-ICS-01, E2E-ICS-04 |
| `intermediary-code-search-check-icon` | Icône check | Membre sélectionné | E2E-ICS-01 |
| `intermediary-code-search-error` | Erreur | Format invalide | E2E-ICS-03 |
| `intermediary-code-search-clear` | Bouton clear | Membre sélectionné | E2E-ICS-04 |

## 6. Implémentation dans le composant

### 6.1 Exemple de code

```tsx
// IntermediaryCodeSearch.tsx

<div data-testid="intermediary-code-search-container" className="space-y-2">
  <Label>
    <Hash 
      data-testid="intermediary-code-search-icon"
      className="w-4 h-4"
    />
    Qui vous a référé? *
  </Label>
  
  <Input
    data-testid="intermediary-code-search-input"
    value={query}
    onChange={handleChange}
    placeholder="Rechercher par nom ou prénom..."
  />
  
  {query.length < 2 && (
    <p data-testid="intermediary-code-search-hint" className="text-xs text-gray-400">
      Tapez au moins 2 caractères
    </p>
  )}
  
  {isLoading && (
    <div data-testid="intermediary-code-search-loading">
      <Loader2 className="animate-spin" />
    </div>
  )}
  
  {results.length > 0 && (
    <div data-testid="intermediary-code-search-results">
      {results.map((member) => (
        <div
          key={member.matricule}
          data-testid={`intermediary-code-search-option-${member.matricule}`}
          onClick={() => handleSelect(member)}
        >
          {member.displayName} ({member.matricule})
        </div>
      ))}
    </div>
  )}
  
  {results.length === 0 && query.length >= 2 && !isLoading && (
    <div data-testid="intermediary-code-search-empty">
      Aucun résultat pour "{query}"
    </div>
  )}
  
  {isValidated && (
    <div data-testid="intermediary-code-search-validated">
      <CheckCircle data-testid="intermediary-code-search-check-icon" />
    </div>
  )}
  
  {error && (
    <div data-testid="intermediary-code-search-error">
      {error.message}
    </div>
  )}
</div>
```

## 7. Notes importantes

### 7.1 Format du matricule dans l'ID

Le matricule dans l'ID doit être **sans espaces** et **sans caractères spéciaux** qui pourraient poser problème dans les sélecteurs CSS :

```typescript
// ✅ Bon
data-testid="intermediary-code-search-option-1228.MK.0058"

// ❌ Mauvais (espaces)
data-testid="intermediary-code-search-option-1228. MK. 0058"
```

### 7.2 Sélecteurs Playwright

Playwright peut utiliser les `data-testid` directement :

```typescript
// Méthode recommandée
page.getByTestId('intermediary-code-search-input')

// Alternative avec sélecteur CSS
page.locator('[data-testid="intermediary-code-search-input"]')
```

### 7.3 Tests d'accessibilité

Les IDs peuvent aussi être utilisés pour les tests d'accessibilité :

```typescript
// Vérifier les attributs ARIA
const input = page.getByTestId('intermediary-code-search-input')
await expect(input).toHaveAttribute('role', 'combobox')
await expect(input).toHaveAttribute('aria-expanded', 'true')
```
