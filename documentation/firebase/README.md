# Firebase - Documentation Technique

> Documentation complète des collections Firestore, règles de sécurité et index pour le projet KARA.

## Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Configuration](#configuration)
3. [Collections Firestore](#collections-firestore)
4. [Règles de sécurité](#règles-de-sécurité)
5. [Index Firestore](#index-firestore)
6. [Cloud Functions](#cloud-functions)
7. [Firebase Storage](#firebase-storage)
8. [Emulateurs](#emulateurs)

---

## Vue d'ensemble

Le projet KARA utilise Firebase pour :
- **Firestore** : Base de données NoSQL pour stocker toutes les données métier
- **Authentication** : Gestion des utilisateurs et authentification
- **Storage** : Stockage des fichiers (photos, documents PDF)
- **Cloud Functions** : Logique métier côté serveur

### Architecture Multi-Environnement

Chaque environnement (dev, preprod, prod) utilise sa propre base de données Firebase :
- Les noms de collections sont **identiques** dans tous les environnements
- La séparation se fait au niveau du **projet Firebase**

---

## Configuration

### Fichier `firebase.json`

```json
{
  "functions": [{
    "source": "functions",
    "codebase": "default",
    "predeploy": ["npm --prefix \"$RESOURCE_DIR\" run build"]
  }],
  "emulators": {
    "auth": { "port": 9099 },
    "firestore": { "port": 8080 },
    "storage": { "port": 9097 },
    "functions": { "port": 5001 },
    "ui": { "enabled": true }
  },
  "storage": { "rules": "storage.rules" },
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  }
}
```

---

## Collections Firestore

### Vue d'ensemble des collections

| Collection | Description | Accès Lecture | Accès Écriture |
|------------|-------------|---------------|----------------|
| `users` | Membres de l'association | Public | Admin |
| `members` | Informations détaillées des membres | Authentifié | Admin |
| `membership-requests` | Demandes d'adhésion | Public | Conditionnel |
| `admins` | Administrateurs du système | Public | SuperAdmin |
| `subscriptions` | Abonnements des membres | Admin/Propriétaire | Admin |
| `payments` | Historique des paiements | Admin | Admin |
| `notifications` | Notifications système | Admin | Admin/CF |
| `audit-logs` | Logs d'audit | Admin | CF uniquement |
| `documents` | Documents archivés | Admin/Propriétaire | Admin |
| `companies` | Référentiel entreprises | Public | Admin |
| `professions` | Référentiel professions | Public | Admin |
| `groups` | Groupes de membres | Authentifié | Admin |

#### Collections Géographiques

| Collection | Description | Hiérarchie |
|------------|-------------|------------|
| `provinces` | Provinces du Gabon | Niveau 1 |
| `departments` | Départements | Niveau 2 (→ Province) |
| `communes` | Communes/Villes | Niveau 3 (→ Département) |
| `districts` | Arrondissements | Niveau 4 (→ Commune) |
| `quarters` | Quartiers | Niveau 5 (→ District) |

#### Collections Métier

| Collection | Module | Description |
|------------|--------|-------------|
| `contractsCI` | Caisse Imprévue | Contrats de caisse imprévue |
| `subscriptionsCI` | Caisse Imprévue | Forfaits disponibles |
| `demandsCI` | Caisse Imprévue | Demandes de contrats CI |
| `contractsCS` | Caisse Spéciale | Contrats de caisse spéciale |
| `demandsCS` | Caisse Spéciale | Demandes de contrats CS |
| `placements` | Placement | Placements bienfaiteurs |
| `placementDemands` | Placement | Demandes de placements |
| `credits` | Crédit Spéciale | Contrats de crédit |
| `creditDemands` | Crédit Spéciale | Demandes de crédit |
| `charityEvents` | Bienfaiteur | Évènements de charité |
| `vehicleInsurances` | Véhicule | Assurances véhicules |

---

### Structures détaillées des collections

#### `users` - Utilisateurs/Membres

```typescript
interface User {
  id: string                    // UID Firebase = matricule
  matricule: string             // Format: XXXX.MK.DDMMYY
  
  // Identité
  lastName: string
  firstName: string
  birthDate: string
  birthPlace?: string
  contacts: string[]
  gender: string
  email?: string
  nationality: string
  hasCar: boolean
  
  // Adresse
  address?: {
    province: string
    city: string
    district: string
    arrondissement: string
    additionalInfo?: string
  }
  
  // Professionnel
  companyName?: string
  profession?: string
  
  // Photos
  photoURL?: string | null
  photoPath?: string | null
  
  // Documents
  identityDocument?: string
  identityDocumentNumber?: string
  
  // Références
  subscriptions: string[]       // IDs des souscriptions
  dossier: string               // ID membership-request
  
  // Rôles et type
  membershipType: 'adherant' | 'bienfaiteur' | 'sympathisant'
  roles: ('Adherant' | 'Bienfaiteur' | 'Sympathisant' | 'Admin' | 'SuperAdmin' | 'Secretary')[]
  
  // Appartenance
  groupIds?: string[]
  caisseContractIds?: string[]
  
  // Métadonnées
  createdAt: Timestamp
  updatedAt: Timestamp
  isActive: boolean
}
```

#### `membership-requests` - Demandes d'adhésion

```typescript
interface MembershipRequest {
  id: string
  matricule: string
  status: 'pending' | 'approved' | 'rejected' | 'under_review'
  
  // Identité (RegisterFormData.identity)
  identity: {
    civility: string
    lastName: string
    firstName?: string
    birthDate: string
    birthPlace: string
    birthCertificateNumber: string
    contacts: string[]
    email?: string
    gender: string
    nationality: string
    hasCar: boolean
    photoURL?: string | null
    photoPath?: string | null
    // ... autres champs
  }
  
  // Adresse
  address: {
    provinceId?: string
    communeId?: string
    districtId?: string
    quarterId?: string
    province: string
    city: string
    district: string
    arrondissement: string
    additionalInfo?: string
  }
  
  // Entreprise
  company: {
    isEmployed: boolean
    companyName?: string
    profession?: string
    // ...
  }
  
  // Documents
  documents: {
    identityDocument: string
    identityDocumentNumber: string
    documentPhotoFrontURL?: string
    documentPhotoBackURL?: string
    expirationDate: string
    issuingPlace: string
    issuingDate: string
    termsAccepted: boolean
  }
  
  // Traitement
  processedAt?: Timestamp
  processedBy?: string
  approvedBy?: string
  approvedAt?: Timestamp
  motifReject?: string
  
  // Réouverture
  reopenedAt?: Timestamp
  reopenedBy?: string
  reopenReason?: string
  
  // Paiements
  isPaid?: boolean
  payments?: Payment[]
  
  // Code de sécurité (corrections)
  securityCode?: string
  securityCodeExpiry?: Timestamp
  securityCodeUsed?: boolean
  
  // Métadonnées
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

#### `payments` - Paiements centralisés

```typescript
interface Payment {
  id: string
  
  // Informations du paiement
  date: Timestamp               // Date du versement
  time: string                  // Heure (HH:mm)
  mode: 'airtel_money' | 'mobicash' | 'cash' | 'bank_transfer' | 'other'
  amount: number
  acceptedBy: string            // ID admin
  paymentType: 'Membership' | 'Subscription' | 'Tontine' | 'Charity'
  
  // Source
  sourceType: string            // Type de la source (membership-request, subscription, etc.)
  sourceId: string              // ID de la source
  
  // Preuves
  proofUrl?: string
  proofPath?: string
  proofJustification?: string
  
  // Traçabilité
  recordedBy: string            // ID admin
  recordedByName: string        // Nom complet
  recordedAt: Timestamp
  createdAt: Timestamp
}
```

#### `notifications` - Notifications

```typescript
interface Notification {
  id: string
  module: 'memberships' | 'vehicule' | 'caisse_speciale' | 'caisse_imprevue' | 'bienfaiteur' | 'placement' | 'credit_speciale'
  entityId: string
  type: NotificationType        // Voir types.ts pour la liste complète
  title: string
  message: string
  isRead: boolean
  createdAt: Timestamp
  scheduledAt?: Timestamp
  sentAt?: Timestamp
  metadata?: Record<string, any>
}
```

#### Collections Géographiques

```typescript
// Province (Niveau 1)
interface Province {
  id: string
  code: string                  // Ex: "ESTUAIRE"
  name: string                  // Ex: "Estuaire"
  searchableText: string        // Pour la recherche
  createdAt: Timestamp
  updatedAt: Timestamp
  createdBy: string
}

// Department (Niveau 2)
interface Department {
  id: string
  provinceId: string            // FK → provinces
  name: string
  code?: string
  searchableText: string
  createdAt: Timestamp
  updatedAt: Timestamp
  createdBy: string
}

// Commune (Niveau 3)
interface Commune {
  id: string
  departmentId: string          // FK → departments
  name: string
  postalCode?: string
  alias?: string
  searchableText: string
  createdAt: Timestamp
  updatedAt: Timestamp
  createdBy: string
}

// District/Arrondissement (Niveau 4)
interface District {
  id: string
  communeId: string             // FK → communes
  name: string
  searchableText: string
  createdAt: Timestamp
  updatedAt: Timestamp
  createdBy: string
}

// Quarter/Quartier (Niveau 5)
interface Quarter {
  id: string
  districtId: string            // FK → districts
  name: string
  searchableText: string
  createdAt: Timestamp
  updatedAt: Timestamp
  createdBy: string
}
```

---

## Règles de sécurité

### Fonctions utilitaires

```javascript
// Vérifie si l'utilisateur est authentifié
function isAuthenticated() {
  return request.auth != null;
}

// Vérifie si l'utilisateur est admin (Admin, SuperAdmin ou Secretary)
function isAdmin() {
  return isAuthenticated() && 
         request.auth.token.role in ['Admin', 'SuperAdmin', 'Secretary'];
}

// Vérifie si le code de sécurité est valide
function hasValidSecurityCode(requestData) {
  return requestData.securityCode != null &&
         requestData.securityCodeExpiry != null &&
         requestData.get('securityCodeUsed', false) == false &&
         request.time < requestData.securityCodeExpiry;
}
```

### Matrice des permissions

| Collection | Read | Create | Update | Delete |
|------------|------|--------|--------|--------|
| **Géographie** |
| `provinces` | Public | Admin | Admin | Admin |
| `departments` | Public | Admin | Admin | Admin |
| `communes` | Public | Admin | Admin | Admin |
| `districts` | Public | Admin | Admin | Admin |
| `quarters` | Public | Admin | Admin | Admin |
| **Utilisateurs** |
| `users` | Public | Admin | Admin | Admin |
| `members` | Auth | Admin | Admin | Admin |
| `admins` | Public | SuperAdmin | SuperAdmin | SuperAdmin |
| **Métier** |
| `membership-requests` | Public | Public* | Conditionnel** | Admin |
| `subscriptions` | Admin/Owner | Admin | Admin | Admin |
| `payments` | Admin | Admin* | Admin*** | Admin |
| `notifications` | Admin | Admin/CF | Admin/Owner**** | Admin |
| `audit-logs` | Admin | CF | Interdit | SuperAdmin |
| `documents` | Admin/Owner | Admin | Admin | Admin |
| **Référentiels** |
| `companies` | Public | Admin | Admin | Admin |
| `professions` | Public | Admin | Admin | Admin |

**Légendes :**
- `*` Validation des champs requis à la création
- `**` Admin complet, ou demandeur avec code de sécurité valide
- `***` Champs critiques non modifiables (amount, mode, date, sourceType, sourceId, recordedBy)
- `****` Propriétaire peut seulement modifier `isRead` et `readAt`

### Règles spéciales pour `membership-requests`

#### Création (Public avec validation)
```javascript
allow create: if 
  // Champs obligatoires
  request.resource.data.keys().hasAll([
    'matricule', 'status', 'identity', 'address', 'documents', 'createdAt'
  ]) &&
  // Statut initial = pending
  request.resource.data.status == 'pending' &&
  // Identity complète
  request.resource.data.identity.keys().hasAll([
    'firstName', 'lastName', 'birthDate', 'nationality'
  ]) &&
  // Pas de fraude
  request.resource.data.get('isPaid', false) == false &&
  request.resource.data.get('processedBy', null) == null;
```

#### Mise à jour (Conditions complexes)

1. **Admin - Approbation** : Requiert `approvedBy`, `approvedAt`
2. **Admin - Rejet** : Requiert `processedBy`, `processedAt`, `motifReject` (10-500 chars)
3. **Admin - Réouverture** : Status `rejected` → `pending`, requiert `reopenedBy`, `reopenedAt`, `reopenReason`
4. **Demandeur avec code** : Peut modifier si email correspond et code valide, doit marquer code comme utilisé
5. **Soumission corrections** : Status `under_review` → `pending`, nettoie `securityCode` et `reviewNote`

---

## Index Firestore

### Index composites principaux

#### membership-requests

| Champs | Ordre | Usage |
|--------|-------|-------|
| `status` + `createdAt` | ASC + DESC | Liste par statut |
| `isPaid` + `status` + `createdAt` | ASC + ASC + DESC | Filtrage paiement + statut |
| `status` + `matricule` + `createdAt` | ASC + ASC + DESC | Recherche par matricule |
| `status` + `identity.email` + `createdAt` | ASC + ASC + DESC | Recherche par email |
| `status` + `identity.firstName` + `createdAt` | ASC + ASC + DESC | Recherche par prénom |
| `status` + `approvedBy` + `approvedAt` | ASC + ASC + DESC | Historique approbations |
| `securityCode` + `securityCodeUsed` | ASC + ASC | Validation code sécurité |

#### notifications

| Champs | Ordre | Usage |
|--------|-------|-------|
| `isRead` + `createdAt` | ASC + DESC | Non lues en premier |
| `module` + `createdAt` | ASC + DESC | Par module |
| `module` + `isRead` + `createdAt` | ASC + ASC + DESC | Module + statut lu |

#### Collections géographiques

Chaque collection géographique a des index pour :
- Recherche par parent (`provinceId`, `departmentId`, etc.) + `name`
- Recherche textuelle `searchableText` + `name`
- Combinaison parent + recherche textuelle + `name`

#### users

| Champs | Ordre | Usage |
|--------|-------|-------|
| `roles` (CONTAINS) + `createdAt` | - + DESC | Par rôle |
| `roles` (CONTAINS) + `membershipType` + `createdAt` | - + ASC + DESC | Rôle + type membre |
| `roles` (CONTAINS) + `hasCar` + `createdAt` | - + ASC + DESC | Membres avec véhicule |
| `roles` (CONTAINS) + `isActive` + `createdAt` | - + ASC + DESC | Membres actifs |
| `roles` (CONTAINS) + `nationality` + `createdAt` | - + ASC + DESC | Par nationalité |

### Déploiement des index

```bash
# Déployer les index
firebase deploy --only firestore:indexes

# Vérifier le statut des index
firebase firestore:indexes
```

---

## Cloud Functions

### Fonctions disponibles

| Fonction | Trigger | Description |
|----------|---------|-------------|
| `approveMembershipRequest` | Callable | Approuve une demande et crée l'utilisateur |
| `deleteMembershipRequest` | Callable | Supprime une demande rejetée |
| `renewSecurityCode` | Callable | Régénère le code de sécurité |
| `submitCorrections` | Callable | Soumet les corrections du demandeur |
| `verifySecurityCode` | Callable | Vérifie un code de sécurité |
| `syncToAlgolia` | Firestore Trigger | Sync les données vers Algolia |

### Fonctions planifiées (Scheduled)

| Fonction | Schedule | Description |
|----------|----------|-------------|
| `birthdayNotifications` | Daily | Notifications anniversaires (J-2, J, J+1) |
| `caisseImprevueDemandReminders` | Daily | Rappels demandes CI en attente |
| `caisseSpecialeDemandReminders` | Daily | Rappels demandes CS en attente |
| `ciPaymentDue` | Daily | Rappels paiements CI dus |
| `creditPaymentDue` | Daily | Rappels échéances crédit |
| `overdueCommissions` | Daily | Alertes commissions en retard |
| `vehicleInsuranceExpiring` | Daily | Alertes assurances expirantes |

### Structure des fonctions

```
functions/
├── src/
│   ├── index.ts                    # Export de toutes les fonctions
│   ├── membership-requests/        # Fonctions demandes d'adhésion
│   │   ├── approveMembershipRequest.ts
│   │   ├── deleteMembershipRequest.ts
│   │   ├── renewSecurityCode.ts
│   │   ├── submitCorrections.ts
│   │   ├── syncToAlgolia.ts
│   │   └── verifySecurityCode.ts
│   ├── scheduled/                  # Tâches planifiées
│   │   ├── birthdayNotifications.ts
│   │   ├── caisseImprevueDemandReminders.ts
│   │   └── ...
│   └── tools/                      # Outils admin
│       └── renameUserMatricule.ts
├── package.json
└── tsconfig.json
```

---

## Firebase Storage

### Structure des buckets

```
/
├── membership-requests/
│   └── {requestId}/
│       ├── photo.jpg               # Photo d'identité
│       ├── document-front.jpg      # Recto du document
│       └── document-back.jpg       # Verso du document
│
├── members/
│   └── {memberId}/
│       ├── photo.jpg               # Photo de profil
│       └── documents/
│           └── {documentId}.pdf    # Documents archivés
│
├── contracts/
│   ├── CI/                         # Caisse Imprévue
│   │   └── {contractId}/
│   │       ├── contract.pdf
│   │       └── proofs/
│   ├── CS/                         # Caisse Spéciale
│   └── credits/                    # Crédits
│
├── payments/
│   └── {paymentId}/
│       └── proof.{ext}             # Preuves de paiement
│
└── events/                         # Module Bienfaiteur
    └── {eventId}/
        ├── cover.jpg
        └── media/
```

### Règles Storage (storage.rules)

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Lecture publique pour les photos de profil
    match /members/{memberId}/photo.jpg {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Documents - Admin uniquement
    match /documents/{allPaths=**} {
      allow read, write: if request.auth.token.role in ['Admin', 'SuperAdmin', 'Secretary'];
    }
    
    // Demandes d'adhésion - Création publique, lecture admin
    match /membership-requests/{requestId}/{allPaths=**} {
      allow write: if true;  // Permet l'upload lors de l'inscription
      allow read: if request.auth.token.role in ['Admin', 'SuperAdmin', 'Secretary'];
    }
  }
}
```

---

## Emulateurs

### Configuration

| Service | Port | URL |
|---------|------|-----|
| Auth | 9099 | http://localhost:9099 |
| Firestore | 8080 | http://localhost:8080 |
| Storage | 9097 | http://localhost:9097 |
| Functions | 5001 | http://localhost:5001 |
| Emulator UI | 4000 | http://localhost:4000 |

### Démarrage

```bash
# Démarrer tous les émulateurs
firebase emulators:start

# Démarrer avec données persistantes
firebase emulators:start --import=./emulator-data --export-on-exit

# Démarrer seulement Firestore
firebase emulators:start --only firestore
```

### Variables d'environnement (développement)

```env
NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true
NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST=localhost:8080
NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST=localhost:9097
```

---

## Commandes utiles

```bash
# Déploiement
firebase deploy                              # Tout déployer
firebase deploy --only firestore:rules       # Règles Firestore uniquement
firebase deploy --only firestore:indexes     # Index uniquement
firebase deploy --only functions             # Cloud Functions
firebase deploy --only storage               # Règles Storage

# Debug
firebase firestore:indexes                   # Voir les index
firebase functions:log                       # Logs des fonctions

# Export/Import données
firebase emulators:export ./backup           # Exporter données émulateur
firebase emulators:start --import ./backup   # Importer données
```

---

## Voir aussi

- [FIREBASE_CONFIGURATIONS.md](./FIREBASE_CONFIGURATIONS.md) - Configurations détaillées
- [FIREBASE_MULTI_ENVIRONNEMENT.md](./FIREBASE_MULTI_ENVIRONNEMENT.md) - Gestion multi-env
- [FIREBASE_SETUP_CHECKLIST.md](./FIREBASE_SETUP_CHECKLIST.md) - Checklist de setup
- [SERVICE_ACCOUNTS_GUIDE.md](./SERVICE_ACCOUNTS_GUIDE.md) - Guide des service accounts
