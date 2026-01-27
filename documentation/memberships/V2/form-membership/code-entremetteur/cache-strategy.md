# Stratégie de Cache – Code Entremetteur

## 1. Vue d'ensemble

La recherche du code entremetteur utilise **React Query** pour gérer le cache des résultats de recherche Algolia. Cette stratégie permet d'éviter les recherches redondantes et d'améliorer les performances.

## 2. Problématique

### 2.1 Scénario problématique

```
1. Admin recherche "Glenn" → Résultats affichés
2. Admin efface et recherche "Marie" → Nouvelle recherche Algolia
3. Admin efface et recherche "Glenn" → Nouvelle recherche Algolia ❌
   (alors que les résultats existent déjà)
```

**Problème** : Recherches redondantes qui :
- Consomment le quota Algolia inutilement
- Ralentissent l'expérience utilisateur
- Augmentent les coûts

### 2.2 Solution : Cache React Query

React Query cache automatiquement les résultats par **clé de requête** unique.

## 3. Implémentation du Cache

### 3.1 Clé de cache

La clé de cache est construite à partir des paramètres de recherche :

```typescript
// Hook useIntermediaryCodeSearch
const queryKey = [
  'intermediary-code-search',
  {
    query: searchQuery.trim(),
    filters: { isActive: true },
    hitsPerPage: 10
  }
]
```

**Exemple** :
- Recherche "Glenn" → `['intermediary-code-search', { query: 'Glenn', filters: { isActive: true }, hitsPerPage: 10 }]`
- Recherche "Marie" → `['intermediary-code-search', { query: 'Marie', filters: { isActive: true }, hitsPerPage: 10 }]`

### 3.2 Configuration React Query

```typescript
// src/domains/memberships/hooks/useIntermediaryCodeSearch.ts

export function useIntermediaryCodeSearch(options: UseIntermediaryCodeSearchOptions = {}) {
  const {
    query = '',
    filters = {},
    enabled = true,
  } = options

  const searchService = getMembersAlgoliaSearchService()

  return useQuery({
    queryKey: [
      'intermediary-code-search',
      {
        query: query.trim(),
        filters: { isActive: true },
        hitsPerPage: 10
      }
    ],
    queryFn: () => searchService.search({
      query: query.trim(),
      filters: { isActive: true },
      hitsPerPage: 10
    }),
    enabled: enabled && searchService.isAvailable() && query.trim().length >= 2,
    staleTime: 5 * 60 * 1000, // 5 minutes - Les résultats restent "frais" pendant 5 min
    gcTime: 10 * 60 * 1000,   // 10 minutes - Le cache est gardé en mémoire pendant 10 min
    refetchOnWindowFocus: false, // Ne pas refetch au focus de la fenêtre
    refetchOnMount: false,        // Ne pas refetch au remount
  })
}
```

### 3.3 Paramètres de cache

| Paramètre | Valeur | Description |
|-----------|--------|-------------|
| `staleTime` | 5 minutes | Durée pendant laquelle les données sont considérées "frais" (pas de refetch) |
| `gcTime` | 10 minutes | Durée pendant laquelle le cache est gardé en mémoire après inactivité |
| `refetchOnWindowFocus` | `false` | Ne pas refetch quand la fenêtre reprend le focus |
| `refetchOnMount` | `false` | Ne pas refetch quand le composant se remonte |

## 4. Comportement du Cache

### 4.1 Scénario : Recherche "Glenn" → Efface → Recherche "Glenn"

```
┌─────────────────────────────────────────────────────────────┐
│  FLUX DE CACHE : Recherche "Glenn" → Efface → "Glenn"      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Admin tape "Glenn"                                     │
│     ┌─────────────────────────────────────────────────┐   │
│     │ QueryKey: ['intermediary-code-search',         │   │
│     │           { query: 'Glenn', ... }]             │   │
│     │ Cache MISS → Fetch Algolia → Stocke cache      │   │
│     └─────────────────────────────────────────────────┘   │
│                                                             │
│  2. Admin efface (query = "")                              │
│     ┌─────────────────────────────────────────────────┐   │
│     │ Query désactivée (enabled: false)              │   │
│     │ Cache CONSERVÉ en mémoire                      │   │
│     └─────────────────────────────────────────────────┘   │
│                                                             │
│  3. Admin retape "Glenn"                                   │
│     ┌─────────────────────────────────────────────────┐   │
│     │ QueryKey: ['intermediary-code-search',         │   │
│     │           { query: 'Glenn', ... }]             │   │
│     │ Cache HIT → Retourne depuis cache ✅            │   │
│     │ Pas de fetch Algolia                            │   │
│     └─────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Scénario : Recherche "Glenn" → Recherche "Marie" → Recherche "Glenn"

```
┌─────────────────────────────────────────────────────────────┐
│  FLUX DE CACHE : Recherches multiples                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Admin recherche "Glenn"                                 │
│     → Cache MISS → Fetch → Stocke cache                    │
│                                                             │
│  2. Admin recherche "Marie"                                 │
│     → Cache MISS → Fetch → Stocke cache                    │
│     → Cache "Glenn" toujours en mémoire                    │
│                                                             │
│  3. Admin recherche "Glenn" (retour)                        │
│     → Cache HIT → Retourne depuis cache ✅                 │
│     → Pas de fetch Algolia                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 Scénario : Recherche après 5 minutes

