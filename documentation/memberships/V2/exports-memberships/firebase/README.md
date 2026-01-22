## Firebase – Exports membres (V2)

### 1. Collections / documents utilisés

- **`users`** / `members` :
  - Source principale des membres à exporter.
  - Champs utilisés : identité, contacts, adresse, statut d'abonnement, hasCar, etc.
- **`membershipRequests`** :
  - Récupération du dossier complet (identité, adresse, entreprise, documents, paiements) pour enrichir les lignes d'export.
- **`documents`** (optionnel) :
  - Si l’on décide d’exporter des métadonnées de documents spécifiques.
- **`exports`** (optionnel, V2 avancée) :
  - Collection dédiée pour journaliser les exports volumineux (id export, type, filtres, crééPar, downloadUrl…).

### 2. Index Firestore nécessaires

#### 2.1 Requêtes de base pour les membres

- `users` :
  - Index sur `roles` + `createdAt` (déjà nécessaire pour la liste).
  - Index sur `hasCar` + `createdAt` (pour UC6 avec/sans véhicule).
  - Index sur `isActive` + `createdAt` (si on filtre par statut d’abonnement dans l’export).

#### 2.2 Requêtes côté Cloud Function (optionnel)

- Si l’export est fait via Cloud Function (`exportMembersList`) :
  - Même index que ci‑dessus, mais côté Admin SDK (pas de contrainte de règles côté client).

### 3. Règles de sécurité Firestore

- Lecture des `users` et `membershipRequests` :
  - Déjà couverte par les règles admin existantes (lecture pour les admins seulement).
- Collection `exports` (si utilisée) :
  ```javascript
  match /exports/{exportId} {
    allow read: if request.auth != null
      && exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    allow create: if request.auth != null
      && exists(/databases/$(database)/documents/admins/$(request.auth.uid));
  }
  ```

### 4. Règles de sécurité Storage (Cloud Function optionnelle)

- Dossier d’exports : `/exports/members/{exportId}.{ext}`
  - Lecture : admins uniquement.
  - Écriture : uniquement via la Cloud Function.

### 5. À vérifier / compléter

- [ ] Lister précisément les champs utilisés dans `buildRow` pour s’assurer que les règles couvrent bien tous les accès nécessaires.
- [ ] Ajouter les index manquants dans `firestore.indexes.json` le cas échéant.
