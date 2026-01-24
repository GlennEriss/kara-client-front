## Workflow d'implémentation – Modifier une demande d'adhésion

Ce document décrit **le plan d’implémentation par étapes** pour la fonctionnalité `modifier-membership-requests`, en s’alignant sur l’architecture V2 (`services` / `repositories` / `hooks` / `components`).

---

### Phase 1 – Cartographie et analyse de l’existant

- **Objectif**
  - Comprendre comment les demandes d’adhésion sont créées, affichées et approuvées aujourd’hui.
- **Actions**
  - Revoir :
    - `MembershipRequestsPageV2` (liste + actions approbation/rejet/corrections/paiement).
    - `MembershipRequestDetails` (doc `documentation/membership-requests/details`).
    - `MembershipFormService.submitNewMembership` (création).
    - `MembershipRepositoryV2.create` / `updateStatus` / gestion des documents.
  - Lister les **champs modifiables** par un admin et ceux qui doivent rester en lecture seule.

---

### Phase 2 – Service de modification (domaine)

- **Objectif**
  - Centraliser la logique métier de modification dans un **service de domaine**, pour éviter que l’UI manipule directement Firestore.
- **Actions**
  - Ajouter dans `MembershipFormService` :
    - `updateMembershipRequest(requestId: string, formData: RegisterFormData): Promise<SubmitMembershipResult>`
      - Charge la demande existante via `MembershipRepositoryV2`.
      - Valide les données (réutilise les mêmes règles que `submitNewMembership` + règles spécifiques à la modification).
      - Met à jour les champs autorisés (identity, address, company, documents…).
      - Journalise les erreurs via `MembershipErrorHandler`.
  - Ajouter, si nécessaire, une méthode dédiée dans `MembershipRepositoryV2` :
    - `update(id: string, payload: Partial<MembershipRequest>)`.

---

### Phase 3 – UI d’édition (fiche d’adhésion admin)

- **Objectif**
  - Offrir une **fiche d’adhésion éditable** pour les admins, en réutilisant au maximum le formulaire existant.
- **Actions**
  - Étendre `MemberDetailsModal` pour supporter :
    - Un **mode lecture seule** (état actuel).
    - Un **mode édition admin** (activation depuis `MembershipRequestsPageV2`).
  - Pré‑remplir le formulaire avec les données de `MembershipRequest`.
  - Gérer :
    - **Boutons d’action** : « Enregistrer les modifications », « Annuler ».
    - **Feedback** : toasts succès/erreur, indicateurs de chargement.

---

### Phase 4 – Intégration avec la liste et les détails

- **Objectif**
  - Relier la fiche d’édition à la navigation existante.
- **Actions**
  - Dans `MembershipRequestsPageV2` :
    - Ajouter une action « Modifier » / « Ouvrir fiche » qui ouvre `MemberDetailsModal` en mode édition.
  - Optionnel : depuis la page de détails (`MembershipRequestDetails`), ajouter une action « Modifier » pour les admins autorisés.

---

### Phase 5 – Tests (TDD / validation)

- **Objectif**
  - Garantir la non‑régression et la traçabilité de la logique de modification.
- **Actions**
  - **Unitaires**
    - `MembershipFormService.updateMembershipRequest` :
      - succès de mise à jour.
      - validation qui échoue (nom manquant, adresse incohérente, etc.).
      - erreurs de repository (Firestor e/Storage).
    - `MembershipRepositoryV2.update` (si ajouté).
  - **Intégration**
    - Flow complet : liste → ouvrir fiche → modifier champs → sauvegarder → recharger la demande.
  - **E2E**
    - Scénario admin qui corrige une demande avec erreurs mineures.

---

### Phase 6 – Documentation & audit

- **Objectif**
  - Finaliser la documentation et s’assurer que les impacts sont maîtrisés (sécurité, audit, notifications).
- **Actions**
  - Compléter :
    - `activite/README.md` + diagrammes PlantUML.
    - `sequence/README.md` (séquences principales).
    - `tests/README.md` (liste des cas couverts).
    - `firebase/README.md` (règles Firestore/Storage pour l’update).
    - `notifications/README.md` si des notifications sont envoyées après modification.
