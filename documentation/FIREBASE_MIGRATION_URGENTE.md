# ⚠️ Migration Urgente Firebase — Séparation Dev/Preprod/Prod

> **SITUATION ACTUELLE** : Le projet utilise actuellement la base de données de **production** (`kara-gabon`) en développement local (`.env.local`).  
> **RISQUE CRITIQUE** : Tous les tests et développements polluent/corrompent les données de production.

---

## 🚨 Problème Identifié

### État Actuel

- ✅ **Production** : Projet Firebase `kara-gabon` (utilisé en production)
- ❌ **Development** : Utilise aussi `kara-gabon` (via `.env.local`) ← **PROBLÈME**
- ❌ **Preprod** : N'existe pas encore
- ❌ **Dev** : N'existe pas encore (ou projet `fir-demo-project` non utilisé)

### Risques

- 🔴 **Données de production corrompues** lors des tests
- 🔴 **Impossible de tester en sécurité** sans impacter la prod
- 🔴 **Pas de rollback possible** si erreur en développement
- 🔴 **Données de test mélangées** avec données réelles

---

## ✅ Solution : Plan d'Action Immédiat

### Étape 1 : Sauvegarder la Production (OBLIGATOIRE)

**AVANT TOUTE CHOSE**, sauvegarder les données de production :

```bash
# Se connecter au projet de production
firebase use kara-gabon

# Exporter les données (si nécessaire)
firebase firestore:export gs://kara-gabon-backups/firestore-export-$(date +%Y%m%d-%H%M%S)

# Ou exporter localement (si backup local nécessaire)
firebase firestore:export ./backup-prod-$(date +%Y%m%d)
```

**Checklist** :
- [ ] Backup Firestore créé
- [ ] Backup Storage créé (si nécessaire)
- [ ] Backup des règles Firestore (`firestore.rules`)
- [ ] Backup des indexes (`firestore.indexes.json`)

---

### Étape 2 : Créer les 3 Projets Firebase

#### 2.1 Créer le Projet DEV

