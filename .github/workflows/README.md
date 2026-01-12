# GitHub Actions Workflows - Configuration

## Workflows créés

1. **`pr-checks.yml`** : Exécute tous les tests sur chaque PR vers `develop` ou `main`
2. **`ci.yml`** : Exécute tous les tests après merge sur `develop` ou `main`
3. **`deploy-preprod.yml`** : Déploie automatiquement en préprod après merge sur `develop` (si CI réussi)
4. **`deploy-prod.yml`** : Déploie automatiquement en prod après merge sur `main` (si CI réussi)
5. **`sync-vercel-env.yml`** : Synchronise automatiquement les variables d'environnement Vercel depuis les secrets GitHub

## Secrets GitHub à configurer

### Pour les déploiements Firebase

✅ **Approche recommandée (propre)** : utiliser **GitHub Environments** pour séparer **préprod** et **prod**,
avec **les mêmes noms de secrets** (sans suffixe).

Créer 2 environnements :
- **`Preview`** → préprod (branche `develop`)
- **`Production`** → prod (branche `main`)

Puis, dans **chacun** de ces environnements, ajouter les secrets/variables suivants :

**Environment secrets** (données sensibles) :
- `FIREBASE_CLIENT_EMAIL` : Email du service account Firebase (ex: `firebase-adminsdk-xxx@project.iam.gserviceaccount.com`)
- `FIREBASE_PRIVATE_KEY` : Clé privée du service account Firebase (format: `-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n`)

**Environment variables** (données non sensibles) :
- `FIREBASE_PROJECT_ID` : ID du projet Firebase (ex: `kara-gabon-preprod` ou `kara-gabon-prod`)
- `FIREBASE_PRIVATE_KEY_ID` : ID de la clé privée du service account (ex: `3d337cc13616980423e08255c2553966a15cee02`)
- `FIREBASE_CLIENT_ID` : ID du client du service account (ex: `114013063754458102878`)
- `NEXT_PUBLIC_APP_ENV` : `preprod` (Preview) ou `production` (Production)
- `NEXT_PUBLIC_GEOGRAPHY_VERSION` : `V2`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID` : Même valeur que `FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

### Pour la synchronisation Vercel

**Obligatoires pour tous les environnements** :
- `VERCEL_TOKEN` : Token d'API Vercel (obtenir sur https://vercel.com/account/tokens)
- `VERCEL_PROJECT_ID` : ID du projet Vercel (trouvable dans les paramètres du projet)
- `VERCEL_ORG_ID` : ID de l'organisation Vercel (trouvable dans les paramètres de l'organisation)

> Ces 3 secrets peuvent rester en **Repository secrets** (mêmes valeurs en préprod/prod),
> ou être dupliqués dans les environnements `Preview` et `Production` si tu préfères tout regrouper.

## Comment configurer les secrets

1. Aller dans **GitHub Repository > Settings > Secrets and variables > Actions**
2. Cliquer sur **"New repository secret"**
3. Ajouter chaque secret avec son nom et sa valeur
4. Répéter pour tous les secrets listés ci-dessus

## Service Account Firebase

Pour obtenir les variables du service account :
1. Aller dans Firebase Console > Project Settings > Service Accounts
2. Cliquer sur "Generate new private key"
3. Télécharger le fichier JSON
4. Extraire les valeurs suivantes du JSON :
   - `client_email` → Secret GitHub `FIREBASE_CLIENT_EMAIL`
   - `private_key` → Secret GitHub `FIREBASE_PRIVATE_KEY` (garder les `\n` dans la clé)
   - `project_id` → Variable GitHub `FIREBASE_PROJECT_ID` (et `NEXT_PUBLIC_FIREBASE_PROJECT_ID`)
   - `private_key_id` → Variable GitHub `FIREBASE_PRIVATE_KEY_ID`
   - `client_id` → Variable GitHub `FIREBASE_CLIENT_ID`

> ⚠️ **Important** : Le fichier JSON ne doit **jamais** être commité dans le repository.
> Les workflows construisent automatiquement le JSON à partir des variables séparées.

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