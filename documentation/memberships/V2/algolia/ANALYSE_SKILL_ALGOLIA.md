# Analyse : Implémentation Algolia vs Skill algolia-search

> Comparaison de l'implémentation actuelle sur `/membership-requests` avec les recommandations du skill algolia-search.

## Vue d'ensemble

| Aspect | Skill algolia-search | Implémentation actuelle | Écart |
|--------|----------------------|-------------------------|-------|
| **Bibliothèque UI** | React InstantSearch (useSearchBox, useHits, useRefinementList) | API client algoliasearch/lite + React Query | ⚠️ Approche différente |
| **Déduplication** | SWR / request deduplication | React Query (queryKey) | ✅ Équivalent |
| **Debounce** | Recommandé pour optimiser les requêtes | **Absent** sur membership-requests | ❌ Manquant |
| **Indexation** | partialUpdateObjects, batch records | Cloud Functions + Firestore | ✅ Cohérent |

---

## 1. Approche technique : InstantSearch vs API client

### Ce que dit le skill

> **React InstantSearch with Hooks** : useSearchBox, useHits, useRefinementList, usePagination, useInstantSearch

### Implémentation actuelle

- **algoliasearch/lite** (client API direct)
- **React Query** (useQuery) via `useMembershipRequestsV2` → `MembershipRepositoryV2` → `AlgoliaSearchService`
- Pas de `react-instantsearch` ou `react-instantsearch-hooks-web` dans les dépendances

### Verdict

**Approche valide.** L'API client directe est une alternative légitime à InstantSearch. Elle offre :
- Plus de contrôle sur le flux de données
- Intégration avec le Repository pattern existant
- Fallback Firestore transparent
- Pas de dépendance supplémentaire

Le skill mentionne InstantSearch comme option recommandée, mais l'approche API client + React Query est documentée par Algolia et adaptée à une architecture Repository/Firestore hybride.

---

## 2. Debounce : point critique

### Ce que dit le skill / Algolia

> Optimize search requests : debouncing reduces the number of API calls during typing.

### Implémentation actuelle

**MembershipRequestsPageV2** :
```tsx
const handleSearch = useCallback((value: string) => {
  setSearchQuery(value)
  setFilters((prev) => ({ ...prev, search: value.trim() || undefined }))
  setCurrentPage(1)
}, [])
```

→ **Chaque frappe** met à jour les filtres → **Chaque frappe** déclenche une nouvelle requête Algolia via `useMembershipRequestsV2`.

**ListDemandesV2** (caisse-imprevue) utilise correctement le debounce :
```tsx
const debouncedSearchQuery = useDebounce(searchQuery, 300)
// effectiveFilters.searchQuery = debouncedSearchQuery
```

**Constante existante mais non utilisée** :
```ts
// constantes/membership-requests.ts
MEMBERSHIP_REQUEST_SEARCH: { DEBOUNCE_MS: 300, ... }
```

### Verdict

❌ **Debounce manquant** sur membership-requests. Impact :
- Requêtes excessives pendant la saisie (ex. 10 frappes = 10 requêtes)
- Coût API Algolia inutile
- UX potentiellement saccadée (loading à chaque frappe)

---

## 3. Configuration Algolia

### Index et filtres

| Élément | Implémentation | Conforme |
|---------|----------------|----------|
| Index multi-env | `membership-requests-{dev|preprod|prod}` | ✅ |
| Filtres | `isPaid`, `status` | ✅ |
| attributesToRetrieve | `['objectID']` + fetch Firestore | ✅ Efficace |
| Pagination | page, hitsPerPage | ✅ |
| Fallback | Firestore si Algolia échoue | ✅ |

### Condition d'activation

```ts
// MembershipRepositoryV2
if (process.env.NEXT_PUBLIC_ALGOLIA_APP_ID && filters.search?.trim()) {
  return searchService.search(...)
}
```

→ Algolia utilisé **uniquement** quand il y a une recherche textuelle. Sinon Firestore. ✅ Cohérent.

---

## 4. Hook useMembershipSearch : non utilisé

Le hook `useMembershipSearch` existe et encapsule la recherche Algolia avec React Query, mais **n'est pas utilisé** par `MembershipRequestsPageV2`.

Le flux actuel passe par :
- `useMembershipRequestsV2(filters, page)` → `MembershipRepositoryV2.getAll()` → Algolia ou Firestore selon `filters.search`

Cela centralise la logique dans le Repository, ce qui est cohérent avec l'architecture. Le hook `useMembershipSearch` pourrait servir pour des cas d'usage dédiés (ex. autocomplete, recherche standalone).

---

## 5. Recommandations

### Priorité 1 : Ajouter le debounce

```tsx
// MembershipRequestsPageV2.tsx
import { useDebounce } from '@/hooks/useDebounce'
import { MEMBERSHIP_REQUEST_SEARCH } from '@/constantes/membership-requests'

// Dans le composant :
const debouncedSearchQuery = useDebounce(searchQuery, MEMBERSHIP_REQUEST_SEARCH.DEBOUNCE_MS)

// Utiliser debouncedSearchQuery dans les filtres passés à useMembershipRequestsV2
const effectiveFilters = useMemo(() => ({
  ...filters,
  search: debouncedSearchQuery.trim().length >= 2 
    ? debouncedSearchQuery.trim() 
    : undefined,
}), [filters, debouncedSearchQuery])

const { data, isLoading } = useMembershipRequestsV2(effectiveFilters, currentPage)
```

### Priorité 2 : Condition de recherche (optionnel)

Le skill mentionne souvent une condition du type "query >= 2 caractères". Actuellement, une recherche d'un seul caractère déclenche déjà Algolia. Aligner avec `useMembershipSearch` qui utilise `query.trim().length >= 2 || query.trim().length === 0` pour éviter les recherches trop courtes.

### Priorité 3 : InstantSearch (optionnel)

Si vous souhaitez bénéficier des widgets InstantSearch (autocomplete, facettes, etc.), une migration vers `react-instantsearch-hooks-web` est possible. Pour l'instant, l'approche actuelle reste adaptée.

---

## Résumé

| Critère | Statut | Action |
|---------|--------|--------|
| Approche API vs InstantSearch | ✅ Valide | Aucune |
| Debounce | ❌ Manquant | **À implémenter** |
| Configuration Algolia | ✅ Correcte | Aucune |
| Fallback Firestore | ✅ Présent | Aucune |
| useMembershipSearch non utilisé | ℹ️ Info | Optionnel : réutiliser ou documenter |

**Conclusion** : L'implémentation est globalement solide et alignée avec le skill, à l'exception du **debounce** qui doit être ajouté sur la page membership-requests pour limiter les requêtes pendant la saisie.
