# Analyse fonctionnelle – Module Caisse Imprévue (Gestion des contrats)

## 1. Contexte et périmètre

- **Module** : Caisse Imprévue (CI)
- **Fonctionnalité** : Gestion des contrats avec distinction entre contrats journaliers (DAILY) et mensuels (MONTHLY)
- **Objectif** : Permettre à l'admin de lister, filtrer, rechercher, paginer et exporter les contrats, avec notifications automatiques
- **Architecture** : Respecter l'architecture globale décrite dans [`../architecture/ARCHITECTURE.md`](../architecture/ARCHITECTURE.md)

## 2. Types de contrats

### 2.1. Contrat Journalier (DAILY)
- **Type** : `DAILY` (fréquence de paiement quotidienne)
- **Caractéristiques** : Versements quotidiens
- **Fréquence de paiement** : Tous les jours
- **Collection Firestore** : `contractsCI` avec `paymentFrequency: 'DAILY'`

### 2.2. Contrat Mensuel (MONTHLY)
- **Type** : `MONTHLY` (fréquence de paiement mensuelle)
- **Caractéristiques** : Versements mensuels
- **Fréquence de paiement** : Une fois par mois
- **Collection Firestore** : `contractsCI` avec `paymentFrequency: 'MONTHLY'`

## 3. Diagramme de classes (conceptuel)

```
┌─────────────────────────────────────────────────────────────┐
│                        ContractCI                            │
├─────────────────────────────────────────────────────────────┤
│ + id: string                                                │
│ + memberId: string                                          │
│ + memberFirstName: string                                   │
│ + memberLastName: string                                    │
│ + memberContacts: string[]                                  │
│ + memberEmail?: string                                      │
│ + paymentFrequency: 'DAILY' | 'MONTHLY'                    │
│ + subscriptionCIID: string                                  │
│ + subscriptionCICode: string                               │
│ + subscriptionCIAmountPerMonth: number                      │
│ + subscriptionCINominal: number                             │
│ + subscriptionCIDuration: number                            │
│ + firstPaymentDate: string                                  │
│ + status: ContractCIStatus                                   │
│ + emergencyContact: EmergencyContactCI                      │
│ + totalMonthsPaid: number                                   │
│ + isEligibleForSupport: boolean                             │
│ + currentSupportId?: string                                 │
│ + supportHistory: string[]                                 │
│ + contractStartId?: string                                 │
│ + contractCanceledId?: string                              │
│ + contractFinishedId?: string                              │
│ + earlyRefundDocumentId?: string                           │
│ + finalRefundDocumentId?: string                           │
│ + createdAt: Date                                          │
│ + updatedAt: Date                                          │
│ + createdBy: string                                        │
│ + updatedBy: string                                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              │
                    ┌─────────┴─────────┐
                    │                   │
        ┌───────────▼──────┐  ┌─────────▼──────────┐
        │  DailyContract   │  │  MonthlyContract  │
        │  (paymentFrequency│  │  (paymentFrequency│
        │   = 'DAILY')      │  │   = 'MONTHLY')   │
        └──────────────────┘  └────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      PaymentCI                              │
├─────────────────────────────────────────────────────────────┤
│ + id: string                                                │
│ + contractId: string                                        │
│ + monthIndex: number                                        │
│ + dueDate: Date                                             │
│ + amount: number                                            │
│ + status: 'DUE' | 'PAID' | 'PARTIAL'                       │
│ + paidAt?: Date                                             │
│ + accumulatedAmount: number                                 │
│ + proofUrl?: string                                         │
│ + createdAt: Date                                           │
│ + updatedAt: Date                                           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    ContractCIStatus                         │
├─────────────────────────────────────────────────────────────┤
│ Type: 'ACTIVE' | 'FINISHED' | 'CANCELED'                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    ContractsCIFilters                        │
├─────────────────────────────────────────────────────────────┤
│ + paymentFrequency?: 'DAILY' | 'MONTHLY' | 'all'           │
│ + status?: ContractCIStatus | 'all'                         │
│ + search?: string                                           │
│ + memberId?: string                                         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    ContractsCIStats                         │
├─────────────────────────────────────────────────────────────┤
│ + totalContracts: number                                     │
│ + activeContracts: number                                    │
│ + finishedContracts: number                                 │
│ + canceledContracts: number                                │
│ + totalAmount: number                                        │
│ + totalPaid: number                                         │
│ + pendingPayments: number                                   │
│ + overduePayments: number                                  │
│ + byFrequency: {                                            │
│     daily: ContractStats                                    │
│     monthly: ContractStats                                  │
│   }                                                         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      Notification                           │
├─────────────────────────────────────────────────────────────┤
│ + id: string                                                │
│ + module: 'caisse_imprevue'                                 │
│ + type: 'contract_created' | 'contract_finished' |          │
│         'contract_canceled' | 'payment_due'                │
│ + contractId: string                                        │
│ + title: string                                            │
│ + message: string                                          │
│ + isRead: boolean                                          │
│ + createdAt: Date                                          │
│ + metadata?: {                                              │
│     paymentFrequency?: 'DAILY' | 'MONTHLY'                 │
│     dueDate?: Date                                          │
│     amount?: number                                         │
│     monthIndex?: number                                     │
│   }                                                         │
└─────────────────────────────────────────────────────────────┘
```

