## V2 – Liste des membres (`liste-memberships`)

### 1. État actuel V1 – Cartographie complète

#### 1.1 Pages et routes

- **Route principale** : `/memberships` (via `src/app/(admin)/memberships/page.tsx`).
- **Composant principal** : `src/components/memberships/MembershipList.tsx` (~900 lignes, monolithique).

#### 1.2 Sous-composants utilisés

- **`MemberCard.tsx`** : Carte individuelle d’un membre (grille/liste).
  - Affiche : photo, nom, matricule, statut abonnement, badges (anniversaire, type membre).
  - Actions : voir détails, voir abonnements, prévisualiser fiche d’adhésion.
- **`MemberDetailsWrapper.tsx`** : Modal wrapper pour afficher les détails d’un membre depuis la liste.
- **`MemberFilters.tsx`** : Composant de filtres avancés (~600 lignes).
  - Recherche textuelle (nom, prénom, matricule, email) avec debounce.
  - Filtres : type membre (checkbox), statut abonnement, hasCar, géographie (province → ville → arrondissement → quartier), entreprise, profession.
  - Badges de filtres actifs avec suppression individuelle.
- **`MembershipPagination.tsx`** : Pagination avec sélection d’items par page.
- **`ExportMembershipModal.tsx`** : Modal d’export (PDF/Excel).
- **`MemberStats.tsx`** : Widget de statistiques (utilisé ailleurs, pas directement dans `MembershipList`).
- **`MemberBirthdaysList.tsx`** : Widget d’anniversaires (utilisé ailleurs).

#### 1.3 Hooks et données

- **`useAllMembers(filters, page, itemsPerPage)`** (`@/hooks/useMembers.ts`) :
  - Utilise `getMembers()` de `src/db/member.db.ts`.
  - Retourne `PaginatedMembers` avec `data: MemberWithSubscription[]` et `pagination`.
- **`getMembers()`** (`src/db/member.db.ts`) :
  - Requête Firestore sur collection `users` avec filtres (rôles, type, hasCar, isActive, géographie, entreprise, profession).
  - Pagination avec curseur (`startAfter`).
  - Filtres texte/adresse/profession appliqués **côté client** après récupération.
  - Pour chaque membre, appelle `getMemberWithSubscription()` pour enrichir avec la dernière subscription.
- **Types** :
  - `User` / `MemberWithSubscription` (`src/db/member.db.ts`, `src/types/types.ts`).
  - `UserFilters` (`src/types/types.ts`) : structure des filtres.

#### 1.4 Fonctionnalités implémentées dans `MembershipList.tsx`

- **Carrousel de statistiques** (`StatsCarousel`) :
  - Hook custom `useCarousel` (drag/swipe, responsive itemsPerView).
  - Stats affichées : Total, Actifs, Expirés, Hommes, Femmes (avec pourcentages et graphiques `recharts`).
  - Calcul des stats via `useMemo` basé sur `membersWithSubscriptions`.
- **Vue grille/liste** :
  - Toggle `viewMode` ('grid' | 'list').
  - Grille responsive : `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`.
- **Pagination** :
  - Gestion de `currentPage`, `itemsPerPage` (12 par défaut).
  - Reset page à 1 quand filtres changent.
- **Actions** :
  - Bouton "Actualiser" (refetch).
  - Bouton "Exporter" (ouvre `ExportMembershipModal`).
  - Bouton "Nouveau Membre" (navigation vers `/memberships/add`).
- **Modals** :
  - `MemberDetailsWrapper` (détails membre).
  - Prévisualisation PDF fiche d’adhésion (iframe).
  - `ExportMembershipModal`.
- **Outils de debug/test** (en dev uniquement) :
  - Boutons pour créer des utilisateurs de test (avec/sans abonnement, expiré, anniversaire, etc.).
  - Boutons de debug Firebase.

#### 1.5 Problèmes identifiés

- **Monolithisme** : `MembershipList.tsx` fait tout (données, stats, carrousel, filtres, exports, debug).
- **Couplage fort** : logique métier (calcul stats, filtres) directement dans le composant.
- **Filtres mixtes** : certains côté Firestore (`getMembers`), d’autres côté client (recherche texte, adresse, profession).
- **Performance** : `getMembers` récupère chaque membre puis appelle `getMemberWithSubscription` séquentiellement (N+1 queries).
- **Tests difficiles** : impossible de tester isolément stats, filtres, carrousel, exports.

### 2. Objectifs V2

- **Conserver exactement le même design** (grille/liste, cartes, stats visuelles, carrousel, etc.).
- **Extraire la logique dans des couches dédiées** :
  - **Hook agrégateur** : `domains/memberships/hooks/useMembershipsListV2` :
    - Gère données + filtres + pagination + stats de base.
    - Consomme un repository V2 (`MembershipRepositoryV2` ou équivalent).
  - **Service de stats** : `domains/memberships/services/MembershipStatsService` :
    - Calcul des statistiques (actifs, expirés, genre, etc.).
    - Peut être consommé par le hook ou séparément.
  - **Composants présentatifs** :
    - `MembershipsListPage` (container principal).
    - `MembershipsListHeader` (titre, compteur, actions).
    - `MembershipsListStats` (carrousel de stats).
    - `MembershipsListFilters` (wrapper autour de `MemberFilters` simplifié).
    - `MembershipsListLayout` (grille/liste avec `MemberCard`).
    - `MembershipsListPagination` (wrapper autour de `MembershipPagination`).
- **Optimiser les requêtes** :
  - Éviter les N+1 queries (agréger subscriptions en batch si possible).
  - Déplacer les filtres texte/adresse/profession côté Firestore (index + requêtes) plutôt que côté client.
