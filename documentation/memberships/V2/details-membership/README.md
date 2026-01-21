## V2 – Détails membre (`details-membership`)

### 1. État actuel V1

- **Page / composant principal**
  - `src/app/(admin)/memberships/[id]/page.tsx`
  - `src/components/memberships/MembershipDetails.tsx`
- **Données**
  - `useUser(userId)` (`@/hooks/useMembers`).
  - Appel direct `listContractsByMember(userId)` depuis `src/db/caisse/contracts.db` dans le composant (couplage fort avec le module caisse).
  - Navigation vers la demande d’adhésion via `routes.admin.membershipRequestDetails(user.dossier)`.
  - Lien vers d’autres vues membres (contrats caisse spéciale / imprevue, véhicules, etc.).
- **Fonctionnalités visibles en V1**
  - **Voir l’abonnement** : via `MemberSubscriptionModal.tsx` (historique et statut des abonnements d’un membre).
  - **Voir documents / dossier** : bouton « Voir le dossier » renvoyant vers `MembershipRequestDetails`, et modales de prévisualisation de documents (ex. `DocumentPreviewModal`, `IdentityDocumentModalV2` côté demandes).
  - **Liste des filleuls / parrainage** : intégration avec le module filleuls (composant `FilleulsList` / `MemberActivitySummary` qui s’appuie sur les membres).
  - **Historique des paiements** : affichage des paiements caisse / abonnements liés au membre (via `listContractsByMember`, modales de détails dans les modules caisse / subscriptions).
  - **Historique des contrats** : liste des contrats de caisse associés au membre (caisse imprevue/spéciale, placement, etc.).
- **Problèmes**
  - Composant **monolithique** (chargement, logique, UI dans un seul fichier).
  - Appels directs à la DB dans le composant → pas de service/hook de domaine.
  - Pas aligné avec le pattern déjà mis en place pour `MembershipRequestDetails` (hook agrégateur + sous‑composants).

### 2. Objectifs V2

- Garder **exactement le même rendu visuel** (layout, sections, boutons).
- Introduire :
  - Un hook agrégateur `useMembershipDetails` dans `domains/memberships/hooks` :
    - Récupération du membre, contrats associés, autres liens (véhicules, caisse, etc.).
    - Gestion des états `loading/error`.
  - Des sous‑composants de détails (identité, contacts, contrats, liens vers autres modules…), à l’image de la refactorisation faite pour `MembershipRequestDetails`.
  - Une séparation claire entre **logique de navigation** (Next router) et **logique métier** (service/hook de domaine).

### 3. Plan des sous‑composants V2

#### 3.1 Hook agrégateur

- **`useMembershipDetails`** (`src/domains/memberships/hooks/useMembershipDetails.ts` – à créer)
  - Entrées :
    - `memberId: string`
  - Agrège :
    - `MemberRepositoryV2.getById(memberId)` (données de base du membre).
    - `SubscriptionRepositoryV2.getByMemberId(memberId)` (historique abonnements).
    - `CaisseContractsRepositoryV2.listByMember(memberId)` (contrats caisse spéciale / imprevue).
    - Éventuellement : `FilleulsRepository.getByParrain(memberId)` (filleuls / parrainage).
  - États retournés :
    - `member`, `subscriptions`, `contracts`, `filleuls`, `payments`, etc.
    - `isLoading`, `isError`, `error`.
  - Actions / handlers :
    - `onOpenSubscriptionHistory()`
    - `onOpenMembershipRequest()`
    - `onOpenContracts(moduleKey)`

#### 3.2 Sous‑composants de détails (UI)

Dans `src/domains/memberships/components/details/` :

- **`MemberDetailsHeader.tsx`**
  - Titre (nom du membre, matricule).
  - Badges de statut (abonnement valide/expiré, type de membre).
  - Boutons d’actions principales (Voir abonnement, Voir dossier, Aller vers véhicules / contrats).

- **`MemberIdentityCard.tsx`**
  - Informations d’identité : civilité, nom, prénom, date/lieu de naissance, nationalité, état civil, etc.
  - Photo du membre (si disponible) ou avatar fallback.

- **`MemberContactCard.tsx`**
  - Téléphones, email principal / secondaires.
  - Boutons « appeler » / « envoyer un email » (icônes).

- **`MemberAddressCard.tsx`**
  - Adresse : province, ville, quartier, arrondissement, complément.
  - Map ou simple affichage formaté (en s’inspirant de `formatAddress` côté demandes).

- **`MemberSubscriptionCard.tsx`**
  - Statut d’abonnement actuel (actif/expiré/aucun).
  - Dates début/fin de la dernière subscription.
  - Bouton « Voir l’historique » qui ouvre `MemberSubscriptionModal` (ou équivalent V2).

- **`MemberDocumentsCard.tsx`**
  - Lien « Voir le dossier » → `MembershipRequestDetails` (page déjà refactorée).
  - Résumé des pièces d’identité / documents clés (si remontés par le hook).
  - Bouton de prévisualisation PDF (si disponible).

- **`MemberFilleulsCard.tsx`**
  - Liste (ou compteur) des filleuls liés au membre.
  - Lien vers page dédiée filleuls / parrainage si existante.

