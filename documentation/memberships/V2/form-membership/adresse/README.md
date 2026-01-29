# Documentation - Step2 Adresse (Formulaire d'Adhésion)

## 📋 Vue d'ensemble

Le **Step2** du formulaire d'ajout de membership (`/memberships/add`) gère la saisie de l'adresse de résidence via une cascade géographique :
- **Province** → **Ville (Commune)** → **Arrondissement (District)** → **Quartier (Quarter)**

Le composant utilise des **Combobox** avec recherche et permet aux admins de créer rapidement de nouvelles entités géographiques via des modals.

## 🎯 Concept

L'idée du composant est **excellente** :
- ✅ Interface intuitive avec cascade automatique
- ✅ Recherche dans les listes (avec debounce et cache)
- ✅ Création rapide pour les admins
- ✅ Validation en temps réel
- ✅ Responsive design
- ✅ Gestion optimisée du cache (chargement complet vs recherche selon le volume)

**MAIS** le composant **bug trop** en production, notamment lors de l'ajout de nouvelles villes/communes.

## 💾 Stratégies de Chargement et Cache

**IMPORTANT** : Les stratégies de chargement varient selon le volume de données :

| Niveau | Volume | Stratégie | Recherche |
|--------|--------|-----------|-----------|
| **Provinces** | 9 | Chargement complet | ❌ Non |
| **Départements** | ~50-60 | Chargement par province | 🟡 Optionnelle |
| **Communes** | Élevé par province | **Chargement initial + Recherche** (hybride) | 🟡 Optionnelle |
| **Districts** | Max 7/commune | Chargement complet | ❌ Non |
| **Quarters** | Variable par arrondissement | **Chargement initial + Recherche** (hybride) | 🟡 Optionnelle |

**Gestion du cache** :
- **Provinces** : Cache 30 min (données stables)
- **Départements** : Cache 30 min par province
- **Communes** : Cache 5 min par département (chargement initial) + cache 5 min par terme de recherche
- **Districts** : Cache 30 min par commune
- **Quarters** : Cache 5 min par arrondissement (chargement initial) + cache 5 min par terme de recherche

Voir **[CACHE-ET-CAS-CRITIQUES.md](./CACHE-ET-CAS-CRITIQUES.md)** pour les détails complets.

## 🐛 Problèmes Identifiés

### 0. **Combobox Ville et Quartier vides à l'ouverture** (priorité haute) ✅ Résolu

**Symptôme** : Quand une province/commune/arrondissement est sélectionné, les combobox Ville et Quartier restent **vides**. L'utilisateur doit taper au moins 2 caractères pour voir des options.

**Cause** : Stratégie "recherche uniquement" — les données ne sont chargées que lors d'une recherche (min 2 chars).

**Solution** : Approche hybride — chargement initial + recherche optionnelle. Implémenté dans `CommuneCombobox` et `QuarterCombobox`. Voir **[COMMUNES-COMBOBOX-VIDE.md](./COMMUNES-COMBOBOX-VIDE.md)**.

### 1. **Ajout de ville/commune qui ne passe pas**

**Symptôme** : 
- L'admin crée une nouvelle commune via `AddCommuneModal`
- Le toast affiche "Commune créée et sélectionnée"
- Mais la commune **n'apparaît pas** dans le `CommuneCombobox`
- L'utilisateur doit fermer/réouvrir le formulaire pour voir la nouvelle commune

**Cause racine** :
- Le `CommuneCombobox` charge les communes via `useQueries` avec des clés spécifiques : `['communes', dept.id]` pour chaque département
- Quand `handleCommuneCreated` invalide `['communes']`, ça invalide **toutes** les queries communes
- **MAIS** le `CommuneCombobox` ne se rafraîchit pas immédiatement car :
  - Les queries sont désactivées (`enabled: !!selectedProvinceId && departments.length > 0`)
  - Le nouveau département de la nouvelle commune n'est peut-être pas encore chargé
  - Le `setValue('address.communeId', newCommune.id)` se fait **avant** que le cache soit réellement rafraîchi

**Code problématique** (`Step2.tsx:52-56`) :
```typescript
const handleCommuneCreated = (newCommune: Commune) => {
  queryClient.invalidateQueries({ queryKey: ['communes'] }) // ❌ Trop large, ne cible pas les queries spécifiques
  setValue('address.communeId', newCommune.id, { shouldValidate: true }) // ❌ Se fait avant que le cache soit rafraîchi
  toast.success(`Commune "${newCommune.name}" créée et sélectionnée`)
}
```

### 2. **Problème de cache React Query et stratégie de chargement**

**Symptôme** :
- Après création, même si on invalide, le `CommuneCombobox` continue d'afficher l'ancienne liste
- Il faut attendre plusieurs secondes ou fermer/réouvrir le popover
- **NOUVEAU** : Le composant essaie de charger toutes les communes (trop nombreuses) au lieu d'utiliser la recherche

**Cause** :
- `CommuneCombobox` utilise `useQueries` pour charger **toutes** les communes par département
- ❌ **Problème critique** : Il y a trop de communes au Gabon pour toutes les charger
- ❌ `staleTime: 5 * 60 * 1000` (5 minutes) empêche le refetch immédiat
- ❌ L'invalidation ne force pas un refetch immédiat si les queries sont désactivées ou en cache
- ❌ Le `useMemo` qui agrège les communes ne se recalcule pas immédiatement

