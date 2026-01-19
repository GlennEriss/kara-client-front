# Règles Firestore - Approbation d'une Demande d'Adhésion

> Documentation des règles Firestore nécessaires pour l'approbation

---

## 📋 Vue d'ensemble

Les règles Firestore pour l'approbation concernent plusieurs collections :
- `membership-requests` : Mise à jour du statut et des champs de traçabilité
- `users` : Création d'un nouvel utilisateur
- `subscriptions` : Création d'un abonnement
- `documents` : Archivage du PDF d'adhésion
- `notifications` : Création de notification d'approbation
- `companies` : Création/vérification d'entreprise
- `professions` : Création/vérification de profession

---

## 🔐 Règles par Collection

### 1. membership-requests

**Fichier** : `firestore.rules` (lignes 89-151)

#### Mise à Jour pour Approbation

**Règle actuelle** : Les admins peuvent mettre à jour les demandes

```javascript
allow update: if isAdmin() || (
  // ... règles pour corrections ...
)
```

**Modification nécessaire** : Ajouter validation pour `approvedBy` et `approvedAt`

```javascript
match /membership-requests/{requestId} {
  // ... règles existantes ...
  
  // MISE À JOUR : Admin ou demandeur avec code de sécurité valide
  allow update: if isAdmin() || (
    // ... règles pour corrections existantes ...
  );
  
  // Validation spécifique pour l'approbation
  // Si le statut passe à 'approved', approvedBy et approvedAt doivent être présents
  // Note: Cette validation est gérée par la Cloud Function, mais peut être renforcée ici
}
```

**Champs concernés lors de l'approbation** :
- `status` : Doit passer à `'approved'`
- `approvedBy` : ID de l'admin (obligatoire)
- `approvedAt` : Timestamp serveur (obligatoire)
- `updatedAt` : Timestamp serveur

**Validation recommandée** :
```javascript
// Dans la règle update pour admin, ajouter :
allow update: if isAdmin() && (
  // Si le statut passe à 'approved', vérifier les champs de traçabilité
  (request.resource.data.status == 'approved' &&
   request.resource.data.approvedBy is string &&
   request.resource.data.approvedBy != null &&
   request.resource.data.approvedAt is timestamp &&
   request.resource.data.approvedAt != null) ||
  // Sinon, mise à jour normale
  (request.resource.data.status != 'approved')
)
```

**État actuel** : ✅ Les règles existantes permettent déjà la mise à jour par admin. La validation des champs `approvedBy` et `approvedAt` est gérée par la Cloud Function.

**Recommandation** : Ajouter une validation explicite dans les règles pour renforcer la sécurité.

---

### 2. users

**Fichier** : `firestore.rules` (lignes 67-72)

**Règle actuelle** :
```javascript
match /users/{userId} {
  // Lecture : Publique (nécessaire pour la connexion)
  allow read: if true;
  // Écriture : Admin uniquement (création lors de l'approbation)
  allow write: if isAdmin();
}
```

**État** : ✅ **Suffisant** - Les admins peuvent créer des utilisateurs lors de l'approbation.

**Aucune modification nécessaire**.

---

### 3. subscriptions

**Fichier** : `firestore.rules` (lignes 170-176)

**Règle actuelle** :
```javascript
match /subscriptions/{subscriptionId} {
  // Lecture : Admin ou propriétaire
  allow read: if isAdmin() || 
                 (isAuthenticated() && resource.data.userId == request.auth.uid);
  // Écriture : Admin uniquement
  allow write: if isAdmin();
}
```

**État** : ✅ **Suffisant** - Les admins peuvent créer des abonnements lors de l'approbation.

**Aucune modification nécessaire**.

---

### 4. documents

**Fichier** : `firestore.rules` (lignes 182-188)

**Règle actuelle** :
```javascript
match /documents/{documentId} {
  // Lecture : Admin ou propriétaire (via memberId)
  allow read: if isAdmin() || 
                 (isAuthenticated() && resource.data.memberId == request.auth.uid);
  // Écriture : Admin uniquement
  allow write: if isAdmin();
}
```

**État** : ✅ **Suffisant** - Les admins peuvent archiver le PDF d'adhésion dans la collection `documents`.

**Aucune modification nécessaire**.

---

### 5. notifications

**Fichier** : `firestore.rules` (lignes 194-206)

