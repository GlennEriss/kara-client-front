# UC9 – Filtrage des contrats par retard de paiement (Caisse Imprévue)

## 1. Contexte

Ce document décrit l'implémentation du filtrage des contrats par retard de paiement dans le module Caisse Imprévue. Cette fonctionnalité permet à l'admin de visualiser rapidement tous les contrats qui ont des versements en retard.

## 2. Définition d'un contrat en retard

Un contrat de Caisse Imprévue est considéré **en retard** si :

1. Le contrat a le statut `ACTIVE`
2. **ET** le contrat a au moins un versement (dans la sous-collection `contractsCI/{contractId}/payments`) avec :
   - `status: 'DUE'` ou `status: 'PARTIAL'`
   - `dueDate` défini et `dueDate < date actuelle` (le versement est en retard)

## 3. Architecture

### 3.1. Extension des filtres

**Fichier** : `src/repositories/caisse-imprevu/IContractCIRepository.ts`

```typescript
export interface ContractsCIFilters {
  search?: string
  status?: ContractCIStatus | 'all'
  paymentFrequency?: CaisseImprevuePaymentFrequency | 'all'
  memberId?: string
  overdueOnly?: boolean // Nouveau : filtrer uniquement les contrats en retard
}
```

### 3.2. Logique de détection des retards

La détection des contrats en retard peut être implémentée de deux façons :

#### Option A : Filtrage côté client (recommandé pour commencer)

1. Récupérer tous les contrats actifs
2. Pour chaque contrat, récupérer les versements de la sous-collection `payments`
3. Filtrer côté client les contrats ayant au moins un versement en retard

**Avantages** :
- Plus simple à implémenter
- Pas besoin d'index Firestore complexe
- Flexible pour des règles métier complexes

**Inconvénients** :
- Peut être plus lent avec beaucoup de contrats
- Nécessite de charger tous les versements

#### Option B : Filtrage côté Firestore (optimisé)

1. Créer un champ calculé `hasOverduePayments: boolean` sur chaque contrat
2. Mettre à jour ce champ via une Cloud Function ou lors de la création/mise à jour des versements
3. Filtrer directement par `hasOverduePayments: true`

**Avantages** :
- Plus performant
- Requêtes Firestore simples

**Inconvénients** :
- Nécessite une synchronisation du champ calculé
- Plus complexe à maintenir

**Recommandation** : Commencer avec l'Option A, puis migrer vers l'Option B si nécessaire pour les performances.

## 4. Implémentation

### 4.1. Repository

**Fichier** : `src/repositories/caisse-imprevu/ContractCIRepository.ts`

```typescript
async getContractsWithFilters(filters?: ContractsCIFilters): Promise<ContractCI[]> {
  try {
    const { collection, db, getDocs, query, orderBy, where } = await getFirestore()

    const constraints: any[] = []
    
    // Filtrer par statut si spécifié
    if (filters?.status && filters.status !== 'all') {
      constraints.push(where("status", "==", filters.status))
    } else {
      // Pour les contrats en retard, on veut uniquement les ACTIVE
      if (filters?.overdueOnly) {
        constraints.push(where("status", "==", "ACTIVE"))
      }
    }

    // Filtrer par paymentFrequency si spécifié
    if (filters?.paymentFrequency && filters.paymentFrequency !== 'all') {
      constraints.push(where("paymentFrequency", "==", filters.paymentFrequency))
    }

    constraints.push(orderBy("createdAt", "desc"))

    const q = query(
      collection(db, firebaseCollectionNames.contractsCI || "contractsCI"),
      ...constraints
    )

    const querySnapshot = await getDocs(q)
    let contracts: ContractCI[] = []

    querySnapshot.forEach((doc) => {
      const data = doc.data()
      const contract: ContractCI = {
        id: doc.id,
        ...(data as any),
        createdAt: (data.createdAt as any)?.toDate ? (data.createdAt as any).toDate() : new Date(),
        updatedAt: (data.updatedAt as any)?.toDate ? (data.updatedAt as any).toDate() : new Date(),
      }
      contracts.push(contract)
    })

    // Filtrer par recherche côté client
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase()
      contracts = contracts.filter(c =>
        c.id.toLowerCase().includes(searchLower) ||
        c.memberFirstName?.toLowerCase().includes(searchLower) ||
        c.memberLastName?.toLowerCase().includes(searchLower) ||
        c.subscriptionCICode?.toLowerCase().includes(searchLower) ||
        c.subscriptionCILabel?.toLowerCase().includes(searchLower) ||
        c.memberContacts?.some(contact => contact.toLowerCase().includes(searchLower))
      )
    }

    // Filtrer par retard de paiement (côté client)
    if (filters?.overdueOnly) {
      contracts = await this.filterOverdueContracts(contracts)
    }

    return contracts
  } catch (error) {
    console.error("Erreur lors de la récupération des contrats CI avec filtres:", error)
    return []
  }
}

/**
 * Filtre les contrats pour ne garder que ceux avec des versements en retard
 */
private async filterOverdueContracts(contracts: ContractCI[]): Promise<ContractCI[]> {
  const { collection, db, getDocs, query, where } = await getFirestore()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const overdueContracts: ContractCI[] = []

  for (const contract of contracts) {
    try {
      // Récupérer les versements du contrat
      const paymentsSnapshot = await getDocs(
        query(
          collection(db, firebaseCollectionNames.contractsCI || "contractsCI", contract.id, "payments"),
          where("status", "in", ["DUE", "PARTIAL"])
        )
      )

      // Vérifier si au moins un versement est en retard
      let hasOverdue = false
      for (const paymentDoc of paymentsSnapshot.docs) {
        const payment = paymentDoc.data()
        const dueDate = payment.dueDate?.toDate ? payment.dueDate.toDate() : null
        
        if (dueDate) {
          const dueDateNormalized = new Date(dueDate)
          dueDateNormalized.setHours(0, 0, 0, 0)
          
          if (dueDateNormalized < today) {
            hasOverdue = true
            break
          }
        }
      }

      if (hasOverdue) {
        overdueContracts.push(contract)
      }
    } catch (error) {
      console.error(`Erreur lors de la vérification des retards pour le contrat ${contract.id}:`, error)
      // En cas d'erreur, ne pas inclure le contrat
    }
  }

  return overdueContracts
}
```

