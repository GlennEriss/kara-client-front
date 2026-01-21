## Cloud Functions – Statistiques membres (V2)

### 1. Option pré-calcul des stats (recommandée pour gros volumes)

Si le nombre de membres devient important, pré-calculer les stats dans un document Firestore :

- **Cloud Function `recalculateMemberStats`** (déjà mentionnée dans `liste-memberships/functions/README.md`) :
  - Scheduled (quotidien) ou callable.
  - Calcule les stats globales et les stocke dans `stats/members` (document Firestore).
  - Le hook `useMembershipStats` peut alors lire directement ce document au lieu de scanner tous les membres.

### 2. Intégration avec la vue liste

- La liste des membres peut :
  - Afficher les stats pré-calculées (rapide, cohérentes).
  - Ou calculer les stats sur la page courante uniquement (plus réactif mais limité).

### 3. À faire

- [ ] Décider si pré-calcul nécessaire (selon volumétrie).
- [ ] Si oui, implémenter `recalculateMemberStats` (voir `liste-memberships/functions/README.md`).