**Code problématique** (`CommuneCombobox.tsx:49-61`) :
```typescript
// ❌ MAUVAIS : Essaie de charger toutes les communes
const communeQueries = useQueries({
  queries: departments.length > 0 && selectedProvinceId
    ? departments.map(dept => ({
        queryKey: ['communes', dept.id],
        queryFn: async () => { 
          // ❌ Charge TOUTES les communes du département (trop de données)
          return geographieService.getCommunesByDepartmentId(dept.id)
        },
        enabled: !!selectedProvinceId && departments.length > 0,
        staleTime: 5 * 60 * 1000, // ❌ Cache trop long
      }))
    : []
})
```

**Solution** : Utiliser la **recherche uniquement** (voir [CACHE-ET-CAS-CRITIQUES.md](./CACHE-ET-CAS-CRITIQUES.md))

### 3. **Dépendance manquante : département de la nouvelle commune**

**Symptôme** :
- Quand on crée une commune, elle est liée à un `departmentId`
- Mais le `CommuneCombobox` charge les communes par département
- Si le département de la nouvelle commune n'est pas dans la liste des départements chargés, la commune n'apparaît pas

**Cause** :
- `CommuneCombobox` charge les départements de la province : `useDepartments(selectedProvinceId)`
- Si la nouvelle commune est dans un département qui n'est pas encore chargé, elle n'apparaît pas
- Le `useQueries` ne charge que les communes des départements déjà chargés

**Code problématique** (`CommuneCombobox.tsx:44-46`) :
```typescript
const { data: departments = [], isLoading: isLoadingDepartments } = useDepartments(
  selectedProvinceId || undefined // ❌ Ne charge que les départements de la province
)
```

### 4. **Race condition : setValue vs cache refresh**

**Symptôme** :
- `setValue('address.communeId', newCommune.id)` est appelé
- Mais `selectedCommune` dans `useAddressCascade` reste `undefined` car la commune n'est pas encore dans `allCommunes`

**Cause** :
- `useAddressCascade` calcule `selectedCommune` depuis `allCommunes.find(c => c.id === selectedCommuneId)`
- `allCommunes` vient de `communeQueries` qui ne sont pas encore rafraîchies
- Donc `selectedCommune` est `undefined` même si l'ID est dans le formulaire

**Code problématique** (`useAddressCascade.ts:140`) :
```typescript
const selectedCommune = allCommunes.find(c => c.id === selectedCommuneId) // ❌ allCommunes pas encore mis à jour
```

### 5. **Invalidation trop large vs queries spécifiques**

**Symptôme** :
- `invalidateQueries({ queryKey: ['communes'] })` invalide **toutes** les queries communes
- Mais `CommuneCombobox` utilise des queries spécifiques `['communes', dept.id]`
- L'invalidation ne force pas toujours un refetch immédiat

**Solution manquante** :
- Devrait utiliser `invalidateQueries({ queryKey: ['communes'], exact: false })` pour cibler toutes les sous-queries
- Ou mieux : invalider spécifiquement les queries des départements de la province

### 6. **Pas de refetch explicite après création**

**Symptôme** :
- Après `invalidateQueries`, les queries ne se refetch pas automatiquement si elles sont désactivées ou en cache

**Solution manquante** :
- Devrait forcer un `refetch()` explicite après invalidation
- Ou utiliser `queryClient.setQueryData` pour mettre à jour le cache manuellement

## 💡 Solution Proposée

### Architecture cible

1. **Optimistic Updates** : Mettre à jour le cache **immédiatement** après création
2. **Invalidation ciblée** : Invalider les queries spécifiques, pas toutes
3. **Refetch explicite** : Forcer le refetch des queries actives
4. **Synchronisation** : S'assurer que `setValue` et le cache sont synchronisés

### Implémentation

#### 1. Modifier `handleCommuneCreated` dans `Step2.tsx`

```typescript
const handleCommuneCreated = async (newCommune: Commune) => {
  // 1. Mettre à jour le cache OPTIMISTICALLY
  const departments = await queryClient.ensureQueryData({
    queryKey: ['departments', selectedIds.provinceId],
    queryFn: async () => {
      const service = ServiceFactory.getGeographieService()
      return service.getDepartmentsByProvinceId(selectedIds.provinceId)
    }
  })
  
  // Trouver le département de la nouvelle commune
  const communeDepartment = departments.find(d => d.id === newCommune.departmentId)
  
  if (communeDepartment) {
    // Mettre à jour le cache de la query spécifique
    queryClient.setQueryData(['communes', communeDepartment.id], (old: Commune[] = []) => {
      // Vérifier si la commune existe déjà (éviter doublons)
      if (old.some(c => c.id === newCommune.id)) return old
      return [...old, newCommune].sort((a, b) => 
        a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
      )
    })
  }
  
  // 2. Invalider toutes les queries communes (pour forcer refetch)
  await queryClient.invalidateQueries({ 
    queryKey: ['communes'],
    exact: false // Invalider toutes les sous-queries
  })
  
  // 3. Refetch les queries actives
  await queryClient.refetchQueries({
    queryKey: ['communes'],
    exact: false
  })
  
  // 4. SEULEMENT APRÈS le cache mis à jour, setValue
  setValue('address.communeId', newCommune.id, { shouldValidate: true })
  
  toast.success(`Commune "${newCommune.name}" créée et sélectionnée`)
}
```

