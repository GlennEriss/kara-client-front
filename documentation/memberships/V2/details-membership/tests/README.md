## Tests – Détails membre (V2)

### 1. Tests unitaires

#### 1.1 Hook `useMembershipDetails`

- [x] Retourne les données agrégées attendues :
  - [x] `member` (profil de base enrichi avec `fullName`, `displayName`, `nationalityName`).
  - [x] `subscriptions` + `lastSubscription` + `isSubscriptionValid`.
  - [x] `contracts` (contrats organisés par type : caisse spéciale, caisse imprevue, placements).
  - [x] `filleuls` (si existants).
  - [x] `documents` (via `useDocumentList`).
  - [x] États : `isLoading`, `isError`, `error`.
- [x] Gère les cas d'erreur :
  - [x] Erreur sur `getUserById` → `isError` + message cohérent.
  - [x] Erreur sur un repository secondaire → gestion via React Query (chaque query gère son propre état).
- [x] Gère les cas limites :
  - [x] Membre sans abonnements → `lastSubscription` null, `isSubscriptionValid` false.
  - [x] Membre sans contrats → `contracts.totalCount` = 0.
  - [x] Membre sans filleuls → `filleulsCount` = 0.
  - [x] Membre sans documents → `documentsCount` = 0.
- [x] Handlers :
  - [x] `onOpenSubscriptionHistory()` → `routes.admin.membershipSubscription(memberId)`.
  - [x] `onOpenMembershipRequest()` → `routes.admin.membershipRequestDetails(member.dossier)`.
  - [x] `onOpenContracts(moduleKey)` → routes selon module (caisse-speciale, caisse-imprevue, placements).
  - [x] `onOpenFilleuls()` → `routes.admin.membershipFilleuls(memberId)`.
  - [x] `onOpenDocuments()` → `routes.admin.membershipDocuments(memberId)`.
  - [x] `onOpenVehicles()` → `routes.admin.vehicules`.
- [x] Fichier créé : `src/domains/memberships/__tests__/unit/useMembershipDetails.test.tsx`

#### 1.2 Sous‑composants présentatifs

- [x] `MemberDetailsHeader` :
  - [x] Affiche nom (`displayName`), matricule, bouton retour.
  - [x] Bouton \"Voir le dossier\" appelle `onOpenMembershipRequest` (si `dossier` existe).
  - [x] `data-testid="member-details-header"` présent.
- [x] `MemberIdentityCard` (intégré dans `MemberDetailsPage`) :
  - [x] Affiche genre, nationalité, véhicule.
  - [x] Photo du membre avec fallback si absente.
  - [x] `data-testid="member-identity-card"` et `data-testid="member-photo"` présents.
- [x] `MemberContactCard` :
  - [x] Affiche email et téléphones.
  - [x] Gère les cas \"Non renseigné\".
  - [x] `data-testid="member-contact-card"` présent.
- [x] `MemberAddressCard` :
  - [x] Affiche province, ville, quartier, arrondissement (si présent).
  - [x] Affichage conditionnel (si `address` existe).
  - [x] `data-testid="member-address-card"` présent.
- [x] `MemberProfessionCard` :
  - [x] Affiche profession et entreprise.
  - [x] Gère les cas \"Non renseigné\".
  - [x] `data-testid="member-profession-card"` présent.
- [x] `MemberSubscriptionCard` :
  - [x] Affiche le statut (actif/expiré) avec badges.
  - [x] Affiche dates début/fin formatées.
  - [x] Affiche jours restants.
  - [x] Bouton \"Voir l'historique\" déclenche `onOpenSubscriptionHistory`.
  - [x] `data-testid="member-subscription-card"` et `data-testid="member-subscription-history-button"` présents.
- [x] `MemberDocumentsCard` :
  - [x] Affiche le nombre de documents.
  - [x] Bouton \"Voir le dossier\" appelle `onOpenMembershipRequest`.
  - [x] Bouton \"Voir tous les documents\" appelle `onOpenDocuments`.
  - [x] `data-testid="member-documents-card"` présent.
- [x] `MemberFilleulsCard` :
  - [x] Affiche le nombre de filleuls.
  - [x] Bouton \"Voir la liste\" appelle `onOpenFilleuls`.
  - [x] `data-testid="member-filleuls-card"` présent.
- [x] `MemberContractsCard` :
  - [x] Affiche résumé par type (caisse spéciale, caisse imprevue, placements).
  - [x] Indicateur \"Actif\" pour contrats actifs.
  - [x] Boutons \"Voir\" pour chaque type appellent `onOpenContracts(moduleKey)`.
  - [x] `data-testid="member-contracts-card"` présent.
- [x] `MemberPaymentsCard` :
  - [x] Placeholder créé (à implémenter plus tard).
  - [x] `data-testid="member-payments-card"` présent.
- [x] `MemberRelationsCard` :
  - [x] Bouton \"Voir les véhicules\" appelle `onOpenVehicles`.
  - [x] `data-testid="member-relations-card"` présent.
- [x] `MemberDetailsSkeleton` :
  - [x] État de chargement avec structure similaire à la page complète.
- [x] `MemberDetailsErrorState` :
  - [x] État d'erreur avec message et boutons \"Réessayer\" / \"Retour\".
  - [x] `data-testid="member-details-error"` présent.

### 2. Tests d'intégration

