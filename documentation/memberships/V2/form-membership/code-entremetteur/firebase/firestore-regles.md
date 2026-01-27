# Règles de Sécurité Firestore – Code Entremetteur

## 1. Vue d'ensemble

La fonctionnalité de recherche du code entremetteur utilise l'index Algolia existant `members-{env}` pour la recherche, mais récupère les données complètes depuis Firestore. Les règles de sécurité doivent permettre aux administrateurs de lire les informations des membres pour la recherche.

## 2. Collections concernées

### 2.1 Collection `users`

Cette collection contient les informations des membres, y compris :
- `id` (matricule) : Code unique du membre
- `firstName` : Prénom
- `lastName` : Nom
- `matricule` : Code entremetteur (format: `XXXX.MK.XXXX`)
- `isActive` : Statut actif/inactif
- `roles` : Rôles du membre

## 3. Règles de sécurité actuelles

### 3.1 Lecture des membres

Les règles actuelles devraient déjà permettre aux administrateurs de lire la collection `users` :

```javascript
// Dans firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Collection users
    match /users/{userId} {
      // Lecture : admins uniquement
      allow read: if isAdmin();
      
      // Écriture : système uniquement (Cloud Functions)
      allow write: if false;
      
      function isAdmin() {
        return request.auth != null && 
               get(/databases/$(database)/documents/users/$(request.auth.uid)).data.roles.hasAny(['Admin', 'SuperAdmin']);
      }
    }
  }
}
```

## 4. Vérifications nécessaires

### 4.1 Lecture par ID (batch reads)

Lorsque Algolia retourne des résultats, le système récupère les documents complets depuis Firestore par leurs IDs. Vérifier que les règles permettent les **lectures par batch** :

```javascript
// Les règles doivent permettre :
// - get() sur un document spécifique
// - get() en batch (plusieurs documents à la fois)
// - where() queries pour les recherches directes (fallback)
```

### 4.2 Filtrage par `isActive`

La recherche filtre automatiquement les membres inactifs (`isActive: true`). Les règles doivent permettre les requêtes avec ce filtre :

```javascript
// Requête Firestore (fallback si Algolia indisponible)
query(
  usersRef,
  where('isActive', '==', true),
  where('firstName', '>=', query),
  where('firstName', '<=', query + '\uf8ff'),
  limit(10)
)
```

## 5. Règles recommandées

### 5.1 Règles complètes pour `users`

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Collection users
    match /users/{userId} {
      // Lecture : admins uniquement
      // Permet :
      // - Lecture individuelle (get)
      // - Lecture en batch (get plusieurs documents)
      // - Requêtes avec filtres (where)
      allow read: if isAdmin();
      
      // Écriture : système uniquement (Cloud Functions)
      allow write: if false;
      
      // Fonction helper pour vérifier le rôle admin
      function isAdmin() {
        return request.auth != null && 
               get(/databases/$(database)/documents/users/$(request.auth.uid)).data.roles.hasAny(['Admin', 'SuperAdmin']);
      }
    }
  }
}
```

### 5.2 Vérification des permissions

Avant de déployer, tester que les règles permettent :

1. **Lecture individuelle** :
   ```typescript
   const userDoc = await getDoc(doc(db, 'users', '1234.MK.567890'))
   ```

2. **Lecture en batch** :
   ```typescript
   const memberIds = ['1234.MK.567890', '1235.MK.567891']
   const userDocs = await getDocs(query(collection(db, 'users'), where('__name__', 'in', memberIds)))
   ```

3. **Requêtes avec filtres** :
   ```typescript
   const q = query(
     collection(db, 'users'),
     where('isActive', '==', true),
     where('firstName', '>=', 'Jean'),
     where('firstName', '<=', 'Jean\uf8ff'),
     limit(10)
   )
   const snapshot = await getDocs(q)
   ```

## 6. Sécurité des données

### 6.1 Données sensibles

La recherche du code entremetteur ne nécessite que des informations **publiques** :
- Nom et prénom
- Matricule (code entremetteur)
- Statut actif/inactif

**Aucune donnée sensible** n'est exposée (téléphone, adresse, etc.).

### 6.2 Limitation des résultats

- **Maximum 10 résultats** affichés (limite Algolia `hitsPerPage: 10`)
- **Filtre automatique** : `isActive: true` (seulement les membres actifs)
- **Debounce** : 300ms (limite les appels API)

## 7. Checklist de déploiement

### 7.1 Vérifications pré-déploiement

- [ ] Vérifier que les règles actuelles permettent la lecture par les admins
- [ ] Tester la lecture individuelle d'un document `users`
- [ ] Tester la lecture en batch (plusieurs documents)
- [ ] Tester les requêtes avec filtres (`isActive`, `firstName`)
- [ ] Vérifier que les utilisateurs non-admin ne peuvent pas lire `users`

### 7.2 Tests de sécurité

- [ ] Tester avec un compte admin → doit pouvoir lire
- [ ] Tester avec un compte non-admin → doit être refusé
- [ ] Tester avec un compte non-authentifié → doit être refusé
- [ ] Vérifier que seuls les champs nécessaires sont exposés

## 8. Notes importantes

### 8.1 Pas de nouvelles règles nécessaires

Si les règles actuelles permettent déjà aux admins de lire la collection `users`, **aucune modification n'est nécessaire**. La fonctionnalité utilise les mêmes permissions que la liste des membres.

### 8.2 Fallback Firestore

Si Algolia est indisponible, le système peut utiliser Firestore directement. Les règles doivent donc permettre les requêtes avec filtres sur `firstName`, `lastName` et `isActive`.

### 8.3 Performance

Les règles Firestore sont évaluées pour chaque requête. Pour optimiser :
- Utiliser Algolia en priorité (pas de règles Firestore évaluées)
- Limiter les requêtes Firestore directes (fallback uniquement)
- Utiliser le cache React Query pour éviter les re-requêtes
