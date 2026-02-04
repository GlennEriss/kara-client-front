# Tests - Remplacement du PDF d'adhesion

## 1. Unitaires (Cloud Function)

- `replaceAdhesionPdf` refuse si user non admin.
- `replaceAdhesionPdf` refuse si `status != approved`.
- `replaceAdhesionPdf` refuse si `isPaid != true`.
- `replaceAdhesionPdf` met a jour `adhesionPdfURL` + audit fields.
- `replaceAdhesionPdf` cree un nouveau document `ADHESION` + `isCurrent=true`.
- `replaceAdhesionPdf` marque l'ancien document `isCurrent=false`.

## 2. Integration (Firestore + Storage mocks)

- Remplacement OK : URL mise a jour + document cree + subscription alignee.
- Ancien document absent : fonction continue sans erreur.
- Mauvais payload (url/path) : `invalid-argument`.

## 3. UI / Integration front

- Bouton "Remplacer le PDF" visible uniquement si `approved` + `paid`.
- Modal de confirmation affiche le message "remplacement effectif".
- Upload PDF -> appel Cloud Function -> toast succes.
- Erreur Cloud Function -> toast erreur + PDF non remplace.

## 4. E2E (optionnel)

- Scenario complet :
  1) Demande approuvee + payee
  2) Ouvrir PDF
  3) Remplacer PDF
  4) Verifier que le nouveau PDF est affiche

---

## Architecture (domains)

- **Component** : `MembershipRequestsPageV2` / `MembershipRequestDetails`.
- **Hook** : `useReplaceAdhesionPdf`.
- **Service** : `MembershipServiceV2.replaceAdhesionPdf`.
- **Repository** : `MembershipRepositoryV2.updateAdhesionPdf` + `DocumentRepository`.
- **Infra** : Cloud Function `replaceAdhesionPdf` + Storage.

## Source de verite

- Valider que `membership-requests.adhesionPdfURL` est la reference UI apres remplacement.
- Verifier que l'historique `documents` est conserve avec `isCurrent`.
