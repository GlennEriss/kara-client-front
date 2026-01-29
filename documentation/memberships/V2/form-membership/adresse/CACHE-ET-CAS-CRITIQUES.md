# Gestion du Cache et Cas Critiques - Step2 Adresse

## 📋 Vue d'ensemble

Documentation détaillée sur la gestion du cache React Query et les stratégies de chargement pour chaque niveau géographique, en tenant compte des volumes de données au Gabon.

## 🎯 Stratégies de chargement par niveau

### 1. Provinces (9 au Gabon)

**Volume** : Très faible (9 provinces)  
**Stratégie** : **Chargement complet au démarrage**

```typescript
// Chargement initial : Toutes les provinces sont chargées
const { data: provinces } = useQuery({
  queryKey: ['provinces'],
  queryFn: () => geographieService.getProvinces(),
  staleTime: 30 * 60 * 1000, // 30 minutes (données très stables)
  cacheTime: Infinity, // Garder en cache indéfiniment
})

// Pas de recherche nécessaire : Liste courte et exhaustive
// Tri : Alphabétique par nom
```

**Caractéristiques** :
- ✅ Chargement complet au montage du composant
- ✅ Cache long (30 minutes)
- ✅ Pas de recherche nécessaire
- ✅ Tri alphabétique
- ✅ Affichage direct dans le Combobox

### 2. Départements (~50-60 au Gabon)

**Volume** : Modéré mais exhaustif  
**Stratégie** : **Chargement par province avec cache**

```typescript
// Chargement par province : Seulement les départements de la province sélectionnée
const { data: departments } = useQuery({
  queryKey: ['departments', provinceId],
  queryFn: () => geographieService.getDepartmentsByProvinceId(provinceId),
  enabled: !!provinceId,
  staleTime: 30 * 60 * 1000, // 30 minutes
  cacheTime: 60 * 60 * 1000, // 1 heure
})

// Recherche : Optionnelle mais recommandée pour faciliter la sélection
// Tri : Alphabétique par nom
```

**Caractéristiques** :
- ✅ Chargement par province (pas tous les départements)
- ✅ Cache par province (si on change de province puis on revient, utilise le cache)
- ✅ Recherche optionnelle (mais recommandée)
- ✅ Tri alphabétique
- ✅ Affichage direct dans le Combobox (liste filtrée par province)

### 3. Communes (Volume élevé par province)

**Volume** : Élevé au niveau national (plusieurs centaines), mais **raisonnable par province** (~50-200 communes)  
**Stratégie** : **Chargement initial par province + Recherche pour filtrer** (approche hybride)

> ⚠️ **Problème identifié** : Avec la stratégie "recherche uniquement", le combobox reste **vide** à l'ouverture quand une province est sélectionnée. L'utilisateur doit taper au moins 2 caractères pour voir des communes. Voir [COMMUNES-COMBOBOX-VIDE.md](./COMMUNES-COMBOBOX-VIDE.md).

```typescript
// APPROCHE HYBRIDE : Chargement initial + Recherche

// 1. Chargement initial : Communes des départements de la province sélectionnée
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

// 2. Recherche : Pour filtrer quand l'utilisateur tape (optionnel)
const { communes: searchResults } = useCommuneSearch({
  departmentIds: departments.map(d => d.id),
  debounceDelay: 300,
  limit: 50,
})

// 3. Affichage : Initiales si pas de recherche, sinon résultats de recherche
const communesToDisplay = searchTerm.trim().length >= 2 ? searchResults : initialCommunes
```

**Caractéristiques** :
- ✅ **Chargement initial par province** (communes des départements de la province)
- ✅ **Combobox rempli à l'ouverture** (liste visible sans taper)
- ✅ Recherche optionnelle (pour filtrer/affiner)
- ✅ Debounce de 300ms pour la recherche
- ✅ Cache par département (5 min)
- ✅ Tri alphabétique
- ✅ Affichage direct dans le Combobox (comme Province et Département)

**Gestion du cache** :
```typescript
// Scénario 1 : Province sélectionnée → Ouverture combobox
// - Chargement initial : useQueries(['communes', dept.id]) pour chaque département
// - Cache par département (staleTime 5 min)
// - Affichage immédiat des communes de la province

// Scénario 2 : Recherche "Libreville" (si l'utilisateur tape)
// - useCommuneSearch : Cache ['communes', 'search', 'Libreville', departmentIds]
// - Résultats filtrés affichés
// - Si on efface la recherche → Retour aux communes initiales (déjà en cache)
```

