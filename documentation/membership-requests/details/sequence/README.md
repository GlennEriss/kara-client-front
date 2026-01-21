## Diagrammes de séquence – Vue détails d’une demande d’adhésion

Objectif : documenter les interactions entre UI, hooks, services et dépôts (domain) lors du chargement et des actions sur la page `MembershipRequestDetails`.

### À faire
- Séquence de chargement initial (route -> hook -> service/repo -> rendu).
- Séquence d’ouverture du PDF d’adhésion validé (inclure fallback Firestore `documents` si `adhesionPdfURL` manquant).
- Séquence d’affichage des pièces d’identité / autres documents (si pertinent).

### Format recommandé
- Diagrammes Mermaid `sequenceDiagram` dans des `.md` dédiés.
- Un diagramme par fichier pour maintenir la clarté.
