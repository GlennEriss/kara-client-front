## Tests – Détails membre (V2)

### 1. Tests unitaires

#### 1.1 Hook `useMembershipDetails`

- [ ] Retourne les données agrégées attendues :
  - `member` (profil de base).
  - `subscriptions` + `lastSubscription`.
  - `contracts` (contrats caisse / placements).
  - `filleuls` (si existants).
  - États : `isLoading`, `isError`, `error`.
- [ ] Gère les cas d’erreur :
  - Erreur sur `MemberRepositoryV2` → `isError` + message cohérent.
  - Erreur sur un repository secondaire (subscriptions/contrats/filleuls) → section concernée indiquée comme vide ou en erreur, sans casser toute la page.
- [ ] Gère les cas limites :
  - Membre sans abonnements.
  - Membre sans contrats.
  - Membre sans filleuls.
- [ ] Handlers :
  - `onOpenSubscriptionHistory()` appelle la bonne route / callback.
  - `onOpenMembershipRequest()` navigue vers `MembershipRequestDetails`.
  - `onOpenContracts(moduleKey)` navigue vers la bonne page de module.

#### 1.2 Sous‑composants présentatifs

- [ ] `MemberDetailsHeader` :
  - Affiche nom, matricule, badges de statut.
  - Appelle les callbacks d’actions (voir abonnement, voir dossier, liens externes).
- [ ] `MemberIdentityCard` :
  - Affiche correctement les champs d’identité (y compris cas valeurs manquantes).
- [ ] `MemberContactCard` :
  - Affiche les contacts, email, et réagit aux clics sur \"appeler\" / \"envoyer un email\" (via mocks).
- [ ] `MemberAddressCard` :
  - Affiche l’adresse formatée (tests avec combinaison de champs présents/absents).
- [ ] `MemberSubscriptionCard` :
  - Affiche le statut (actif/expiré/aucun).
  - Bouton \"Voir l’historique\" déclenche le callback.
- [ ] `MemberDocumentsCard` :
  - Bouton \"Voir le dossier\" appelle `onOpenMembershipRequest`.
- [ ] `MemberFilleulsCard`, `MemberPaymentsCard`, `MemberContractsCard`, `MemberRelationsCard` :
  - Affichent correctement les résumés (compteurs, montants).
  - Appellent les callbacks de navigation associés.

### 2. Tests d’intégration

Fichier cible : `src/domains/memberships/__tests__/integration/membership-details.integration.test.tsx`

- [ ] **INT-MEMBER-DETAILS-01 – Fiche complète**
  - Membre avec abonnement actif, contrats, filleuls.
  - Vérifier l’affichage de toutes les sections :
    - Identité, contacts, adresse.
    - Abonnement (statut + dates).
    - Documents / dossier (bouton \"Voir le dossier\").
    - Filleuls (liste ou compteur).
    - Paiements & contrats (résumés).
    - Liens vers autres modules.

- [ ] **INT-MEMBER-DETAILS-02 – Membre sans données secondaires**
  - Membre sans abonnements, sans contrats, sans filleuls.
  - Vérifier que les sections sont affichées de manière \"vide\" mais cohérente (messages d’absence de données).

- [ ] **INT-MEMBER-DETAILS-03 – Erreur de chargement**
  - Simuler une erreur backend (ex. membre introuvable / erreur réseau).
  - Vérifier l’affichage de l’état erreur (`MemberDetailsErrorState`) + bouton retour vers la liste.

- [ ] **INT-MEMBER-DETAILS-04 – Navigation vers dossier d’adhésion**
  - Clic sur \"Voir le dossier\".
  - Vérifier navigation vers la page `MembershipRequestDetails` (URL, composant rendu).

- [ ] **INT-MEMBER-DETAILS-05 – Historique abonnements**
  - Clic sur \"Voir l’historique\" dans la carte abonnement.
  - Vérifier ouverture de la modal `MemberSubscriptionModal` (ou équivalent V2).

- [ ] **INT-MEMBER-DETAILS-06 – Liens vers modules externes**
  - Clic sur liens vers :
    - Contrats caisse spéciale / imprevue.
    - Véhicules / groupes (si présents).
  - Vérifier navigation correcte (mock du router).

### 3. Tests E2E (Playwright – à planifier)

Scénarios cibles sur `/memberships/[id]` :

- [ ] Navigation depuis la liste des membres vers la fiche détail.
- [ ] Vérification visuelle des sections principales (identité, abonnement, contrats).
- [ ] Ouverture et fermeture de la modal d’historique des abonnements.
- [ ] Clic sur \"Voir le dossier\" ouvre bien la page dossier (au moins URL correcte).
- [ ] Navigation retour vers la liste depuis la fiche détail.

### 4. Attributs `data-testid` recommandés

- `data-testid="member-details-page"` : conteneur principal.
- `data-testid="member-details-header"` : header.
- `data-testid="member-identity-card"`, `member-contact-card`, `member-address-card`, etc.
- `data-testid="member-subscription-card"`, `member-documents-card`, `member-filleuls-card`, `member-payments-card`, `member-contracts-card`, `member-relations-card`.
- `data-testid="member-details-error"` : état erreur.
- `data-testid="member-details-skeleton"` : état loading.

### 5. Couverture cible

- **Hook `useMembershipDetails`** : ≥80%.
- **Sous‑composants critiques** (header, identité, abonnement, documents) : ≥80% ou validés via tests d’intégration.
- **Intégration** : tous les scénarios INT-MEMBER-DETAILS-01 → 06 couverts.
- **E2E** : au moins 3–4 scénarios utilisateur critiques (navigation, ouverture modals, liens principaux).

