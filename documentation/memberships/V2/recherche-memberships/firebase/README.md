## Firebase – Recherche & filtres (V2)

### 1. Collections / champs utilisés

- **`users`** / `members` :
  - Champs utilisés pour la recherche et les filtres :
    - `firstName`, `lastName`, `matricule`, `email` (recherche texte).
    - `roles`, `membershipType`, `hasCar`, `isActive`.
    - `address.province`, `address.city`, `address.arrondissement`, `address.district`.
- **(Optionnel)** : champ dérivé `searchableText` sur `users` :
  - Concaténation normalisée de `firstName`, `lastName`, `matricule`, `email`.
  - Utilisé pour la recherche full‑text simple côté Firestore.

### 2. Index Firestore nécessaires (stratégie Firestore-only)

- `users` :
  - `roles` + `createdAt` (déjà utilisé pour la liste).
  - `membershipType` + `createdAt` (si filtres par type sont côté serveur).
  - `hasCar` + `createdAt` (pour UC6 exports mais aussi filtres liste).
  - `isActive` + `createdAt` (statut abonnement).
  - `address.province` + `address.city` + `createdAt` (si filtrage géographique côté Firestore).
- Pour recherche texte basique :
  - Index sur `searchableText` + éventuellement `roles`.

### 3. Option moteur externe (Algolia) – à décider

Si l’on choisit d’utiliser Algolia (comme pour `membership-requests/recherche`) :

- Créer un index `memberships` dans Algolia avec les champs :
  - `firstName`, `lastName`, `matricule`, `email`, `roles`, `membershipType`, `hasCar`, etc.
- Mettre en place des Cloud Functions de synchronisation (voir `functions/README.md`).
- `useMembershipSearch` devient un wrapper autour du service Algolia.

### 4. Règles de sécurité Firestore

- Lecture des `users` :
  - Déjà couverte par les règles admin existantes (lecture réservée aux admins).
- Si champ `searchableText` ajouté :
  - Aucun changement spécifique, mais vérifier qu’il ne contient pas de données sensibles.

### 5. À faire

- [ ] Lister précisément les champs utilisés par les filtres V2.
- [ ] Ajouter/ajuster les index nécessaires dans `firestore.indexes.json`.
- [ ] Décider Firestore-only vs Algolia et documenter le choix.