#### 2. Améliorer `CommuneCombobox` pour accepter une commune "temporaire"

```typescript
// Dans CommuneCombobox.tsx, ajouter une prop pour forcer l'affichage d'une commune
interface CommuneComboboxProps {
  // ... existing props
  temporaryCommune?: Commune // Commune créée mais pas encore dans le cache
}

// Dans le useMemo allCommunes :
const allCommunes = useMemo(() => {
  const communes: Commune[] = []
  // ... existing logic
  // Ajouter la commune temporaire si elle existe
  if (temporaryCommune && !uniqueCommunes.some(c => c.id === temporaryCommune.id)) {
    uniqueCommunes.push(temporaryCommune)
  }
  return uniqueCommunes.sort(...)
}, [communeQueries, temporaryCommune])
```

#### 3. Utiliser `queryClient.setQueryData` pour mise à jour immédiate

Alternative plus simple : mettre à jour le cache **avant** `setValue` :

```typescript
const handleCommuneCreated = (newCommune: Commune) => {
  // 1. Mettre à jour TOUS les caches de communes qui pourraient contenir cette commune
  // (même si on ne connaît pas exactement le département, on met à jour tous les caches possibles)
  queryClient.setQueriesData(
    { queryKey: ['communes'] },
    (old: Commune[] | undefined) => {
      if (!old) return [newCommune]
      if (old.some(c => c.id === newCommune.id)) return old
      return [...old, newCommune].sort((a, b) => 
        a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
      )
    }
  )
  
  // 2. Invalider pour forcer refetch en arrière-plan
  queryClient.invalidateQueries({ queryKey: ['communes'], exact: false })
  
  // 3. SetValue APRÈS la mise à jour du cache
  setValue('address.communeId', newCommune.id, { shouldValidate: true })
  
  toast.success(`Commune "${newCommune.name}" créée et sélectionnée`)
}
```

#### 4. Solution alternative : Refetch explicite dans `CommuneCombobox`

Modifier `CommuneCombobox` pour exposer une méthode `refetch` et l'appeler depuis `handleCommuneCreated` :

```typescript
// Dans CommuneCombobox.tsx, utiliser useImperativeHandle
const CommuneCombobox = forwardRef((props, ref) => {
  // ... existing code
  
  useImperativeHandle(ref, () => ({
    refetch: () => {
      communeQueries.forEach(q => q.refetch())
    }
  }))
})

// Dans Step2.tsx
const communeComboboxRef = useRef<{ refetch: () => void }>(null)

const handleCommuneCreated = async (newCommune: Commune) => {
  queryClient.invalidateQueries({ queryKey: ['communes'], exact: false })
  setValue('address.communeId', newCommune.id, { shouldValidate: true })
  // Forcer le refetch du combobox
  await communeComboboxRef.current?.refetch()
  toast.success(`Commune "${newCommune.name}" créée et sélectionnée`)
}
```

## 📝 Recommandations

### Solution recommandée (la plus simple)

**Modifier `handleCommuneCreated` pour utiliser `setQueryData` + invalidation + refetch** :

```typescript
const handleCommuneCreated = async (newCommune: Commune) => {
  // 1. Mettre à jour le cache immédiatement (optimistic update)
  queryClient.setQueriesData<Commune[]>(
    { queryKey: ['communes'], exact: false },
    (old) => {
      if (!old) return [newCommune]
      // Éviter les doublons
      if (old.some(c => c.id === newCommune.id)) return old
      // Ajouter et trier
      return [...old, newCommune].sort((a, b) => 
        a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
      )
    }
  )
  
  // 2. Invalider pour forcer refetch en arrière-plan
  await queryClient.invalidateQueries({ 
    queryKey: ['communes'],
    exact: false 
  })
  
  // 3. Refetch les queries actives
  await queryClient.refetchQueries({
    queryKey: ['communes'],
    exact: false,
    type: 'active' // Seulement les queries actives (celles du CommuneCombobox ouvert)
  })
  
  // 4. SetValue APRÈS la mise à jour du cache
  setValue('address.communeId', newCommune.id, { shouldValidate: true })
  
  toast.success(`Commune "${newCommune.name}" créée et sélectionnée`)
}
```

### Améliorations supplémentaires

1. **Ajouter un état de chargement** dans `CommuneCombobox` après création
2. **Désactiver le bouton "Ajouter"** pendant le refetch
3. **Afficher un indicateur** quand une nouvelle commune est en cours de chargement
4. **Gérer les erreurs** si le refetch échoue

## 🔗 Fichiers concernés

- `src/components/register/Step2.tsx` : Composant principal
- `src/domains/infrastructure/geography/components/forms/CommuneCombobox.tsx` : Combobox de sélection
- `src/domains/infrastructure/geography/components/modals/AddCommuneModal.tsx` : Modal de création
- `src/domains/memberships/hooks/useAddressCascade.ts` : Hook de cascade