```
┌─────────────────────────────────────────────────────────────┐
│  FLUX DE CACHE : Recherche après staleTime                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Admin recherche "Glenn" à 10:00                         │
│     → Cache créé avec staleTime: 5 min                      │
│                                                             │
│  2. Admin recherche "Glenn" à 10:03                         │
│     → Cache HIT (encore frais) ✅                          │
│                                                             │
│  3. Admin recherche "Glenn" à 10:06 (6 min après)          │
│     → Cache STALE (dépassé staleTime)                      │
│     → Cache HIT mais refetch en arrière-plan              │
│     → Affiche d'abord données cache (instantané)            │
│     → Met à jour avec nouvelles données si différentes     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 5. Gestion de la Fraîcheur des Données

### 5.1 Problème : Données obsolètes

**Scénario** :
- Admin recherche "Glenn" → Trouve 3 résultats
- Un nouveau membre "Glenn" est ajouté dans Firestore/Algolia
- Admin recherche "Glenn" à nouveau → Cache retourne les 3 anciens résultats

**Solution** : `staleTime` de 5 minutes

```typescript
staleTime: 5 * 60 * 1000 // 5 minutes
```

**Comportement** :
- Les données sont considérées "frais" pendant 5 minutes
- Après 5 minutes, elles deviennent "stale"
- Au prochain accès, React Query :
  1. Retourne immédiatement les données en cache (UX fluide)
  2. Refetch en arrière-plan (données à jour)
  3. Met à jour l'UI si les données ont changé

### 5.2 Invalidation manuelle du cache

Si nécessaire, on peut invalider le cache manuellement :

```typescript
// Après création/modification d'un membre
import { useQueryClient } from '@tanstack/react-query'

const queryClient = useQueryClient()

// Invalider toutes les recherches
queryClient.invalidateQueries({ queryKey: ['intermediary-code-search'] })

// Ou invalider une recherche spécifique
queryClient.invalidateQueries({ 
  queryKey: ['intermediary-code-search', { query: 'Glenn' }] 
})
```

## 6. Problèmes Potentiels et Solutions

### 6.1 Problème 1 : Cache trop volumineux

**Symptôme** : 
- Beaucoup de recherches différentes → Beaucoup de cache en mémoire
- Performance dégradée

**Solution** : `gcTime` (garbage collection time)

```typescript
gcTime: 10 * 60 * 1000 // 10 minutes
```

**Comportement** :
- Les recherches non utilisées pendant 10 minutes sont supprimées du cache
- Limite la consommation mémoire
- Les recherches fréquentes restent en cache

**Recommandation** : 
- `gcTime` = 2x `staleTime` (10 min vs 5 min)
- Permet de garder les recherches récentes même si elles sont stale

### 6.2 Problème 2 : Données obsolètes (stale)

**Symptôme** :
- Un membre est ajouté/modifié dans Algolia
- La recherche retourne toujours les anciennes données

**Solutions** :

#### Solution A : Réduire `staleTime`

```typescript
staleTime: 2 * 60 * 1000 // 2 minutes au lieu de 5
```

**Avantages** : Données plus fraîches
**Inconvénients** : Plus de requêtes Algolia

#### Solution B : Invalidation après modification

```typescript
// Dans la Cloud Function qui met à jour Algolia
// Après syncToAlgolia, invalider le cache côté client

// Option 1 : Webhook vers le client
// Option 2 : Polling périodique (moins recommandé)
// Option 3 : Accepter staleTime de 5 min (recommandé)
```

#### Solution C : Refetch manuel

```typescript
// Ajouter un bouton "Actualiser" (optionnel)
const { refetch } = useIntermediaryCodeSearch({ query: 'Glenn' })