- **`MemberPaymentsCard.tsx`**
  - Résumé des paiements (caisse, abonnements) : nombre, total.
  - Lien/CTA vers vues détaillées paiements (modules caisse / subscriptions).

- **`MemberContractsCard.tsx`**
  - Liste des contrats liés au membre (caisse spéciale, caisse imprevue, placements, etc.).
  - CTA « Voir les contrats caisse spéciale », « Voir les contrats caisse imprevue », etc.

- **`MemberRelationsCard.tsx`** (optionnel)
  - Regroupe les liens vers autres modules (véhicules, groupes, caisse, placements…).

### 4. Mapping V1 → V2 (par section)

#### 4.1 Composant principal

- **V1**
  - `src/components/memberships/MembershipDetails.tsx`
  - Gère tout : chargement des données, logique métier, navigation, UI.
- **V2**
  - `src/domains/memberships/components/details/MemberDetailsPage.tsx` (ou `MembershipDetailsPage.tsx`)
    - Compose : header, cartes de sections, modales (abonnements, documents).
    - Utilise `useMembershipDetails(memberId)` pour les données.

#### 4.2 Identité / contacts / adresse

- **V1**
  - Regroupées dans la partie haute de `MembershipDetails.tsx` (carte identité).
- **V2**
  - `MemberIdentityCard.tsx`, `MemberContactCard.tsx`, `MemberAddressCard.tsx`.
  - Données fournies par `useMembershipDetails` (member.identity, member.address, etc.).

#### 4.3 Abonnements

- **V1**
  - Bouton « Voir l’abonnement » dans `MembershipDetails.tsx` qui ouvre `MemberSubscriptionModal.tsx`.
  - Données abonnement récupérées via hooks/services existants (en direct).
- **V2**
  - `MemberSubscriptionCard.tsx` :
    - Affiche le statut d’abonnement et la dernière subscription.
    - Bouton « Voir l’historique » → modal dédiée (réutilisation ou refactor de `MemberSubscriptionModal` dans le domaine memberships).
  - Hook `useMembershipDetails` alimente la section avec `subscriptions` / `lastSubscription`.

#### 4.4 Documents / dossier

- **V1**
  - Bouton « Voir le dossier » dans `MembershipDetails.tsx` → route `MembershipRequestDetails`.
  - Prévisualisations de documents via modales spécifiques (côté demandes).
- **V2**
  - `MemberDocumentsCard.tsx` :
    - Conserve le bouton « Voir le dossier » (navigation identique).
    - Affiche un résumé des documents clés si exposés par le hook.
    - Utilise les mêmes patterns que `DetailsDocumentsCard` côté `membership-requests/details`.

#### 4.5 Filleuls / parrainage

- **V1**
  - Intégré dans `MembershipDetails.tsx` via un composant ou une section filleuls (ex. `FilleulsList`, `MemberActivitySummary`).
- **V2**
  - `MemberFilleulsCard.tsx` :
    - Liste ou compteur des filleuls.
    - CTA vers une vue détaillée parrainage le cas échéant.
  - Données fournies par un repository/service dédié (ex. `FilleulsRepository`) appelé depuis `useMembershipDetails`.

#### 4.6 Paiements / contrats

- **V1**
  - Appels directs à `listContractsByMember(userId)` (`src/db/caisse/contracts.db`) dans `MembershipDetails.tsx`.
  - Mélange paiement / contrats / logique de caisse dans le composant.
- **V2**
  - `MemberPaymentsCard.tsx` :
    - Résumé paiements (nombre, total, derniers paiements).
    - Lien vers écrans caisse / paiements détaillés.
  - `MemberContractsCard.tsx` :
    - Liste des contrats (par type : caisse spéciale/imprevue, placements…).
    - Lien vers écrans de gestion contrats.
  - Données fournies par un service de domaine (ex. `MemberFinancialService`) qui encapsule les appels à `contracts.db` / autres DB.

#### 4.7 Liens vers autres modules

- **V1**
  - Boutons/links dans `MembershipDetails.tsx` (vers véhicules, groupes, caisse, placements, etc.).
- **V2**
  - `MemberRelationsCard.tsx` :
    - Regroupe les liens vers autres modules (véhicules, groupes, caisse spéciale, caisse imprevue, placements).
  - Navigation gérée par des handlers dédiés (ex. `onGoToVehicles(memberId)`, `onGoToCaisseSpeciale(memberId)`), fournis par un petit hook d’UI ou un service de navigation.

#### 4.8 Navigation vers demande d’adhésion

- **V1**
  - Lien direct dans `MembershipDetails.tsx` vers `routes.admin.membershipRequestDetails(user.dossier)`.
- **V2**
  - Conserver la navigation, mais :
    - L’encapsuler dans un handler `onOpenMembershipRequest()` exposé par `useMembershipDetails` ou un hook d’UI.
    - L’utiliser dans `MemberDocumentsCard.tsx` (bouton « Voir le dossier »).

> Ce mapping servira de base au `workflow/README.md` (phases d’implémentation) et à la définition des tests (unitaires + intégration) pour `details-membership`.

