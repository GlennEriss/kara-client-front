## Modifier une demande d'adhésion (`modifier-membership-requests`)

### Description

Cette fonctionnalité permettra à un admin de **modifier une demande d'adhésion existante** directement depuis l'interface, sans passer par le workflow de corrections (qui nécessite un code de sécurité et une validation par le demandeur).

### Contexte

- Le formulaire actuel (`/memberships/add`) permet de **créer** une nouvelle `MembershipRequest`.
- Il n'existe pas encore de fonctionnalité pour **modifier** une demande existante (sauf via le workflow de corrections côté demandeur).
- Cette fonctionnalité sera utile pour :
  - Corriger des erreurs administratives.
  - Mettre à jour des informations après validation initiale.
  - Modifier des champs sans attendre le processus de corrections.

### À documenter plus tard

- État actuel V1 (s'il existe déjà une fonctionnalité partielle).
- Objectifs V2 (architecture, composants, services).
- Plan des sous‑composants (formulaire de modification, validation, sauvegarde).
- Mapping V1 → V2 (si applicable).
- Workflow d'implémentation.
- Tests, Firebase, Functions, Notifications, diagrammes.