**Règle actuelle** :
```javascript
match /notifications/{notificationId} {
  // Lecture : Authentifié
  allow read: if isAuthenticated();
  // Création : Admin uniquement
  allow create: if isAdmin();
  // Mise à jour : Admin ou propriétaire (pour marquer comme lu uniquement)
  allow update: if isAdmin() || (
    isAuthenticated() &&
    request.resource.data.diff(resource.data).affectedKeys().hasOnly(['isRead', 'readAt'])
  );
  // Suppression : Admin uniquement
  allow delete: if isAdmin();
}
```

**État** : ✅ **Suffisant** - Les admins peuvent créer des notifications lors de l'approbation.

**Aucune modification nécessaire**.

---

### 6. companies

**Fichier** : `firestore.rules` (lignes 212-215)

**Règle actuelle** :
```javascript
match /companies/{companyId} {
  allow read: if true;
  allow write: if isAdmin();
}
```

**État** : ✅ **Suffisant** - Les admins peuvent créer/vérifier des entreprises lors de l'approbation.

**Aucune modification nécessaire**.

---

### 7. professions

**Fichier** : `firestore.rules` (lignes 217-220)

**Règle actuelle** :
```javascript
match /professions/{professionId} {
  allow read: if true;
  allow write: if isAdmin();
}
```

**État** : ✅ **Suffisant** - Les admins peuvent créer/vérifier des professions lors de l'approbation.

**Aucune modification nécessaire**.

---

## 🔒 Sécurité - Protection contre les Modifications Non Autorisées

### Protection des Champs de Traçabilité

**Problème** : Empêcher la modification de `approvedBy` et `approvedAt` après approbation.

**Solution recommandée** : Ajouter une validation dans les règles `membership-requests` :

```javascript
match /membership-requests/{requestId} {
  // ... règles existantes ...
  
  allow update: if isAdmin() && (
    // Si la demande est déjà approuvée, empêcher la modification de approvedBy/approvedAt
    (resource.data.status == 'approved' &&
     request.resource.data.approvedBy == resource.data.approvedBy &&
     request.resource.data.approvedAt == resource.data.approvedAt) ||
    // Sinon, mise à jour normale
    (resource.data.status != 'approved')
  ) || (
    // ... règles pour corrections existantes ...
  );
}
```

**État actuel** : ⚠️ **Recommandation** - Cette validation n'est pas encore implémentée. Elle est gérée par la Cloud Function, mais peut être renforcée dans les règles.

---

## 📝 Résumé des Modifications Nécessaires

### ✅ Déjà en Place
- ✅ Règles pour création `users` (admin uniquement)
- ✅ Règles pour création `subscriptions` (admin uniquement)
- ✅ Règles pour création `documents` (admin uniquement)
- ✅ Règles pour création `notifications` (admin uniquement)
- ✅ Règles pour création `companies` (admin uniquement)
- ✅ Règles pour création `professions` (admin uniquement)
- ✅ Règles pour mise à jour `membership-requests` (admin uniquement)

### ⚠️ Recommandations (Optionnelles)
- ⚠️ Ajouter validation explicite de `approvedBy` et `approvedAt` dans les règles `membership-requests`
- ⚠️ Ajouter protection contre la modification de `approvedBy` et `approvedAt` après approbation

**Note** : Ces validations sont déjà gérées par la Cloud Function `approveMembershipRequest`, mais peuvent être renforcées dans les règles Firestore pour une sécurité en profondeur.

---

## 🧪 Tests des Règles

### Scénarios à Tester

1. **Approbation réussie** :
   - Admin authentifié peut mettre à jour `membership-requests` avec `status='approved'`, `approvedBy`, `approvedAt`
   - Admin peut créer `users`, `subscriptions`, `documents`, `notifications`

2. **Protection contre modifications non autorisées** :
   - Utilisateur non admin ne peut pas approuver
   - Utilisateur non admin ne peut pas créer `users`, `subscriptions`, `documents`

3. **Validation des champs** :
   - Si `status='approved'`, `approvedBy` et `approvedAt` doivent être présents
   - Impossible de modifier `approvedBy` et `approvedAt` après approbation

---

## 📖 Références

- **Fichier de règles** : `firestore.rules`
- **Documentation Cloud Function** : `../functions/README.md`
- **Flux d'approbation** : `../FLUX_APPROBATION.md`
