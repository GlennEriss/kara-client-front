# Réalisation à faire – Gestion des contrats Caisse Imprévue

Ce document décrit **les fonctionnalités à implémenter** pour améliorer la gestion des contrats dans le module Caisse Imprévue et fait le lien entre :

- L'architecture globale : [`../architecture/ARCHITECTURE.md`](../architecture/ARCHITECTURE.md)
- L'analyse des contrats : [`./ANALYSE_CAISSE_IMPREVUE_CONTRATS.md`](./ANALYSE_CAISSE_IMPREVUE_CONTRATS.md)
- Le système de notifications : [`../notifications/ARCHITECTURE_NOTIFICATIONS.md`](../notifications/ARCHITECTURE_NOTIFICATIONS.md)

## 1. Objectifs

- Améliorer l'interface de gestion des contrats avec des onglets par type (Tous, Journalier, Mensuel)
- Filtrer, rechercher et paginer les contrats par type
- Générer des statistiques adaptatives selon le type de contrat sélectionné
- Notifier l'admin des événements importants (création, résiliation, terminaison, versements)
- Exporter les listes de contrats en PDF et Excel

## 2. Backlog de fonctionnalités

> **Important** : Avant toute implémentation, consulter [`ANALYSE_CAISSE_IMPREVUE_CONTRATS.md`](./ANALYSE_CAISSE_IMPREVUE_CONTRATS.md) pour les détails techniques complets.

### UC1 – Lister les contrats par types

- [ ] **Repository**
  - Étendre `IContractCIRepository.list()` pour accepter un filtre `paymentFrequency`
  - Implémenter le filtrage par type dans `ContractCIRepository`

- [ ] **Service**
  - Étendre `CaisseImprevueService.getContractsCIPaginated()` pour accepter `paymentFrequency` dans les filtres

- [ ] **Hooks**
  - Étendre `useContractsCI()` pour accepter `paymentFrequency` dans les filtres

- [ ] **Composants UI**
  - Modifier `src/components/caisse-imprevue/ListContractsCISection.tsx`
  - Ajouter des onglets (Tabs) : "Tous", "Journalier", "Mensuel"
  - Implémenter la logique de filtrage par onglet
  - Conserver l'affichage existant (cartes/tableau)

### UC2 – Voir les statistiques des contrats par type

- [ ] **Service**
  - Étendre `CaisseImprevueService.getContractsCIStats()` pour accepter un paramètre `paymentFrequency`
  - Calculer les statistiques séparément pour chaque type (DAILY, MONTHLY)

- [ ] **Hooks**
  - Étendre `useContractsCIStats()` pour accepter `paymentFrequency` en paramètre

- [ ] **Composants UI**
  - Modifier `src/components/caisse-imprevue/StatisticsCI.tsx`
  - Adapter les statistiques selon l'onglet actif (Tous, Journalier, Mensuel)
  - Conserver le design existant avec carousel

### UC3 – Filtrer les listes de contrats par statut

- [ ] **Repository**
  - Le filtre par statut existe déjà dans `ContractsCIFilters`
  - Vérifier que le filtre fonctionne correctement avec les onglets

- [ ] **Composants UI**
  - Vérifier que `src/components/caisse-imprevue/FiltersCI.tsx` fonctionne avec les onglets
  - S'assurer que le filtre de statut est appliqué à l'onglet actif

### UC4 – Rechercher des contrats dans chaque onglet

- [ ] **Repository**
  - Le filtre de recherche existe déjà dans `ContractsCIFilters.search`
  - Vérifier que la recherche fonctionne avec les onglets

- [ ] **Composants UI**
  - Vérifier que `FiltersCI.tsx` applique la recherche à l'onglet actif
  - S'assurer que la recherche est limitée au type de contrat de l'onglet

### UC5 – Paginer les listes de contrats

- [ ] **Repository**
  - La pagination existe déjà dans `ContractCIRepository`
  - Vérifier que la pagination fonctionne correctement avec les filtres par type

- [ ] **Composants UI**
  - Vérifier que la pagination dans `ListContractsCISection.tsx` fonctionne avec les onglets
  - Réinitialiser la pagination lors du changement d'onglet ou de filtre

### UC6 – Notifications de création/résiliation/terminaison