<Button onClick={() => refetch()}>Actualiser</Button>
```

**Recommandation** : `staleTime: 5 min` est un bon compromis pour ce cas d'usage.

### 6.3 Problème 3 : Recherches partielles non mises en cache

**Symptôme** :
- Admin tape "G" → Pas de recherche (< 2 caractères)
- Admin tape "Gl" → Recherche "Gl"
- Admin tape "Gle" → Recherche "Gle"
- Admin tape "Glenn" → Recherche "Glenn"
- Si admin revient à "Gl", la recherche "Gl" n'est pas en cache

**Solution** : C'est normal et souhaitable

**Raison** :
- Les recherches partielles (< 2 caractères) ne sont pas utiles
- Le cache ne devrait contenir que les recherches complètes
- Évite de polluer le cache avec des recherches inutiles

**Comportement actuel** :
```typescript
enabled: query.trim().length >= 2 // Seulement si >= 2 caractères
```

### 6.4 Problème 4 : Cache partagé entre utilisateurs

**Symptôme** :
- Admin A recherche "Glenn" → Cache créé
- Admin B recherche "Glenn" → Utilise le même cache
- Si Admin A modifie les résultats, Admin B voit les modifications

**Solution** : C'est le comportement attendu

**Raison** :
- Le cache React Query est **par instance d'application**
- Si deux admins sont sur la même session/navigateur → Cache partagé (normal)
- Si deux admins sont sur des machines différentes → Caches séparés (normal)

**Pas de problème** : Les données Algolia sont les mêmes pour tous les admins.

### 6.5 Problème 5 : Memory leak avec beaucoup de recherches

**Symptôme** :
- Admin fait 50 recherches différentes
- Le cache garde toutes les recherches en mémoire
- Consommation mémoire élevée

**Solution** : `gcTime` + `maxSize` (optionnel)

```typescript
// Configuration globale React Query (optionnel)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 10 * 60 * 1000, // 10 minutes
      // Optionnel : Limiter le nombre de queries en cache
      // (nécessite une configuration personnalisée)
    }
  }
})
```

**Comportement actuel** :
- `gcTime: 10 min` supprime automatiquement les recherches inactives
- Les recherches fréquentes restent en cache
- Les recherches anciennes sont supprimées

**Recommandation** : Le comportement actuel est suffisant pour ce cas d'usage.

### 6.6 Problème 6 : Race conditions (requêtes simultanées)

**Symptôme** :
- Admin tape rapidement "Glenn"
- Plusieurs requêtes sont déclenchées avant le debounce
- Résultats incohérents

**Solution** : Debounce dans le composant + `enabled` dans React Query

```typescript
// Dans le composant IntermediaryCodeSearch
const [debouncedQuery, setDebouncedQuery] = useState('')

useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedQuery(query)
  }, 300) // Debounce 300ms

  return () => clearTimeout(timer)
}, [query])

// Utiliser debouncedQuery dans le hook
const { data } = useIntermediaryCodeSearch({ query: debouncedQuery })
```

**Comportement** :
- React Query annule automatiquement les requêtes précédentes si une nouvelle est déclenchée
- Le debounce évite les requêtes multiples
- Seule la dernière requête est exécutée

### 6.7 Problème 7 : Cache avec filtres différents

**Symptôme** :
- Recherche "Glenn" avec `isActive: true` → Cache créé
- Recherche "Glenn" avec `isActive: false` → Nouvelle recherche (cache différent)

**Solution** : C'est le comportement attendu

**Raison** :
- Les filtres font partie de la clé de cache
- Recherches avec filtres différents = résultats différents = caches différents

**Comportement actuel** :
```typescript
queryKey: [
  'intermediary-code-search',
  {
    query: query.trim(),
    filters: { isActive: true }, // Fait partie de la clé
    hitsPerPage: 10
  }
]
```

## 7. Optimisations Avancées

### 7.1 Préchargement (Prefetching)

**Idée** : Précharger les recherches probables

```typescript
// Précharger les recherches fréquentes au montage
useEffect(() => {
  const commonQueries = ['Jean', 'Marie', 'Pierre']
  commonQueries.forEach(query => {
    queryClient.prefetchQuery({
      queryKey: ['intermediary-code-search', { query, filters: { isActive: true } }],
      queryFn: () => searchService.search({ query, filters: { isActive: true } })
    })
  })
}, [])
```

**Avantage** : Recherches instantanées pour les termes fréquents
**Inconvénient** : Consomme le quota Algolia même si non utilisé
**Recommandation** : Non recommandé pour ce cas d'usage (recherche ad-hoc)

### 7.2 Cache persistant (localStorage)

**Idée** : Persister le cache dans localStorage

```typescript
import { persistQueryClient } from '@tanstack/react-query-persist-client'

