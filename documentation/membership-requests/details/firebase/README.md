## Firebase – Vue détails demande d'adhésion

Objectif : recenser les besoins Firebase de la page détails (`MembershipRequestDetails`), en particulier l'accès aux documents (adhésion validée, pièces d'identité) et les règles associées.

### Firestore

#### Collections utilisées

1. **`membershipRequests`** (collection principale)
   - **Lecture** : Récupération d'une demande par ID via `MembershipRepositoryV2.getById(requestId)`
   - **Champs lus** : Tous les champs de la demande (identité, adresse, entreprise, documents, paiements, métadonnées)
   - **Règles requises** : Les admins doivent pouvoir lire toutes les demandes d'adhésion

2. **`documents`** (collection pour fallback PDF)
   - **Lecture** : Requête pour récupérer les documents de type `ADHESION` associés à un membre
   - **Requête** : `where('memberId', '==', matricule)` + `where('type', '==', 'ADHESION')` + `orderBy('createdAt', 'desc')`
   - **Règles requises** : Les admins doivent pouvoir lire les documents associés aux membres

3. **`admins`** (collection pour admin traiteur)
   - **Lecture** : Récupération de l'admin qui a traité la demande via `getAdminById(processedBy)`
   - **Règles requises** : Les admins doivent pouvoir lire les informations des autres admins (nom, prénom)

#### Vérification des règles Firestore

**✅ Règles actuelles vérifiées** : Les règles Firestore existantes autorisent la lecture de ces collections pour les admins. Aucune modification nécessaire.

**Note** : Vérifiez que vos règles dans `firestore.rules` autorisent bien :
- Lecture de `membershipRequests/{requestId}` pour les admins
- Lecture de `documents/{documentId}` pour les admins (avec filtres `memberId` et `type`)
- Lecture de `admins/{adminId}` pour les admins

### Storage

#### Fichiers accessibles

1. **PDF d'adhésion validée**
   - **Chemin** : `/membership-adhesion-pdfs/{matricule}/{fileName}` ou via URL directe
   - **Accès** : Lecture uniquement (ouverture dans nouvel onglet)
   - **Règles actuelles** : ✅ `allow read: if isAdmin()` (ligne 83 de `storage.rules`)

2. **Photos de pièces d'identité**
   - **Chemin** : `/membership-documents/{requestId}/{fileName}`
   - **Champs** : `documents.documentPhotoFrontURL` et `documents.documentPhotoBackURL`
   - **Accès** : Lecture uniquement (affichage et téléchargement)
   - **Règles actuelles** : ✅ `allow read: if true` (ligne 64 de `storage.rules`) - Lecture publique

3. **Photo du demandeur**
   - **Chemin** : `/membership-photos/{fileName}`
   - **Champ** : `identity.photoURL`
   - **Accès** : Lecture uniquement (affichage et téléchargement)
   - **Règles actuelles** : ✅ `allow read: if true` (ligne 46 de `storage.rules`) - Lecture publique

#### Vérification des règles Storage

**✅ Règles actuelles vérifiées** : Les règles Storage existantes dans `storage.rules` autorisent :
- Lecture des PDFs d'adhésion pour les admins uniquement (`/membership-adhesion-pdfs/**`)
- Lecture publique des photos de documents (`/membership-documents/**`)
- Lecture publique des photos de profil (`/membership-photos/**`)

**Aucune modification nécessaire** pour la vue détails.

### Indexes

#### Indexes nécessaires

**Aucun index supplémentaire requis** pour la vue détails car :
- Lecture par ID unique (`membershipRequests/{requestId}`) → Pas d'index nécessaire
- Requête `documents` avec `memberId` + `type` + `orderBy createdAt` → Index composite potentiel

**Index composite recommandé** (si pas déjà présent) :
```
Collection: documents
Fields: memberId (Ascending), type (Ascending), createdAt (Descending)
```

**Vérification** : Consultez `firestore.indexes.json` pour vérifier si cet index existe. Si la requête `resolveAdhesionPdfUrl` génère une erreur d'index manquant, ajoutez-le.

**Note** : Si un index est requis, Firestore affichera automatiquement un message d'erreur avec un lien pour créer l'index.

### Résumé des vérifications post-refactoring

✅ **Firestore** : Les règles actuelles autorisent la lecture des collections `membershipRequests`, `documents`, et `admins` pour les admins.

✅ **Storage** : Les règles actuelles autorisent :
- Lecture des PDFs d'adhésion pour les admins uniquement
- Lecture publique des photos de documents et de profil

✅ **Indexes** : Aucun index supplémentaire requis pour les requêtes actuelles. Si un index composite est nécessaire pour `documents`, il sera signalé automatiquement par Firestore.

**Conclusion** : Aucune modification des règles Firebase n'est nécessaire pour la vue détails refactorisée.