### 4. Districts/Arrondissements (Max 7 par commune)

**Volume** : Très faible (max 7 par commune)  
**Stratégie** : **Chargement complet par commune**

```typescript
// Chargement complet : Tous les districts de la commune sélectionnée
const { data: districts } = useQuery({
  queryKey: ['districts', communeId],
  queryFn: () => geographieService.getDistrictsByCommuneId(communeId),
  enabled: !!communeId,
  staleTime: 30 * 60 * 1000, // 30 minutes
  cacheTime: 60 * 60 * 1000, // 1 heure
})

// Pas de recherche nécessaire : Liste courte
// Tri : Alphabétique par nom
```

**Caractéristiques** :
- ✅ Chargement complet au sélection d'une commune
- ✅ Cache par commune
- ✅ Pas de recherche nécessaire (max 7)
- ✅ Tri alphabétique
- ✅ Affichage direct dans le Combobox

### 5. Quarters (Volume variable par arrondissement)

**Volume** : Variable par arrondissement (quelques dizaines à centaines)  
**Stratégie** : **Chargement initial par arrondissement + Recherche pour filtrer** (approche hybride)

> ⚠️ **Même problème que Communes** : Avec "recherche uniquement", le combobox Quartier restait vide à l'ouverture. Voir [COMMUNES-COMBOBOX-VIDE.md](./COMMUNES-COMBOBOX-VIDE.md).

```typescript
// APPROCHE HYBRIDE : Chargement initial + Recherche

// 1. Chargement initial : Quartiers de l'arrondissement sélectionné
const { data: initialQuarters = [] } = useQuery({
  queryKey: ['quarters', districtId],
  queryFn: () => geographieService.getQuartersByDistrictId(districtId),
  enabled: !!districtId,
  staleTime: 5 * 60 * 1000,
})

// 2. Recherche : Pour filtrer quand l'utilisateur tape (optionnel)
const { quarters: searchResults } = useQuarterSearch({
  districtId,
  debounceDelay: 300,
  limit: 50,
})

// 3. Affichage : Initiales si pas de recherche, sinon résultats de recherche
const quartersToDisplay = searchTerm.trim().length >= 2 ? searchResults : initialQuarters
```

**Caractéristiques** :
- ✅ **Chargement initial par arrondissement** (quartiers du district)
- ✅ **Combobox rempli à l'ouverture** (liste visible sans taper)
- ✅ Recherche optionnelle (pour filtrer/affiner)
- ✅ Debounce de 300ms pour la recherche
- ✅ Cache par arrondissement (5 min)
- ✅ Tri alphabétique
- ✅ Affichage direct dans le Combobox

## 🔄 Gestion du cache React Query

### Scénario : Recherche → Sélection → Changement → Retour

```typescript
// ÉTAPE 1 : Recherche "Libreville"
// → Requête Firestore
// → Cache créé : ['communes', 'search', 'Libreville', ['dept-1', 'dept-2']]
// → Résultats affichés

// ÉTAPE 2 : Sélection de "Libreville"
// → Cache toujours présent
// → Pas de nouvelle requête

// ÉTAPE 3 : Changement de commune (sélection d'une autre commune)
// → Cache de "Libreville" toujours présent
// → Nouvelle sélection ne touche pas au cache

// ÉTAPE 4 : Retour à "Libreville"
// → Tape "Lib" dans la recherche
// → React Query vérifie le cache :
//    - Si 'Libreville' est dans le cache ET cache encore valide (staleTime) :
//      → Utilise le cache IMMÉDIATEMENT (pas de requête)
//      → Affiche les résultats instantanément
//    - Si cache stale :
//      → Affiche le cache d'abord (stale-while-revalidate)
//      → Refetch en arrière-plan
//      → Met à jour les résultats si différents
```

### Configuration React Query

```typescript
// Configuration globale pour les queries géographiques
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes par défaut
      cacheTime: 10 * 60 * 1000, // 10 minutes par défaut
      refetchOnWindowFocus: false, // Ne pas refetch au focus
      refetchOnReconnect: false, // Ne pas refetch à la reconnexion
    },
  },
})

// Configuration spécifique par type
const provinceQuery = {
  staleTime: 30 * 60 * 1000, // 30 minutes (données très stables)
  cacheTime: Infinity, // Garder indéfiniment
}

const communeSearchQuery = {
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 10 * 60 * 1000, // 10 minutes
  // Pas de refetch automatique (recherche manuelle uniquement)
}
```

