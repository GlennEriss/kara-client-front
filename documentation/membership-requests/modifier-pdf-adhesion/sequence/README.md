## Diagrammes de sequence - Remplacement du PDF d'adhesion

Ce dossier contient les **diagrammes de sequence PlantUML** pour la fonctionnalite de remplacement du PDF d'adhesion d'une demande **payee et approuvee**.

### Fichiers

| Fichier | Description |
|---------|-------------|
| `SEQ_RemplacerPdfAdhesion.puml` | Flux complet : UI -> upload -> Cloud Function -> Firestore/Storage. |

---

## Participants

| Participant | Role |
|-------------|------|
| **Admin** | Declenche l'action de remplacement |
| **UI** | Viewer PDF + modal de confirmation + upload |
| **UploadService** | Upload du fichier dans Storage |
| **Cloud Function** | Valide et met a jour les donnees |
| **Firestore** | `membership-requests`, `documents`, `subscriptions` |
| **Storage** | Stockage du nouveau PDF (et cleanup optionnel) |

---

## Architecture (domains)

Pour rester coherent avec l'architecture par domaines :

- **Domain Component** : `MembershipRequestsPageV2` / `MembershipRequestDetails`.
- **Hook** : `useReplaceAdhesionPdf`.
- **Service** : `MembershipServiceV2.replaceAdhesionPdf`.
- **Repository** : `MembershipRepositoryV2.updateAdhesionPdf` + `DocumentRepository`.
- **Infra** : Cloud Function `replaceAdhesionPdf` + Storage.

## Source de verite

- UI ouvre le PDF via `membership-requests.adhesionPdfURL`.
- Historique conserve via `documents` avec `isCurrent`.
