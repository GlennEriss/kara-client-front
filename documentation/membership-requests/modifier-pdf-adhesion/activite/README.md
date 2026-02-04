## Diagrammes d'activite - Remplacement du PDF d'adhesion

Ce dossier contient les **diagrammes d'activite PlantUML** qui decrivent le flux de remplacement du PDF d'adhesion pour une demande **payee et approuvee**.

### Fichiers

| Fichier | Description |
|---------|-------------|
| `RemplacerPdfAdhesion.puml` | Flux complet : ouverture PDF -> confirmation -> upload -> mise a jour. |

---

## Resume du flux

1. L'admin ouvre le PDF d'adhesion depuis la fiche ou la liste.
2. Le bouton **Remplacer le PDF** est disponible si `status=approved` et `isPaid=true`.
3. Une modale de confirmation valide l'intention.
4. L'admin choisit un nouveau fichier PDF.
5. Le fichier est uploade dans Storage.
6. La Cloud Function met a jour la demande, archive l'ancien PDF et synchronise les donnees.
7. Un message de succes confirme le remplacement.

---

## Architecture (domains)

- **Component** : `MembershipRequestsPageV2` / `MembershipRequestDetails`.
- **Hook** : `useReplaceAdhesionPdf`.
- **Service** : `MembershipServiceV2.replaceAdhesionPdf`.
- **Repository** : `MembershipRepositoryV2.updateAdhesionPdf` + `DocumentRepository`.
- **Infra** : Cloud Function `replaceAdhesionPdf` + Storage.

## Source de verite

- La reference UI reste `membership-requests.adhesionPdfURL`.
- L'historique est conserve via `documents` avec `isCurrent`.