## 🎨 Design Pattern : Cascading Dependent Selection avec Optimistic Updates

### Pattern identifié

Ce problème relève d'un pattern plus complexe : **"Cascading Dependent Selection Pattern"** combiné avec **"Optimistic Update Pattern"**.

#### Le problème en détail

Le composant Step2 implémente une **cascade de sélections dépendantes** :

```
Province (niveau 1)
  └─> Charge les départements
      └─> Charge les communes (niveau 2)
          └─> Charge les districts (niveau 3)
              └─> Charge les quarters (niveau 4)
```

**Contraintes** :
1. Chaque niveau **dépend** du niveau parent
2. Changer un niveau parent **réinitialise** les niveaux enfants
3. Créer une nouvelle entité doit :
   - La **charger** dans le cache (optimistic update)
   - La **sélectionner** automatiquement
   - **Respecter la cascade** : la nouvelle entité doit être visible dans le contexte du parent sélectionné
   - **Synchroniser** avec le formulaire

**Exemple concret** :
- Province "Estuaire" sélectionnée → charge les départements de l'Estuaire
- On recherche "Libreville" → charge les communes correspondantes (recherche, pas tout charger)
- On crée une nouvelle commune "Nouvelle Ville" dans l'Estuaire
- La commune doit apparaître **immédiatement** dans le cache de recherche
- La commune doit être **sélectionnée** automatiquement
- Les districts et quarters doivent être **réinitialisés** (car la commune a changé)

**IMPORTANT** : Les communes et quarters utilisent la **recherche uniquement** (pas de chargement complet) car il y en a trop. Voir [CACHE-ET-CAS-CRITIQUES.md](./CACHE-ET-CAS-CRITIQUES.md).

### Pattern existant dans le codebase

Dans `src/hooks/caisse-imprevue/useSubscriptionCIMutations.ts`, on trouve déjà un exemple de ce pattern :

```typescript
onSuccess: (newSubscription) => {
  // 1. Invalider le cache pour recharger la liste
  queryClient.invalidateQueries({ queryKey: SUBSCRIPTIONS_QUERY_KEY })
  
  // 2. OU mettre à jour directement le cache de manière optimiste
  queryClient.setQueryData<SubscriptionCI[]>(SUBSCRIPTIONS_QUERY_KEY, (old) => {
    return old ? [newSubscription, ...old] : [newSubscription]
  })
}
```

### Pattern recommandé : "Cascading Dependent Selection avec Optimistic Updates"

Ce pattern combine 5 stratégies :

1. **Cascading Selection** : Gestion de la cascade de dépendances entre niveaux
2. **Optimistic Update** : Mise à jour immédiate du cache avant confirmation serveur
3. **Context-Aware Cache Update** : Mise à jour du cache dans le contexte du parent sélectionné
4. **Cascade Reset** : Réinitialisation des niveaux enfants lors de la sélection
5. **Stratégies de chargement adaptées** : Chargement complet vs recherche selon le volume de données (voir [CACHE-ET-CAS-CRITIQUES.md](./CACHE-ET-CAS-CRITIQUES.md))

#### Structure du pattern

```typescript
/**
 * Pattern : Cascading Dependent Selection avec Optimistic Updates
 * 
 * Gère la création d'entité dans un contexte de cascade :
 * - Mise à jour optimiste du cache dans le contexte du parent
 * - Sélection automatique de la nouvelle entité
 * - Réinitialisation en cascade des niveaux enfants
 * 
 * Étapes :
 * 1. Vérifier le contexte parent (ex: province sélectionnée)
 * 2. Mise à jour optimiste du cache dans le contexte du parent
 * 3. Invalidation ciblée des queries concernées
 * 4. Refetch explicite des queries actives
 * 5. Sélection de la nouvelle entité
 * 6. Réinitialisation en cascade des niveaux enfants
 */
interface CascadingEntityCreationOptions<T extends { id: string }> {
  queryKey: QueryKey
  parentContext?: {
    key: string // Ex: 'provinceId'
    value: string | undefined // Ex: selectedProvinceId
    getParentId: (entity: T) => string | undefined // Ex: (commune) => commune.departmentId
  }
  setValue: (id: string) => void
  resetChildren?: () => void // Réinitialiser les niveaux enfants
  filterFn?: (old: T[], entity: T, parentContext?: string) => T[]
  sortFn?: (a: T, b: T) => number
}

async function handleCascadingEntityCreated<T extends { id: string }>(
  newEntity: T,
  options: CascadingEntityCreationOptions<T>
) {
  const { queryClient } = options
  
  // 1. CONTEXT AWARENESS : Vérifier que l'entité appartient au contexte parent
  if (options.parentContext) {
    const entityParentId = options.parentContext.getParentId(newEntity)
    const selectedParentId = options.parentContext.value
    
    // Si un parent est sélectionné, vérifier que la nouvelle entité lui appartient
    if (selectedParentId && entityParentId !== selectedParentId) {
      // La nouvelle entité n'appartient pas au contexte actuel
      // On peut soit :
      // - Avertir l'utilisateur
      // - Changer le contexte parent
      // - Ignorer la sélection
      console.warn(`Entity ${newEntity.id} does not belong to parent context ${selectedParentId}`)
    }
  }
  
  // 2. CONTEXT-AWARE OPTIMISTIC UPDATE : Mettre à jour le cache dans le contexte du parent
  if (options.parentContext?.value) {
    // Mettre à jour les queries spécifiques au parent (ex: ['communes', deptId])
    const parentId = options.parentContext.getParentId(newEntity)
    if (parentId) {
      queryClient.setQueryData<T[]>(
        [...options.queryKey, parentId],
        (old) => {
          if (!old) return [newEntity]
          if (old.some(e => e.id === newEntity.id)) return old
          
          const filtered = options.filterFn
            ? options.filterFn(old, newEntity, parentId)
            : [...old, newEntity]
          
          return options.sortFn
            ? filtered.sort(options.sortFn)
            : filtered
        }
      )
    }
  }
  
  // Mettre à jour aussi toutes les queries génériques
  queryClient.setQueriesData<T[]>(
    { queryKey: options.queryKey, exact: false },
    (old) => {
      if (!old) return [newEntity]
      if (old.some(e => e.id === newEntity.id)) return old
      
      const filtered = options.filterFn
        ? options.filterFn(old, newEntity, options.parentContext?.value)
        : [...old, newEntity]
      
      return options.sortFn
        ? filtered.sort(options.sortFn)
        : filtered
    }
  )
  
  // 3. INVALIDATION : Invalider toutes les queries concernées
  await queryClient.invalidateQueries({ 
    queryKey: options.queryKey,
    exact: false
  })
  
  // 4. REFETCH : Forcer le refetch des queries actives
  await queryClient.refetchQueries({
    queryKey: options.queryKey,
    exact: false,
    type: 'active'
  })
  
  // 5. SELECTION : Sélectionner la nouvelle entité
  options.setValue(newEntity.id)
  
  // 6. CASCADE RESET : Réinitialiser les niveaux enfants
  if (options.resetChildren) {
    options.resetChildren()
  }
}
```

