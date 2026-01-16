# Configuration Multi-Environnement Firebase — KARA Mutuelle

> Guide complet pour configurer les 3 environnements Firebase (dev, preprod, prod)

---

## ⚠️ Pourquoi séparer les environnements ?

**PROBLÈME ACTUEL** : Vous utilisez actuellement la même base de données Firebase pour dev, preprod et prod.

**RISQUES** :
- ❌ Tests qui polluent les données de production
- ❌ Impossibilité de tester les règles Firestore en isolation
- ❌ Risque de supprimer/modifier des données de production par erreur
- ❌ Pas de rollback possible

**SOLUTION** : Créer 3 projets Firebase séparés avec des collections préfixées.

---

## 1) Création des projets Firebase

### Sur Firebase Console

Créer 3 projets distincts :

| Projet | Nom | Usage | Collections |
|--------|-----|-------|-------------|
| **DEV** | `kara-mutuelle-dev` | Développement et tests locaux | Préfixe `-dev` |
| **PREPROD** | `kara-mutuelle-preprod` | Tests UAT, validation avant prod | Préfixe `-preprod` |
| **PROD** | `kara-mutuelle-prod` | Production | Pas de préfixe |

### Pour chaque projet, activer :

- [ ] **Authentication** (Email/Password, Phone)
- [ ] **Firestore Database** (mode production)
- [ ] **Storage** (mode production)
- [ ] **Cloud Functions** (Blaze plan requis pour prod)

### Récupérer les configurations

Pour chaque projet, dans **Console Firebase > Project Settings > General > Your apps > Web app** :