## 4. Cas d'utilisation (Use Cases)

### UC1 – Lister les contrats par types

**Acteur** : Admin

**Objectif** : Permettre à l'admin de visualiser les contrats organisés par type de fréquence de paiement (Journalier, Mensuel, Tous)

**Préconditions** :
- L'admin est authentifié
- L'admin a accès au module Caisse Imprévue

**Scénario principal** :
1. L'admin accède à la page de gestion des contrats (`/caisse-imprevue`)
2. La page affiche trois onglets (tabs) :
   - **"Tous"** : Affiche tous les contrats (journaliers + mensuels) - Vue principale par défaut
   - **"Journalier"** : Affiche uniquement les contrats avec `paymentFrequency: 'DAILY'`
   - **"Mensuel"** : Affiche uniquement les contrats avec `paymentFrequency: 'MONTHLY'`
3. Chaque onglet affiche la liste des contrats correspondants
4. Les contrats sont affichés sous forme de cartes ou de tableau

**Scénarios alternatifs** :
- Si aucun contrat n'existe, afficher un message "Aucun contrat trouvé"
- Si un onglet est vide, afficher "Aucun contrat [journalier/mensuel]"

**Postconditions** :
- Les contrats sont affichés selon le type sélectionné
- Les statistiques sont mises à jour selon l'onglet actif

---

### UC2 – Voir les statistiques des contrats par type

**Acteur** : Admin

**Objectif** : Afficher les statistiques agrégées des contrats selon le type de fréquence de paiement sélectionné

**Préconditions** :
- L'admin est sur la page de gestion des contrats
- Un onglet est sélectionné (Tous, Journalier, ou Mensuel)

**Scénario principal** :
1. L'admin sélectionne un onglet (Tous, Journalier, ou Mensuel)
2. Les statistiques s'adaptent automatiquement au type de contrat :
   - **Onglet "Tous"** : Statistiques globales (tous types confondus)
   - **Onglet "Journalier"** : Statistiques uniquement pour les contrats avec `paymentFrequency: 'DAILY'`
   - **Onglet "Mensuel"** : Statistiques uniquement pour les contrats avec `paymentFrequency: 'MONTHLY'`
3. Les statistiques affichées incluent :
   - Nombre total de contrats
   - Nombre de contrats actifs
   - Nombre de contrats terminés
   - Nombre de contrats résiliés
   - Montant total des contrats
   - Montant total payé
   - Nombre de versements en attente
   - Nombre de versements en retard

**Scénarios alternatifs** :
- Si aucune statistique n'est disponible, afficher des valeurs à zéro

**Postconditions** :
- Les statistiques sont mises à jour selon l'onglet actif

---

### UC3 – Filtrer les listes de contrats par statut

**Acteur** : Admin

**Objectif** : Permettre à l'admin de filtrer les contrats selon leur statut

**Préconditions** :
- L'admin est sur la page de gestion des contrats
- Un onglet est sélectionné

