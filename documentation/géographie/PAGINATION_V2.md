# Système de Pagination V2 - Géographie

## 🎯 Vue d'ensemble

Le système V2 implémente une **pagination côté serveur** et une **recherche Firestore** native, remplaçant l'approche "charger tout + filtrer en mémoire".

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         COMPOSANT V2                            │
│  ProvinceListV2, DepartmentListV2, etc.                        │
├─────────────────────────────────────────────────────────────────┤
│                         HOOKS V2                                │
│  useProvincesV2({ search, pageSize })                          │
│  → useInfiniteQuery + debounce + cache                         │
├─────────────────────────────────────────────────────────────────┤
│                      REPOSITORY V2                              │
│  getPaginated({ search, cursor, pageSize })                    │
│  → startAfter() + limit() + where()                            │
├─────────────────────────────────────────────────────────────────┤
│                        FIRESTORE                                │
│  Indexes sur searchableText + parentId                         │
└─────────────────────────────────────────────────────────────────┘
```

## 📦 Fichiers créés

### Types
- `types/pagination.types.ts` - Types génériques pour pagination

### Repositories V2
- `repositories/BaseGeographyRepository.ts` - Classe de base avec pagination
- `repositories/ProvinceRepositoryV2.ts`
- `repositories/DepartmentRepositoryV2.ts`
- `repositories/CommuneRepositoryV2.ts`
- `repositories/DistrictRepositoryV2.ts`
- `repositories/QuarterRepositoryV2.ts`

### Hooks V2
- `hooks/useGeographieV2.ts` - Tous les hooks avec:
  - `useProvincesV2(options)` → Scroll infini
  - `useProvinceMutationsV2()` → CRUD avec invalidation
  - `useGeographyStatsV2()` → Comptages avec cache

### Composants UI
- `components/ui/load-more-button.tsx` - Bouton pagination / scroll infini

## 🔍 Recherche côté serveur

### Principe
Firestore ne supporte pas la recherche full-text. On utilise :
1. Un champ `searchableText` (lowercase, sans accents)
2. Recherche par **préfixe** avec `>=` et `<=`

```typescript
// Dans BaseGeographyRepository.ts
if (search) {
  const searchLower = search.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  
  constraints.push(where('searchableText', '>=', searchLower))
  constraints.push(where('searchableText', '<=', searchLower + '\uf8ff'))
}
```

### Migration des données existantes
Exécuter le script de migration :

```bash
npx ts-node scripts/migrate-searchable-text.ts
```

## 📄 Pagination avec curseur

### Principe
Au lieu de `skip` + `limit` (coûteux en lecture), on utilise `startAfter(lastDoc)` :

```typescript
// Charger les 20 premiers
const page1 = await repo.getPaginated({ pageSize: 20 })

// Charger les 20 suivants avec le curseur
const page2 = await repo.getPaginated({ 
  pageSize: 20, 
  cursor: page1.pagination.nextCursor 
})
```

### Avantages
- ✅ Performance O(1) pour n'importe quelle page
- ✅ Pas de lecture des N premiers documents
- ✅ Cache efficace avec React Query

## 🚀 Usage dans les composants

### Hook avec recherche et scroll infini

```tsx
import { useProvincesV2 } from '@/domains/infrastructure/geography/hooks/useGeographieV2'
import { LoadMoreButton } from '@/components/ui/load-more-button'

function ProvinceListV2() {
  const [search, setSearch] = useState('')
  
  const { 
    data: provinces, 
    isLoading, 
    hasNextPage, 
    fetchNextPage, 
    isFetchingNextPage,
    totalCount 
  } = useProvincesV2({ 
    search, 
    pageSize: 20 
  })

  return (
    <div>
      <Input 
        placeholder="Rechercher..." 
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      
      <p>{totalCount} provinces au total</p>
      
      {provinces.map(p => <ProvinceCard key={p.id} {...p} />)}
      
      <LoadMoreButton
        hasMore={hasNextPage}
        isLoading={isFetchingNextPage}
        onLoadMore={fetchNextPage}
        autoLoad // Scroll infini automatique
      />
    </div>
  )
}
```

### Filtrage par parent

```tsx
const { data: departments } = useDepartmentsV2({ 
  parentId: selectedProvinceId,
  search,
  pageSize: 20 
})
```

## 🗂️ Indexes Firestore requis

Les indexes sont définis dans `firestore.indexes.json` et déployés automatiquement :

```json
{
  "indexes": [
    {
      "collectionGroup": "provinces",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "searchableText", "order": "ASCENDING" },
        { "fieldPath": "name", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "departments",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "provinceId", "order": "ASCENDING" },
        { "fieldPath": "searchableText", "order": "ASCENDING" },
        { "fieldPath": "name", "order": "ASCENDING" }
      ]
    }
    // ... autres collections
  ]
}
```

Déployer manuellement si nécessaire :
```bash
firebase deploy --only firestore:indexes
```

## 📊 Cache et performance

### React Query
- `staleTime: 5min` → Données considérées fraîches pendant 5 min
- `gcTime: 10min` → Cache gardé 10 min après dernière utilisation
- `keepPreviousData` → Garde les anciennes données pendant le chargement

### Cache de comptage
Le `getCount()` utilise un cache en mémoire avec TTL de 5 min pour éviter les requêtes répétées.

## 🔄 Migration V1 → V2

1. **Activer V2** : `NEXT_PUBLIC_GEOGRAPHY_VERSION=v2`
2. **Exécuter la migration** : `npx ts-node scripts/migrate-searchable-text.ts`
3. **Déployer les indexes** : `firebase deploy --only firestore:indexes`
4. **Mettre à jour les imports** dans les composants si nécessaire

## ⚠️ Limitations connues

1. **Recherche par préfixe uniquement** : "par" trouvera "Paris" mais pas "Libreville"
2. **Pas de recherche full-text** : Utiliser Algolia/Elasticsearch si besoin
3. **Comptage approximatif** : `getCount()` peut être légèrement décalé après mutations

## 📚 Références

- [Firestore Query Cursors](https://firebase.google.com/docs/firestore/query-data/query-cursors)
- [React Query Infinite Queries](https://tanstack.com/query/latest/docs/react/guides/infinite-queries)
- [Firestore Indexes](https://firebase.google.com/docs/firestore/query-data/indexing)
