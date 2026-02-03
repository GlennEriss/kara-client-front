## Firebase – Générer identifiant (V2)

### 1. Vue d'ensemble

La fonctionnalité « Générer identifiant » utilise :

- **Firestore** : lecture du profil membre (collection `users`) pour obtenir le matricule, l’identifiant (email) et l’`uid` nécessaires à la réinitialisation du mot de passe et à la génération du PDF.
- **Firebase Auth** : mise à jour du mot de passe du membre. Cette opération doit être effectuée **côté serveur** (Firebase Admin), car un client ne peut pas modifier le mot de passe d’un autre utilisateur.

### 2. Collections Firestore utilisées

- **`users`**
  - Lecture du document du membre par `memberId` (ou `uid`).
  - Champs utilisés : `matricule`, `email` (ou champ utilisé comme identifiant de connexion), `uid` si différent de l’id du document.
  - Pas d’écriture dans le cadre de cette fonctionnalité (seul le mot de passe Auth est modifié).

### 3. Firebase Auth

- **Opération** : `admin.auth().updateUser(uid, { password: newPassword })`.
- **Contexte** : exécutée depuis une **route API** (Next.js) ou une **Cloud Function**, après vérification que l’appelant est un admin.
- **Sécurité** :
  - Ne pas exposer de route publique sans contrôle du rôle admin.
  - Utiliser le SDK Admin (clé de service ou compte de service) uniquement côté serveur.
- **Erreurs possibles** : utilisateur introuvable, règle Auth (ex. mot de passe trop court si politique appliquée). À gérer dans le service et remonter au modal.

### 4. Règles de sécurité

- **Firestore** : les règles existantes pour la collection `users` (lecture admin) suffisent pour la lecture du profil membre.
- **Auth** : la modification du mot de passe d’un utilisateur par un autre utilisateur (admin) n’est pas gérée par les règles client ; elle doit être faite via l’API Admin côté serveur.

### 5. Route API recommandée

- **Chemin** : par exemple `POST /api/auth/admin/reset-member-password` ou `POST /api/memberships/[memberId]/reset-password`.
- **Corps** : `{ "newPassword": "<matricule>" }` (ou `memberId` + `newPassword`).
- **Vérifications** :
  1. Session / token valide et utilisateur a le rôle admin.
  2. Récupération de l’`uid` du membre (via Firestore `users` si l’id passé est le document id, ou via le champ `uid` du document).
  3. Appel `admin.auth().updateUser(uid, { password: newPassword })`.
- **Réponse** : 200 OK ou 4xx/5xx avec message d’erreur.

### 6. Cloud Function (alternative)

Si l’on préfère une Cloud Function plutôt qu’une route Next.js :

- **Déclencheur** : appel HTTP (POST) avec authentification (token admin).
- **Corps** : `memberId` (ou `uid`), `newPassword`.
- **Logique** : vérifier le rôle admin (token ou Firestore `admins`), puis `admin.auth().updateUser(uid, { password })`.
- Documenter dans `functions/README.md` de ce dossier.

### 7. Index Firestore

- Aucun index supplémentaire nécessaire pour cette fonctionnalité : une seule lecture par document `users/{memberId}`.

### 8. Résumé

| Élément            | Usage                                      |
|--------------------|--------------------------------------------|
| Firestore `users`  | Lecture du membre (matricule, email, uid)  |
| Firebase Auth      | Mise à jour du mot de passe (Admin SDK)   |
| Route API / Function | Vérification admin + appel Auth Admin   |
