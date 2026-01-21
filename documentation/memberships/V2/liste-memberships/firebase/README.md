## Firebase – Liste des membres (V2)

### Collections / documents utilisés

- **`users`** (collection principale) :
  - Champs utilisés : `roles`, `membershipType`, `nationality`, `hasCar`, `isActive`, `createdAt`, `firstName`, `lastName`, `matricule`, `email`, `address.*`, `companyName`, `profession`.
- **`subscriptions`** (collection liée) :
  - Requête pour enrichir chaque membre avec `lastSubscription` et calculer `isSubscriptionValid`.
  - Champs : `userId`, `dateStart`, `dateEnd`, `status`.
- **Collections liées** (pour tabs/filtres) :
  - `contributions` (module bienfaiteur) : pour identifier les bienfaiteurs.
  - Éventuellement `vehicles` : pour le filtre "avec véhicule" (si pas déjà dans `hasCar`).

### Index Firestore nécessaires

#### Index existants (à vérifier)
- `users` : `roles` (array-contains-any) + `createdAt` (desc) → pour pagination de base.
- `users` : `roles` + `membershipType` + `createdAt` → pour filtres par type.
- `users` : `roles` + `hasCar` + `createdAt` → pour filtre véhicule.
- `users` : `roles` + `isActive` + `createdAt` → pour filtre abonnement.

#### Index à créer (V2)
- **Recherche texte** (si déplacée côté Firestore) :
  - `users` : `searchableText` (string) + `createdAt` (desc).
  - Ou index composite avec `roles` + `searchableText` + `createdAt`.
- **Filtres géographiques** (si déplacés côté Firestore) :
  - `users` : `roles` + `address.province` + `createdAt`.
  - `users` : `roles` + `address.province` + `address.city` + `createdAt`.
  - `users` : `roles` + `address.province` + `address.city` + `address.arrondissement` + `createdAt`.
  - `users` : `roles` + `address.province` + `address.city` + `address.arrondissement` + `address.district` + `createdAt`.
- **Filtres professionnels** (si déplacés côté Firestore) :
  - `users` : `roles` + `companyName` + `createdAt`.
  - `users` : `roles` + `profession` + `createdAt`.
- **Tabs spécifiques** :
  - `users` : `roles` (array-contains 'Bienfaiteur') + `createdAt` → pour tab Bienfaiteurs.
  - Index composite pour abonnements valides/invalides (nécessite jointure avec `subscriptions` ou champ calculé).

### Règles de sécurité Firestore

```javascript
// Exemple de règle pour lecture des membres (admin uniquement)
match /users/{userId} {
  allow read: if request.auth != null 
    && exists(/databases/$(database)/documents/admins/$(request.auth.uid))
    && resource.data.roles.hasAny(['Adherant', 'Bienfaiteur', 'Sympathisant']);
}
```

### Règles de sécurité Storage

- **Photos de membres** :
  - Path : `/members/photos/{userId}.jpg` (ou équivalent).
  - Règle : lecture admin uniquement.
- **Documents liés** :
  - Paths : `/members/documents/{userId}/*` (PDFs, pièces d'identité, etc.).
  - Règle : lecture admin uniquement.

### Vérification

- [ ] Vérifier que tous les index nécessaires existent dans `firestore.indexes.json`.
- [ ] Tester les requêtes avec filtres combinés (ex. `roles` + `hasCar` + `address.province`).
- [ ] Vérifier les performances sur de gros volumes (pagination avec curseur).