### Implémentation pour Step2

#### 1. Créer un hook réutilisable pour la cascade

```typescript
// src/domains/memberships/hooks/useCascadingEntityCreation.ts

import { useQueryClient } from '@tanstack/react-query'
import { QueryKey } from '@tanstack/react-query'

interface UseCascadingEntityCreationOptions<T extends { id: string }> {
  queryKey: QueryKey
  parentContext?: {
    key: string // Ex: 'provinceId'
    value: string | undefined // Ex: selectedProvinceId
    getParentId: (entity: T) => string | undefined // Ex: (commune) => commune.departmentId
  }
  resetChildren?: () => void
  filterFn?: (old: T[], entity: T, parentContext?: string) => T[]
  sortFn?: (a: T, b: T) => number
}

export function useCascadingEntityCreation<T extends { id: string }>(
  options: UseCascadingEntityCreationOptions<T>
) {
  const queryClient = useQueryClient()
  
  const handleEntityCreated = async (
    newEntity: T,
    setValue: (id: string) => void
  ) => {
    // 1. CONTEXT-AWARE OPTIMISTIC UPDATE
    // Mettre à jour les queries spécifiques au parent si disponible
    if (options.parentContext?.value) {
      const parentId = options.parentContext.getParentId(newEntity)
      if (parentId) {
        queryClient.setQueryData<T[]>(
          [...options.queryKey, parentId],
          (old) => {
            if (!old) return [newEntity]
            if (old.some(e => e.id === newEntity.id)) return old
            
            const filtered = options.filterFn
              ? options.filterFn(old, newEntity, parentId)
              : [...old, newEntity]
            
            return options.sortFn
              ? filtered.sort(options.sortFn)
              : filtered
          }
        )
      }
    }
    
    // Mettre à jour toutes les queries génériques
    queryClient.setQueriesData<T[]>(
      { queryKey: options.queryKey, exact: false },
      (old) => {
        if (!old) return [newEntity]
        if (old.some(e => e.id === newEntity.id)) return old
        
        const filtered = options.filterFn
          ? options.filterFn(old, newEntity, options.parentContext?.value)
          : [...old, newEntity]
        
        return options.sortFn
          ? filtered.sort(options.sortFn)
          : filtered
      }
    )
    
    // 2. INVALIDATION
    await queryClient.invalidateQueries({ 
      queryKey: options.queryKey,
      exact: false 
    })
    
    // 3. REFETCH ACTIF
    await queryClient.refetchQueries({
      queryKey: options.queryKey,
      exact: false,
      type: 'active'
    })
    
    // 4. SELECTION
    setValue(newEntity.id)
    
    // 5. CASCADE RESET
    if (options.resetChildren) {
      options.resetChildren()
    }
  }
  
  return { handleEntityCreated }
}
```

#### 2. Utiliser le hook dans Step2 avec gestion de la cascade

