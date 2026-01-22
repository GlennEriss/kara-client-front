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

#### Index à créer (V2) - **PAGINATION CÔTÉ SERVEUR**

- **Comptage total** :
  - Utiliser `getCountFromServer()` avec les mêmes filtres que la requête principale (pas besoin d’index spécifique pour le comptage).
  - **Important** : le comptage doit utiliser les mêmes filtres Firestore que la requête de pagination pour être cohérent.

- **Recherche texte** (déplacée côté Firestore) :
  - `users` : `searchableText` (string) + `createdAt` (desc).
  - Index composite : `roles` (array-contains) + `searchableText` (asc) + `createdAt` (desc).
  - **Alternative** : si pas de champ `searchableText`, index composites pour chaque champ :
    - `roles` + `firstName` + `createdAt`
    - `roles` + `lastName` + `createdAt`
    - `roles` + `matricule` + `createdAt`
    - `roles` + `email` + `createdAt`
- **Filtres géographiques** (déplacés côté Firestore pour pagination correcte) :
  - `users` : `roles` (array-contains) + `address.province` (asc) + `createdAt` (desc).
  - `users` : `roles` (array-contains) + `address.province` (asc) + `address.city` (asc) + `createdAt` (desc).
  - `users` : `roles` (array-contains) + `address.province` (asc) + `address.city` (asc) + `address.arrondissement` (asc) + `createdAt` (desc).
  - `users` : `roles` (array-contains) + `address.province` (asc) + `address.city` (asc) + `address.arrondissement` (asc) + `address.district` (asc) + `createdAt` (desc).
  - **Note** : ces index sont nécessaires pour que les filtres géographiques fonctionnent avec la pagination côté serveur.

- **Filtres professionnels** (déplacés côté Firestore pour pagination correcte) :
  - `users` : `roles` (array-contains) + `companyName` (asc) + `createdAt` (desc).
  - `users` : `roles` (array-contains) + `profession` (asc) + `createdAt` (desc).
  - **Note** : ces index sont nécessaires pour que les filtres professionnels fonctionnent avec la pagination côté serveur.
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

### Pagination côté serveur - Détails techniques

#### Utilisation de `getCountFromServer()`

Pour obtenir le vrai `totalItems`, utiliser `getCountFromServer()` (fonction Firebase standard) avec les mêmes filtres que la requête principale :

```typescript
import { getCountFromServer } from 'firebase/firestore'

// Requête de comptage (mêmes filtres, sans limit)
const countQuery = query(
  membersRef,
  where('roles', 'array-contains-any', memberRoles),
  // ... autres filtres identiques à la requête principale
)
const countSnapshot = await getCountFromServer(countQuery)
const totalItems = countSnapshot.data().count
```

**Important** :
- `getCountFromServer()` est déjà disponible dans le codebase (utilisé dans `MembershipRepositoryV2.ts`, `user.db.ts`, `DocumentRepository.ts`, etc.).
- Le comptage doit utiliser exactement les mêmes filtres Firestore que la requête de pagination.
- Les filtres côté client (recherche texte, adresse, profession) ne doivent plus exister en V2 (tout doit être côté Firestore).
- **Exemple d’utilisation existante** : voir `src/domains/memberships/repositories/MembershipRepositoryV2.ts` ligne 229 pour un exemple d’implémentation.

#### Pagination par curseur

```typescript
// Page suivante
if (pagination.nextCursor) {
  constraints.push(startAfter(pagination.nextCursor))
}

// Limite
constraints.push(limit(itemsPerPage))
```

**Avantages** :
- Plus efficace que `offset()` sur de gros volumes.
- Permet navigation page suivante/précédente sans recharger toutes les pages précédentes.

### Vérification

- [ ] Vérifier que tous les index nécessaires existent dans `firestore.indexes.json`.
- [ ] Tester les requêtes avec filtres combinés (ex. `roles` + `hasCar` + `address.province`).
- [ ] Vérifier les performances sur de gros volumes (pagination avec curseur).
- [ ] **Tester `getCountFromServer()`** : vérifier que le total retourné correspond au nombre réel de documents correspondant aux filtres.
- [ ] **Tester pagination par curseur** : vérifier que `nextCursor`/`prevCursor` permettent de naviguer correctement entre les pages.
- [ ] **Vérifier cohérence** : `totalItems` doit être cohérent avec le nombre de pages (`totalPages = Math.ceil(totalItems / itemsPerPage)`).

