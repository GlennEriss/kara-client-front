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
- Storage : autoriser le remplacement des documents existants.
