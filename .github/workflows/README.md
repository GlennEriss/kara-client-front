# GitHub Actions Workflows - Configuration

## Workflows créés

1. **`pr-checks.yml`** : Exécute tous les tests sur chaque PR vers `develop` ou `main`
2. **`ci.yml`** : Exécute tous les tests après merge sur `develop` ou `main`
3. **`deploy-preprod.yml`** : Déploie automatiquement en préprod après merge sur `develop` (si CI réussi)
4. **`deploy-prod.yml`** : Déploie automatiquement en prod après merge sur `main` (si CI réussi)
5. **`sync-vercel-env.yml`** : Synchronise automatiquement les variables d'environnement Vercel depuis les secrets GitHub

## Secrets GitHub à configurer

### Pour les tests E2E (PR et CI)

**Development (pour PRs)** :
- `FIREBASE_API_KEY_DEV`
- `FIREBASE_AUTH_DOMAIN_DEV`
- `FIREBASE_PROJECT_ID_DEV`
- `FIREBASE_STORAGE_BUCKET_DEV`
- `FIREBASE_MESSAGING_SENDER_ID_DEV`
- `FIREBASE_APP_ID_DEV`

### Pour les déploiements Firebase

**Preprod** :
- `FIREBASE_SERVICE_ACCOUNT_PREPROD` : Contenu JSON du service account Firebase (preprod)
- `FIREBASE_PROJECT_ID_PREPROD` : ID du projet Firebase preprod (ex: `kara-gabon-preprod`)
- `NEXT_PUBLIC_FIREBASE_API_KEY_PREPROD` : Clé API Firebase preprod
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN_PREPROD` : Domaine auth Firebase preprod
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET_PREPROD` : Bucket Storage Firebase preprod
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID_PREPROD` : Sender ID Firebase preprod
- `NEXT_PUBLIC_FIREBASE_APP_ID_PREPROD` : App ID Firebase preprod

**Production** :
- `FIREBASE_SERVICE_ACCOUNT_PROD` : Contenu JSON du service account Firebase (prod)
- `FIREBASE_PROJECT_ID_PROD` : ID du projet Firebase prod (ex: `kara-gabon-prod`)
- `NEXT_PUBLIC_FIREBASE_API_KEY_PROD` : Clé API Firebase prod
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN_PROD` : Domaine auth Firebase prod
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET_PROD` : Bucket Storage Firebase prod
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID_PROD` : Sender ID Firebase prod
- `NEXT_PUBLIC_FIREBASE_APP_ID_PROD` : App ID Firebase prod

### Pour la synchronisation Vercel

**Obligatoires pour tous les environnements** :
- `VERCEL_TOKEN` : Token d'API Vercel (obtenir sur https://vercel.com/account/tokens)
- `VERCEL_PROJECT_ID` : ID du projet Vercel (trouvable dans les paramètres du projet)
- `VERCEL_ORG_ID` : ID de l'organisation Vercel (trouvable dans les paramètres de l'organisation)

## Comment configurer les secrets

1. Aller dans **GitHub Repository > Settings > Secrets and variables > Actions**
2. Cliquer sur **"New repository secret"**
3. Ajouter chaque secret avec son nom et sa valeur
4. Répéter pour tous les secrets listés ci-dessus

## Service Account Firebase

Pour obtenir le service account JSON :
1. Aller dans Firebase Console > Project Settings > Service Accounts
2. Cliquer sur "Generate new private key"
3. Copier le contenu JSON complet
4. Coller dans le secret GitHub correspondant

## Flux de déploiement

### Sur PR vers `develop` ou `main`
1. Workflow `pr-checks.yml` s'exécute
2. Exécute : lint → typecheck → tests unitaires → build → tests E2E
3. Si un test échoue → PR bloquée
4. Si tous les tests passent → PR peut être mergée