persistQueryClient({
  queryClient,
  persister: createSyncStoragePersister({
    storage: window.localStorage,
  }),
})
```

**Avantage** : Cache conservé après rechargement de la page
**Inconvénient** : Risque de données obsolètes, complexité ajoutée
**Recommandation** : Non recommandé pour ce cas d'usage (données dynamiques)

## 8. Monitoring et Debugging

### 8.1 Vérifier le cache

```typescript
// Dans la console du navigateur
const queryClient = window.__REACT_QUERY_CLIENT__

// Voir toutes les queries en cache
console.log(queryClient.getQueryCache().getAll())

// Voir une query spécifique
const query = queryClient.getQueryCache().find({
  queryKey: ['intermediary-code-search', { query: 'Glenn' }]
})
console.log(query?.state)
```

### 8.2 Logs de cache

```typescript
// Ajouter des logs pour debug
const { data, isLoading, isFetching } = useIntermediaryCodeSearch({ query })

useEffect(() => {
  if (data) {
    console.log('Cache HIT pour:', query)
  }
  if (isFetching) {
    console.log('Fetching pour:', query)
  }
}, [data, isFetching, query])
```

## 9. Recommandations Finales

### 9.1 Configuration optimale

```typescript
{
  staleTime: 5 * 60 * 1000,      // 5 minutes - Bon compromis fraîcheur/performance
  gcTime: 10 * 60 * 1000,        // 10 minutes - Garde les recherches récentes
  refetchOnWindowFocus: false,    // Pas de refetch au focus
  refetchOnMount: false,         // Pas de refetch au remount
}
```

### 9.2 Points d'attention

1. **staleTime** : Ajuster selon la fréquence de mise à jour des membres
   - Si membres ajoutés souvent → Réduire à 2-3 min
   - Si membres stables → Garder 5 min

2. **gcTime** : Ajuster selon l'usage
   - Si beaucoup de recherches différentes → Réduire à 5 min
   - Si recherches répétitives → Garder 10 min

3. **Invalidation** : Invalider manuellement après modifications importantes
   - Après création d'un membre (si nécessaire)
   - Après modification d'un membre (si nécessaire)

### 9.3 Métriques à surveiller

- **Taux de cache hit** : % de recherches qui utilisent le cache
- **Nombre de requêtes Algolia** : Surveiller le quota
- **Temps de réponse** : Cache = instantané, Fetch = ~100-300ms

## 10. Exemple Complet

```typescript
// src/domains/memberships/hooks/useIntermediaryCodeSearch.ts

import { useQuery } from '@tanstack/react-query'
import { getMembersAlgoliaSearchService } from '@/services/search/MembersAlgoliaSearchService'

interface UseIntermediaryCodeSearchOptions {
  query?: string
  enabled?: boolean
}

export function useIntermediaryCodeSearch(options: UseIntermediaryCodeSearchOptions = {}) {
  const { query = '', enabled = true } = options
  const searchService = getMembersAlgoliaSearchService()

  return useQuery({
    queryKey: [
      'intermediary-code-search',
      {
        query: query.trim(),
        filters: { isActive: true },
        hitsPerPage: 10
      }
    ],
    queryFn: async () => {
      const result = await searchService.search({
        query: query.trim(),
        filters: { isActive: true },
        hitsPerPage: 10
      })
      return result
    },
    enabled: enabled && searchService.isAvailable() && query.trim().length >= 2,
    staleTime: 5 * 60 * 1000,      // 5 minutes
    gcTime: 10 * 60 * 1000,       // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })
}
```

## 11. Résumé

### Avantages du cache React Query

✅ **Évite les recherches redondantes** : "Glenn" → Efface → "Glenn" = Cache HIT
✅ **Performance** : Résultats instantanés depuis le cache
✅ **Économie de quota** : Moins de requêtes Algolia
✅ **UX fluide** : Pas de loading pour les recherches déjà faites
✅ **Gestion automatique** : Suppression des caches inactifs (gcTime)

### Comportement attendu

- Recherche "Glenn" → Cache créé
- Efface → Cache conservé
- Recherche "Glenn" → Cache HIT (instantané) ✅
- Recherche "Glenn" après 5 min → Cache HIT + Refetch en arrière-plan
- Recherche "Glenn" après 10 min d'inactivité → Cache supprimé → Nouvelle recherche
