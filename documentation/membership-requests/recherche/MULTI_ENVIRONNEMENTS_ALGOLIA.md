# Gestion Multi-Environnements Algolia

## 🎯 Objectif

Gérer Algolia de manière sécurisée et isolée pour 3 environnements :
- **Dev** : Développement local avec Firebase project `kara-gabon-dev` (base en ligne)
- **Preprod** : Pré-production (staging) avec Firebase project `kara-gabon-preprod`
- **Prod** : Production avec Firebase project `kara-gabon`

---

## 📊 Architecture Multi-Environnements

```
┌─────────────────────────────────────────────────────────┐
│                    ALGOLIA ACCOUNT                        │
│                                                           │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Index: membership-requests-dev                 │    │
│  │  → Dev local / Firebase: kara-gabon-dev        │    │
│  └─────────────────────────────────────────────────┘    │
│                                                           │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Index: membership-requests-preprod             │    │
│  │  → Preprod / Vercel Preview                    │    │
│  └─────────────────────────────────────────────────┘    │
│                                                           │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Index: membership-requests-prod                │    │
│  │  → Production / Vercel Production              │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

**Important** : 
- Un seul compte Algolia, mais 3 index séparés pour isoler les données
- **Dev local** : Utilise la base Firebase en ligne `kara-gabon-dev` (pas d'émulateur)
- **Preprod** : Base Firebase en ligne `kara-gabon-preprod`
- **Prod** : Base Firebase en ligne `kara-gabon`

---

## 🔑 Configuration des Index Algolia

### 1. Créer les 3 Index dans Algolia Dashboard

1. Aller dans **Indices** → **Create Index**
2. Créer les 3 index :
   - `membership-requests-dev`
   - `membership-requests-preprod`
   - `membership-requests-prod`

### 2. Configurer chaque Index

**Configuration identique pour les 3 index** (voir `ALGOLIA_SETUP.md`) :
- Attributs de recherche
- Facets
- Ranking
- Settings

**Note** : Vous pouvez dupliquer la configuration du premier index vers les autres.

---

## 🔐 Gestion des Clés API

### Option 1 : Clés Partagées (Recommandé pour début)

**Avantages** :
- ✅ Simple à gérer
- ✅ Un seul Admin API Key à sécuriser

**Inconvénients** :
- ⚠️ Tous les environnements ont accès à tous les index
- ⚠️ Moins sécurisé (si une clé est compromise, tous les index sont accessibles)

**Configuration** :
- **Application ID** : Identique pour les 3 environnements
- **Admin API Key** : Identique pour les 3 environnements
- **Search-Only API Key** : Identique pour les 3 environnements

### Option 2 : Clés par Environnement (Recommandé pour Production)

**Avantages** :
- ✅ Isolation complète entre environnements
- ✅ Sécurité renforcée (si une clé est compromise, seul un environnement est affecté)
- ✅ Possibilité de révoquer une clé sans affecter les autres

**Inconvénients** :
- ⚠️ Plus complexe à gérer
- ⚠️ Nécessite de créer des clés API spécifiques

**Configuration** :
- Créer 3 **Search-Only API Keys** avec restrictions :
  - `search-dev` : Accès uniquement à `membership-requests-dev`
  - `search-preprod` : Accès uniquement à `membership-requests-preprod`
  - `search-prod` : Accès uniquement à `membership-requests-prod`

**Comment créer des clés API restreintes** :
1. Aller dans **Settings** → **API Keys**
2. Cliquer sur **Add API Key**
3. Nom : `search-dev`
4. **ACLs** : `search` uniquement
5. **Indexes** : `membership-requests-dev` uniquement
6. Répéter pour preprod et prod

---

## 📝 Configuration des Variables d'Environnement

### Client (Next.js)

#### `.env.local` (Dev - Local avec Firebase project kara-gabon-dev)
```env
NEXT_PUBLIC_ALGOLIA_APP_ID=your_app_id
NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY=search_only_key_here
NEXT_PUBLIC_ALGOLIA_INDEX_NAME=membership-requests-dev
NEXT_PUBLIC_ENV=dev

