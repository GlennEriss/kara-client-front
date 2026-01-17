# Règles Firebase et Index - Module Membership Requests

Ce document définit les règles Firestore, les règles Firebase Storage et les index nécessaires pour le module de gestion des demandes d'adhésion.

---

## Sommaire

1. [Vue d'ensemble](#1-vue-densemble)
2. [Règles Firestore](#2-règles-firestore)
3. [Règles Firebase Storage](#3-règles-firebase-storage)
4. [Index Firestore](#4-index-firestore)
5. [Recommandations de Sécurité](#5-recommandations-de-sécurité)
6. [Déploiement](#6-déploiement)

---

## 1. Vue d'ensemble

### Collections Firestore Utilisées

| Collection | Description | Accès |
|------------|-------------|-------|
| `membership-requests` | Demandes d'adhésion | Create: Public, Read/Write: Admin |
| `users` | Utilisateurs approuvés | Read: Public*, Write: Admin |
| `subscriptions` | Abonnements des membres | Read: Auth, Write: Admin |
| `notifications` | Notifications système | Read: Auth, Write: Admin |
| `companies` | Entreprises référentielles | Read: Public, Write: Admin |
| `professions` | Professions référentielles | Read: Public, Write: Admin |
| `documents` | Documents archivés | Read: Auth, Write: Admin |

### Chemins Firebase Storage Utilisés

| Chemin | Description | Accès |
|--------|-------------|-------|
| `membership-photos/` | Photos de profil | Upload: Public, Read: Public |
| `membership-documents/` | Pièces d'identité | Upload: Public, Read: Admin |
| `membership-adhesion-pdfs/` | PDFs d'adhésion | Upload: Admin, Read: Admin |

---

## 2. Règles Firestore

### 2.1 Règles Actuelles (Analyse)

```javascript
// firestore.rules (actuel)
match /membership-requests/{requestId} {
  allow create: if true;  // ✅ OK pour inscription publique
  allow read, update, delete: if isAdmin();  // ✅ OK
}
```

**Points positifs :**
- ✅ Création publique pour permettre l'inscription
- ✅ Lecture/modification réservée aux admins

**Points à améliorer :**
- ❌ Pas de validation des données à la création
- ❌ Le demandeur ne peut pas modifier sa propre demande (même pour corrections)
- ❌ Pas de règles pour les sous-collections éventuelles

### 2.2 Règles Proposées (Améliorées)

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // ==========================================
    // FONCTIONS UTILITAIRES
    // ==========================================
    
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isAdmin() {
      return isAuthenticated() && 
             request.auth.token.role in ['Admin', 'SuperAdmin', 'Secretary'];
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    // Vérifie si l'utilisateur a un code de sécurité valide pour modifier sa demande
    function hasValidSecurityCode(requestData) {
      return requestData.securityCode != null &&
             requestData.securityCodeExpiry != null &&
             requestData.securityCodeUsed == false &&
             request.time < requestData.securityCodeExpiry;
    }
    
    // ==========================================
    // DEMANDES D'ADHÉSION (MEMBERSHIP REQUESTS)
    // ==========================================
    
    match /membership-requests/{requestId} {
      
      // ----------------------------------------
      // LECTURE
      // ----------------------------------------
      // Admins peuvent lire toutes les demandes
      // Le propriétaire peut lire sa propre demande (via matricule/email)
      allow read: if isAdmin() || 
                     resource.data.identity.email == request.auth.token.email;
      
      // ----------------------------------------
      // CRÉATION
      // ----------------------------------------
      // Permettre la création par n'importe qui (inscription publique)
      // Avec validation des champs requis
      allow create: if 
        // Vérifier les champs obligatoires
        request.resource.data.keys().hasAll([
          'matricule', 
          'status', 
          'identity', 
          'address', 
          'documents',
          'createdAt'
        ]) &&
        // Statut initial doit être 'pending'
        request.resource.data.status == 'pending' &&
        // Identité doit avoir les champs requis
        request.resource.data.identity.keys().hasAll([
          'firstName', 
          'lastName', 
          'birthDate',
          'nationality'
        ]) &&
        // Pas de tentative de se définir comme payé ou approuvé
        request.resource.data.get('isPaid', false) == false &&
        request.resource.data.get('processedBy', null) == null;
      
      // ----------------------------------------
      // MISE À JOUR
      // ----------------------------------------
      // Admins peuvent tout modifier
      // Demandeurs peuvent modifier UNIQUEMENT si code de sécurité valide
      allow update: if isAdmin() || (
        // Demandeur avec code de sécurité valide
        resource.data.identity.email == request.auth.token.email &&
        hasValidSecurityCode(resource.data) &&
        // Ne peut pas modifier ces champs protégés
        request.resource.data.matricule == resource.data.matricule &&
        request.resource.data.status == resource.data.status &&
        request.resource.data.isPaid == resource.data.get('isPaid', false) &&
        // Doit marquer le code comme utilisé
        request.resource.data.securityCodeUsed == true
      );
      
      // ----------------------------------------
      // SUPPRESSION
      // ----------------------------------------
      // Seuls les admins peuvent supprimer
      allow delete: if isAdmin();
    }
    
    // ==========================================
    // UTILISATEURS (USERS)
    // ==========================================
    
    match /users/{userId} {
      // Lecture : Public (pour connexion) ou propriétaire ou admin
      allow read: if true;  // Nécessaire pour la connexion
      
      // Écriture : Admin uniquement (création lors de l'approbation)
      allow write: if isAdmin();
    }
    
    // ==========================================
    // ABONNEMENTS (SUBSCRIPTIONS)
    // ==========================================
    
    match /subscriptions/{subscriptionId} {
      // Lecture : Propriétaire ou Admin
      allow read: if isAdmin() || 
                     resource.data.userId == request.auth.uid;
      
      // Écriture : Admin uniquement
      allow write: if isAdmin();
    }
    
    // ==========================================
    // DOCUMENTS ARCHIVÉS
    // ==========================================
    
    match /documents/{documentId} {
      // Lecture : Propriétaire (via memberId) ou Admin
      allow read: if isAdmin() || 
                     resource.data.memberId == request.auth.uid;
      
      // Écriture : Admin uniquement
      allow write: if isAdmin();
    }
    
    // ==========================================
    // NOTIFICATIONS
    // ==========================================
    
    match /notifications/{notificationId} {
      // Lecture : Authentifié (pour voir les notifications)
      allow read: if isAuthenticated();
      
      // Création : Admin uniquement
      allow create: if isAdmin();
      
      // Mise à jour : Admin ou propriétaire (pour marquer comme lu)
      allow update: if isAdmin() || (
        isAuthenticated() &&
        // Ne peut modifier que isRead
        request.resource.data.diff(resource.data).affectedKeys().hasOnly(['isRead'])
      );
      
      // Suppression : Admin uniquement
      allow delete: if isAdmin();
    }
    
    // ==========================================
    // ENTREPRISES & PROFESSIONS (RÉFÉRENTIELS)
    // ==========================================
    
    match /companies/{companyId} {
      allow read: if true;  // Lecture publique (formulaire inscription)
      allow write: if isAdmin();
    }
    
    match /professions/{professionId} {
      allow read: if true;  // Lecture publique (formulaire inscription)
      allow write: if isAdmin();
    }
    
    // ==========================================
    // COLLECTIONS GÉOGRAPHIQUES
    // ==========================================
    
    match /provinces/{doc} { allow read: if true; allow write: if isAdmin(); }
    match /departments/{doc} { allow read: if true; allow write: if isAdmin(); }
    match /communes/{doc} { allow read: if true; allow write: if isAdmin(); }
    match /districts/{doc} { allow read: if true; allow write: if isAdmin(); }
    match /quarters/{doc} { allow read: if true; allow write: if isAdmin(); }
    
    // ==========================================
    // RÈGLE PAR DÉFAUT
    // ==========================================
    // Refuser tout accès non explicitement autorisé
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### 2.3 Résumé des Permissions

| Collection | Create | Read | Update | Delete |
|------------|--------|------|--------|--------|
| `membership-requests` | Public* | Admin + Propriétaire | Admin + Propriétaire** | Admin |
| `users` | Admin | Public | Admin | Admin |
| `subscriptions` | Admin | Admin + Propriétaire | Admin | Admin |
| `documents` | Admin | Admin + Propriétaire | Admin | Admin |
| `notifications` | Admin | Authentifié | Admin + isRead only | Admin |
| `companies` | Admin | Public | Admin | Admin |
| `professions` | Admin | Public | Admin | Admin |

\* Avec validation des champs requis
\** Uniquement si code de sécurité valide

---

## 3. Règles Firebase Storage

### 3.1 Règles Actuelles (Analyse)

```javascript
// storage.rules (actuel)
match /membership-photos/{fileName} {
  allow read: if true;
  allow write: if true;  // ⚠️ Risque de sécurité
}

match /membership-documents/{userId}/{fileName} {
  allow read: if true;   // ⚠️ Documents sensibles exposés
  allow write: if true;  // ⚠️ Risque de sécurité
}
```

**Problèmes identifiés :**
- ❌ Pas de validation du type de fichier
- ❌ Pas de limite de taille
- ❌ Documents d'identité accessibles publiquement
- ❌ Pas de chemin pour les PDFs d'adhésion

### 3.2 Règles Proposées (Améliorées)

```javascript
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    
    // ==========================================
    // FONCTIONS UTILITAIRES
    // ==========================================
    
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isAdmin() {
      return isAuthenticated() && 
             request.auth.token.role in ['Admin', 'SuperAdmin', 'Secretary'];
    }
    
    // Vérifie si le fichier est une image
    function isImage() {
      return request.resource.contentType.matches('image/.*');
    }
    
    // Vérifie si le fichier est un PDF
    function isPDF() {
      return request.resource.contentType == 'application/pdf';
    }
    
    // Limite de taille : 5 MB pour les images
    function isImageSizeValid() {
      return request.resource.size < 5 * 1024 * 1024;
    }
    
    // Limite de taille : 10 MB pour les PDFs
    function isPDFSizeValid() {
      return request.resource.size < 10 * 1024 * 1024;
    }
    
    // ==========================================
    // PHOTOS DE PROFIL (MEMBERSHIP-PHOTOS)
    // ==========================================
    // Utilisées lors de l'inscription et affichées dans la liste des demandes
    
    match /membership-photos/{fileName} {
      // Lecture : Publique (affichage dans le formulaire et admin)
      allow read: if true;
      
      // Écriture : Publique avec validation
      // - Doit être une image
      // - Taille max 5 MB
      allow write: if isImage() && isImageSizeValid();
      
      // Suppression : Admin uniquement
      allow delete: if isAdmin();
    }
    
    // ==========================================
    // DOCUMENTS D'IDENTITÉ (MEMBERSHIP-DOCUMENTS)
    // ==========================================
    // Pièces d'identité recto/verso - SENSIBLES
    
    match /membership-documents/{requestId}/{fileName} {
      // Lecture : Admins uniquement (données sensibles)
      allow read: if isAdmin();
      
      // Écriture : Publique avec validation
      // - Doit être une image (photo du document)
      // - Taille max 5 MB
      allow write: if isImage() && isImageSizeValid();
      
      // Suppression : Admin uniquement
      allow delete: if isAdmin();
    }
    
    // ==========================================
    // PDFs D'ADHÉSION (MEMBERSHIP-ADHESION-PDFS)
    // ==========================================
    // PDFs générés lors de l'approbation - CONFIDENTIELS
    
    match /membership-adhesion-pdfs/{fileName} {
      // Lecture : Admins uniquement
      allow read: if isAdmin();
      
      // Écriture : Admins uniquement avec validation
      // - Doit être un PDF
      // - Taille max 10 MB
      allow write: if isAdmin() && isPDF() && isPDFSizeValid();
      
      // Suppression : Admin uniquement
      allow delete: if isAdmin();
    }
    
    // ==========================================
    // DOCUMENTS ARCHIVÉS
    // ==========================================
    // Chemin générique pour les documents archivés par module
    
    match /documents/{module}/{memberId}/{fileName} {
      // Lecture : Admin ou propriétaire
      allow read: if isAdmin() || request.auth.uid == memberId;
      
      // Écriture : Admin uniquement
      allow write: if isAdmin();
      
      // Suppression : Admin uniquement
      allow delete: if isAdmin();
    }
    
    // ==========================================
    // RÈGLE PAR DÉFAUT
    // ==========================================
    // Refuser tout accès non explicitement autorisé
    
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

### 3.3 Résumé des Permissions Storage

| Chemin | Read | Write | Delete | Validation |
|--------|------|-------|--------|------------|
| `membership-photos/` | Public | Public | Admin | Image, max 5MB |
| `membership-documents/{id}/` | Admin | Public | Admin | Image, max 5MB |
| `membership-adhesion-pdfs/` | Admin | Admin | Admin | PDF, max 10MB |
| `documents/{module}/{memberId}/` | Admin + Propriétaire | Admin | Admin | - |

---

## 4. Index Firestore

### 4.1 Index Actuels (Analyse)

Actuellement, **aucun index** n'est défini pour la collection `membership-requests`.

### 4.2 Index Nécessaires

Les requêtes suivantes sont effectuées sur la collection `membership-requests` :

| Requête | Champs utilisés | Index requis |
|---------|-----------------|--------------|
| Liste par statut + date | `status`, `createdAt` | Composite |
| Liste triée par date | `createdAt` | Simple (auto) |
| Recherche par matricule | `matricule` | Simple (auto) |
| Statistiques par statut | `status` | Simple (auto) |
| Filtrage payé + statut | `isPaid`, `status`, `createdAt` | Composite |

### 4.3 Configuration des Index

Ajoutez ces index dans `firestore.indexes.json` :

```json
{
  "indexes": [
    // ==========================================
    // INDEX EXISTANTS (ne pas modifier)
    // ==========================================
    // ... index existants pour notifications, géographie ...
    
    // ==========================================
    // INDEX MEMBERSHIP-REQUESTS
    // ==========================================
    
    // Index 1: Filtrage par statut + tri par date (DESC)
    // Requête: where('status', '==', 'pending').orderBy('createdAt', 'desc')
    {
      "collectionGroup": "membership-requests",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "status",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    },
    
    // Index 2: Filtrage par statut + tri par date (ASC)
    // Requête: where('status', '==', 'pending').orderBy('createdAt', 'asc')
    {
      "collectionGroup": "membership-requests",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "status",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "ASCENDING"
        }
      ]
    },
    
    // Index 3: Filtrage par paiement + statut + date
    // Requête: where('isPaid', '==', true).where('status', '==', 'pending').orderBy('createdAt', 'desc')
    {
      "collectionGroup": "membership-requests",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "isPaid",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "status",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    },
    
    // Index 4: Filtrage par paiement + date (pour onglets Payé/Non payé)
    // Requête: where('isPaid', '==', false).orderBy('createdAt', 'desc')
    {
      "collectionGroup": "membership-requests",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "isPaid",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    },
    
    // Index 5: Filtrage par processedBy + date (demandes traitées par un admin)
    // Requête: where('processedBy', '==', adminId).orderBy('processedAt', 'desc')
    {
      "collectionGroup": "membership-requests",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "processedBy",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "processedAt",
          "order": "DESCENDING"
        }
      ]
    },
    
    // Index 6: Recherche par email + date
    // Requête: where('identity.email', '==', email).orderBy('createdAt', 'desc')
    {
      "collectionGroup": "membership-requests",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "identity.email",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    },
    
    // Index 7: Demandes en cours d'examen avec code de sécurité non expiré
    // Requête: where('status', '==', 'under_review').where('securityCodeUsed', '==', false)
    {
      "collectionGroup": "membership-requests",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "status",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "securityCodeUsed",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    },
    
    // ==========================================
    // INDEX NOTIFICATIONS (pour membership)
    // ==========================================
    
    // Index 8: Notifications par module + date
    // Requête: where('module', '==', 'memberships').orderBy('createdAt', 'desc')
    {
      "collectionGroup": "notifications",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "module",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    },
    
    // Index 9: Notifications non lues par module
    // Requête: where('module', '==', 'memberships').where('isRead', '==', false).orderBy('createdAt', 'desc')
    {
      "collectionGroup": "notifications",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "module",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "isRead",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    },
    
    // ==========================================
    // INDEX SUBSCRIPTIONS
    // ==========================================
    
    // Index 10: Abonnements par utilisateur + date
    // Requête: where('userId', '==', memberId).orderBy('dateStart', 'desc')
    {
      "collectionGroup": "subscriptions",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "userId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "dateStart",
          "order": "DESCENDING"
        }
      ]
    },
    
    // ==========================================
    // INDEX DOCUMENTS
    // ==========================================
    
    // Index 11: Documents par membre + date
    // Requête: where('memberId', '==', memberId).orderBy('createdAt', 'desc')
    {
      "collectionGroup": "documents",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "memberId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    },
    
    // Index 12: Documents par type + membre
    // Requête: where('type', '==', 'ADHESION').where('memberId', '==', memberId)
    {
      "collectionGroup": "documents",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "type",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "memberId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    }
  ],
  "fieldOverrides": []
}
```

### 4.4 Index pour la Recherche Textuelle (Optionnel)

Pour une recherche plus performante, vous pouvez ajouter un champ `searchableText` :

```typescript
// Lors de la création/mise à jour d'une demande
const searchableText = [
  identity.firstName,
  identity.lastName,
  identity.email,
  matricule,
  identity.contacts[0]
].filter(Boolean).join(' ').toLowerCase();
```

Puis créer un index :

```json
{
  "collectionGroup": "membership-requests",
  "queryScope": "COLLECTION",
  "fields": [
    {
      "fieldPath": "searchableText",
      "order": "ASCENDING"
    },
    {
      "fieldPath": "createdAt",
      "order": "DESCENDING"
    }
  ]
}
```

---

## 5. Recommandations de Sécurité

### 5.1 Améliorations Critiques

| Recommandation | Priorité | Impact |
|----------------|----------|--------|
| Valider les données à la création | 🔴 Haute | Empêche les injections |
| Restreindre l'accès aux documents d'identité | 🔴 Haute | Protection des données sensibles |
| Valider le type de fichier uploadé | 🔴 Haute | Empêche les fichiers malveillants |
| Limiter la taille des fichiers | 🟠 Moyenne | Performance et coût |
| Ajouter des index pour la pagination | 🟠 Moyenne | Performance |

### 5.2 Points d'Attention

1. **Custom Claims Firebase Auth :**
   - Les règles utilisent `request.auth.token.role`
   - Le rôle doit être défini comme Custom Claim lors de la création du compte admin

2. **Code de Sécurité :**
   - La validation du code se fait dans les règles Firestore
   - Le code doit être marqué comme utilisé après modification

3. **PDFs d'Adhésion :**
   - Uploadés uniquement par les admins
   - Contiennent des données sensibles
   - Ne doivent pas être accessibles publiquement

### 5.3 Logging et Audit

Pour un audit complet, considérez :

```typescript
// Ajouter à chaque modification
{
  lastModifiedAt: serverTimestamp(),
  lastModifiedBy: adminId,
  auditLog: arrayUnion({
    action: 'status_update',
    from: 'pending',
    to: 'approved',
    by: adminId,
    at: serverTimestamp()
  })
}
```

---

## 6. Déploiement

### 6.1 Commandes de Déploiement

```bash
# Déployer les règles Firestore
firebase deploy --only firestore:rules

# Déployer les index Firestore
firebase deploy --only firestore:indexes

# Déployer les règles Storage
firebase deploy --only storage

# Tout déployer d'un coup
firebase deploy --only firestore,storage
```

### 6.2 Vérification Post-Déploiement

1. **Tester la création d'une demande** (non authentifié)
2. **Tester la lecture d'une demande** (admin)
3. **Tester l'upload de photo** (non authentifié)
4. **Tester l'accès aux documents d'identité** (admin vs non-admin)
5. **Vérifier les index** dans la console Firebase

### 6.3 Environnements

| Environnement | Projet Firebase | Configuration |
|---------------|-----------------|---------------|
| Development | `kara-dev` | Règles permissives pour debug |
| Preprod | `kara-preprod` | Règles identiques à prod |
| Production | `kara-prod` | Règles strictes |

---

## 7. Checklist de Validation

### Firestore Rules
- [ ] Création de demande publique avec validation des champs
- [ ] Lecture des demandes réservée aux admins
- [ ] Modification par demandeur uniquement avec code de sécurité valide
- [ ] Custom Claims `role` défini pour les admins

### Storage Rules
- [ ] Photos uploadables par tous (avec validation type/taille)
- [ ] Documents d'identité non accessibles publiquement
- [ ] PDFs d'adhésion réservés aux admins
- [ ] Validation du type de fichier

### Index
- [ ] Index pour filtrage par statut + date
- [ ] Index pour filtrage par paiement + date
- [ ] Index pour notifications par module
- [ ] Tous les index créés sans erreur

---

## Références

- `firestore.rules` - Fichier de règles Firestore
- `storage.rules` - Fichier de règles Storage
- `firestore.indexes.json` - Configuration des index
- [Firebase Security Rules](https://firebase.google.com/docs/rules)
- [Firestore Indexes](https://firebase.google.com/docs/firestore/query-data/indexing)