### Après merge sur `develop`
1. Workflow `ci.yml` s'exécute
2. Exécute : lint → typecheck → tests unitaires → build → tests E2E
3. Si tous les tests passent → Workflow `deploy-preprod.yml` s'exécute automatiquement
4. Déploie sur Firebase Preprod :
   - ✅ **Firestore Rules** (`firestore.rules`)
   - ✅ **Firestore Indexes** (`firestore.indexes.json`)
   - ✅ **Storage Rules** (`storage.rules`)
   - ✅ **Cloud Functions** (`functions/`)
   - ✅ **Firebase Hosting** (Next.js build)

### Après merge sur `main`
1. Workflow `ci.yml` s'exécute
2. Exécute : lint → typecheck → tests unitaires → build → tests E2E
3. Si tous les tests passent → Workflow `deploy-prod.yml` s'exécute automatiquement
4. Déploie sur Firebase Prod :
   - ✅ **Firestore Rules** (`firestore.rules`)
   - ✅ **Firestore Indexes** (`firestore.indexes.json`)
   - ✅ **Storage Rules** (`storage.rules`)
   - ✅ **Cloud Functions** (`functions/`)
   - ✅ **Firebase Hosting** (Next.js build)
5. Crée un tag Git `vYYYY.MM.DD.RUN_NUMBER`

## Ce qui est déployé automatiquement

| Ressource | Fichier source | Environnement |
|-----------|---------------|---------------|
| Firestore Rules | `firestore.rules` | Preprod + Prod |
| Firestore Indexes | `firestore.indexes.json` | Preprod + Prod |
| Storage Rules | `storage.rules` | Preprod + Prod |
| Cloud Functions | `functions/src/` | Preprod + Prod |
| Hosting (Next.js) | `.next/` | Preprod + Prod |

## Synchronisation automatique des variables Vercel

### Comment ça fonctionne

Le workflow `sync-vercel-env.yml` synchronise **automatiquement** les variables d'environnement Vercel depuis les secrets GitHub :

- **Sur push vers `develop`** → Synchronise les variables **Preview** (preprod)
- **Sur push vers `main`** → Synchronise les variables **Production**
- **Manuellement** → Via l'interface GitHub Actions, tu peux déclencher la synchronisation pour un environnement spécifique

### Variables synchronisées

| Variable | Preview | Production |
|----------|---------|------------|
| `NEXT_PUBLIC_APP_ENV` | `preprod` | `production` |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Preprod | Prod |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Preprod | Prod |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Preprod | Prod |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Preprod | Prod |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Preprod | Prod |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Preprod | Prod |
| `NEXT_PUBLIC_GEOGRAPHY_VERSION` | `V2` | `V2` |

### Synchronisation manuelle (locale)

Tu peux aussi synchroniser manuellement depuis ta machine locale :

```bash
# Pour Preview (preprod)
pnpm sync-vercel-env:preview

# Pour Production
pnpm sync-vercel-env:prod
```

**Prérequis** : Tu dois avoir les variables d'environnement suivantes définies localement :
- `VERCEL_TOKEN`
- `VERCEL_PROJECT_ID`
- `VERCEL_ORG_ID`
- Toutes les variables Firebase (PREPROD ou PROD selon l'environnement)

### Obtenir les IDs Vercel

1. **VERCEL_TOKEN** : https://vercel.com/account/tokens → Créer un nouveau token
2. **VERCEL_PROJECT_ID** : Vercel Dashboard → Projet → Settings → General → Project ID
3. **VERCEL_ORG_ID** : Vercel Dashboard → Settings → General → Team ID

## Notes importantes

- ⚠️ **Aucun déploiement n'est possible si un test échoue**
- Les tests E2E utilisent Firebase Cloud (pas d'émulateurs en CI)
- Les déploiements Firebase nécessitent les service accounts configurés
- Les workflows `deploy-preprod.yml` et `deploy-prod.yml` dépendent de `ci.yml` (ne s'exécutent que si CI réussit)
- **Les indexes Firestore peuvent prendre plusieurs minutes à se créer** - C'est normal
- Les credentials Firebase sont nettoyés après chaque déploiement pour la sécurité
- **Les variables Vercel sont synchronisées automatiquement** - Plus besoin de les configurer manuellement dans le dashboard Vercel ! 🎉