1. Aller sur [Firebase Console](https://console.firebase.google.com/)
2. Cliquer sur "Add project"
3. **Nom du projet** : `kara-mutuelle-dev`
4. Activer Google Analytics (optionnel)
5. Créer le projet

**Activer les services** :
- [ ] Authentication (Email/Password, Phone)
- [ ] Firestore Database (mode production)
- [ ] Storage (mode production)
- [ ] Cloud Functions (Spark plan suffit pour dev)

#### 2.2 Créer le Projet PREPROD

1. Aller sur [Firebase Console](https://console.firebase.google.com/)
2. Cliquer sur "Add project"
3. **Nom du projet** : `kara-mutuelle-preprod`
4. Activer Google Analytics (optionnel)
5. Créer le projet

**Activer les services** :
- [ ] Authentication (Email/Password, Phone)
- [ ] Firestore Database (mode production)
- [ ] Storage (mode production)
- [ ] Cloud Functions (Spark plan suffit pour preprod)

#### 2.3 Renommer/Utiliser le Projet PROD

**Option A : Renommer le projet existant** (si possible)
- Le projet `kara-gabon` devient `kara-mutuelle-prod`
- ⚠️ **Note** : Firebase ne permet pas de renommer un projet, il faudra créer un nouveau projet et migrer

**Option B : Créer un nouveau projet PROD** (recommandé)
1. Créer un nouveau projet : `kara-mutuelle-prod`
2. Migrer les données de `kara-gabon` vers `kara-mutuelle-prod` (voir étape 4)
3. Mettre à jour la configuration Vercel pour utiliser `kara-mutuelle-prod`

**Option C : Garder `kara-gabon` comme PROD** (si migration impossible maintenant)
- Utiliser `kara-gabon` comme prod pour l'instant
- Créer `kara-mutuelle-prod` plus tard et migrer progressivement

---

### Étape 3 : Récupérer les Configurations Firebase

Pour chaque projet créé :

1. Aller dans **Project Settings > General**
2. Section "Your apps" > Cliquer sur l'icône Web (`</>`)
3. Donner un nom à l'app (ex: "kara-web")
4. Copier la configuration :

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

**Noter ces valeurs pour chaque projet** :
- [ ] `kara-mutuelle-dev` : API Key, Auth Domain, Project ID, Storage Bucket, Messaging Sender ID, App ID
- [ ] `kara-mutuelle-preprod` : API Key, Auth Domain, Project ID, Storage Bucket, Messaging Sender ID, App ID
- [ ] `kara-gabon` (ou `kara-mutuelle-prod`) : API Key, Auth Domain, Project ID, Storage Bucket, Messaging Sender ID, App ID

---

### Étape 4 : Configurer `.firebaserc`

Mettre à jour `.firebaserc` :

```json
{
  "projects": {
    "default": "kara-mutuelle-dev",
    "dev": "kara-mutuelle-dev",
    "preprod": "kara-mutuelle-preprod",
    "prod": "kara-gabon"
  }
}
```

**Ou si vous créez un nouveau projet prod** :

```json
{
  "projects": {
    "default": "kara-mutuelle-dev",
    "dev": "kara-mutuelle-dev",
    "preprod": "kara-mutuelle-preprod",
    "prod": "kara-mutuelle-prod"
  }
}
```

---

### Étape 5 : Créer/Mettre à jour `.env.local` (DEV)

**⚠️ IMPORTANT** : Remplacer le contenu de `.env.local` par les valeurs du projet **DEV** :

```bash
# Environnement
NEXT_PUBLIC_APP_ENV=development

# Firebase DEV (kara-mutuelle-dev)
NEXT_PUBLIC_FIREBASE_API_KEY=<dev-api-key>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=kara-mutuelle-dev.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=kara-mutuelle-dev
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=kara-mutuelle-dev.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<dev-sender-id>
NEXT_PUBLIC_FIREBASE_APP_ID=<dev-app-id>

# Admin SDK (pour Functions)
FIREBASE_PROJECT_ID=kara-mutuelle-dev
FIREBASE_CLIENT_EMAIL=<dev-service-account-email>
FIREBASE_PRIVATE_KEY=<dev-private-key>

# Optionnel
NEXT_PUBLIC_USE_FIREBASE_EMULATORS=false
```

**⚠️ ACTION IMMÉDIATE** : Remplacer les valeurs de production par les valeurs DEV dans `.env.local`

---

### Étape 6 : Créer `.env.preview` (PREPROD)

Créer un fichier `.env.preview` (gitignored) :

```bash
# Environnement
NEXT_PUBLIC_APP_ENV=preprod

# Firebase PREPROD (kara-mutuelle-preprod)
NEXT_PUBLIC_FIREBASE_API_KEY=<preprod-api-key>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=kara-mutuelle-preprod.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=kara-mutuelle-preprod
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=kara-mutuelle-preprod.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<preprod-sender-id>
NEXT_PUBLIC_FIREBASE_APP_ID=<preprod-app-id>

# Admin SDK
FIREBASE_PROJECT_ID=kara-mutuelle-preprod
FIREBASE_CLIENT_EMAIL=<preprod-service-account-email>
FIREBASE_PRIVATE_KEY=<preprod-private-key>
```

---

### Étape 7 : Migrer les Données (si nécessaire)

#### 7.1 Migrer de `kara-gabon` vers `kara-mutuelle-prod`

Si vous créez un nouveau projet prod :

```bash
# Exporter depuis kara-gabon
firebase use kara-gabon
firebase firestore:export gs://kara-mutuelle-prod-backups/export-from-kara-gabon

# Importer dans kara-mutuelle-prod
firebase use kara-mutuelle-prod
firebase firestore:import gs://kara-mutuelle-prod-backups/export-from-kara-gabon
```

#### 7.2 Copier les règles et indexes

```bash
# Déployer les règles sur le nouveau projet
firebase use kara-mutuelle-prod
firebase deploy --only firestore:rules,firestore:indexes
```

---

### Étape 8 : Adapter le Code pour les Préfixes de Collections

Voir `documentation/FIREBASE_MULTI_ENVIRONNEMENT.md` section 2 pour l'implémentation.

**Résumé** :
1. Créer `src/shared/constants/collections.ts` avec les préfixes
2. Remplacer tous les noms de collections en dur par les constantes
3. Tester en local avec le projet dev

---

### Étape 9 : Configurer Vercel

#### Variables Preview (Preprod)

Dans **Vercel Dashboard > Settings > Environment Variables** :

- Environment: **Preview**
- Ajouter toutes les variables `NEXT_PUBLIC_*` avec les valeurs du projet **preprod**

#### Variables Production

Dans **Vercel Dashboard > Settings > Environment Variables** :

- Environment: **Production**
- Ajouter toutes les variables `NEXT_PUBLIC_*` avec les valeurs du projet **prod** (`kara-gabon` ou `kara-mutuelle-prod`)

---

## 📋 Checklist Complète de Migration

### Sécurité
- [ ] Backup de production créé
- [ ] Backup des règles et indexes
- [ ] Plan de rollback préparé

### Projets Firebase
- [ ] Projet DEV créé (`kara-mutuelle-dev`)
- [ ] Projet PREPROD créé (`kara-mutuelle-preprod`)
- [ ] Projet PROD identifié/renommé (`kara-gabon` ou `kara-mutuelle-prod`)
- [ ] Services activés pour chaque projet (Auth, Firestore, Storage, Functions)

### Configuration Locale
- [ ] `.firebaserc` mis à jour
- [ ] `.env.local` mis à jour avec projet DEV (⚠️ **ACTION IMMÉDIATE**)
- [ ] `.env.preview` créé avec projet PREPROD

### Migration Données
- [ ] Données migrées vers nouveau projet PROD (si nécessaire)
- [ ] Règles Firestore déployées sur chaque projet
- [ ] Indexes Firestore déployés sur chaque projet

### Code
- [ ] Code adapté pour utiliser les préfixes de collections (voir étape 8)
- [ ] Tests locaux fonctionnent avec projet DEV

### Vercel
- [ ] Variables Vercel Preview configurées (PREPROD)
- [ ] Variables Vercel Production configurées (PROD)
- [ ] Déploiement testé en preprod

---

## ⚠️ Actions Immédiates (À Faire MAINTENANT)

1. **✅ STOP** : Ne plus utiliser `.env.local` avec les variables de production
2. **✅ Créer les projets Firebase** (dev, preprod)
3. **✅ Mettre à jour `.env.local`** avec les valeurs DEV
4. **✅ Tester en local** avec le projet DEV
5. **✅ Configurer Vercel** avec les bonnes variables

---

## 🔄 Après la Migration

Une fois la migration terminée :

- ✅ Développement local utilise `kara-mutuelle-dev`
- ✅ Tests ne polluent plus la production
- ✅ Preprod permet de tester avant prod
- ✅ Production isolée et sécurisée

---

## 📚 Références

- `FIREBASE_MULTI_ENVIRONNEMENT.md` : Guide complet sur la configuration multi-environnement
- `WORKFLOW.md` : Section INIT-2 et INIT-3 pour les détails
- [Firebase Console](https://console.firebase.google.com/)
- [Documentation Firebase](https://firebase.google.com/docs)

---

## ❓ Questions Fréquentes

**Q : Puis-je garder `kara-gabon` comme projet de production ?**  
R : Oui, vous pouvez garder `kara-gabon` comme prod pour l'instant. Créez simplement `kara-mutuelle-dev` et `kara-mutuelle-preprod`.

**Q : Dois-je migrer les données vers un nouveau projet prod maintenant ?**  
R : Non, vous pouvez garder `kara-gabon` comme prod. La migration vers `kara-mutuelle-prod` peut se faire plus tard.

**Q : Que faire si j'ai déjà pollué la base de production ?**  
R : Restaurer depuis le backup créé à l'étape 1. Si pas de backup, analyser les données corrompues et les nettoyer manuellement.