### Invalidation du cache

```typescript
// Après création d'une nouvelle commune
const handleCommuneCreated = async (newCommune: Commune) => {
  // 1. Optimistic Update : Mise à jour immédiate du cache
  queryClient.setQueryData(
    ['communes', 'search', searchTerm, departmentIds],
    (old: Commune[] | undefined) => {
      if (!old) return [newCommune]
      // Vérifier si déjà présent (éviter doublons)
      if (old.some(c => c.id === newCommune.id)) return old
      // Ajouter et trier
      return [...old, newCommune].sort((a, b) => 
        a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
      )
    }
  )
  
  // 2. Invalidation : Marquer comme stale pour refetch si nécessaire
  queryClient.invalidateQueries({
    queryKey: ['communes'],
    exact: false,
  })
  
  // 3. Refetch actif : Forcer le refetch des queries actives
  await queryClient.refetchQueries({
    queryKey: ['communes'],
    exact: false,
    type: 'active',
  })
}
```

## 📊 Tableau récapitulatif

| Niveau | Volume | Stratégie | Recherche | Cache | Tri |
|--------|--------|-----------|-----------|-------|-----|
| **Provinces** | 9 | Chargement complet | ❌ Non | 30 min | ✅ Alphabétique |
| **Départements** | ~50-60 | Chargement par province | 🟡 Optionnelle | 30 min | ✅ Alphabétique |
| **Communes** | Très élevé | Recherche uniquement | ✅ Obligatoire (min 2 chars) | 5 min | ✅ Alphabétique |
| **Districts** | Max 7/commune | Chargement complet | ❌ Non | 30 min | ✅ Alphabétique |
| **Quarters** | Très élevé | Recherche uniquement | ✅ Obligatoire (min 2 chars) | 5 min | ✅ Alphabétique |

## 🚨 Cas critiques

### 1. Communes : Trop nombreuses pour charger

**Problème** : Plusieurs centaines de communes au Gabon  
**Solution** : Recherche uniquement avec minimum 2 caractères

```typescript
// ❌ MAUVAIS : Charger toutes les communes
const { data: communes } = useQuery({
  queryKey: ['communes', departmentIds],
  queryFn: () => geographieService.getCommunesByDepartmentIds(departmentIds),
  // ❌ Trop de données, requête lente, mémoire excessive
})

// ✅ BON : Recherche uniquement
const { data: communes } = useQuery({
  queryKey: ['communes', 'search', debouncedSearch, departmentIds],
  queryFn: () => geographieService.searchCommunes({
    search: debouncedSearch,
    departmentIds: departmentIds,
    limit: 50
  }),
  enabled: debouncedSearch.length >= 2, // Minimum 2 caractères
})
```

### 2. Quarters : Trop nombreux pour charger

**Problème** : Plusieurs milliers de quarters au Gabon  
**Solution** : Recherche uniquement avec minimum 2 caractères

```typescript
// ❌ MAUVAIS : Charger tous les quarters d'un district
const { data: quarters } = useQuery({
  queryKey: ['quarters', districtId],
  queryFn: () => geographieService.getQuartersByDistrictId(districtId),
  // ❌ Trop de données, requête lente
})

// ✅ BON : Recherche uniquement
const { data: quarters } = useQuery({
  queryKey: ['quarters', 'search', debouncedSearch, districtId],
  queryFn: () => geographieService.searchQuarters({
    search: debouncedSearch,
    districtId: districtId,
    limit: 50
  }),
  enabled: debouncedSearch.length >= 2,
})
```

### 3. Départements : Volume modéré mais exhaustif

**Problème** : ~50-60 départements au total  
**Solution** : Chargement par province (pas tous les départements)

```typescript
// ✅ BON : Charger seulement les départements de la province sélectionnée
const { data: departments } = useQuery({
  queryKey: ['departments', provinceId],
  queryFn: () => geographieService.getDepartmentsByProvinceId(provinceId),
  enabled: !!provinceId,
  // Charge seulement ~5-10 départements par province
})
```

### 4. Cache : Retour à une recherche précédente

**Problème** : Si l'utilisateur recherche "Libreville", sélectionne, change, puis revient  
**Solution** : React Query utilise le cache si encore valide