1. Cliquer sur "Add app" (ou utiliser l'app existante)
2. Copier la configuration Firebase :

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "kara-mutuelle-dev.firebaseapp.com",
  projectId: "kara-mutuelle-dev",
  storageBucket: "kara-mutuelle-dev.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

3. Noter ces valeurs pour les fichiers d'environnement (voir section 2)

---

## 2) Stratégie de nommage des collections

### Préfixes par environnement

| Environnement | Préfixe | Exemple Collection |
|---------------|---------|-------------------|
| **DEV** | `-dev` | `members-dev`, `caisseContracts-dev` |
| **PREPROD** | `-preprod` | `members-preprod`, `caisseContracts-preprod` |
| **PROD** | **Aucun** | `members`, `caisseContracts` |

### Implémentation dans le code

#### Option 1 : Helper function (recommandé)

```typescript
// src/shared/utils/collections.ts

/**
 * Retourne le nom de collection avec le préfixe approprié selon l'environnement
 */
export function getCollectionName(baseName: string): string {
  const env = process.env.NEXT_PUBLIC_APP_ENV || 'development'
  
  // En production, pas de préfixe
  if (env === 'production') {
    return baseName
  }
  
  // En dev/preprod, ajouter le préfixe
  const prefix = env === 'preprod' ? '-preprod' : '-dev'
  return `${baseName}${prefix}`
}

// Usage dans les repositories
import { getCollectionName } from '@/shared/utils/collections'

const membersCollection = getCollectionName('members')
// En dev : 'members-dev'
// En preprod : 'members-preprod'
// En prod : 'members'

const collectionRef = collection(db, membersCollection)
```

#### Option 2 : Constantes par environnement

```typescript
// src/shared/constants/collections.ts

const ENV = process.env.NEXT_PUBLIC_APP_ENV || 'development'
const SUFFIX = ENV === 'production' 
  ? '' 
  : ENV === 'preprod' 
    ? '-preprod' 
    : '-dev'

export const COLLECTIONS = {
  // Membership
  MEMBERS: `members${SUFFIX}`,
  MEMBERSHIP_REQUESTS: `membership-requests${SUFFIX}`,
  GROUPS: `groups${SUFFIX}`,
  USERS: `users${SUFFIX}`,
  
  // Caisse Spéciale
  CAISSE_CONTRACTS: `caisseContracts${SUFFIX}`,
  CAISSE_SPECIALE_DEMANDS: `caisseSpecialeDemands${SUFFIX}`,
  CAISSE_SETTINGS: `caisseSettings${SUFFIX}`,
  
  // Caisse Imprévue
  CONTRACTS_CI: `contractsCI${SUFFIX}`,
  SUBSCRIPTIONS_CI: `subscriptionsCI${SUFFIX}`,
  CAISSE_IMPREVUE_DEMANDS: `caisseImprevueDemands${SUFFIX}`,
  
  // Crédit Spéciale
  CREDIT_DEMANDS: `creditDemands${SUFFIX}`,
  CREDIT_CONTRACTS: `creditContracts${SUFFIX}`,
  CREDIT_INSTALLMENTS: `creditInstallments${SUFFIX}`,
  CREDIT_PAYMENTS: `creditPayments${SUFFIX}`,
  CREDIT_PENALTIES: `creditPenalties${SUFFIX}`,
  
  // Placement
  PLACEMENTS: `placements${SUFFIX}`,
  PLACEMENT_DEMANDS: `placementDemands${SUFFIX}`,
  
  // Bienfaiteur
  CHARITY_EVENTS: `charityEvents${SUFFIX}`,
  CHARITY_PARTICIPANTS: `charityParticipants${SUFFIX}`,
  CHARITY_CONTRIBUTIONS: `charityContributions${SUFFIX}`,
  
  // Véhicule
  VEHICLES: `vehicles${SUFFIX}`,
  VEHICLE_INSURANCES: `vehicleInsurances${SUFFIX}`,
  
  // Infrastructure
  PROVINCES: `provinces${SUFFIX}`,
  DEPARTMENTS: `departments${SUFFIX}`,
  COMMUNES: `communes${SUFFIX}`,
  DISTRICTS: `districts${SUFFIX}`,
  QUARTERS: `quarters${SUFFIX}`,
  COMPANIES: `companies${SUFFIX}`,
  PROFESSIONS: `professions${SUFFIX}`,
  DOCUMENTS: `documents${SUFFIX}`,
  NOTIFICATIONS: `notifications${SUFFIX}`,
} as const

// Usage
import { COLLECTIONS } from '@/shared/constants/collections'

const membersRef = collection(db, COLLECTIONS.MEMBERS)
```

**Recommandation** : Utiliser l'**Option 2** (constantes) car elle est plus explicite et facilite le refactoring.

---

## 3) Configuration des variables d'environnement

### Fichiers locaux

#### `.env.local` (Development)

```bash
# Environnement
NEXT_PUBLIC_APP_ENV=development

# Firebase DEV
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...dev
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=kara-mutuelle-dev.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=kara-mutuelle-dev
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=kara-mutuelle-dev.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:dev

# Optionnel
NEXT_PUBLIC_USE_FIREBASE_EMULATORS=false  # Utiliser Firebase Cloud avec collections -dev
```

#### `.env.preview` (Preprod - pour tests locaux)

```bash
# Environnement
NEXT_PUBLIC_APP_ENV=preprod

# Firebase PREPROD
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...preprod
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=kara-mutuelle-preprod.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=kara-mutuelle-preprod
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=kara-mutuelle-preprod.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=987654321
NEXT_PUBLIC_FIREBASE_APP_ID=1:987654321:web:preprod

# Optionnel
NEXT_PUBLIC_USE_FIREBASE_EMULATORS=false
```

#### `.env.production` (Production - pour build local)

```bash
# Environnement
NEXT_PUBLIC_APP_ENV=production

# Firebase PROD
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...prod
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=kara-mutuelle-prod.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=kara-mutuelle-prod
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=kara-mutuelle-prod.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=111222333
NEXT_PUBLIC_FIREBASE_APP_ID=1:111222333:web:prod

# Optionnel
NEXT_PUBLIC_USE_FIREBASE_EMULATORS=false
```

### Configuration Firebase CLI (`.firebaserc`)

```json
{
  "projects": {
    "default": "kara-mutuelle-dev",
    "dev": "kara-mutuelle-dev",
    "preprod": "kara-mutuelle-preprod",
    "prod": "kara-mutuelle-prod"
}
```

### Configuration Vercel

#### Variables Preview (Preprod)

Dans **Vercel Dashboard > Settings > Environment Variables** :

- Environment: **Preview** (pour toutes les branches sauf `main`)
- Ajouter toutes les variables `NEXT_PUBLIC_*` avec les valeurs du projet **preprod**

#### Variables Production

Dans **Vercel Dashboard > Settings > Environment Variables** :

- Environment: **Production** (pour la branche `main`)
- Ajouter toutes les variables `NEXT_PUBLIC_*` avec les valeurs du projet **prod**

---

## 4) Migration depuis l'existant

### Plan de migration

Si vous utilisez actuellement la même base pour tous les environnements :

#### Étape 1 : Créer les nouveaux projets Firebase
- [ ] Créer `kara-mutuelle-dev` sur Firebase Console
- [ ] Créer `kara-mutuelle-preprod` sur Firebase Console
- [ ] Créer `kara-mutuelle-prod` sur Firebase Console (ou renommer l'existant)

#### Étape 2 : Configurer les projets
- [ ] Activer Authentication, Firestore, Storage, Functions pour chaque projet
- [ ] Récupérer les configurations Firebase pour chaque projet

#### Étape 3 : Adapter le code
- [ ] Créer `src/shared/constants/collections.ts` avec les préfixes
- [ ] Remplacer tous les noms de collections en dur par les constantes
- [ ] Tester en local avec projet dev

#### Étape 4 : Migrer les données (si nécessaire)
- [ ] Exporter les données de prod si besoin
- [ ] Importer dans le nouveau projet prod (si nouveau projet créé)

#### Étape 5 : Configurer les environnements
- [ ] Mettre à jour `.env.local` avec projet dev
- [ ] Mettre à jour `.firebaserc`
- [ ] Configurer variables Vercel Preview (preprod)
- [ ] Configurer variables Vercel Production (prod)

#### Étape 6 : Déployer
- [ ] Déployer rules/indexes sur preprod
- [ ] Tester en preprod
- [ ] Déployer rules/indexes sur prod
- [ ] Valider en prod

---

## 5) Règles Firestore et préfixes

### ⚠️ Important

Les **règles Firestore** sont les mêmes pour tous les environnements, mais elles s'appliquent sur des **projets Firebase différents** avec des **collections différentes** (avec/sans préfixe).

Les règles Firestore ne peuvent pas détecter dynamiquement le préfixe. Le préfixe est géré au niveau du code (constantes), pas des règles.

### Exemple de règles

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper pour vérifier si l'utilisateur est admin
    function isAdmin() {
      return request.auth != null && request.auth.token.admin == true;
    }
    
    // Règles pour members (collections: members, members-dev, members-preprod)
    match /{collection}/members/{memberId} {
      allow read: if request.auth != null;
      allow write: if isAdmin();
    }
    
    // Règles pour membership-requests
    match /{collection}/membership-requests/{requestId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if isAdmin();
    }
    
    // Répéter pour chaque collection...
  }
}
```

---

## 6) Checklist complète

### Création des projets
- [ ] 3 projets Firebase créés (dev, preprod, prod)
- [ ] Authentication activé pour chaque projet
- [ ] Firestore activé pour chaque projet
- [ ] Storage activé pour chaque projet
- [ ] Functions activé pour chaque projet (Blaze pour prod)

### Configuration
- [ ] Configurations Firebase récupérées pour chaque projet
- [ ] `.env.local` créé avec projet dev
- [ ] `.firebaserc` configuré avec les 3 projets
- [ ] Variables Vercel Preview configurées (preprod)
- [ ] Variables Vercel Production configurées (prod)

### Code
- [ ] `src/shared/constants/collections.ts` créé avec préfixes
- [ ] Tous les noms de collections remplacés par les constantes
- [ ] Tests locaux fonctionnent avec projet dev

### Déploiement
- [ ] Rules/indexes/storage déployés sur preprod
- [ ] Tests en preprod fonctionnent
- [ ] Rules/indexes/storage déployés sur prod
- [ ] Validation en prod

---

## 7) Scripts utiles

### Changer de projet Firebase

```bash
# Utiliser dev
firebase use dev

# Utiliser preprod
firebase use preprod

# Utiliser prod
firebase use prod

# Vérifier le projet actif
firebase projects:list
```

### Déployer sur un environnement spécifique

```bash
# Preprod
firebase use preprod
firebase deploy --only firestore:rules,firestore:indexes,storage,functions

# Prod
firebase use prod
firebase deploy --only firestore:rules,firestore:indexes,storage,functions
```

---

## 8) Références

- `WORKFLOW.md` : Section INIT-2 et INIT-3 pour plus de détails (même dossier)
- Firebase Console : https://console.firebase.google.com/
- Documentation Firebase : https://firebase.google.com/docs