# Firebase project dev (base en ligne, pas d'émulateur)
NEXT_PUBLIC_FIREBASE_PROJECT_ID=kara-gabon-dev
```

#### `.env.preview` (Preprod - Vercel Preview)
```env
NEXT_PUBLIC_ALGOLIA_APP_ID=your_app_id
NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY=search_preprod_key_here
NEXT_PUBLIC_ALGOLIA_INDEX_NAME=membership-requests-preprod
NEXT_PUBLIC_ENV=preprod
```

#### `.env.production` (Prod - Vercel Production)
```env
NEXT_PUBLIC_ALGOLIA_APP_ID=your_app_id
NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY=search_prod_key_here
NEXT_PUBLIC_ALGOLIA_INDEX_NAME=membership-requests-prod
NEXT_PUBLIC_ENV=prod
```

### Firebase Functions

#### Configuration par Projet Firebase

**Dev** (`kara-gabon-dev`) :
```bash
firebase use dev
firebase functions:config:set \
  algolia.app_id="your_app_id" \
  algolia.admin_api_key="admin_key_here" \
  algolia.index_name="membership-requests-dev" \
  env.name="dev"
```

**Preprod** (`kara-gabon-preprod`) :
```bash
firebase use preprod
firebase functions:config:set \
  algolia.app_id="your_app_id" \
  algolia.admin_api_key="admin_key_here" \
  algolia.index_name="membership-requests-preprod" \
  env.name="preprod"
```

**Prod** (`kara-gabon`) :
```bash
firebase use prod
firebase functions:config:set \
  algolia.app_id="your_app_id" \
  algolia.admin_api_key="admin_key_here" \
  algolia.index_name="membership-requests-prod" \
  env.name="prod"
```

### Variables d'Environnement Vercel

#### Preprod (Preview)
```bash
vercel env add NEXT_PUBLIC_ALGOLIA_APP_ID preview
vercel env add NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY preview
vercel env add NEXT_PUBLIC_ALGOLIA_INDEX_NAME preview
vercel env add NEXT_PUBLIC_ENV preview
```

#### Prod (Production)
```bash
vercel env add NEXT_PUBLIC_ALGOLIA_APP_ID production
vercel env add NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY production
vercel env add NEXT_PUBLIC_ALGOLIA_INDEX_NAME production
vercel env add NEXT_PUBLIC_ENV production
```

---

## 🔧 Code - Détection Automatique de l'Environnement

### Service Algolia avec Détection d'Environnement

**`src/services/search/AlgoliaSearchService.ts`** :
```typescript
import algoliasearch from 'algoliasearch/lite'

// Détection automatique de l'environnement
function getAlgoliaConfig() {
  // Priorité : variable d'environnement explicite
  const env = process.env.NEXT_PUBLIC_ENV || 
              process.env.NODE_ENV || 
              (process.env.VERCEL_ENV === 'production' ? 'prod' : 
               process.env.VERCEL_ENV === 'preview' ? 'preprod' : 'dev')

  const indexName = process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME || 
                    `membership-requests-${env}`

  return {
    appId: process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!,
    searchKey: process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY!,
    indexName,
    env,
  }
}

const config = getAlgoliaConfig()

const client = algoliasearch(config.appId, config.searchKey)
const index = client.initIndex(config.indexName)

// Log pour debug (uniquement en dev)
if (config.env === 'dev') {
  console.log(`🔍 Algolia configuré pour l'environnement: ${config.env}`)
  console.log(`📊 Index utilisé: ${config.indexName}`)
}

export class AlgoliaSearchService {
  // ... reste du code identique
}
```

### Cloud Functions avec Détection d'Environnement

**`functions/src/membership-requests/syncToAlgolia.ts`** :
```typescript
import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import algoliasearch from 'algoliasearch'