```typescript
// src/components/register/Step2.tsx

import { useCascadingEntityCreation } from '@/domains/memberships/hooks/useCascadingEntityCreation'
import type { Commune, District, Quarter } from '@/domains/infrastructure/geography/entities/geography.types'

export default function Step2({ form }: Step2Props) {
  const { setValue } = form
  const { selectedIds } = useAddressCascade({ form })
  
  // Utiliser le pattern pour les communes avec contexte parent (province)
  // IMPORTANT : Les communes utilisent la RECHERCHE uniquement (pas de chargement complet)
  // Le cache est géré par terme de recherche : ['communes', 'search', searchTerm, departmentIds]
  const { handleEntityCreated: handleCommuneCreatedOptimistic } = 
    useCascadingEntityCreation<Commune>({
      queryKey: ['communes', 'search'], // Clé de recherche, pas de chargement complet
      parentContext: {
        key: 'provinceId',
        value: selectedIds.provinceId,
        getParentId: (commune) => {
          // Trouver le département de la commune pour mettre à jour la query spécifique
          // Note: On devrait avoir accès au departmentId depuis la commune
          // Si ce n'est pas le cas, on peut le charger depuis le service
          return commune.departmentId
        }
      },
      sortFn: (a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }),
      resetChildren: () => {
        // Réinitialiser les niveaux enfants (districts et quarters)
        setValue('address.districtId', '', { shouldValidate: true })
        setValue('address.quarterId', '', { shouldValidate: true })
      }
    })
  
  const handleCommuneCreated = async (newCommune: Commune) => {
    await handleCommuneCreatedOptimistic(
      newCommune,
      (id) => setValue('address.communeId', id, { shouldValidate: true })
    )
    toast.success(`Commune "${newCommune.name}" créée et sélectionnée`)
  }
  
  // Même pattern pour les districts (chargement complet, max 7 par commune)
  const { handleEntityCreated: handleDistrictCreatedOptimistic } = 
    useCascadingEntityCreation<District>({
      queryKey: ['districts'], // Chargement complet (max 7 par commune)
      parentContext: {
        key: 'communeId',
        value: selectedIds.communeId,
        getParentId: (district) => district.communeId
      },
      sortFn: (a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }),
      resetChildren: () => {
        setValue('address.quarterId', '', { shouldValidate: true })
      }
    })
  
  // Pour les quarters : RECHERCHE uniquement (trop nombreux pour charger)
  const { handleEntityCreated: handleQuarterCreatedOptimistic } = 
    useCascadingEntityCreation<Quarter>({
      queryKey: ['quarters', 'search'], // Recherche uniquement (pas de chargement complet)
      parentContext: {
        key: 'districtId',
        value: selectedIds.districtId,
        getParentId: (quarter) => quarter.districtId
      },
      sortFn: (a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
    })
  
  const handleDistrictCreated = async (_newDistricts: any[]) => {
    // Pour les districts créés en masse, on ne sélectionne pas automatiquement
    // mais on rafraîchit le cache
    await queryClient.invalidateQueries({ queryKey: ['districts'], exact: false })
    await queryClient.refetchQueries({ queryKey: ['districts'], exact: false, type: 'active' })
    toast.success('Arrondissements créés avec succès')
  }
  
  // ... reste du code
}
```

### Autres patterns possibles

#### Pattern 2 : "Repository Pattern avec Cache"

Centraliser la logique dans le repository :

```typescript
// src/domains/infrastructure/geography/repositories/CommuneRepository.ts

class CommuneRepository {
  async create(data: CommuneFormData): Promise<Commune> {
    const newCommune = await this.firestoreCreate(data)
    
    // Mettre à jour le cache automatiquement
    this.updateCacheAfterCreate(newCommune)
    
    return newCommune
  }
  
  private updateCacheAfterCreate(commune: Commune) {
    const queryClient = getQueryClient() // Singleton ou context
    queryClient.setQueriesData<Commune[]>(
      { queryKey: ['communes'], exact: false },
      (old) => old ? [...old, commune].sort(...) : [commune]
    )
  }
}
```

#### Pattern 3 : "Event-Driven Cache Update"

Utiliser un système d'événements pour notifier les composants :

```typescript
// src/domains/infrastructure/geography/events/geographyEvents.ts

export const geographyEvents = {
  communeCreated: new EventEmitter<Commune>()
}

// Dans le modal
geographyEvents.communeCreated.emit(newCommune)

// Dans le Combobox
useEffect(() => {
  const handler = (commune: Commune) => {
    // Mettre à jour le cache local
  }
  geographyEvents.communeCreated.on(handler)
  return () => geographyEvents.communeCreated.off(handler)
}, [])
```

### Comparaison des patterns

| Pattern | Avantages | Inconvénients | Cas d'usage |
|---------|-----------|---------------|-------------|
| **Cascading Dependent Selection** | Gère les dépendances, réinitialisation automatique | Complexité accrue | ✅ **Recommandé pour Step2** (cascade géographique) |
| **Optimistic Update simple** | Réactivité immédiate, UX fluide | Ne gère pas les dépendances | Listes simples sans cascade |
| **Repository Pattern** | Centralisation, réutilisabilité | Couplage avec cache | Listes complexes |
| **Event-Driven** | Découplage total | Overhead, debugging difficile | Architecture distribuée |

### Recommandation finale