**Scénario principal** :
1. L'admin voit un filtre de statut dans l'interface (composant `FiltersCI`)
2. L'admin sélectionne un statut dans le filtre :
   - **"Tous"** : Affiche tous les statuts
   - **"Actif"** : Affiche uniquement les contrats avec `status: 'ACTIVE'`
   - **"Terminé"** : Affiche uniquement les contrats avec `status: 'FINISHED'`
   - **"Résilié"** : Affiche uniquement les contrats avec `status: 'CANCELED'`
3. La liste des contrats est filtrée selon le statut sélectionné
4. Les statistiques sont mises à jour selon le filtre appliqué

**Scénarios alternatifs** :
- Si aucun contrat ne correspond au filtre, afficher "Aucun contrat trouvé avec ce statut"

**Postconditions** :
- La liste affichée correspond au filtre de statut sélectionné
- Le filtre est appliqué à l'onglet actif (Journalier, Mensuel, ou Tous)

---

### UC4 – Rechercher des contrats dans chaque onglet

**Acteur** : Admin

**Objectif** : Permettre à l'admin de rechercher des contrats par différents critères

**Préconditions** :
- L'admin est sur la page de gestion des contrats
- Un onglet est sélectionné

**Scénario principal** :
1. L'admin voit un champ de recherche dans l'interface (composant `FiltersCI`)
2. L'admin saisit une requête de recherche (nom du membre, ID du contrat, etc.)
3. La recherche est effectuée dans les champs suivants :
   - Nom du membre (`memberFirstName`, `memberLastName`)
   - Matricule du membre (via `memberId`)
   - ID du contrat
   - Numéro de téléphone (`memberContacts`)
4. La liste des contrats est filtrée en temps réel selon la recherche
5. Les résultats sont affichés uniquement pour l'onglet actif

**Scénarios alternatifs** :
- Si aucun résultat n'est trouvé, afficher "Aucun contrat trouvé"
- Si la recherche est vide, afficher tous les contrats de l'onglet actif

**Postconditions** :
- La liste affichée correspond aux critères de recherche
- La recherche est limitée à l'onglet actif

---

### UC5 – Paginer les listes de contrats

**Acteur** : Admin

**Objectif** : Permettre à l'admin de naviguer entre les pages de contrats

**Préconditions** :
- L'admin est sur la page de gestion des contrats
- Il y a plus de contrats que la limite par page (ex: 14 contrats par page)

**Scénario principal** :
1. L'admin voit les contrats paginés (ex: 14 par page)
2. L'admin voit les contrôles de pagination :
   - Numéros de pages
   - Bouton "Précédent"
   - Bouton "Suivant"
   - Indicateur "Page X sur Y"
3. L'admin clique sur un numéro de page ou un bouton de navigation
4. La liste se met à jour pour afficher la page sélectionnée
5. La pagination est indépendante pour chaque onglet

**Scénarios alternatifs** :
- Si l'admin change d'onglet, la pagination revient à la page 1
- Si l'admin applique un filtre, la pagination revient à la page 1

**Postconditions** :
- La page affichée correspond à la sélection de l'admin
- Les filtres et la recherche sont conservés lors de la navigation

---

### UC6 – Notifications de création/résiliation/terminaison de contrat

**Acteur** : Admin (système)

**Objectif** : Notifier automatiquement l'admin lors d'événements importants sur les contrats

**Préconditions** :
- Un contrat est créé, terminé ou résilié
- Le système de notifications est opérationnel

**Scénario principal - Création de contrat** :
1. Un nouveau contrat est créé (journalier ou mensuel)
2. Le système crée automatiquement une notification de type `contract_created`
3. La notification contient :
   - Titre : "Nouveau contrat créé"
   - Message : "Un nouveau contrat [journalier/mensuel] a été créé pour [Nom du membre]"
   - Métadonnées : contractId, paymentFrequency, memberId
4. La notification apparaît dans le centre de notifications de l'admin

**Scénario principal - Résiliation de contrat** :
1. Un contrat est résilié par l'admin ou automatiquement
2. Le système crée automatiquement une notification de type `contract_canceled`
3. La notification contient :
   - Titre : "Contrat résilié"
   - Message : "Le contrat [ID] de [Nom du membre] a été résilié"
   - Métadonnées : contractId, paymentFrequency, reason (si disponible)