- [ ] **Service**
  - Intégrer `NotificationService` dans `CaisseImprevueService`
  - Créer `createContractNotification()` pour les notifications de création
  - Créer `createContractFinishedNotification()` pour les notifications de terminaison
  - Créer `createContractCanceledNotification()` pour les notifications de résiliation
  - Appeler ces méthodes lors de la création/mise à jour de contrats dans :
    - `createContractCI()`
    - `updateContractCIStatus()` (si existe)

- [ ] **Types**
  - Ajouter les types de notifications dans `NotificationType` :
    - `contract_created`
    - `contract_finished`
    - `contract_canceled`

- [ ] **Documentation**
  - Voir [`../notifications/NF7_INTEGRATION_MEMBERSHIP_SERVICE.md`](../notifications/NF7_INTEGRATION_MEMBERSHIP_SERVICE.md) pour le pattern d'intégration

### UC7 – Notifications de versements programmés (J-1, J, J+1)

> **Note** : Cette fonctionnalité sera implémentée plus tard. Voir [`./NF7_NOTIFICATIONS_VERSEMENTS.md`](./NF7_NOTIFICATIONS_VERSEMENTS.md) pour la documentation complète.

- [ ] **Job planifié (Cloud Functions)**
  - Créer `functions/src/scheduled/caisseImprevuePaymentNotifications.ts`
  - Implémenter la logique pour vérifier les versements programmés dans la sous-collection `payments`
  - Pour chaque contrat actif :
    - Récupérer les versements avec `status: 'DUE'` ou `status: 'PARTIAL'`
    - Calculer les jours jusqu'à `dueDate`
    - Créer les notifications J-1, J, J+1 selon les règles
  - Configurer le trigger cron (quotidien à 8h00)

- [ ] **Service**
  - Créer `CaisseImprevueService.createPaymentDueNotification()`
  - Intégrer dans le job planifié

- [ ] **Types**
  - ✅ `payment_due` déjà ajouté dans `NotificationType`
  - ✅ Les métadonnées nécessaires sont déjà définies dans l'interface `Notification`

- [ ] **Documentation**
  - ✅ Documentation complète disponible dans [`./NF7_NOTIFICATIONS_VERSEMENTS.md`](./NF7_NOTIFICATIONS_VERSEMENTS.md)

### UC8 – Exporter les listes de contrats en PDF et Excel

- [x] **Service**
  - ✅ Exports implémentés directement dans `ListContractsCISection.tsx`

- [x] **Composants UI**
  - ✅ Boutons d'export Excel et PDF ajoutés dans `ListContractsCISection.tsx`
  - ✅ Fonctions d'export avec gestion des erreurs implémentées

- [x] **Format d'export**
  - ✅ Colonnes Excel/PDF : ID, Type, Membre, Statut, Montant mensuel, Nominal, Durée, Date début, Mois payés, Versements en attente
  - ✅ Respect des filtres et de la recherche
  - ✅ Respect de l'onglet actif (Tous, Journalier, ou Mensuel)

### UC9 – Filtrer les contrats par retard de paiement

> **Documentation détaillée** : Voir [`./UC9_FILTRAGE_RETARD.md`](./UC9_FILTRAGE_RETARD.md) pour l'implémentation complète.

- [ ] **Repository**
  - Étendre `IContractCIRepository.getContractsWithFilters()` pour supporter `overdueOnly: true`
  - Implémenter la méthode `filterOverdueContracts()` pour identifier les contrats en retard :
    - Récupérer tous les contrats actifs
    - Pour chaque contrat, vérifier la sous-collection `payments`
    - Filtrer les contrats ayant au moins un versement avec `status: 'DUE'` ou `'PARTIAL'` et `dueDate < aujourd'hui`
  - **Note** : Commencer avec un filtrage côté client, puis optimiser avec un champ calculé si nécessaire

- [ ] **Service**
  - Aucune modification nécessaire, le service passe simplement les filtres au repository

- [ ] **Hooks**
  - Aucune modification nécessaire, le hook passe simplement les filtres au service

- [ ] **Composants UI**
  - Modifier `src/components/caisse-imprevue/ListContractsCISection.tsx`
  - Ajouter un nouvel onglet "Retard" dans les Tabs (après "Mensuel")
  - Implémenter la logique pour activer `overdueOnly: true` quand l'onglet "Retard" est sélectionné
  - Ajouter un badge visuel (rouge/orange) sur les contrats en retard dans la liste
  - Adapter les statistiques pour l'onglet "Retard" (afficher uniquement les stats des contrats en retard)