### 4.2. Service

**Fichier** : `src/services/caisse-imprevue/CaisseImprevueService.ts`

Aucune modification nécessaire, le service passe simplement les filtres au repository.

### 4.3. Hook

**Fichier** : `src/hooks/caisse-imprevue/useContractsCI.ts`

Aucune modification nécessaire, le hook passe simplement les filtres au service.

### 4.4. Composant UI

**Fichier** : `src/components/caisse-imprevue/ListContractsCISection.tsx`

```typescript
// Ajouter un nouvel onglet "Retard"
const [activeTab, setActiveTab] = useState<'all' | 'DAILY' | 'MONTHLY' | 'overdue'>('all')

// Dans les Tabs
<Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'all' | 'DAILY' | 'MONTHLY' | 'overdue')}>
  <TabsList className="grid w-full max-w-2xl grid-cols-4">
    <TabsTrigger value="all">Tous</TabsTrigger>
    <TabsTrigger value="DAILY">Journalier</TabsTrigger>
    <TabsTrigger value="MONTHLY">Mensuel</TabsTrigger>
    <TabsTrigger value="overdue" className="text-red-600">
      <AlertCircle className="h-4 w-4 mr-2" />
      Retard
    </TabsTrigger>
  </TabsList>
</Tabs>

// Mettre à jour les filtres selon l'onglet actif
const effectiveFilters: ContractsCIFilters = {
  ...filters,
  paymentFrequency: activeTab === 'all' || activeTab === 'overdue' ? 'all' : activeTab,
  overdueOnly: activeTab === 'overdue'
}
```

### 4.5. Indicateurs visuels

Ajouter un badge "En retard" sur les cartes de contrats :

```typescript
// Dans la carte de contrat
{contractHasOverduePayments(contract) && (
  <Badge variant="destructive" className="absolute top-2 right-2">
    <AlertCircle className="h-3 w-3 mr-1" />
    En retard
  </Badge>
)}
```

## 5. Optimisations futures

### 5.1. Champ calculé `hasOverduePayments`

Pour améliorer les performances, on peut ajouter un champ calculé sur chaque contrat :

```typescript
export interface ContractCI {
  // ... champs existants
  hasOverduePayments?: boolean // Calculé automatiquement
  lastOverdueCheck?: Date // Date de la dernière vérification
}
```

Ce champ serait mis à jour :
- Par une Cloud Function quotidienne
- Lors de la création/mise à jour d'un versement
- Lors du paiement d'un versement

### 5.2. Index Firestore

Si on utilise le champ calculé, créer un index composite :

```
Collection: contractsCI
Champs: status (Ascending), hasOverduePayments (Ascending), createdAt (Descending)
```

## 6. Tests

### 6.1. Tests manuels

1. Créer un contrat avec un versement en retard
2. Vérifier qu'il apparaît dans l'onglet "Retard"
3. Payer le versement
4. Vérifier qu'il disparaît de l'onglet "Retard"

### 6.2. Tests automatisés

- Tester la méthode `filterOverdueContracts()` avec différents scénarios
- Tester que les filtres combinés fonctionnent (retard + type de contrat)
- Tester la pagination avec le filtre de retard

## 7. Références

- **Analyse fonctionnelle** : [`./ANALYSE_CAISSE_IMPREVUE_CONTRATS.md`](./ANALYSE_CAISSE_IMPREVUE_CONTRATS.md)
- **Réalisation à faire** : [`./realisationAfaire_contrats.md`](./realisationAfaire_contrats.md)