Pour le problème de Step2, utiliser le **"Cascading Dependent Selection avec Optimistic Updates"** car :
- ✅ Gère la cascade de dépendances (Province → Commune → District → Quarter)
- ✅ Mise à jour optimiste du cache dans le contexte du parent
- ✅ Réinitialisation automatique des niveaux enfants
- ✅ Réutilisable pour toutes les entités géographiques
- ✅ Cohérent avec les patterns existants dans le codebase (`useAddressCascade`)
- ✅ Facile à tester et maintenir

### Diagramme du pattern

```
┌─────────────────────────────────────────────────────────────┐
│  User Action: Créer une nouvelle commune                    │
└───────────────────────┬───────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  1. CONTEXT CHECK                                            │
│     - Province sélectionnée ? (selectedProvinceId)          │
│     - Département de la nouvelle commune ?                   │
└───────────────────────┬───────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  2. OPTIMISTIC UPDATE (Context-Aware)                       │
│     - setQueryData(['communes', deptId], [...old, new])    │
│     - setQueryData(['communes'], [...old, new])            │
└───────────────────────┬───────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  3. INVALIDATION + REFETCH                                  │
│     - invalidateQueries(['communes'], exact: false)         │
│     - refetchQueries(['communes'], type: 'active')         │
└───────────────────────┬───────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  4. SELECTION + CASCADE RESET                               │
│     - setValue('address.communeId', newCommune.id)          │
│     - setValue('address.districtId', '')  ← Reset enfant   │
│     - setValue('address.quarterId', '')    ← Reset enfant   │
└───────────────────────┬───────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  5. UI UPDATE                                               │
│     - CommuneCombobox affiche la nouvelle commune          │
│     - Commune sélectionnée automatiquement                 │
│     - DistrictCombobox et QuarterCombobox réinitialisés   │
└─────────────────────────────────────────────────────────────┘
```

## 📊 Diagrammes UML

Les diagrammes UML détaillant la fonctionnalité sont disponibles dans le dossier [`uml/`](./uml/) :

- **[Use Case V1](./uml/use-case-v1.puml)** : Fonctionnement actuel avec les bugs identifiés
- **[Use Case V2](./uml/use-case-v2.puml)** : Solution proposée avec le pattern Cascading Dependent Selection
- **[Diagramme d'Activité](./uml/activite.puml)** : Processus complet de création d'une commune (V2)
- **[Diagramme de Séquence](./uml/sequence.puml)** : Interactions entre composants lors de la création

Voir le [README des diagrammes](./uml/README.md) pour plus de détails.

## 🎨 Propositions UI/UX

Les propositions d'amélioration de l'interface utilisateur sont disponibles dans le dossier [`ui/`](./ui/) :

- **[README UI](./ui/README.md)** : Vue d'ensemble des améliorations proposées
- **[Wireframe - État initial](./ui/wireframe-etat-initial.md)** : Interface avant toute sélection
- **[Wireframe - Recherche active](./ui/wireframe-recherche-active.md)** : Interface pendant une recherche
- **[Wireframe - Sélection complète](./ui/wireframe-selection-complete.md)** : Interface avec toutes les sélections
- **[Test IDs](./ui/test-ids.md)** : Liste complète des `data-testid` pour les tests E2E

Les propositions respectent le thème KARA (Primary Dark: `#224D62`, Primary Light: `#CBB171`) et sont optimisées pour mobile, tablette et desktop.

## ☁️ Cloud Function : Nécessaire ou pas ?

### Analyse du problème

Le problème identifié est **purement frontend** :
- ✅ La création de la commune dans Firestore **fonctionne correctement**
- ❌ Le cache React Query **n'est pas synchronisé** après la création
- ❌ Le `CommuneCombobox` **n'affiche pas** la nouvelle commune immédiatement

### Flux actuel (sans Cloud Function)

```
Frontend (AddCommuneModal)
  ↓
useCommuneMutations.create()
  ↓
GeographieService.createCommune()
  ↓
CommuneRepository.create()
  ↓
Firestore.addDoc() ✅ Création réussie
  ↓
Retour au frontend avec newCommune
  ↓
invalidateQueries(['communes']) ❌ Problème ici
  ↓
setValue('address.communeId', newCommune.id) ❌ Race condition
```

### Une Cloud Function est-elle nécessaire ?

**Réponse : NON, une Cloud Function n'est PAS nécessaire** pour résoudre ce problème.

#### Pourquoi ?

1. **Le problème est frontend** : Le cache React Query est géré côté client, une Cloud Function ne peut pas le mettre à jour directement.

2. **La création fonctionne** : L'écriture dans Firestore est réussie, le problème est uniquement la synchronisation du cache.

3. **Solution frontend suffisante** : Le pattern **Cascading Dependent Selection avec Optimistic Updates** résout le problème en mettant à jour le cache **immédiatement** avant même la confirmation serveur.

4. **Pas de logique serveur complexe** : La création d'une commune est simple (ajout d'un document), pas besoin de validation complexe ou de traitement asynchrone.

#### Quand une Cloud Function serait utile ?

Une Cloud Function pourrait être ajoutée pour d'autres raisons (non liées au bug actuel) :