- **Faciliter** :
  - L’ajout d’exports (voir `../exports-memberships`).
  - L’intégration des **anniversaires** (voir `../anniversaires-memberships`).
  - L’implémentation des **tabs** (presets de filtres).
  - Les **tests unitaires / intégration** ciblés.

### 2.1 Tabs existants / prévus (V1 → V2)

Dans V2, la vue liste doit supporter des **tabs logiques** (ou filtres prédéfinis) qui s’appuient sur les données existantes :

- **Tous les membres** : vue par défaut (équivalent actuel de `MembershipList`).
- **Adhérents** : filtrage sur les membres avec adhésion / statut actif.
- **Bienfaiteurs** : membres liés à des contributions (module bienfaiteur).
- **Sympathisants** : membres/contacts sans adhésion active.
- **Abonnement valide** : membres avec abonnement en cours (dérivé de `MemberWithSubscription`).
- **Abonnement invalide / expiré** : abonnements terminés ou à renouveler.
- **Anniversaires** : onglet qui renvoie vers la fonctionnalité décrite dans `../anniversaires-memberships`.

### 3. Mapping V1 → V2 (détaillé)

#### 3.1 Composants

| V1 (actuel) | V2 (futur) | Notes |
|------------|------------|-------|
| `MembershipList.tsx` (monolithique) | `domains/memberships/components/page/MembershipsListPage.tsx` | Container principal, compose les sous-composants |
| Logique stats dans `MembershipList` | `domains/memberships/components/list/MembershipsListStats.tsx` | Carrousel de stats (reprend `StatsCarousel` interne) |
| Logique header dans `MembershipList` | `domains/memberships/components/list/MembershipsListHeader.tsx` | Titre, compteur, boutons actions |
| `MemberFilters.tsx` | `domains/memberships/components/list/MembershipsListFilters.tsx` | Wrapper simplifié, logique dans hook |
| Logique layout dans `MembershipList` | `domains/memberships/components/list/MembershipsListLayout.tsx` | Grille/liste avec `MemberCard` |
| `MembershipPagination.tsx` | `domains/memberships/components/list/MembershipsListPagination.tsx` | Wrapper, logique dans hook |
| `MemberCard.tsx` | **Conservé tel quel** (ou déplacé dans `domains/memberships/components/cards/`) | Design parfait, pas de changement |
| `MemberDetailsWrapper.tsx` | **Conservé tel quel** (ou déplacé) | Modal wrapper, pas de changement |
| `ExportMembershipModal.tsx` | **Conservé tel quel** (ou déplacé) | Voir `../exports-memberships` pour refactor |

#### 3.2 Hooks et services

| V1 (actuel) | V2 (futur) | Notes |
|------------|------------|-------|
| `useAllMembers` (`@/hooks/useMembers.ts`) | `domains/memberships/hooks/useMembershipsListV2.ts` | Hook agrégateur (données + filtres + pagination) |
| `getMembers()` (`src/db/member.db.ts`) | `domains/memberships/repositories/MembershipRepositoryV2.ts` | Repository V2 avec méthodes optimisées |
| Calcul stats dans `useMemo` | `domains/memberships/services/MembershipStatsService.ts` | Service de calcul de stats |
| `useCarousel` (interne à `MembershipList`) | `domains/memberships/utils/carousel.ts` ou hook partagé | Utilité réutilisable |

#### 3.3 Mapping des tabs (presets de filtres)

Chaque tab sera un **preset de `UserFilters`** passé au hook `useMembershipsListV2` :

| Tab | Preset de filtres `UserFilters` | Mapping Firestore / données |
|-----|--------------------------------|----------------------------|
| **Tous les membres** | `{}` (aucun filtre) | Requête `users` avec `roles: array-contains-any ['Adherant', 'Bienfaiteur', 'Sympathisant']` |
| **Adhérents** | `{ roles: ['Adherant'] }` | Filtre Firestore sur `roles: array-contains 'Adherant'` |
| **Bienfaiteurs** | `{ roles: ['Bienfaiteur'] }` | Filtre Firestore + éventuelle jointure avec contributions |
| **Sympathisants** | `{ roles: ['Sympathisant'] }` | Filtre Firestore sur `roles: array-contains 'Sympathisant'` |
| **Abonnement valide** | `{ isActive: true }` | Filtre Firestore + calcul côté client via `isSubscriptionValid` |
| **Abonnement invalide** | `{ isActive: false }` | Filtre Firestore + calcul côté client |
| **Anniversaires** | `{}` + logique spéciale | Filtre côté client sur `birthDate` (voir `../anniversaires-memberships`) |

> **Note** : Les tabs "Abonnement valide/invalide" nécessitent un enrichissement avec les subscriptions (comme actuellement via `getMemberWithSubscription`), donc la logique peut rester partiellement côté client ou nécessiter un index Firestore composite.

#### 3.4 Filtres avancés (via `MemberFilters`)

Les filtres avancés restent accessibles via le composant `MembershipsListFilters`, mais la logique de construction de requête sera dans le hook/repository V2 :

- **Recherche texte** : actuellement côté client → **à déplacer côté Firestore** (index full-text ou champ `searchableText`).
- **Filtres géographiques** : actuellement côté client → **à déplacer côté Firestore** (index composite si nécessaire).
- **Filtres entreprise/profession** : actuellement côté client → **à déplacer côté Firestore** (index si nécessaire).

> À compléter au fur et à mesure du refactor : lister les nouveaux fichiers V2 créés et ceux de V1 qui seront retirés des routes admin.

