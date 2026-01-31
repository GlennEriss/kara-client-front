# Réalisation à faire – Module Caisse spéciale

Ce document décrit **les fonctionnalités à implémenter** pour la caisse spéciale et fait le lien entre :

- L’architecture globale du projet : [`../architecture/ARCHITECTURE.md`](../architecture/ARCHITECTURE.md)  
- L’analyse UML / fonctionnelle dédiée au module : [`./ANALYSE_CAISSE_SPECIALE.md`](./ANALYSE_CAISSE_SPECIALE.md)
- L’analyse de la fonctionnalité "Demandes" : [`./DEMANDES_CAISSE_SPECIALE.md`](./DEMANDES_CAISSE_SPECIALE.md)

## 1. Rappels module existant

- UI & flux actuels :
  - Composants : `src/components/caisse-speciale/*`
  - Pages admin : `src/app/(admin)/caisse-speciale/*`
  - PDF / exports : `src/components/caisse-speciale/CaisseSpecialePDF*.tsx`, modals associées.
- Ce fichier doit toujours être **synchronisé** avec :
  - Les règles techniques définies dans [`ARCHITECTURE.md`](../architecture/ARCHITECTURE.md)
  - Les modèles définis dans `src/types/types.ts`
  - Les services / repositories du module.

## 2. Backlog de fonctionnalités à implémenter

> À compléter au fur et à mesure des besoins. Chaque point doit être traçable avec l'implémentation réelle (PR, commits, etc.).

- [ ] **Formaliser le cycle de vie complet d'un contrat**
  - Statuts : brouillon, validé, en cours, résilié, terminé…
  - Règles de transition de statut.
- [ ] **Uniformiser les formulaires de création / édition de contrat**
  - Schémas Zod dans `src/schemas/caisse-speciale.schema.ts`
  - Utiliser `react-hook-form` + composants UI internes.
- [ ] **Standardiser les PDF et exports**
  - Réutiliser la logique d'export et de mise en page déjà utilisée dans les autres modules (bienfaiteur, véhicules, etc.).

### UC6 – Filtrer les contrats par retard de paiement

> **Documentation détaillée** : Voir [`./UC6_FILTRAGE_RETARD.md`](./UC6_FILTRAGE_RETARD.md) pour l'implémentation complète.

- [ ] **Repository/Service**
  - Étendre les filtres de contrats pour supporter `overdueOnly: true`
  - Implémenter la logique pour identifier les contrats en retard :
    - Filtrer les contrats avec `status: 'LATE_NO_PENALTY'` ou `'LATE_WITH_PENALTY'` (déjà calculé)
    - OU filtrer les contrats avec `nextDueAt < aujourd'hui` et `status: 'ACTIVE'`
  - **Note** : Utiliser la méthode `getContractWithComputedState()` existante qui calcule déjà le statut selon les retards

- [ ] **Hooks**
  - Étendre les hooks de récupération des contrats pour accepter `overdueOnly` dans les filtres
  - Fichier : `src/hooks/useContracts.ts` ou le hook approprié

- [ ] **Composants UI**
  - Modifier `src/components/caisse-speciale/ListContracts.tsx`
  - Ajouter une structure d'onglets avec "Tous les contrats" et "Retard"
  - Implémenter la logique pour activer `overdueOnly: true` quand l'onglet "Retard" est sélectionné
  - Ajouter un badge visuel (rouge/orange) sur les contrats en retard dans la liste
  - Adapter les statistiques pour l'onglet "Retard" (afficher uniquement les stats des contrats en retard)

- [ ] **Indicateurs visuels**
  - Badge "En retard" sur les cartes/tableaux de contrats
  - Couleur différente (rouge/orange) pour les contrats en retard
  - Afficher le nombre de jours de retard si disponible (calculé via `computeDueWindow`)

- [ ] **Types**
  - Étendre les interfaces de filtres pour inclure `overdueOnly?: boolean`

### 2.0.1 – Gestion des demandes de contrats Caisse Spéciale

> **Documentation détaillée** : Voir [`./DEMANDES_CAISSE_SPECIALE.md`](./DEMANDES_CAISSE_SPECIALE.md) pour l'analyse complète.