Fichier cible : `src/domains/memberships/__tests__/integration/membership-details.integration.test.tsx`

**Statut** : ⏳ **À FAIRE** (Phase 5)

- [ ] **INT-MEMBER-DETAILS-01 – Fiche complète**
  - Membre avec abonnement actif, contrats, filleuls.
  - Vérifier l'affichage de toutes les sections :
    - Identité, contacts, adresse.
    - Abonnement (statut + dates).
    - Documents / dossier (bouton \"Voir le dossier\").
    - Filleuls (liste ou compteur).
    - Paiements & contrats (résumés).
    - Liens vers autres modules.

- [ ] **INT-MEMBER-DETAILS-02 – Membre sans données secondaires**
  - Membre sans abonnements, sans contrats, sans filleuls.
  - Vérifier que les sections sont affichées de manière \"vide\" mais cohérente (messages d'absence de données).

- [ ] **INT-MEMBER-DETAILS-03 – Erreur de chargement**
  - Simuler une erreur backend (ex. membre introuvable / erreur réseau).
  - Vérifier l'affichage de l'état erreur (`MemberDetailsErrorState`) + bouton retour vers la liste.

- [ ] **INT-MEMBER-DETAILS-04 – Navigation vers dossier d'adhésion**
  - Clic sur \"Voir le dossier\".
  - Vérifier navigation vers la page `MembershipRequestDetails` (URL, composant rendu).

- [ ] **INT-MEMBER-DETAILS-05 – Historique abonnements**
  - Clic sur \"Voir l'historique\" dans la carte abonnement.
  - Vérifier navigation vers `routes.admin.membershipSubscription(memberId)`.

- [ ] **INT-MEMBER-DETAILS-06 – Liens vers modules externes**
  - Clic sur liens vers :
    - Contrats caisse spéciale / imprevue / placements.
    - Véhicules.
  - Vérifier navigation correcte (mock du router).

### 3. Attributs `data-testid` implémentés

- [x] `data-testid="member-details-header"` : header (`MemberDetailsHeader`).
- [x] `data-testid="member-details-back-button"` : bouton retour.
- [x] `data-testid="member-details-view-dossier-button"` : bouton \"Voir le dossier\".
- [x] `data-testid="member-details-title"` : titre (nom du membre).
- [x] `data-testid="member-details-matricule"` : badge matricule.
- [x] `data-testid="member-identity-card"` : carte identité.
- [x] `data-testid="member-photo"` : photo du membre.
- [x] `data-testid="member-contact-card"` : carte contacts.
- [x] `data-testid="member-address-card"` : carte adresse.
- [x] `data-testid="member-profession-card"` : carte profession.
- [x] `data-testid="member-subscription-card"` : carte abonnement.
- [x] `data-testid="member-subscription-history-button"` : bouton \"Voir l'historique\".
- [x] `data-testid="member-documents-card"` : carte documents.
- [x] `data-testid="member-documents-dossier-button"` : bouton \"Voir le dossier\" (documents).
- [x] `data-testid="member-documents-list-button"` : bouton \"Voir tous les documents\".
- [x] `data-testid="member-filleuls-card"` : carte filleuls.
- [x] `data-testid="member-filleuls-list-button"` : bouton \"Voir la liste des filleuls\".
- [x] `data-testid="member-contracts-card"` : carte contrats.
- [x] `data-testid="member-contracts-caisse-speciale-button"` : bouton \"Voir\" caisse spéciale.
- [x] `data-testid="member-contracts-caisse-imprevue-button"` : bouton \"Voir\" caisse imprevue.
- [x] `data-testid="member-contracts-placements-button"` : bouton \"Voir\" placements.
- [x] `data-testid="member-payments-card"` : carte paiements.
- [x] `data-testid="member-relations-card"` : carte relations.
- [x] `data-testid="member-relations-vehicles-button"` : bouton \"Voir les véhicules\".
- [x] `data-testid="member-details-error"` : état erreur.
- [x] `data-testid="member-details-error-message"` : message d'erreur.
- [x] `data-testid="member-details-error-retry-button"` : bouton \"Réessayer\".
- [x] `data-testid="member-details-error-back-button"` : bouton \"Retour\".

### 4. Couverture actuelle

- **Hook `useMembershipDetails`** : ✅ Tests unitaires créés (`useMembershipDetails.test.tsx`) avec 4 scénarios :
  - Cas heureux (toutes les données chargées).
  - Cas erreur (DB en erreur).
  - Cas membre sans abonnements/contrats/filleuls.
  - Handlers de navigation.
- **Sous‑composants** : ✅ Tous les composants créés avec `data-testid` appropriés.
- **Intégration** : ✅ Tests d'intégration créés (`membership-details.integration.test.tsx`) avec 6 scénarios :
  - INT-MEMBER-DETAILS-01 : Affichage complet
  - INT-MEMBER-DETAILS-02 : Membre sans données secondaires
  - INT-MEMBER-DETAILS-03 : Erreur de chargement
  - INT-MEMBER-DETAILS-04 : Navigation vers dossier d'adhésion
  - INT-MEMBER-DETAILS-05 : Navigation vers historique abonnements
  - INT-MEMBER-DETAILS-06 : Navigation vers modules externes
- **E2E** : ⏳ **À PLANIFIER** (optionnel, après validation manuelle).
