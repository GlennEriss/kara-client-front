## V2 – Recherche & filtres (`recherche-memberships`)

### 1. État actuel V1

- **Recherche / filtres sur la liste**
  - `MemberFilters.tsx` + logique dans `MembershipList.tsx` (filtres, `useEffect` / `useMemo` complexes, filtrage côté client après `getMembers()`).
- **Recherche globale (hooks)**
  - `useSearchMembers(searchTerm)` dans `src/hooks/useMembers.ts` :
    - Appelle `searchMembers` dans `member.db`.
    - Utilisé par plusieurs modules (`vehicule/MemberSearchInput`, `placement`, `bienfaiteur`, `caisse-imprevue`).
- **UC5 – Recherche dans l’onglet Véhicules (doc V1)**
  - Objectif : depuis l’onglet Véhicules d’un membre, pouvoir rechercher par **nom / matricule** et sélectionner un membre.
  - Partiellement implémenté, mais sans service de domaine partagé clair côté `memberships`.

### 2. Objectifs V2

- Centraliser la **logique de recherche globale** des membres dans le domaine `memberships` :
  - Hook `useMembershipSearch`.
  - Service `MemberSearchService` réutilisable par d’autres modules (Véhicules, Caisse, Placement, etc.).
- Extraire / simplifier la logique de **filtres** :
  - Hook `useMembershipFilters` qui gère `UserFilters` (type, abonnement, hasCar, géographie, entreprise, profession…).
  - Composants de filtres purement présentatifs (`MemberFilters` V2).
- Préparer une évolution possible vers un moteur de recherche plus avancé (ex. Algolia), en s’alignant sur la doc `membership-requests/recherche`.

### 3. Plan des hooks / composants V2

#### 3.1 Hooks de recherche et filtres

- **`useMembershipSearch`** (`src/domains/memberships/hooks/useMembershipSearch.ts`) – recherche globale :
  - Entrées :
    - `searchTerm: string`
    - options (`enabled`, `limit`, `scope`, etc.).
  - Implémentation V1.5 :
    - Wrapper autour de `useSearchMembers` (legacy) pour ne pas tout casser tout de suite.
  - Implémentation V2 :
    - Wrapper autour d’un `MemberSearchRepository` (Firestore optimisé ou Algolia).
  - Retourne :
    - `results: Member[]` (ou `MemberWithSubscription[]`).
    - `isLoading`, `isError`, `error`.

- **`useMembershipFilters`** (`src/domains/memberships/hooks/useMembershipFilters.ts`) – gestion de `UserFilters` :
  - Gère :
    - `filters` (objet `UserFilters` complet).
    - `setFilter(key, value)`, `resetFilters()`, `activeFiltersCount`.
  - Encapsule la logique actuelle dispersée entre `MemberFilters.tsx` et `MembershipList.tsx`.

#### 3.2 Composants UI de recherche

Dans `src/domains/memberships/components/search/` :

- **`MembershipSearchBar.tsx`**
  - Champ texte global (nom, prénom, matricule, email).
  - Debounce (300 ms) et appel à `useMembershipSearch`.

- **`MembershipAdvancedFilters.tsx`**
  - Wrapper autour de `MemberFilters` V2.
  - Purement présentatif : reçoit `filters`, `onFiltersChange`, `onReset`.

- **`MemberSearchResults.tsx`**
  - Liste de résultats réutilisable :
    - Sur la page de liste (`liste-memberships`).
    - Dans des dialogues de sélection de membre (onglet Véhicules, etc.).

### 4. Mapping V1 → V2 (par section)

#### 4.1 Liste des membres (`MembershipList` + `MemberFilters`)

- **V1**
  - `MembershipList.tsx` :
    - Construit `UserFilters` localement.
    - Passe `filters` à `useAllMembers` (qui utilise `getMembers` + filtrage client).
  - `MemberFilters.tsx` :
    - UI + logique de mise à jour des filtres (adresse, entreprise, profession…).

- **V2**
  - `useMembershipFilters` devient la source de vérité pour `UserFilters`.
  - `MembershipList` consomme `useMembershipFilters` + `useAllMembers` (repository V2 qui applique au maximum les filtres côté Firestore).
  - `MemberFilters` devient un composant *dumb* (présentation uniquement).

#### 4.2 UC5 – Recherche Véhicules ↔ Members

- **V1**
  - Hooks utilisés :
    - `useSearchMembers` (global) dans `vehicule/MemberSearchInput.tsx` et autres modules.
  - Pas de contrat de domaine clair côté `memberships`.

- **V2**
  - `MemberSearchService` dans `domains/memberships/services/MemberSearchService.ts` :
    - Expose des méthodes comme `searchByNameOrMatricule(term: string)`.
  - `useMembershipSearch` dans `memberships` + wrappers spécifiques si besoin dans les autres domaines.
  - `MemberSearchInput` (Véhicules, Caisse, Placement) standardisé sur la même API.

#### 4.3 Stratégie d’indexation / moteur de recherche (à détailler dans `firebase/README.md`)

- **Option A – Firestore only** :
  - Ajout d’un champ `searchableText` sur `users` (concat `firstName`, `lastName`, `matricule`, `email`).
  - Index sur `roles` + `searchableText`.
- **Option B – Algolia** :
  - Index `memberships` dans Algolia, parallèle à l’index `membership-requests`.
  - `useMembershipSearch` devient un wrapper Algolia.

> Ce README est la base pour compléter : `workflow/README.md`, `firebase/README.md`, `tests/README.md`, `functions/README.md` et `notifications/README.md` de `recherche-memberships`.