**Scénario principal - Terminaison de contrat** :
1. Un contrat atteint sa date de fin ou est terminé manuellement
2. Le système crée automatiquement une notification de type `contract_finished`
3. La notification contient :
   - Titre : "Contrat terminé"
   - Message : "Le contrat [ID] de [Nom du membre] est terminé"
   - Métadonnées : contractId, paymentFrequency, endDate

**Postconditions** :
- Les notifications sont créées dans Firestore
- Les notifications apparaissent dans le centre de notifications
- Le badge de notifications est mis à jour

---

### UC7 – Notifications de versements programmés

**Acteur** : Admin (système)

**Objectif** : Notifier l'admin des versements à effectuer (J-1, J, J+1)

**Préconditions** :
- Un contrat a des versements programmés (sous-collection `payments`)
- Le système de notifications est opérationnel
- Un job planifié s'exécute quotidiennement

**Scénario principal - Notification J-1 (1 jour avant)** :
1. Le job planifié s'exécute quotidiennement (ex: à 8h00)
2. Pour chaque contrat actif, le système vérifie les versements programmés dans la sous-collection `payments`
3. Si un versement est prévu demain (J+1), une notification est créée :
   - Type : `payment_due`
   - Titre : "Versement à effectuer demain"
   - Message : "Un versement de [montant] FCFA est prévu demain pour le contrat [ID] de [Nom du membre] ([journalier/mensuel])"
   - Métadonnées : contractId, paymentFrequency, dueDate, amount, monthIndex, daysUntil: 1

**Scénario principal - Notification J (jour J)** :
1. Le job planifié s'exécute quotidiennement
2. Si un versement est prévu aujourd'hui, une notification est créée :
   - Type : `payment_due`
   - Titre : "Versement à effectuer aujourd'hui"
   - Message : "Un versement de [montant] FCFA est prévu aujourd'hui pour le contrat [ID] de [Nom du membre] ([journalier/mensuel])"
   - Métadonnées : contractId, paymentFrequency, dueDate, amount, monthIndex, daysUntil: 0

**Scénario principal - Notification J+1 (1 jour après)** :
1. Le job planifié s'exécute quotidiennement
2. Si un versement était prévu hier et n'a pas été payé (`status !== 'PAID'`), une notification est créée :
   - Type : `payment_due`
   - Titre : "Versement en retard"
   - Message : "Un versement de [montant] FCFA était prévu hier pour le contrat [ID] de [Nom du membre] ([journalier/mensuel]) et n'a pas encore été effectué"
   - Métadonnées : contractId, paymentFrequency, dueDate, amount, monthIndex, daysUntil: -1

**Règles de gestion** :
- Une seule notification par versement et par jour (éviter les doublons)
- Les notifications J+1 ne sont créées que si le versement n'a pas été marqué comme payé
- Pour les contrats journaliers, vérifier les versements quotidiens
- Pour les contrats mensuels, vérifier les versements mensuels

**Postconditions** :
- Les notifications sont créées dans Firestore
- Les notifications apparaissent dans le centre de notifications
- Le badge de notifications est mis à jour

---

### UC8 – Exporter les listes de contrats en PDF et Excel

**Acteur** : Admin

**Objectif** : Permettre à l'admin d'exporter les listes de contrats dans différents formats

**Préconditions** :
- L'admin est sur la page de gestion des contrats
- Un onglet est sélectionné (Tous, Journalier, ou Mensuel)
- Des contrats sont affichés (éventuellement filtrés)

**Scénario principal - Export Excel** :
1. L'admin clique sur le bouton "Exporter"
2. L'admin sélectionne le format "Excel" (CSV)
3. Le système génère un fichier Excel contenant :
   - Tous les contrats de l'onglet actif (avec filtres appliqués)
   - Colonnes : ID, Type (Journalier/Mensuel), Membre, Statut, Montant mensuel, Nominal, Durée, Date début, Total payé, Versements en attente
4. Le fichier est téléchargé automatiquement

**Scénario principal - Export PDF** :
1. L'admin clique sur le bouton "Exporter"
2. L'admin sélectionne le format "PDF"
3. Le système génère un fichier PDF contenant :
   - En-tête avec titre et date d'export
   - Tableau des contrats avec les mêmes colonnes que l'export Excel
   - Statistiques en bas de page
   - Pagination si nécessaire
4. Le fichier est téléchargé automatiquement

