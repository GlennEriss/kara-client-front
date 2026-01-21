## Firebase – Statistiques membres (V2)

### 1. Collections / champs utilisés

- **`users`** :
  - Champs utilisés pour les stats :
    - `roles`, `membershipType`, `isActive`, `hasCar`, `gender`, `createdAt`.
    - `subscriptions` (via `MemberWithSubscription`) pour calculer actifs/expirés.
- **`subscriptions`** (optionnel, si stats globales) :
  - Pour calculer des stats agrégées sur les abonnements (si nécessaire pour un dashboard séparé).

### 2. Index Firestore

- Pour `users` :
  - Index déjà nécessaires pour la liste (`roles` + `createdAt`, etc.).
  - Pas d'index supplémentaire spécifique aux stats si on calcule à partir des membres déjà chargés.

### 3. Stratégie de calcul

- **Option A – Calcul côté client** (actuel dans `MembershipList`) :
  - Les stats sont calculées à partir des membres déjà chargés pour la liste (page courante ou tous si chargés).
  - Avantage : pas de requête supplémentaire.
  - Inconvénient : stats limitées aux membres visibles (si pagination).
- **Option B – Stats globales via Firestore** :
  - Utiliser `getMemberStats()` (scan complet) ou un repository V2 équivalent.
  - Avantage : stats réelles sur tous les membres.
  - Inconvénient : requête lourde si beaucoup de membres.

### 4. Règles de sécurité Firestore

- Lecture des `users` :
  - Déjà couverte par les règles admin existantes.

### 5. À faire

- [ ] Décider Option A vs Option B selon les besoins (stats sur page courante vs stats globales).
- [ ] Si Option B : vérifier les performances de `getMemberStats()` et éventuellement optimiser (agrégation pré-calculée, Cloud Function, etc.).