// Détection de l'environnement depuis le projet Firebase
function getAlgoliaConfig() {
  const projectId = admin.app().options.projectId
  
  // Mapping projet Firebase → environnement
  const envMap: Record<string, string> = {
    'kara-gabon-dev': 'dev',
    'kara-gabon-preprod': 'preprod',
    'kara-gabon': 'prod',
  }
  
  const env = envMap[projectId || ''] || 'dev'
  
  // Récupérer la config depuis Firebase Functions Config
  const config = functions.config().algolia || {}
  
  return {
    appId: config.app_id || process.env.ALGOLIA_APP_ID!,
    adminKey: config.admin_api_key || process.env.ALGOLIA_ADMIN_API_KEY!,
    indexName: config.index_name || `membership-requests-${env}`,
    env,
  }
}

const algoliaConfig = getAlgoliaConfig()

const client = algoliasearch(algoliaConfig.appId, algoliaConfig.adminKey)
const index = client.initIndex(algoliaConfig.indexName)

// Log pour debug
console.log(`🔍 Algolia configuré pour: ${algoliaConfig.env}`)
console.log(`📊 Index utilisé: ${algoliaConfig.indexName}`)

export const syncToAlgolia = functions.firestore
  .document('membership-requests/{requestId}')
  .onWrite(async (change, context) => {
    // ... code de synchronisation identique
    // Utiliser `index` qui pointe vers le bon index selon l'environnement
  })
```

---

## 🚀 Scripts de Migration par Environnement

### Script Générique avec Sélection d'Environnement

**`scripts/migrate-to-algolia.ts`** :
```typescript
import * as admin from 'firebase-admin'
import algoliasearch from 'algoliasearch'
import { getFirestore } from '@/firebase/firestore'

// Configuration par environnement
const ENV_CONFIG = {
  dev: {
    projectId: 'kara-gabon-dev',
    indexName: 'membership-requests-dev',
  },
  preprod: {
    projectId: 'kara-gabon-preprod',
    indexName: 'membership-requests-preprod',
  },
  prod: {
    projectId: 'kara-gabon',
    indexName: 'membership-requests-prod',
  },
}

async function migrateToAlgolia(env: 'dev' | 'preprod' | 'prod') {
  const config = ENV_CONFIG[env]
  
  // Initialiser Firebase Admin avec le bon projet
  if (!admin.apps.length) {
    admin.initializeApp({
      projectId: config.projectId,
      // ... autres configs
    })
  }

  // Configuration Algolia
  const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID!
  const ALGOLIA_ADMIN_API_KEY = process.env.ALGOLIA_ADMIN_API_KEY!
  
  const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_ADMIN_API_KEY)
  const index = client.initIndex(config.indexName)

  console.log(`🚀 Migration vers Algolia - Environnement: ${env}`)
  console.log(`📊 Index: ${config.indexName}`)
  console.log(`🔥 Projet Firebase: ${config.projectId}`)

  // ... reste du code de migration
}

// Récupérer l'environnement depuis les arguments
const env = process.argv[2] as 'dev' | 'preprod' | 'prod'

if (!env || !['dev', 'preprod', 'prod'].includes(env)) {
  console.error('❌ Usage: npx tsx scripts/migrate-to-algolia.ts [dev|preprod|prod]')
  process.exit(1)
}

migrateToAlgolia(env).catch(console.error)
```

**Exécution** :
```bash
# Dev
npx tsx scripts/migrate-to-algolia.ts dev

# Preprod
npx tsx scripts/migrate-to-algolia.ts preprod

# Prod
npx tsx scripts/migrate-to-algolia.ts prod
```

---

## 🧪 Tests par Environnement

### Tests Locaux (Dev)

```bash
# Utiliser Firebase project dev (kara-gabon-dev)
firebase use dev

# Les Cloud Functions utiliseront automatiquement l'index dev
# Les données sont synchronisées depuis la base en ligne kara-gabon-dev
```

### Tests Preprod

```bash
# Déployer sur Vercel Preview
vercel --prod=false

# Les variables d'environnement Vercel seront utilisées
```

### Tests Prod

```bash
# Déployer sur Vercel Production
vercel --prod

# Les variables d'environnement Production seront utilisées
```

---

## 📊 Monitoring par Environnement

### Algolia Dashboard

Dans Algolia Dashboard, vous pouvez voir les 3 index séparément :
- **Analytics** par index
- **Logs** par index
- **Performance** par index

### Firebase Functions Logs

```bash
# Dev
firebase use dev
firebase functions:log --only syncToAlgolia

