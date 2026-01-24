## Firebase – Modifier une demande d'adhésion

> **À compléter plus tard** : Cette section documentera les besoins Firebase pour la modification d'une demande d'adhésion.

### Collections concernées

- `membershipRequests` : mise à jour des champs (identité, adresse, entreprise, documents).
- `documents` : mise à jour/remplacement des documents uploadés.
- Éventuellement : historique des modifications (audit trail).

### Index Firestore

- Index pour les requêtes de mise à jour (si nécessaire).

### Règles de sécurité

- Firestore : autoriser la mise à jour de `membershipRequests` uniquement pour les admins.
### Storage

#### Structure des dossiers
Les fichiers sont stockés selon la structure définie par `DocumentRepository` :
`/contracts-ci/{memberId}/{contractId}/{fileName}`

- `memberId` : Identifiant unique de l'utilisateur (ou matricule temporaire).
- `contractId` : Matricule de la demande.
- `fileName` : `{timestamp}_{type}_{filename}`.

#### Types de fichiers gérés
- `membership-request-profile-photo` : Photo de profil.
- `membership-request-document-front` : Photo recto de la pièce d'identité.
- `membership-request-document-back` : Photo verso de la pièce d'identité.

#### Gestion du cycle de vie
- **Création** : Upload initial lors de la soumission.
- **Mise à jour** :
  - Si nouveau fichier : Upload du nouveau fichier + Suppression de l'ancien fichier (via `DocumentRepository.deleteFile`).
  - Si pas de changement : Conservation de l'URL existante.
- **Suppression** : Lors de la suppression de la demande, tous les fichiers associés doivent être supprimés (à implémenter via Cloud Function `onDelete`).
