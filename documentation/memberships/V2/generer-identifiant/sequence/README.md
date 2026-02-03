## Diagrammes de séquence – Générer identifiant (V2)

Ce dossier contient les **diagrammes de séquence** (PlantUML) décrivant les interactions pour la fonctionnalité « Générer identifiant » / réinitialisation du mot de passe.

### Architecture utilisée : domains

Les diagrammes respectent l’architecture par **domaines** :

- **Domain Component** : composants UI du domaine membership (`MembershipsListPage` / `MemberCard`, `GenererIdentifiantModal`).
- **Domain Hook** : `useGenererIdentifiant` – orchestration, validation, appel au service, gestion d’état (loading, erreur).
- **Domain Service** : `GenererIdentifiantService` – logique métier : récupération du membre, appel à l’auth pour mise à jour du mot de passe, déclenchement de la génération PDF.
- **Domain Repository** : `MemberRepository` – accès aux données membre (Firestore).
- **Auth / API** : mise à jour du mot de passe via Firebase Admin (ou route API) – peut être dans le domaine auth ou une couche infrastructure.
- **Génération PDF** : `@react-pdf/renderer` (composant `IdentifiantsMembrePDF` + `pdf().toBlob()` ou équivalent).

Aucun appel direct depuis le composant vers un repository : **Component → Hook → Service → Repository / Auth**.

### Diagrammes disponibles

- **`SEQ_GenererIdentifiant.puml`** : séquence complète du clic sur « Générer identifiant » à la génération et au téléchargement du PDF, avec mise à jour du mot de passe via l’auth (domains).

### Flux résumé

1. Admin clique sur « Générer identifiant » dans la liste → ouverture du modal.
2. Admin saisit le matricule et clique sur « Accepter ».
3. Hook valide, appelle le service.
4. Service : récupération du membre (repository), mise à jour du mot de passe (auth), génération du PDF.
5. Retour du PDF au hook → modal déclenche le téléchargement et se ferme.

### Référence

- Spécification : `../README.md`
- Flux détaillé : `../activite/main.puml`