# Preprod
firebase use preprod
firebase functions:log --only syncToAlgolia

# Prod
firebase use prod
firebase functions:log --only syncToAlgolia
```

---

## 🔒 Sécurité Multi-Environnements

### Bonnes Pratiques

1. **Isolation des Clés** :
   - Utiliser des clés API restreintes par environnement (Option 2)
   - Ne jamais partager les clés entre environnements dans le code

2. **Validation des Index** :
   - Vérifier que le nom d'index correspond à l'environnement
   - Ajouter des logs pour confirmer l'index utilisé

3. **Protection contre les Erreurs** :
   - Ajouter des guards pour éviter d'écrire dans le mauvais index
   - Valider l'environnement avant chaque opération

### Exemple de Guard

```typescript
function validateEnvironment(expectedEnv: string) {
  const currentEnv = process.env.NEXT_PUBLIC_ENV || 'dev'
  
  if (currentEnv !== expectedEnv) {
    throw new Error(
      `❌ Erreur d'environnement: attendu ${expectedEnv}, actuel ${currentEnv}`
    )
  }
}

// Dans le code de migration
validateEnvironment('prod') // S'assurer qu'on est en prod avant migration
```

---

## 📋 Checklist Multi-Environnements

### Configuration Initiale

- [ ] Créer les 3 index dans Algolia Dashboard
- [ ] Configurer chaque index (attributs, facets, ranking)
- [ ] Créer les clés API (partagées ou par environnement)
- [ ] Configurer les variables d'environnement pour chaque projet Firebase
- [ ] Configurer les variables d'environnement Vercel (preprod et prod)
- [ ] Tester la détection automatique d'environnement

### Déploiement

- [ ] Déployer les Cloud Functions sur chaque projet Firebase
- [ ] Vérifier que chaque fonction utilise le bon index
- [ ] Tester la synchronisation sur chaque environnement
- [ ] Exécuter la migration sur chaque environnement

### Monitoring

- [ ] Configurer les alertes Algolia par index
- [ ] Monitorer les logs Firebase Functions par environnement
- [ ] Vérifier les analytics Algolia par environnement

---

## 🎯 Résumé

### Structure Recommandée

```
Algolia Account
├── Index: membership-requests-dev
│   └── → Firebase: kara-gabon-dev
│
├── Index: membership-requests-preprod
│   └── → Firebase: kara-gabon-preprod
│
└── Index: membership-requests-prod
    └── → Firebase: kara-gabon
```

### Variables d'Environnement

| Environnement | Index Name | Firebase Project | Base de Données | Vercel Env |
|---------------|------------|------------------|-----------------|------------|
| Dev | `membership-requests-dev` | `kara-gabon-dev` | En ligne (pas d'émulateur) | `development` |
| Preprod | `membership-requests-preprod` | `kara-gabon-preprod` | En ligne | `preview` |
| Prod | `membership-requests-prod` | `kara-gabon` | En ligne | `production` |

---

## ✅ Avantages de cette Approche

1. **Isolation complète** : Les données de chaque environnement sont séparées
2. **Sécurité** : Possibilité d'utiliser des clés API restreintes
3. **Monitoring** : Analytics séparées par environnement
4. **Flexibilité** : Facile de tester des configurations différentes par environnement
5. **Simplicité** : Un seul compte Algolia à gérer

---

## 🚨 Points d'Attention

1. **Ne jamais mélanger les index** : Vérifier toujours que le bon index est utilisé
2. **Coût Algolia** : Les 3 index comptent séparément dans les limites
3. **Migration** : Exécuter la migration sur chaque environnement séparément
4. **Synchronisation** : Les Cloud Functions doivent pointer vers le bon index
5. **Dev local** : Utilise la base en ligne `kara-gabon-dev`, pas d'émulateur. Les Cloud Functions se déclenchent automatiquement sur les changements Firestore.

---

## 📞 Support

En cas de problème :
1. Vérifier les logs Firebase Functions
2. Vérifier les logs Algolia Dashboard
3. Vérifier les variables d'environnement
4. Tester la détection d'environnement avec des logs