```typescript
// Configuration du cache
const communeSearchQuery = {
  staleTime: 5 * 60 * 1000, // 5 minutes
  // Si l'utilisateur revient dans les 5 minutes :
  // → Utilise le cache (pas de requête)
  // → Affichage instantané
}
```

## ✅ Tri alphabétique

Tous les résultats doivent être triés par ordre alphabétique pour faciliter la sélection :

```typescript
// Tri des provinces
const sortedProvinces = provinces.sort((a, b) => 
  a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
)

// Tri des communes (côté serveur ou client)
const sortedCommunes = communes.sort((a, b) => 
  a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
)

// Tri des districts
const sortedDistricts = districts.sort((a, b) => 
  a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
)

// Tri des quarters
const sortedQuarters = quarters.sort((a, b) => 
  a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
)
```

**Note** : Utiliser `localeCompare` avec `'fr'` pour respecter l'alphabet français (accents, cédilles, etc.)

## 📝 Validation des formulaires

### Principe : Champs libres (pas de restrictions)

Tous les champs de création (Province, Département, Commune, District, Quarter) doivent accepter **tous types de caractères** :

```typescript
// ✅ BON : Validation minimale (seulement requis)
const provinceSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'), // Pas de regex, pas de restrictions
  code: z.string().min(1, 'Le code est requis'),
})

// ✅ BON : Accepter tous les caractères
// - Espaces : "Port-Gentil"
// - Apostrophes : "L'Estuaire"
// - Caractères spéciaux : "Quartier N°1"
// - Accents : "Libreville"
// - Longs noms : "Arrondissement de la Commune de Libreville"

// ❌ MAUVAIS : Restrictions
const badSchema = z.object({
  name: z.string()
    .regex(/^[A-Za-z]+$/, 'Seulement lettres') // ❌ Trop restrictif
    .max(20, 'Maximum 20 caractères'), // ❌ Trop restrictif
})
```

### Exemples de noms valides

```typescript
// Provinces
"Estuaire"
"Haut-Ogooué"
"Ogooué-Lolo"

// Communes
"Port-Gentil"
"L'Estuaire"
"Quartier N°1"
"Arrondissement de la Commune de Libreville"

// Districts
"District Centre"
"District Sud-Est"
"District N'Djamena"

// Quarters
"Quartier Résidentiel"
"Quartier Commercial N°2"
"Quartier de l'Université"
```

## 🔧 Implémentation recommandée

### Hook de recherche pour Communes

```typescript
export function useCommuneSearch(departmentIds: string[]) {
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearch = useDebounce(searchTerm, 300)
  
  const { data: communes = [], isLoading } = useQuery({
    queryKey: ['communes', 'search', debouncedSearch, departmentIds],
    queryFn: async () => {
      if (debouncedSearch.length < 2) return []
      
      const results = await geographieService.searchCommunes({
        search: debouncedSearch,
        departmentIds: departmentIds,
        limit: 50,
      })
      
      // Tri alphabétique
      return results.sort((a, b) => 
        a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
      )
    },
    enabled: debouncedSearch.length >= 2 && departmentIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  })
  
  return {
    communes,
    isLoading,
    searchTerm,
    setSearchTerm,
  }
}
```

### Hook de recherche pour Quarters

```typescript
export function useQuarterSearch(districtId: string | null) {
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearch = useDebounce(searchTerm, 300)
  
  const { data: quarters = [], isLoading } = useQuery({
    queryKey: ['quarters', 'search', debouncedSearch, districtId],
    queryFn: async () => {
      if (debouncedSearch.length < 2 || !districtId) return []
      
      const results = await geographieService.searchQuarters({
        search: debouncedSearch,
        districtId: districtId,
        limit: 50,
      })
      
      // Tri alphabétique
      return results.sort((a, b) => 
        a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
      )
    },
    enabled: debouncedSearch.length >= 2 && !!districtId,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  })
  
  return {
    quarters,
    isLoading,
    searchTerm,
    setSearchTerm,
  }
}
```

## 📚 Références

- [Documentation React Query - Cache](https://tanstack.com/query/latest/docs/react/guides/caching)
- [Documentation React Query - Stale Time](https://tanstack.com/query/latest/docs/react/guides/important-defaults)
- [Documentation principale](./README.md)
- [Pattern Optimistic Update](./README.md#-design-pattern--cascading-dependent-selection-avec-optimistic-updates)
