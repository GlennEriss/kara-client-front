## Firebase – Anniversaires membres (V2)

### 1. Collections / champs utilisés

- **`users`** :
  - Champs : `birthDate`, `isActive`, `firstName`, `lastName`, `matricule`, etc.
  - Utilisés pour calculer les anniversaires (prochains, âge, etc.).
- **`notifications`** :
  - Notifications d’anniversaire (`module: 'memberships'`, `type: 'birthday_reminder'`).
  - Métadonnées : `memberId`, `daysUntil`, etc.

### 2. Index Firestore

- Pour `users` :
  - `isActive` (Ascending) + `birthDate` (pour récupérer les membres actifs avec date de naissance valide, comme dans `birthdayNotifications.ts`).
- Pour `notifications` :
  - Index existants pour `birthday_reminder` (voir doc notifications) :
    - `module` + `type` + `metadata.memberId` + `createdAt`.

### 3. Règles de sécurité Firestore

- **`users`** :
  - Lecture : admins uniquement (règles déjà en place pour le module memberships).
- **`notifications`** :
  - Lecture : admins pour le module `memberships`.

### 4. Jobs planifiés existants

- `functions/src/scheduled/birthdayNotifications.ts` :
  - Utilise Firestore Admin SDK pour récupérer les membres actifs avec `birthDate`.
  - Calcule `daysUntil` et crée des notifications `birthday_reminder` pour J‑2, J, J+1.

### 5. À faire

- [ ] Vérifier que les index requis pour `birthdayNotifications` sont bien présents.
- [ ] Vérifier que les règles Firestore couvrent bien la lecture des notifications d’anniversaire côté admin.
