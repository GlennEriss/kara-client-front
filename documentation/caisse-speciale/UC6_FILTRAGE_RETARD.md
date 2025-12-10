# UC6 – Filtrage des contrats par retard de paiement (Caisse Spéciale)

## 1. Contexte

Ce document décrit l'implémentation du filtrage des contrats par retard de paiement dans le module Caisse Spéciale. Cette fonctionnalité permet à l'admin de visualiser rapidement tous les contrats qui ont des versements en retard.

## 2. Définition d'un contrat en retard

Un contrat de Caisse Spéciale est considéré **en retard** si l'une des conditions suivantes est vraie :

1. Le contrat a le statut `LATE_NO_PENALTY` ou `LATE_WITH_PENALTY` (déjà calculé par le système)
2. **OU** le contrat a le statut `ACTIVE` et :
   - `nextDueAt` est défini et `nextDueAt < date actuelle` (prochain versement en retard)
   - **OU** le contrat a au moins un versement (dans la sous-collection `payments`) avec :
     - `status: 'DUE'` ou `status: 'PARTIAL'`
     - `dueAt` défini et `dueAt < date actuelle` (le versement est en retard)

## 3. Architecture

### 3.1. Extension des filtres

**Fichier** : `src/hooks/useContracts.ts` (ou le fichier de filtres approprié)

```typescript
export interface ContractFilters {
  search?: string
  status?: string | 'all'
  type?: string | 'all'
  caisseType?: string | 'all'
  overdueOnly?: boolean // Nouveau : filtrer uniquement les contrats en retard
}
```

### 3.2. Logique de détection des retards

La détection des contrats en retard peut utiliser la méthode existante `getContractWithComputedState()` qui calcule déjà le statut selon les retards.

#### Option A : Utiliser les statuts calculés (recommandé)

Les contrats avec `status: 'LATE_NO_PENALTY'` ou `'LATE_WITH_PENALTY'` sont déjà identifiés comme en retard.

**Avantages** :
- Utilise la logique existante
- Pas besoin de requêtes supplémentaires
- Performant

**Inconvénients** :
- Dépend de la mise à jour régulière des statuts

#### Option B : Vérification supplémentaire avec `nextDueAt`

En plus des statuts, vérifier `nextDueAt < aujourd'hui` pour les contrats `ACTIVE`.

## 4. Implémentation

### 4.1. Repository/Service

**Fichier** : `src/db/caisse/contracts.db.ts` ou le service approprié

```typescript
export async function getContracts(filters?: ContractFilters) {
  // ... logique existante
  
  let contracts = // ... récupération des contrats
  
  // Filtrer par retard si demandé
  if (filters?.overdueOnly) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    contracts = contracts.filter(contract => {
      // Vérifier les statuts de retard
      if (contract.status === 'LATE_NO_PENALTY' || contract.status === 'LATE_WITH_PENALTY') {
        return true
      }
      
      // Vérifier nextDueAt pour les contrats ACTIVE
      if (contract.status === 'ACTIVE' && contract.nextDueAt) {
        const nextDue = contract.nextDueAt instanceof Date 
          ? contract.nextDueAt 
          : new Date(contract.nextDueAt)
        nextDue.setHours(0, 0, 0, 0)
        
        if (nextDue < today) {
          return true
        }
      }
      
      return false
    })
  }
  
  return contracts
}
```

### 4.2. Composant UI

**Fichier** : `src/components/caisse-speciale/ListContracts.tsx`

```typescript
// Ajouter un état pour l'onglet actif
const [activeTab, setActiveTab] = useState<'all' | 'overdue'>('all')

// Ajouter les Tabs si pas déjà présents
<Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'all' | 'overdue')}>
  <TabsList className="grid w-full max-w-xl grid-cols-2">
    <TabsTrigger value="all">Tous les contrats</TabsTrigger>
    <TabsTrigger value="overdue" className="text-red-600">
      <AlertCircle className="h-4 w-4 mr-2" />
      Retard
    </TabsTrigger>
  </TabsList>
</Tabs>

// Mettre à jour les filtres
const effectiveFilters = {
  ...filters,
  overdueOnly: activeTab === 'overdue'
}
```

### 4.3. Indicateurs visuels

Ajouter un badge "En retard" sur les cartes de contrats :

```typescript
// Fonction helper pour vérifier si un contrat est en retard
const isContractOverdue = (contract: any): boolean => {
  if (contract.status === 'LATE_NO_PENALTY' || contract.status === 'LATE_WITH_PENALTY') {
    return true
  }
  
  if (contract.status === 'ACTIVE' && contract.nextDueAt) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const nextDue = contract.nextDueAt instanceof Date 
      ? contract.nextDueAt 
      : new Date(contract.nextDueAt)
    nextDue.setHours(0, 0, 0, 0)
    
    return nextDue < today
  }
  
  return false
}

// Dans la carte de contrat
{isContractOverdue(contract) && (
  <Badge variant="destructive" className="absolute top-2 right-2">
    <AlertCircle className="h-3 w-3 mr-1" />
    En retard
  </Badge>
)}
```

## 5. Optimisations futures

### 5.1. Utiliser `getContractWithComputedState()`

Pour chaque contrat, appeler `getContractWithComputedState()` qui calcule automatiquement le statut selon les retards. Cela garantit que les statuts sont toujours à jour.

### 5.2. Index Firestore

Créer un index composite pour filtrer par statut de retard :

```
Collection: caisseContracts
Champs: status (Ascending), createdAt (Descending)
```

## 6. Tests

### 6.1. Tests manuels

1. Créer un contrat avec un versement en retard
2. Vérifier que le statut est mis à jour en `LATE_NO_PENALTY` ou `LATE_WITH_PENALTY`
3. Vérifier qu'il apparaît dans l'onglet "Retard"
4. Payer le versement
5. Vérifier que le statut revient à `ACTIVE`
6. Vérifier qu'il disparaît de l'onglet "Retard"

### 6.2. Tests automatisés

- Tester la fonction `isContractOverdue()` avec différents scénarios
- Tester que les filtres combinés fonctionnent (retard + type de contrat)
- Tester la pagination avec le filtre de retard

## 7. Références

- **Analyse fonctionnelle** : [`./ANALYSE_CAISSE_SPECIALE.md`](./ANALYSE_CAISSE_SPECIALE.md)
- **Réalisation à faire** : [`./realisationAfaire.md`](./realisationAfaire.md)
- **Service de calcul de statut** : `src/services/caisse/readers.ts` (fonction `getContractWithComputedState`)