- [ ] **Indicateurs visuels**
  - Badge "En retard" sur les cartes de contrats
  - Couleur différente (rouge/orange) pour les contrats en retard
  - Afficher le nombre de jours de retard si disponible

- [ ] **Optimisations futures (optionnel)**
  - Ajouter un champ calculé `hasOverduePayments: boolean` sur chaque contrat
  - Mettre à jour ce champ via une Cloud Function ou lors de la création/mise à jour des versements
  - Créer un index Firestore pour optimiser les requêtes

## 3. Impacts architecturaux

### 3.1. Structure des fichiers (modifications)

```
src/
  repositories/
    caisse-imprevu/
      IContractCIRepository.ts        # Étendre avec paymentFrequency
      ContractCIRepository.ts         # Implémenter le filtrage
  services/
    caisse-imprevue/
      CaisseImprevueService.ts        # Étendre avec notifications
      CaisseImprevueContractExportService.ts  # Nouveau service
  hooks/
    caisse-imprevue/
      useContractsCI.ts               # Étendre avec paymentFrequency
  components/
    caisse-imprevue/
      ListContractsCISection.tsx      # Ajouter onglets
      StatisticsCI.tsx                 # Adapter aux onglets
      FiltersCI.tsx                   # Vérifier compatibilité
```

### 3.2. Collection Firestore

- **Collection principale** : `contractsCI` (existe déjà)
- **Sous-collection** : `contractsCI/{contractId}/payments` (existe déjà pour `PaymentCI`)

### 3.3. Indexes Firestore nécessaires

1. **Index pour lister les contrats par type et statut** :
   - Collection : `contractsCI`
   - Champs : `paymentFrequency` (Ascending), `status` (Ascending), `createdAt` (Descending)
   - **Note** : Vérifier si cet index existe déjà

2. **Index pour rechercher par membre** :
   - Collection : `contractsCI`
   - Champs : `memberId` (Ascending), `createdAt` (Descending)
   - **Note** : Vérifier si cet index existe déjà

3. **Index pour les versements programmés** :
   - Sous-collection : `contractsCI/{contractId}/payments`
   - Champs : `dueDate` (Ascending), `status` (Ascending)
   - **Note** : Vérifier si cet index existe déjà

## 4. Ordre d'implémentation recommandé

1. **Phase 1 - Interface utilisateur (Onglets)** :
   - Ajouter les onglets dans `ListContractsCISection.tsx`
   - Étendre les filtres pour inclure `paymentFrequency`
   - Tester le filtrage par type

2. **Phase 2 - Statistiques adaptatives** :
   - Étendre `getContractsCIStats()` pour accepter `paymentFrequency`
   - Adapter `StatisticsCI.tsx` pour afficher les stats selon l'onglet

3. **Phase 3 - Notifications** :
   - Intégrer les notifications de création/résiliation/terminaison
   - Créer le job planifié pour les versements

4. **Phase 4 - Exports** :
   - Créer le service d'export
   - Ajouter l'interface d'export dans `ListContractsCISection.tsx`

## 5. Tests à prévoir

- Tests unitaires pour les filtres par `paymentFrequency`
- Tests d'intégration pour les hooks avec les nouveaux filtres
- Tests E2E pour les fonctionnalités principales (onglets, filtres, recherche)
- Tests des jobs planifiés (simulation)

## 6. Références

- **Architecture globale** : [`../architecture/ARCHITECTURE.md`](../architecture/ARCHITECTURE.md)
- **Analyse fonctionnelle** : [`./ANALYSE_CAISSE_IMPREVUE_CONTRATS.md`](./ANALYSE_CAISSE_IMPREVUE_CONTRATS.md)
- **Système de notifications** : [`../notifications/ARCHITECTURE_NOTIFICATIONS.md`](../notifications/ARCHITECTURE_NOTIFICATIONS.md)
- **Jobs planifiés** : [`../notifications/NF6_JOBS_PLANIFIES.md`](../notifications/NF6_JOBS_PLANIFIES.md)
- **Intégration notifications** : [`../notifications/NF7_INTEGRATION_MEMBERSHIP_SERVICE.md`](../notifications/NF7_INTEGRATION_MEMBERSHIP_SERVICE.md)

