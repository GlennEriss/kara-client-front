# Contrats de données V2 – Détails membre

## 1. Vue d'ensemble

Ce document définit les contrats de données (types, interfaces) nécessaires pour la vue détails membre V2.

## 2. Type `MembershipDetailsViewModel`

Type agrégé contenant toutes les données nécessaires à l'affichage de la vue détails.

```typescript
export interface MembershipDetailsViewModel {
  // Données de base du membre
  member: MemberDetails | null
  
  // Abonnements
  subscriptions: Subscription[]
  lastSubscription: Subscription | null
  isSubscriptionValid: boolean
  
  // Contrats
  contracts: MemberContracts
  
  // Filleuls / Parrainage
  filleuls: Filleul[] | null
  filleulsCount: number
  
  // Documents
  documents: Document[] | null
  documentsCount: number
  
  // Paiements (résumé)
  payments: PaymentSummary | null
  
  // Métadonnées
  isLoading: boolean
  isError: boolean
  error: Error | null
}
```

## 3. Types détaillés

### 3.1 `MemberDetails`

Extension du type `User` avec des champs spécifiques à la vue détails.

```typescript
export interface MemberDetails {
  // Champs de base (depuis User)
  id: string
  matricule: string
  firstName: string
  lastName: string
  gender: string
  nationality: string
  email?: string
  contacts?: string[]
  profession?: string
  companyName?: string
  hasCar: boolean
  photoURL?: string
  address?: Address
  dossier?: string // ID de la demande d'adhésion
  
  // Champs calculés / enrichis
  fullName: string // `${firstName} ${lastName}`
  displayName: string // Nom formaté pour affichage
  nationalityName: string // Nom de la nationalité (via getNationalityName)
}
```

### 3.2 `MemberContracts`

Regroupe tous les contrats associés au membre, organisés par type.

```typescript
export interface MemberContracts {
  // Contrats Caisse Spéciale
  caisseSpeciale: Contract[]
  caisseSpecialeCount: number
  hasActiveCaisseSpeciale: boolean
  
  // Contrats Caisse Imprevue
  caisseImprevue: Contract[]
  caisseImprevueCount: number
  hasActiveCaisseImprevue: boolean
  
  // Contrats Placement (si applicable)
  placements: Contract[]
  placementsCount: number
  
  // Total
  totalCount: number
}
```

### 3.3 `PaymentSummary`

Résumé des paiements du membre.

```typescript
export interface PaymentSummary {
  // Paiements abonnements
  subscriptionPayments: {
    count: number
    total: number
    lastPayment?: Payment
  }
  
  // Paiements caisse
  caissePayments: {
    count: number
    total: number
    lastPayment?: Payment
  }
  
  // Total général
  totalCount: number
  totalAmount: number
}
```

### 3.4 `Filleul`

Information sur un filleul (simplifié pour la vue détails).

```typescript
export interface Filleul {
  id: string
  matricule: string
  firstName: string
  lastName: string
  photoURL?: string
  createdAt: Date
}
```

### 3.5 `Document`

Document associé au membre (simplifié pour la vue détails).

```typescript
export interface Document {
  id: string
  type: DocumentType
  name: string
  url?: string
  createdAt: Date
}
```

## 4. Repositories V2 à utiliser

### 4.1 `MembersRepositoryV2`

**Fichier** : `src/domains/memberships/repositories/MembersRepositoryV2.ts` (existe déjà)

**Méthodes utilisées** :
- `getById(memberId: string): Promise<User | null>`
  - Récupère les données de base du membre
  - Collection : `users`

### 4.2 `SubscriptionRepositoryV2` (à créer ou utiliser existant)

**Fichier** : `src/domains/subscriptions/repositories/SubscriptionRepositoryV2.ts` (à vérifier/créer)

**Méthodes nécessaires** :
- `getByMemberId(memberId: string): Promise<Subscription[]>`
  - Récupère toutes les subscriptions du membre
  - Collection : `subscriptions`
  - Filtre : `where('userId', '==', memberId)`
  - Tri : `orderBy('createdAt', 'desc')`

**Alternative** : Utiliser directement `getMemberSubscriptions(userId)` depuis `@/db/member.db` si repository n'existe pas encore.

### 4.3 `CaisseContractsRepositoryV2` (à créer)

**Fichier** : `src/domains/caisse/repositories/CaisseContractsRepositoryV2.ts` (à créer)

**Méthodes nécessaires** :
- `listByMember(memberId: string): Promise<Contract[]>`
  - Récupère tous les contrats caisse du membre
  - Collection : `caisse-contracts` (à vérifier)
  - Filtre : `where('memberId', '==', memberId)`
  - Retourne : Contrats organisés par type (caisse spéciale, caisse imprevue, placements)

**Alternative temporaire** : Utiliser directement `listContractsByMember(memberId)` depuis `@/db/caisse/contracts.db` en attendant la création du repository.

### 4.4 `FilleulsRepository` (à créer ou utiliser existant)

**Fichier** : `src/domains/filleuls/repositories/FilleulsRepository.ts` (à vérifier/créer)

**Méthodes nécessaires** :
- `getByParrain(parrainId: string): Promise<Filleul[]>`
  - Récupère tous les filleuls d'un parrain
  - Collection : `users` (filtre sur `parrainId` ou équivalent)
  - Retourne : Liste des filleuls avec informations de base

