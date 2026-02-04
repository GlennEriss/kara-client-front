## Modifier le PDF d'adhesion (membership-requests/modifier-pdf-adhesion)

**Status** : Spec / To implement.

### Sommaire

- Objectif fonctionnel
- Contexte
- Preconditions
- Parcours utilisateur (resume)
- Portee de la fonctionnalite
- Non-objectifs (V1)
- Architecture cible (haute niveau)
- Architecture (domains)
- Decisions importantes
- Source de verite et synchronisation
- Documentation associee
- Recap coherence (domains + source de verite)

### Objectif fonctionnel

Permettre a un **admin** de **remplacer le PDF d'adhesion** d'une demande **deja payee et approuvee**, avec une confirmation explicite indiquant que **le remplacement est effectif immediatement**.

### Contexte

- Une demande **payee + approuvee** affiche deux actions visibles : **PDF** et **Details**.
- Le bouton **PDF** ouvre la fiche d'adhesion actuellement televersee.
- Le besoin : **corriger un PDF errone** sans repasser par tout le workflow d'approbation.

### Preconditions

- `status === 'approved'`
- `isPaid === true`
- Un PDF d'adhesion existe (URL resolue ou fallback Firestore `documents` de type `ADHESION`).

### Parcours utilisateur (resume)

1. L'admin clique sur **PDF** (liste ou fiche details).
2. Le PDF s'ouvre dans un viewer (nouvel onglet ou modal).
3. Un bouton **Remplacer le PDF** est visible.
4. Au clic, une **modale de confirmation** s'affiche :
   - message clair : "Le remplacement sera effectif immediatement".
   - action primaire : **Confirmer et choisir un PDF**.
5. L'admin televerse le nouveau PDF.
6. Le systeme met a jour la demande et la source de verite du PDF.
7. Un toast de succes confirme la mise a jour.

### Portee de la fonctionnalite

- Remplacement du **PDF d'adhesion** associe a la demande.
- Mise a jour du champ `adhesionPdfURL` sur `membership-requests`.
- Archivage de l'ancien PDF dans `documents` (tracabilite).
- Mise a jour de l'entite membre / subscription si elle existe (alignement des donnees).

### Non-objectifs (V1)

- Modifier les paiements ou le statut de la demande.
- Regenerer un PDF automatiquement.
- Gerer l'edition PDF inline (uniquement remplacement par upload).

### Architecture cible (haute niveau)

- **UI** : bouton PDF + action "Remplacer le PDF" + modal de confirmation.
- **Upload** : reuse `createFile` (Storage) pour uploader le nouveau PDF.
- **Backend** : **Cloud Function callable** `replaceAdhesionPdf` pour garantir la coherente des mises a jour.
- **Firestore** : update `membership-requests` + creation d'un nouveau document `ADHESION` + archivage de l'ancien.

### Architecture (domains)

Cartographie des couches pour respecter l'architecture par domaines.

| Couche | Element | Role |
|--------|---------|------|
| **Domain Component** | `MembershipRequestsPageV2` / `MembershipRequestDetails` | Affiche le PDF + action "Remplacer le PDF" |
| **Hook** | `useReplaceAdhesionPdf` | Mutation + etats (loading, error, success) |
| **Service** | `MembershipServiceV2.replaceAdhesionPdf` | Regroupe la logique d'appel (upload + CF) |
| **Repository** | `MembershipRepositoryV2.updateAdhesionPdf` | Ecritures cote demandes (si besoin client) |
| **Infra** | Cloud Function `replaceAdhesionPdf` | Verifie l'etat, met a jour Firestore, audit |
| **Infra** | `DocumentRepository` | Versioning `documents` (isCurrent) |

> Les ecritures critiques sont centralisees dans la Cloud Function pour garantir la coherente des donnees.

### Decisions importantes

- **Tracabilite** : l'ancien PDF est conserve via `documents` (avec un flag `isCurrent=false`).
- **Instantaneite** : la nouvelle URL devient la reference des l'enregistrement immediatement.
- **Garde** : l'action est refusee si la demande n'est pas `approved` ou pas `isPaid`.

### Source de verite et synchronisation

- **Source de verite UI** : `membership-requests.adhesionPdfURL` (utilisee pour ouvrir le PDF).
- **Historique/versioning** : `documents` conserve toutes les versions avec `isCurrent`.
- **Alignement membership** : si une subscription existe, `adhesionPdfURL` est synchronise.

### Documentation associee

- `activite/README.md` : diagramme d'activite du remplacement.
- `sequence/README.md` : sequence UI -> Storage -> Cloud Function -> Firestore.
- `firebase/README.md` : champs, regles, index utiles.
- `functions/README.md` : spec de la Cloud Function `replaceAdhesionPdf`.
- `workflow/README.md` : plan d'implementation par phases.
- `tests/README.md` : tests unitaires, integration, E2E.

### Recap coherence (domains + source de verite)

Les rappels **Architecture (domains)** et **Source de verite** sont declines dans :
- `activite/README.md`
- `sequence/README.md`
- `workflow/README.md`
- `tests/README.md`

Objectif : garder une vue **coherente** des couches (Component/Hook/Service/Repository/Infra) et de la **reference PDF** (`membership-requests.adhesionPdfURL`) sur tout le module.
