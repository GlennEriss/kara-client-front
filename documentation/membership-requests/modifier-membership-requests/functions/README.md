## Cloud Functions – Modifier une demande d'adhésion

> **À compléter plus tard** : Ce dossier documentera les Cloud Functions éventuellement impliquées dans la modification d'une demande d'adhésion.

### Fonctions potentielles

- Fonction de mise à jour atomique (si nécessaire pour transactions complexes).
- Fonction d'audit trail (historique des modifications).
- Synchronisation avec d'autres collections (ex. mise à jour de `users` si la demande est déjà approuvée).