**Alternative** : Utiliser directement `useMemberWithFilleuls(memberId)` depuis `@/hooks/filleuls` si repository n'existe pas encore.

### 4.5 `DocumentsRepository` (à créer ou utiliser existant)

**Fichier** : `src/domains/documents/repositories/DocumentsRepository.ts` (à vérifier/créer)

**Méthodes nécessaires** :
- `getByMemberId(memberId: string): Promise<Document[]>`
  - Récupère tous les documents du membre
  - Collection : `documents`
  - Filtre : `where('memberId', '==', memberId)`
  - Tri : `orderBy('createdAt', 'desc')`

**Alternative** : Utiliser directement `useDocumentList({ memberId })` depuis `@/hooks/documents/useDocumentList` si repository n'existe pas encore.

### 4.6 `PaymentsRepository` (à créer ou utiliser existant)

**Fichier** : `src/domains/payments/repositories/PaymentsRepository.ts` (à vérifier/créer)

**Méthodes nécessaires** :
- `getSummaryByMemberId(memberId: string): Promise<PaymentSummary>`
  - Récupère un résumé des paiements du membre
  - Collections : `payments` (centralisé) ou `subscriptions`, `caisse-contracts`
  - Retourne : Résumé avec compteurs et totaux

**Alternative** : Calculer le résumé à partir des contrats et subscriptions récupérés.

## 5. Hook `useMembershipDetails` - Signature

```typescript
export interface UseMembershipDetailsOptions {
  memberId: string
  enabled?: boolean
}

export interface UseMembershipDetailsResult {
  // Données
  member: MemberDetails | null
  subscriptions: Subscription[]
  lastSubscription: Subscription | null
  isSubscriptionValid: boolean
  contracts: MemberContracts
  filleuls: Filleul[] | null
  filleulsCount: number
  documents: Document[] | null
  documentsCount: number
  payments: PaymentSummary | null
  
  // États
  isLoading: boolean
  isError: boolean
  error: Error | null
  
  // Actions
  refetch: () => Promise<unknown>
  
  // Handlers de navigation
  onOpenMembershipRequest: () => void
  onOpenSubscriptionHistory: () => void
  onOpenFilleuls: () => void
  onOpenContracts: (moduleKey: 'caisse-speciale' | 'caisse-imprevue' | 'placements') => void
  onOpenDocuments: () => void
  onOpenPayments: () => void
}
```

## 6. Mapping des données V1 → V2

### 6.1 Données de base
- **V1** : `useUser(userId).data` → **V2** : `useMembershipDetails(memberId).member`

### 6.2 Abonnements
- **V1** : Non affichés (mais `useMemberSubscriptions` existe) → **V2** : `useMembershipDetails(memberId).subscriptions`

### 6.3 Contrats
- **V1** : `listContractsByMember(userId)` (chargé mais non affiché) → **V2** : `useMembershipDetails(memberId).contracts`

### 6.4 Filleuls
- **V1** : Non affichés (mais `useMemberWithFilleuls` existe) → **V2** : `useMembershipDetails(memberId).filleuls`

### 6.5 Documents
- **V1** : Non affichés (mais `useDocumentList` existe) → **V2** : `useMembershipDetails(memberId).documents`

### 6.6 Paiements
- **V1** : Non affichés → **V2** : `useMembershipDetails(memberId).payments`

## 7. Services optionnels

### 7.1 `MemberFinancialService` (optionnel)

Service pour agréger les données financières (paiements, contrats).

**Fichier** : `src/domains/memberships/services/MemberFinancialService.ts`

**Méthodes** :
- `getPaymentSummary(memberId: string): Promise<PaymentSummary>`
- `getContractsSummary(memberId: string): Promise<MemberContracts>`

**Justification** : Encapsule la logique de calcul des résumés financiers.

## 8. Notes d'implémentation

### 8.1 Priorité des repositories

1. **Critique** :
   - `MembersRepositoryV2` (existe déjà)
   - `SubscriptionRepositoryV2` (à créer ou utiliser `getMemberSubscriptions`)

2. **Important** :
   - `CaisseContractsRepositoryV2` (à créer ou utiliser `listContractsByMember` temporairement)

3. **Optionnel** :
   - `FilleulsRepository` (peut utiliser hook existant temporairement)
   - `DocumentsRepository` (peut utiliser hook existant temporairement)
   - `PaymentsRepository` (peut calculer depuis contrats/subscriptions)

### 8.2 Stratégie d'implémentation progressive

1. **Phase 1** : Hook avec données de base (member, subscriptions)
2. **Phase 2** : Ajout des contrats
3. **Phase 3** : Ajout des filleuls, documents, paiements

### 8.3 Gestion des erreurs

- Chaque requête peut échouer indépendamment
- Le hook doit gérer les erreurs partielles (ex: membre chargé mais contrats en erreur)
- Exposer `isError` global et `errors` par section si nécessaire

### 8.4 Performance

- Utiliser `Promise.all()` pour paralléliser les requêtes indépendantes
- Cache React Query pour éviter les appels multiples
- `staleTime` et `gcTime` appropriés selon la fréquence de mise à jour
