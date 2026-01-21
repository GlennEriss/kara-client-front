## Refactor vue “Détails demande d’adhésion” (`MembershipRequestDetails`)

Contexte : la page `src/components/memberships/MembershipRequestDetails.tsx` (appelée via `app/(admin)/membership-requests/[id]/page.tsx`) est un composant très volumineux (~700+ lignes) qui embarque logique métier, utilitaires d’affichage et rendu UI dans un seul fichier. L’objectif est de documenter l’état actuel et de lister les axes de refactorisation sans changer le design UI/UX.

### Constats rapides (lecture du code actuel)
- **Composant monolithique** : utils (formatage de dates, badges, skeletons), logique de récupération, filtrage/transformations et UI sont dans un seul fichier.
- **Dépendances nombreuses** : hooks `useMembershipRequest`, `useIntermediary`, `useAuth`, accès direct à `getAdminById`, toasts, etc. Peu de séparation entre data & présentation.
- **Responsabilités mêlées** : calculs (dates expirées, statuts, formats d’adresse), gestion d’état local (chargement admin, toasts), et rendu détaillé d’identité, documents, paiement, etc.
- **Testabilité limitée** : pas de découpage par sous-sections (identité, contact, paiement, documents) → difficile de tester/composer.
- **Accessibilité/UX** : nombreuses icônes/badges/boutons, mais peu de factorisation des composants réutilisables (ex. `InfoField` inline).
- **Lecture/maintenance** : multiples fonctions utilitaires définies inline (formatDate, isDateExpired, getStatusBadge, InfoField, DetailsSkeleton, etc.).

### Pistes de refactorisation (sans changer l’UI/UX)
1) **Découper en sous-composants** (dossier `components/memberships/details/`) :
   - `HeaderStatus` (titre, statut, actions de navigation),
   - `IdentityCard` / `ContactCard`,
   - `AddressCard`,
   - `EmploymentCard` (profession/entreprise),
   - `DocumentsCard` (PDF adhésion, pièce d’identité),
   - `PaymentCard`,
   - `Timeline/Meta` (dates, admin traiteur).
2) **Extraire utilitaires** dans un module partagé (`details/utils.ts`) : formatage de dates, badge de statut, détection expiration, formattage adresse.
3) **Clarifier la récupération de données** :
   - Encapsuler la lecture admin (`getAdminById`) dans un hook dédié (ex. `useAdminById`) ou mettre en cache via React Query pour éviter les effets multiples.
   - Centraliser la logique de chargement/skeletons.
4) **Fiabiliser l’affichage des documents** :
   - Réutiliser la logique déjà ajoutée côté liste (fallback Firestore `documents` type `ADHESION` si `adhesionPdfURL` manquant).
   - Prévoir une prop claire pour les URLs (adhésion validée vs fiche générée).
5) **Tests** :
   - Prévoir des points d’injection pour mocks (données de `useMembershipRequest`, admin, documents) afin de rendre les tests unitaires/integ plus ciblés.

### Étapes proposées
1. Cartographier les sections du composant et lister ce qui peut devenir un sous-composant.
2. Extraire les utilitaires (date, badges, info fields) dans des modules dédiés.
3. Introduire un petit conteneur `MembershipRequestDetailsContainer` qui charge les données (hooks) et passe les props à des composants purement présentatifs.
4. Aligner la logique PDF adhésion sur celle de la liste (fallback Firestore).
5. Ajouter des tests unitaires ciblés sur les sous-composants (rendu conditionnel, données manquantes, états de chargement).

Cette page servira de fil conducteur pendant le refactor, sans modifier le design existant.

### Cartographie des sections (état actuel)
- **Header / Statut / Navigation**  
  - Données : `request.status`, `request.id`, dates (createdAt/processedAt), `request.matricule`.  
  - Hooks/accès : `useMembershipRequest`, `useAuth` (retours/back), `toast` pour actions.

- **Identité**  
  - Données : `identity.firstName/lastName`, `identity.photoURL/photoPath/photo`, `gender`, `birthDate`, etc.  
  - Hooks/accès : `useMembershipRequest`.

- **Contact**  
  - Données : `identity.contacts[]`, `identity.email`.  
  - Hooks/accès : `useMembershipRequest`.

- **Adresse**  
  - Données : `address.*` (province, city, district, arrondissement, etc.).  
  - Hooks/accès : `useMembershipRequest`.

- **Emploi / Profession / Entreprise**  
  - Données : `company`, `profession`, éventuellement `intermediaryCode`.  
  - Hooks/accès : `useIntermediary` (si code présent), `useMembershipRequest`.

- **Paiement**  
  - Données : `isPaid`, `payments[]` (montant, mode, date), statut payé/non payé.  
  - Hooks/accès : `useMembershipRequest`.

- **Documents**  
  - Données : `adhesionPdfURL` (PDF adhésion validé), `documents.identityDocument*`, photos ID.  
  - Hooks/accès : `useMembershipRequest`.  
  - À aligner : fallback Firestore `documents` (type `ADHESION`) si `adhesionPdfURL` manquant.

- **Meta / Admin traiteur**  
  - Données : `processedBy`, `approvedBy`, `processedAt`, `approvedAt`, `reviewNote` (corrections).  
  - Hooks/accès : `getAdminById(processedBy)`, `useAuth` (context admin), `useMembershipRequest`.

### Plan de découpage (proposé)
- **Conteneur / hook de données**  
  - `useMembershipRequestDetails(id)` : agrège `useMembershipRequest` + admin (`getAdminById`), intermédiaire (`useIntermediary`), documents adhésion (fallback `DocumentRepository` si `adhesionPdfURL` absent) et ID docs.  
  - Fournit : `data`, `admin`, `intermediary`, `adhesionPdfUrlResolved`, `idDocs`, `isLoading`, `isError`, `error`.

- **Sous-composants présentatifs (un par section)**  
  - `DetailsHeaderStatus` : titre, statut, navigation (back), dates clés.  
  - `DetailsIdentityCard` : identité + photo.  
  - `DetailsContactCard` : contacts/email.  
  - `DetailsAddressCard` : adresse formatée.  
  - `DetailsEmploymentCard` : profession/entreprise/intermédiaire.  
  - `DetailsPaymentCard` : paiement (payé/non payé, historique).  
  - `DetailsDocumentsCard` : PDF adhésion (URL ou fallback Firestore) + pièces d’identité.  
  - `DetailsMetaCard` : admin traiteur, dates processed/approved, reviewNote (corrections).  
  - `DetailsSkeleton` : squelette partagé (extrait).  
  - `DetailsErrorState` : état erreur/not found.

- **Utilitaires à extraire** (ex. `details/utils.ts`)  
  - `formatDateDetailed` (timestamps Date/Firestore/string)  
  - `isDateExpired`  
  - `formatAddress`  
  - `getStatusBadgeProps` ou composant `StatusBadge`  
  - `copyToClipboard` helper (si besoin)  
  - Types/DTO : structure props de chaque sous-composant

- **Logique PDF adhésion (fallback)**  
  - Encapsuler dans un helper/hook (`resolveAdhesionPdfUrl(request)`) :  
    1) utiliser `request.adhesionPdfURL` si présent  
    2) sinon `DocumentRepository.getDocuments(memberId|matricule, type=ADHESION, sort createdAt desc, limit 1)`  
    3) retourne `url` ou `null`, plus un message d’erreur pour l’UI.