- [ ] **Types et interfaces**
  - Ajouter `CaisseSpecialeDemand` dans `src/types/types.ts`
  - Ajouter `CaisseSpecialeDemandFilters` pour les filtres
  - Ajouter `CaisseSpecialeDemandStats` pour les statistiques
  - Ajouter les statuts : `PENDING`, `APPROVED`, `REJECTED`, `CONVERTED`

- [ ] **Repository**
  - Créer `src/repositories/caisse-speciale/ICaisseSpecialeDemandRepository.ts`
  - Créer `src/repositories/caisse-speciale/CaisseSpecialeDemandRepository.ts`
  - Implémenter :
    - `createDemand(data, customId?)` : Créer une demande avec génération d'ID
    - `getDemandById(id)` : Récupérer une demande par ID
    - `getDemandsWithFilters(filters?)` : Récupérer les demandes avec filtres (statut, type, membre, agent, dates, recherche)
    - `getDemandsStats(filters?)` : Calculer les statistiques (total, pending, approved, rejected, converted)
    - `updateDemandStatus(id, status, adminId, reason, adminName)` : Mettre à jour le statut avec traçabilité
    - `updateDemand(id, data)` : Mettre à jour une demande
  - Collection Firestore : `caisseSpecialeDemands`

- [ ] **Service**
  - Étendre `src/services/caisse-speciale/ICaisseSpecialeService.ts`
  - Étendre `src/services/caisse-speciale/CaisseSpecialeService.ts`
  - Implémenter :
    - `createDemand(data, adminId)` : Créer une demande avec validation
    - `getDemandById(id)` : Récupérer une demande
    - `getDemandsWithFilters(filters?)` : Récupérer les demandes filtrées
    - `getDemandsStats(filters?)` : Récupérer les statistiques
    - `approveDemand(demandId, adminId, reason)` : Accepter une demande (récupérer le nom de l'admin depuis la table `admins`)
    - `rejectDemand(demandId, adminId, reason)` : Refuser une demande (récupérer le nom de l'admin depuis la table `admins`)
    - `convertDemandToContract(demandId, adminId, contractData?)` : Convertir une demande acceptée en contrat

- [ ] **Hooks React Query**
  - Créer `src/hooks/caisse-speciale/useCaisseSpecialeDemands.ts`
  - Implémenter :
    - `useCaisseSpecialeDemands(filters?)` : Liste des demandes avec pagination
    - `useCaisseSpecialeDemand(id)` : Détails d'une demande
    - `useCaisseSpecialeDemandsStats(filters?)` : Statistiques (calculées globalement pour les onglets, filtrées pour les cartes)
    - `useCaisseSpecialeDemandMutations()` : Mutations (create, approve, reject, convert)

- [ ] **Schémas de validation**
  - Étendre `src/schemas/caisse-speciale.schema.ts`
  - Ajouter `caisseSpecialeDemandSchema` avec validation Zod
  - Ajouter `approveDemandSchema` et `rejectDemandSchema` pour les raisons

- [ ] **Composants UI**
  - Créer `src/components/caisse-speciale/ListDemandes.tsx` :
    - Onglets de statut (Toutes, En attente, Acceptées, Refusées, Converties)
    - Cartes de statistiques (carrousel)
    - Section de filtres (recherche, type contrat, type caisse, membre, agent, dates)
    - Liste des demandes (vue grille et vue tableau)
    - Pagination
    - Actions (actualiser, exporter Excel/PDF, nouvelle demande)
    - Alignement avec le design de `ListDemandes.tsx` du module Crédit Spéciale
  - Créer `src/components/caisse-speciale/DemandDetail.tsx` :
    - Affichage complet des informations de la demande
    - Informations de décision (agent, raison, date)
    - Lien vers le contrat si convertie
    - Actions selon le statut (accepter, refuser, créer contrat)
  - Créer `src/components/caisse-speciale/CreateDemandModal.tsx` :
    - Formulaire de création de demande
    - Sélection membre/groupe
    - Sélection type de caisse
    - Saisie montant mensuel et durée
    - Date souhaitée pour le début du contrat (obligatoire, champ date)
    - Raison (optionnel)
  - Créer `src/components/caisse-speciale/AcceptDemandModal.tsx` :
    - Modal de confirmation avec champ "Raison d'acceptation" (obligatoire)
  - Créer `src/components/caisse-speciale/RejectDemandModal.tsx` :
    - Modal de confirmation avec champ "Raison du refus" (obligatoire)
  - Créer `src/components/caisse-speciale/StatisticsCaisseSpecialeDemandes.tsx` :
    - Carrousel de statistiques (même design que Crédit Spéciale)
    - Calcul global pour les compteurs d'onglets
    - Calcul filtré pour les cartes selon l'onglet sélectionné

- [ ] **Pages**
  - Créer `src/app/(admin)/caisse-speciale/demandes/page.tsx` :
    - Page principale de liste des demandes
    - Intégration du composant `ListDemandes`
  - Créer `src/app/(admin)/caisse-speciale/demandes/[id]/page.tsx` :
    - Page de détails d'une demande
    - Intégration du composant `DemandDetail`

- [ ] **Navigation sidebar**
  - Modifier `src/components/layout/AppSidebar.tsx` :
    - Transformer "Caisse Spéciale" en menu avec sous-onglets
    - Ajouter "Demandes" et "Contrats" comme enfants
  - Modifier `src/constantes/routes.ts` :
    - Ajouter `caisseSpecialeDemandes` et `caisseSpecialeDemandDetails(id)`

- [ ] **Design et alignement**
  - Réutiliser les composants UI existants (Cards, Badges, Tables, Buttons)
  - Utiliser la même palette de couleurs que Crédit Spéciale (`#234D65`, `#2c5a73`)
  - Aligner le layout avec `/credit-speciale/demandes`
  - Même style d'onglets, statistiques, filtres

- [ ] **Exports**
  - Implémenter l'export Excel et PDF pour les demandes filtrées
  - Réutiliser la logique d'export existante

- [ ] **Notifications et Cloud Functions**
  - Intégrer `NotificationService` dans `CaisseSpecialeService.ts`
  - Créer les notifications directes dans les méthodes :
    - `createDemand()` : Notification `demand_created` pour tous les admins
    - `approveDemand()` : Notification `demand_approved` pour le membre/groupe et l'admin créateur
    - `rejectDemand()` : Notification `demand_rejected` pour le membre/groupe et l'admin créateur
    - `convertDemandToContract()` : Notification `demand_converted` pour le membre/groupe et tous les admins
  - Créer `functions/src/scheduled/caisseSpecialeDemandReminders.ts` :
    - Cloud Function `remindPendingCaisseSpecialeDemands` : Rappel quotidien à 9h00 pour les demandes en attente (3j, 7j, 14j)
    - Cloud Function `remindApprovedNotConvertedCaisseSpecialeDemands` : Rappel quotidien à 10h00 pour les demandes acceptées non converties (7j, 14j)
  - Exporter les fonctions dans `functions/src/index.ts`
  - Créer les index Firestore nécessaires :
    - `caisseSpecialeDemands` : `status` + `createdAt`, `status` + `decisionMadeAt` + `contractId`
    - `notifications` : `module` + `entityId` + `type` + `metadata.daysPending`
  - Déployer les Cloud Functions
  - Tester les notifications et les rappels automatiques

## 3. Impacts architecturaux

Pour chaque nouvelle fonctionnalité listée ci‑dessus, vérifier :

- Les impacts sur :
  - `src/repositories/caisse-speciale/*` (structure des collections Firestore, requêtes)
  - `src/services/caisse-speciale/*` (règles métier)
  - `src/hooks/caisse-speciale/*` (React Query, formats, mapping vers l’UI)
- La conformité avec les conventions décrites dans [`../architecture/ARCHITECTURE.md`](../architecture/ARCHITECTURE.md)
  - Séparation stricte Repository / Service / Hook / Composant
  - Centralisation des types dans `src/types/types.ts`

## 4. Lien avec l’analyse

- Avant toute implémentation significative, **mettre à jour** l’analyse dans [`ANALYSE_CAISSE_SPECIALE.md`](./ANALYSE_CAISSE_SPECIALE.md) :
  - Cas d’utilisation
  - Diagrammes UML (classe, séquence si besoin)
  - Contraintes métiers supplémentaires

Ce fichier sert donc de **plan d’action** pour le développement, toujours relié :

- À l’architecture globale (`../architecture/ARCHITECTURE.md`)
- À l’analyse détaillée du module (`./ANALYSE_CAISSE_SPECIALE.md`)


