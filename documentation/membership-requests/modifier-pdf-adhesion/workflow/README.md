## Workflow d'implementation - Remplacement du PDF d'adhesion

Ce document decrit le plan d'implementation par etapes.

---

### Phase 0 - Preparation

- Verifier les acces Firebase (Firestore + Storage + Functions).
- Identifier le point d'entree UI (liste ou fiche details).

---

### Phase 1 - Modele de donnees et regles

- Ajouter `adhesionPdfUpdatedAt` et `adhesionPdfUpdatedBy` a `membership-requests`.
- Definir les champs additionnels `documents` (`requestId`, `source`, `isCurrent`, etc.).
- Mettre a jour les regles Firestore/Storage (admin only).

---

### Phase 2 - Cloud Function `replaceAdhesionPdf`

- Creer `functions/src/membership-requests/replaceAdhesionPdf.ts`.
- Valider `approved + paid`.
- Update `membership-requests` + creation document `ADHESION`.
- Marquer l'ancien document `isCurrent=false`.
- Aligner la subscription si elle existe.

---

### Phase 3 - UI + Upload

- Ajouter le bouton "Remplacer le PDF" dans le viewer.
- Ajouter modal de confirmation explicite.
- Upload via `createFile` vers `membership-adhesion-pdfs/`.
- Appel Cloud Function + refresh.

**Architecture (domains)** :
- **Component** : `MembershipRequestsPageV2` / `MembershipRequestDetails`.
- **Hook** : `useReplaceAdhesionPdf`.
- **Service** : `MembershipServiceV2.replaceAdhesionPdf`.
- **Repository** : `MembershipRepositoryV2.updateAdhesionPdf` + `DocumentRepository`.

---

### Phase 4 - Tests

- Unitaires (function) + integration (Firestore).
- UI: visibilite, modal, succes/erreur.

**Source de verite** :
- Valider que `membership-requests.adhesionPdfURL` est la reference UI.
- Verifier la conservation d'historique via `documents` (`isCurrent`).

---

### Phase 5 - Deploiement

- Deployer fonctions + regles.
- Monitorer erreurs et logs.

---

## Ordre recommande

| Phase | Description | Dependances |
|-------|-------------|-------------|
| 0 | Preparation | - |
| 1 | Modele + regles | - |
| 2 | Cloud Function | 1 |
| 3 | UI + Upload | 2 |
| 4 | Tests | 2, 3 |
| 5 | Deploiement | 4 |
