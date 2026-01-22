## Firebase – Formulaire membre (V2)

### 1. Collections / documents utilisés

#### 1.1 Collections principales (création de la demande d’adhésion)

- **`membershipRequests`** – demande d’adhésion créée par le formulaire
  - Créée via `MembershipFormService.submitNewMembership()`.
  - Champs principaux :
    - `identity.*` (nom, prénom, sexe, date/lieu de naissance, nationalité, etc.).
    - `address.*` (province, ville, arrondissement, quartier, complément).
    - `company.*` (entreprise, profession, adresse entreprise).
    - `documents.*` (type pièce d’identité, numéro, dates, URLs des fichiers uploadés).
    - `status` (initialement `'pending'`).
    - `createdAt`, `updatedAt`.

- **`documents`** (collection liée)
  - Documents uploadés (pièce d’identité recto/verso, photo du membre).
  - Liés à la demande via `membershipRequestId` ou `dossierId`.
  - Champs : `type`, `url` (Storage), `uploadedAt`, etc.

#### 1.2 Collections référentiels (lecture + création via modals)

- **Géographie** (collections exactes à confirmer selon la structure actuelle) :
  - `provinces` (ou équivalent).
  - `departments` (ou équivalent).
  - `communes` (ou équivalent).
  - `districts` (ou équivalent).
  - `quarters` (ou équivalent).
  - Utilisées pour :
    - Step2 (Adresse) : combobox en cascade Province → Ville → Arrondissement → Quartier.
    - Modals de création rapide : `AddProvinceModal`, `AddCommuneModal`, `AddDistrictModal`, `AddQuarterModal`.

- **Référentiels professionnels** :
  - `companies` (ou équivalent) : entreprises.
  - `professions` (ou équivalent) : professions.
  - Utilisées pour :
    - Step3 (Entreprise) : combobox `CompanySelect`, `ProfessionSelect`.
    - Modals de création rapide : `AddCompanyModal`, `AddProfessionModal`.

### 2. Index Firestore nécessaires

#### 2.1 Référentiels géographiques (pour combobox avec tri)

- **Provinces** :
  - Collection : `provinces` (ou équivalent).
  - Index : `name` (Ascending) – pour tri alphabétique dans combobox.
- **Communes** :
  - Collection : `communes` (ou équivalent).
  - Index : `departmentId` (Ascending), `name` (Ascending) – pour filtrer par département et trier.
- **Districts / Quarters** :
  - Index similaires : `communeId` (Ascending), `name` (Ascending).

#### 2.2 Référentiels professionnels

- **Companies** :
  - Collection : `companies` (ou équivalent).
  - Index : `name` (Ascending) – pour tri alphabétique.
- **Professions** :
  - Collection : `professions` (ou équivalent).
  - Index : `name` (Ascending) – pour tri alphabétique.

#### 2.3 Demande d’adhésion (création)

- **`membershipRequests`** :
  - Index : `createdAt` (Descending) – pour afficher les dernières demandes créées.
  - Index : `status` (Ascending), `createdAt` (Descending) – pour filtrer par statut.

### 3. Règles de sécurité Firestore

#### 3.1 Création de demande d’adhésion

```javascript
match /membershipRequests/{requestId} {
  allow create: if request.auth != null
    && exists(/databases/$(database)/documents/admins/$(request.auth.uid));
  allow read: if request.auth != null
    && exists(/databases/$(database)/documents/admins/$(request.auth.uid));
}
```

#### 3.2 Création de référentiels via modals (admin uniquement)

```javascript
// Géographie
match /provinces/{provinceId} {
  allow create: if request.auth != null
    && exists(/databases/$(database)/documents/admins/$(request.auth.uid));
}

match /communes/{communeId} {
  allow create: if request.auth != null
    && exists(/databases/$(database)/documents/admins/$(request.auth.uid));
}

// Référentiels pro
match /companies/{companyId} {
  allow create: if request.auth != null
    && exists(/databases/$(database)/documents/admins/$(request.auth.uid));
}

match /professions/{professionId} {
  allow create: if request.auth != null
    && exists(/databases/$(database)/documents/admins/$(request.auth.uid));
}
```

> Les noms exacts de collections (`provinces`, `communes`, `companies`, `professions`) sont à aligner avec la structure actuelle de la DB, mais le principe reste le même : **création réservée aux admins**.

### 4. Règles de sécurité Storage

- **Photos de membres** :
  - Chemin : `/membership-requests/{dossierId}/photos/{filename}` (ou équivalent).
  - Règle :
    - Upload uniquement pour les admins authentifiés.
    - Lecture pour les admins.
    - Validation de la taille (ex. max 5MB) et du type (image/jpeg, image/png).

- **Documents (pièces d’identité)** :
  - Chemin : `/membership-requests/{dossierId}/documents/{type}/{filename}`.
  - Règle :
    - Upload uniquement pour les admins authentifiés.
    - Lecture pour les admins.
    - Validation de la taille et du type (PDF, images).

### 5. Vérifications à faire pendant le refactor

- [ ] Vérifier que tous les index nécessaires existent dans `firestore.indexes.json`.
- [ ] S’assurer que les requêtes dans les combobox (géographie, entreprises, professions) respectent l’ordre des champs dans les index.
- [ ] Vérifier que les règles Firestore et Storage couvrent bien tous les accès nécessaires pour le formulaire et les modals de création rapide.
- [ ] Tester les uploads de documents (photos, pièces d’identité) avec les règles Storage.