**Scénarios alternatifs** :
- Si aucun contrat n'est affiché, désactiver le bouton d'export
- Si l'export échoue, afficher un message d'erreur

**Postconditions** :
- Le fichier est téléchargé sur l'ordinateur de l'admin
- Les filtres et la recherche sont respectés dans l'export

---

### UC9 – Filtrer les contrats par retard de paiement

**Acteur** : Admin

**Objectif** : Permettre à l'admin de visualiser uniquement les contrats qui ont des versements en retard

**Préconditions** :
- L'admin est sur la page de gestion des contrats
- Des contrats existent dans le système

**Définition d'un contrat en retard** :
Un contrat est considéré en retard si :
- Le contrat a le statut `ACTIVE`
- Le contrat a au moins un versement (dans la sous-collection `payments`) avec :
  - `status: 'DUE'` ou `status: 'PARTIAL'`
  - `dueDate` < date actuelle (le versement est en retard)

**Scénario principal** :
1. L'admin voit un nouvel onglet "Retard" dans la liste des onglets (à côté de "Tous", "Journalier", "Mensuel")
2. L'admin clique sur l'onglet "Retard"
3. Le système affiche uniquement les contrats qui ont au moins un versement en retard
4. Les contrats sont affichés avec un indicateur visuel (badge, couleur) pour montrer qu'ils sont en retard
5. Les statistiques s'adaptent pour afficher uniquement les contrats en retard

**Scénarios alternatifs** :
- Si aucun contrat n'est en retard, afficher "Aucun contrat en retard"
- Les filtres de statut et de recherche restent actifs sur l'onglet "Retard"
- La pagination fonctionne normalement sur l'onglet "Retard"

**Postconditions** :
- Seuls les contrats en retard sont affichés
- Les statistiques sont mises à jour pour refléter les contrats en retard
- Les autres onglets (Tous, Journalier, Mensuel) ne sont pas affectés

---

## 5. Structure des données

### 5.1. Type ContractCI (existant)

Le type `ContractCI` existe déjà dans `src/types/types.ts` avec les champs suivants :

```typescript
export type CaisseImprevuePaymentFrequency = 'DAILY' | 'MONTHLY'
export type ContractCIStatus = 'ACTIVE' | 'FINISHED' | 'CANCELED'

export interface ContractCI {
  id: string
  memberId: string
  memberFirstName: string
  memberLastName: string
  memberContacts: string[]
  paymentFrequency: CaisseImprevuePaymentFrequency
  subscriptionCIID: string
  subscriptionCICode: string
  subscriptionCIAmountPerMonth: number
  subscriptionCINominal: number
  subscriptionCIDuration: number
  firstPaymentDate: string
  status: ContractCIStatus
  // ... autres champs
}
```

### 5.2. Type PaymentCI (existant)

Les versements sont stockés dans une sous-collection `payments` :

```typescript
export interface PaymentCI {
  id: string
  contractId: string
  monthIndex: number
  dueDate: Date
  amount: number
  status: 'DUE' | 'PAID' | 'PARTIAL'
  paidAt?: Date
  accumulatedAmount: number
  proofUrl?: string
  createdAt: Date
  updatedAt: Date
}
```

### 5.3. Type ContractsCIFilters (à étendre)

```typescript
export interface ContractsCIFilters {
  paymentFrequency?: 'DAILY' | 'MONTHLY' | 'all'
  status?: ContractCIStatus | 'all'
  search?: string
  memberId?: string
  overdueOnly?: boolean // Nouveau : filtrer uniquement les contrats en retard
}
```

## 6. Références

- **Architecture globale** : [`../architecture/ARCHITECTURE.md`](../architecture/ARCHITECTURE.md)
- **Module caisse-imprevue** : Composants existants dans `src/components/caisse-imprevue/`
- **Remboursements (retrait anticipé, remboursement final)** : [`REMBOURSEMENTS_CI.md`](./REMBOURSEMENTS_CI.md)
- **Système de notifications** : [`../notifications/ARCHITECTURE_NOTIFICATIONS.md`](../notifications/ARCHITECTURE_NOTIFICATIONS.md)
- **Jobs planifiés** : [`../notifications/NF6_JOBS_PLANIFIES.md`](../notifications/NF6_JOBS_PLANIFIES.md)