##### 1. **Validation côté serveur**
```typescript
// functions/src/geography/onCommuneCreated.ts
export const onCommuneCreated = onDocumentCreated(
  'communes/{communeId}',
  async (event) => {
    const commune = event.data.data()
    
    // Vérifier que le département existe
    const dept = await admin.firestore()
      .doc(`departments/${commune.departmentId}`)
      .get()
    
    if (!dept.exists) {
      // Rollback : supprimer la commune créée
      await event.data.ref.delete()
      throw new Error('Département invalide')
    }
  }
)
```

**Avantage** : Validation robuste même si le frontend est compromis  
**Inconvénient** : Complexité supplémentaire, latence

##### 2. **Génération de searchableText**
```typescript
export const onCommuneCreated = onDocumentCreated(
  'communes/{communeId}',
  async (event) => {
    const commune = event.data.data()
    
    const searchableText = [
      commune.name,
      commune.postalCode,
      commune.alias,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
    
    await event.data.ref.update({ searchableText })
  }
)
```

**Avantage** : Cohérence avec les autres entités (provinces, départements)  
**Inconvénient** : Peut être fait côté frontend aussi

##### 3. **Audit et logging**
```typescript
export const onCommuneCreated = onDocumentCreated(
  'communes/{communeId}',
  async (event) => {
    const commune = event.data.data()
    
    // Logger dans une collection d'audit
    await admin.firestore().collection('audit-logs').add({
      action: 'commune.created',
      communeId: event.params.communeId,
      createdBy: commune.createdBy,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    })
  }
)
```

**Avantage** : Traçabilité complète  
**Inconvénient** : Overhead pour une fonctionnalité simple

##### 4. **Synchronisation avec d'autres systèmes**
```typescript
export const onCommuneCreated = onDocumentCreated(
  'communes/{communeId}',
  async (event) => {
    const commune = event.data.data()
    
    // Synchroniser avec un système externe
    await syncToExternalSystem(commune)
  }
)
```

**Avantage** : Intégration avec systèmes tiers  
**Inconvénient** : Seulement si nécessaire

### Recommandation

**Pour résoudre le bug actuel : Solution frontend uniquement**

✅ Utiliser le pattern **Cascading Dependent Selection avec Optimistic Updates**  
✅ Pas besoin de Cloud Function  
✅ Solution plus simple, plus rapide, plus maintenable

**Cloud Function optionnelle (pour d'autres besoins)**

Si vous souhaitez ajouter une Cloud Function pour d'autres raisons (validation, audit, etc.), elle peut coexister avec la solution frontend, mais elle ne résoudra **pas** le problème de synchronisation du cache.

### Comparaison des approches

| Aspect | Solution Frontend (Optimistic Update) | Solution Cloud Function |
|--------|----------------------------------------|-------------------------|
| **Résout le bug** | ✅ Oui | ❌ Non (le bug est frontend) |
| **Complexité** | ⭐ Faible | ⭐⭐⭐ Élevée |
| **Latence** | ⚡ Immédiate | 🐌 Délai réseau |
| **Coût** | 💰 Gratuit | 💰💰 Coût Cloud Functions |
| **Maintenance** | 🛠️ Simple | 🛠️🛠️ Plus complexe |
| **Validation** | ⚠️ Côté client | ✅ Côté serveur |
| **Audit** | ⚠️ Limité | ✅ Complet |

### Conclusion

**Pour le problème actuel** : Solution frontend uniquement avec Optimistic Update  
**Pour d'autres besoins** : Cloud Function optionnelle mais non nécessaire pour résoudre le bug

## 💾 Gestion du Cache et Cas Critiques

La gestion du cache et les stratégies de chargement sont **cruciales** pour les performances :

- **[Cache et Cas Critiques](./CACHE-ET-CAS-CRITIQUES.md)** : Documentation complète sur :
  - Stratégies de chargement par niveau (Provinces, Départements, Communes, Districts, Quarters)
  - Gestion du cache React Query (recherche → sélection → retour)
  - Cas critiques (volumes de données, limites)
  - Tri alphabétique
  - Validation des formulaires (champs libres)

## 🧪 Tests

Les tests unitaires et d'intégration sont documentés dans le dossier [`tests/`](./tests/) :

- **[README Tests](./tests/README.md)** : Vue d'ensemble des tests
- **[Tests unitaires - Hooks](./tests/unit/hooks/README.md)** : Tests des hooks
- **[Tests unitaires - Composants](./tests/unit/components/README.md)** : Tests des composants
- **[Tests d'intégration](./tests/integration/README.md)** : Tests d'intégration complets
- **[Tests E2E](./tests/e2e/README.md)** : Tests E2E complets

Les tests sont **cruciaux** pour garantir la fiabilité du pattern Optimistic Update et de la cascade de sélection.

## 📚 Références

- Documentation React Query : [Invalidation et refetch](https://tanstack.com/query/latest/docs/react/guides/query-invalidation)
- Documentation React Query : [Optimistic Updates](https://tanstack.com/query/latest/docs/react/guides/optimistic-updates)
- **Pattern dans le codebase** : `src/hooks/caisse-imprevue/useSubscriptionCIMutations.ts` (ligne 24-26)
- **Pattern dans le codebase** : `src/hooks/useCreditSpeciale.ts` (ligne 284-305) - `onMutate` avec rollback
- **Cloud Functions existantes** : `functions/src/members/syncMembersToAlgolia.ts` (exemple de trigger Firestore)
