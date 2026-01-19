# Guide de Déploiement des Cloud Functions Algolia

Ce guide explique comment déployer la Cloud Function `syncToAlgolia` sur les 3 environnements (dev, preprod, prod).

## 📋 Prérequis

1. **Firebase CLI installé et authentifié** :
   ```bash
   firebase login --reauth
   ```

2. **Variables d'environnement Algolia** :
   - `ALGOLIA_APP_ID`: `IYE83A0LRH`
   - `ALGOLIA_WRITE_API_KEY`: `f37a6169f18864759940d3a3125625f2`

3. **Projets Firebase configurés** :
   - `kara-gabon-dev` (dev)
   - `kara-gabon-preprod` (preprod)
   - `kara-gabon` (prod)

## 🔧 Configuration des Variables d'Environnement

La fonction `syncToAlgolia` supporte deux méthodes pour les variables d'environnement :
1. **`functions.config()`** (priorité) - Configuration Firebase Functions
2. **`process.env`** (fallback) - Variables d'environnement système

### Option 1 : Firebase Functions Config (Recommandé)

Cette méthode utilise `firebase functions:config:set` qui est compatible avec v1 et v2. C'est la méthode la plus simple et recommandée.

```bash
# Dev
firebase use dev
firebase functions:config:set \
  algolia.app_id="IYE83A0LRH" \
  algolia.write_api_key="f37a6169f18864759940d3a3125625f2" \
  algolia.index_name="membership-requests-dev"

# Preprod
firebase use preprod
firebase functions:config:set \
  algolia.app_id="IYE83A0LRH" \
  algolia.write_api_key="f37a6169f18864759940d3a3125625f2" \
  algolia.index_name="membership-requests-preprod"

# Prod
firebase use prod
firebase functions:config:set \
  algolia.app_id="IYE83A0LRH" \
  algolia.write_api_key="f37a6169f18864759940d3a3125625f2" \
  algolia.index_name="membership-requests-prod"
```

**Note** : La fonction `syncToAlgolia.ts` utilise automatiquement `functions.config()` en priorité, puis `process.env` en fallback.

### Option 2 : Variables d'Environnement via `.env` (Développement local uniquement)

Créer un fichier `.env` dans `functions/` :
```env
ALGOLIA_APP_ID=IYE83A0LRH
ALGOLIA_WRITE_API_KEY=f37a6169f18864759940d3a3125625f2
ALGOLIA_INDEX_NAME=membership-requests-dev
```

**Note** : Cette option fonctionne uniquement en développement local. Pour le déploiement, utilisez les secrets ou config.

## 🚀 Déploiement

### 1. Compiler les Functions

```bash
cd functions
npm run build
cd ..
```

### 2. Déployer sur Dev

```bash
# Sélectionner le projet dev
firebase use dev

# Déployer uniquement la fonction syncToAlgolia
firebase deploy --only functions:syncToAlgolia
```

### 3. Déployer sur Preprod

```bash
# Sélectionner le projet preprod
firebase use preprod

# Déployer uniquement la fonction syncToAlgolia
firebase deploy --only functions:syncToAlgolia
```

### 4. Déployer sur Prod

```bash
# Sélectionner le projet prod
firebase use prod

# Déployer uniquement la fonction syncToAlgolia
firebase deploy --only functions:syncToAlgolia
```

## ✅ Vérification

### 1. Vérifier les Logs

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

### 2. Tester la Synchronisation

1. **Créer ou modifier un document** dans Firestore :
   - Collection : `membership-requests`
   - Modifier un champ (ex: `identity.firstName`)

2. **Vérifier dans Algolia Dashboard** :
   - Aller sur l'index correspondant (dev/preprod/prod)
   - Vérifier que le document est présent
   - Vérifier que `searchableText` contient les bonnes données

### 3. Vérifier les Variables d'Environnement

```bash
# Dev
firebase use dev
firebase functions:config:get

# Vérifier que les variables sont présentes
```

## 🔍 Dépannage

### Erreur : "Algolia n'est pas configuré"

**Cause** : Les variables d'environnement ne sont pas définies.

**Solution** :
1. Vérifier que les secrets/config sont définis :
   ```bash
   firebase functions:config:get
   ```

2. Si vous utilisez `process.env`, vérifier que les variables sont définies dans Firebase Console :
   - Aller dans Firebase Console → Functions → Configuration
   - Ajouter les variables d'environnement

### Erreur : "Cannot read properties of undefined"

**Cause** : Le projet Firebase n'est pas correctement détecté.

**Solution** :
1. Vérifier le projet actif :
   ```bash
   firebase use
   ```

2. Vérifier que le mapping dans `syncToAlgolia.ts` correspond :
   ```typescript
   const envMap: Record<string, string> = {
     'kara-gabon-dev': 'dev',
     'kara-gabon-preprod': 'preprod',
     'kara-gabon': 'prod',
   }
   ```

### Erreur lors du déploiement

**Cause** : Erreur de compilation ou de configuration.

**Solution** :
1. Vérifier la compilation :
   ```bash
   cd functions
   npm run build
   ```

2. Vérifier les erreurs TypeScript :
   ```bash
   cd functions
   npx tsc --noEmit
   ```

## 📝 Notes Importantes

1. **Détection Automatique** : La fonction détecte automatiquement l'environnement depuis `projectId` Firebase.

2. **Index Algolia** : Chaque environnement utilise son propre index :
   - Dev : `membership-requests-dev`
   - Preprod : `membership-requests-preprod`
   - Prod : `membership-requests-prod`

3. **Variables d'Environnement** : Les variables sont lues depuis `functions.config()` en priorité, puis `process.env` en fallback. Assurez-vous qu'elles sont configurées avant le déploiement.

4. **Synchronisation Automatique** : Une fois déployée, la fonction se déclenche automatiquement sur chaque création/modification/suppression de document dans `membership-requests`.

## 🎯 Checklist de Déploiement

- [ ] Variables d'environnement configurées (secrets ou config)
- [ ] Functions compilées (`npm run build`)
- [ ] Déployé sur dev
- [ ] Testé sur dev (créer/modifier un document)
- [ ] Vérifié dans Algolia Dashboard (dev)
- [ ] Déployé sur preprod
- [ ] Testé sur preprod
- [ ] Vérifié dans Algolia Dashboard (preprod)
- [ ] Déployé sur prod
- [ ] Testé sur prod
- [ ] Vérifié dans Algolia Dashboard (prod)
- [ ] Logs vérifiés pour chaque environnement
