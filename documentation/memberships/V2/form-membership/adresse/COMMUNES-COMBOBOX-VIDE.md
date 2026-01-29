# Problème : Combobox Communes (Ville) vide à l'ouverture

## 📋 Symptôme

Quand l'utilisateur sélectionne une province (ex. **ESTUAIRE**), le combobox **Ville** (communes) reste **vide** à l'ouverture. L'utilisateur doit obligatoirement taper au moins 2 caractères dans la recherche pour voir des communes s'afficher.

**Comportement actuel :**
1. ✅ Province "ESTUAIRE" sélectionnée
2. ❌ Combobox Ville ouverte → **vide** (message "Tapez au moins 2 caractères pour rechercher...")
3. ✅ L'utilisateur tape "Lib" → les communes s'affichent
4. ❌ **Problème UX** : L'utilisateur ne peut pas parcourir la liste des communes de la province sans faire une recherche

## 🔍 Cause racine

Le `CommuneCombobox` utilise une stratégie **"recherche uniquement"** (voir [CACHE-ET-CAS-CRITIQUES.md](./CACHE-ET-CAS-CRITIQUES.md)) :

- `useCommuneSearch` ne charge les communes **que** lorsque `searchTerm.length >= 2`
- La query est `enabled: debouncedSearch.trim().length >= 2 && departmentIds.length > 0`
- Donc quand le combobox s'ouvre avec une province sélectionnée mais **sans terme de recherche**, `communes = []`

**Code actuel (`CommuneCombobox.tsx` + `useCommuneSearch.ts`) :**

```typescript
// useCommuneSearch.ts - La query ne s'exécute que si searchTerm >= 2 chars
enabled: debouncedSearch.trim().length >= 2 && departmentIds.length > 0,

// CommuneCombobox.tsx - filteredCommunes = searchResults uniquement
const filteredCommunes = searchResults  // Toujours vide si pas de recherche
```

## ✅ Solution : Approche hybride (chargement initial + recherche)

### Principe

Combiner deux stratégies :
1. **Chargement initial** : Quand une province est sélectionnée, charger les communes des départements de cette province (comme le fait le formulaire d'inscription `AddressStepV2`)
2. **Recherche** : Garder la recherche pour filtrer/affiner quand l'utilisateur tape

### Logique d'affichage

| État | Communes affichées |
|------|-------------------|
| Province non sélectionnée | Rien (message "Sélectionnez d'abord une province") |
| Province sélectionnée, recherche vide (< 2 chars) | **Communes initiales** (chargées par département) |
| Province sélectionnée, recherche ≥ 2 chars | **Résultats de recherche** (filtrés par le terme) |

### Implémentation

#### 1. Créer un hook `useCommunesByProvince` (ou réutiliser `useQueries`)

```typescript
// Option A : Dans CommuneCombobox, utiliser useQueries comme AddressStepV2
const communeQueries = useQueries({
  queries: departments.length > 0 && selectedProvinceId
    ? departments.map(dept => ({
        queryKey: ['communes', dept.id],
        queryFn: () => geographieService.getCommunesByDepartmentId(dept.id),
        enabled: !!selectedProvinceId && departments.length > 0,
        staleTime: 5 * 60 * 1000,
      }))
    : []
})

const initialCommunes = useMemo(() => {
  const all: Commune[] = []
  communeQueries.forEach(q => { if (q.data) all.push(...q.data) })
  const unique = all.filter((c, i, arr) => i === arr.findIndex(x => x.id === c.id))
  return unique.sort((a, b) => a.name.localeCompare(b.name, 'fr'))
}, [communeQueries])
```

#### 2. Modifier la logique d'affichage dans `CommuneCombobox`

```typescript
// Communes à afficher : initiales SI pas de recherche, sinon résultats de recherche
const filteredCommunes = useMemo(() => {
  if (searchTerm.trim().length >= 2) {
    return searchResults  // Recherche active → résultats filtrés
  }
  return initialCommunes  // Pas de recherche → communes de la province
}, [searchTerm, searchResults, initialCommunes])
```

#### 3. Adapter le message affiché dans le combobox

```typescript
// Avant : "Tapez au moins 2 caractères pour rechercher..."
// Après : Si initialCommunes.length > 0 → afficher la liste
//         Si initialCommunes.length === 0 et loading → "Chargement..."
//         Si initialCommunes.length === 0 et !loading → "Aucune commune dans cette province"
```

#### 4. Mettre à jour `useCommuneSearch` (optionnel)

Pour éviter une requête inutile quand on affiche les communes initiales, la query de recherche reste `enabled` uniquement quand `searchTerm >= 2`. Pas de changement nécessaire dans `useCommuneSearch`.

### Fichiers à modifier

| Fichier | Modification |
|---------|--------------|
| `src/domains/infrastructure/geography/components/forms/CommuneCombobox.tsx` | Ajouter `useQueries` pour charger les communes par département, fusionner avec `searchResults` |
| `src/domains/infrastructure/geography/hooks/useCommuneSearch.ts` | Aucun changement (reste inchangé) |

### Considérations de volume

- **Par province** : Une province a typiquement 3 à 10 départements
- **Par département** : Variable (5 à 50+ communes)
- **Total par province** : ~50 à 200 communes pour l'Estuaire (exemple)
- **Conclusion** : Chargement initial par province est **raisonnable** (même ordre de grandeur que les départements)

### Comparaison avec le formulaire d'inscription

Le formulaire d'inscription (`AddressStepV2`) charge déjà les communes par département :

```typescript
// AddressStepV2.tsx - Déjà implémenté
const communeQueries = useQueries({
  queries: departments.map(dept => ({
    queryKey: ['communes', dept.id],
    queryFn: () => service.getCommunesByDepartmentId(dept.id),
    enabled: !!selectedProvinceId && departments.length > 0,
    ...
  }))
})
```

Le `CommuneCombobox` du formulaire d'adhésion devrait adopter la **même stratégie** pour cohérence et meilleure UX.

## 📊 Résumé

| Avant | Après |
|-------|-------|
| Combobox vide à l'ouverture | Liste des communes de la province affichée |
| Recherche obligatoire (min 2 chars) | Recherche optionnelle (pour filtrer) |
| UX frustrante | UX fluide, cohérente avec Province/Département |

## 🔗 Références

- [CACHE-ET-CAS-CRITIQUES.md](./CACHE-ET-CAS-CRITIQUES.md) - Stratégies de chargement (section Communes mise à jour)
- [README.md](./README.md) - Vue d'ensemble du Step2 Adresse
- `src/domains/auth/registration/components/steps/AddressStepV2.tsx` - Implémentation de référence
