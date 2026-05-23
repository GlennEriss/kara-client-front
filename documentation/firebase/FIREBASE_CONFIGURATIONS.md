# Configurations Firebase — KARA Association

> Récapitulatif des configurations Firebase pour les 3 environnements

---

## 📋 Projets Firebase

| Environnement | Nom du Projet | Statut |
|---------------|---------------|--------|
| **DEV** | `kara-gabon-dev` | ✅ Configuré |
| **PREPROD** | `kara-gabon-preprod` | ✅ Configuré |
| **PROD** | `kara-gabon` | ✅ Existant |

---

## 🔧 Configuration DEV (`kara-gabon-dev`)

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyCDZjvtZNKWHXH-E4NkJUE7bWgDZZGp4BQ",
  authDomain: "kara-gabon-dev.firebaseapp.com",
  projectId: "kara-gabon-dev",
  storageBucket: "kara-gabon-dev.firebasestorage.app",
  messagingSenderId: "666722104876",
  appId: "1:666722104876:web:3514be40122fc3b95d0389",
  measurementId: "G-T0HP2F87NW"
};
```

**Variables d'environnement (.env.local)** :
```bash
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyCDZjvtZNKWHXH-E4NkJUE7bWgDZZGp4BQ
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=kara-gabon-dev.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=kara-gabon-dev
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=kara-gabon-dev.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=666722104876
NEXT_PUBLIC_FIREBASE_APP_ID=1:666722104876:web:3514be40122fc3b95d0389
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-T0HP2F87NW

FIREBASE_PROJECT_ID=kara-gabon-dev
# FIREBASE_CLIENT_EMAIL=<à récupérer depuis Service Account>
# FIREBASE_PRIVATE_KEY=<à récupérer depuis Service Account>
```

---

## 🔧 Configuration PREPROD (`kara-gabon-preprod`)

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyA4z5Ws3BHx5th_LHPPEp2HMx_FeNXePV0",
  authDomain: "kara-gabon-preprod.firebaseapp.com",
  projectId: "kara-gabon-preprod",
  storageBucket: "kara-gabon-preprod.firebasestorage.app",
  messagingSenderId: "187271875898",
  appId: "1:187271875898:web:83531fcc88737a947f9403",
  measurementId: "G-HQ8CFLD8G8"
};
```

**Variables d'environnement (.env.preview)** :
```bash
NEXT_PUBLIC_APP_ENV=preprod
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyA4z5Ws3BHx5th_LHPPEp2HMx_FeNXePV0
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=kara-gabon-preprod.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=kara-gabon-preprod
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=kara-gabon-preprod.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=187271875898
NEXT_PUBLIC_FIREBASE_APP_ID=1:187271875898:web:83531fcc88737a947f9403
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-HQ8CFLD8G8

FIREBASE_PROJECT_ID=kara-gabon-preprod
# FIREBASE_CLIENT_EMAIL=<à récupérer depuis Service Account>
# FIREBASE_PRIVATE_KEY=<à récupérer depuis Service Account>
```

**Variables Vercel Preview** :
- À configurer dans Vercel Dashboard > Settings > Environment Variables
- Environment: **Preview**
- Utiliser les mêmes valeurs que ci-dessus

---

## 🔧 Configuration PROD (`kara-gabon`)

**Variables d'environnement (variables Vercel Production)** :
- À configurer dans Vercel Dashboard > Settings > Environment Variables
- Environment: **Production**
- Utiliser les valeurs du projet `kara-gabon` (existant)

**Note** : Les valeurs exactes de production ne sont pas stockées ici pour des raisons de sécurité.

---

## 📝 Configuration `.firebaserc`

Mettre à jour `.firebaserc` :

```json
{
  "projects": {
    "default": "kara-gabon-dev",
    "dev": "kara-gabon-dev",
    "preprod": "kara-gabon-preprod",
    "prod": "kara-gabon"
  }
}
```

---

## ✅ Actions à Faire Maintenant

### 1. Mettre à jour `.firebaserc`
- [ ] Mettre à jour `.firebaserc` avec les 3 projets

### 2. Créer/Mettre à jour `.env.local` (DEV)
- [ ] Créer `.env.local` avec la configuration DEV
- [ ] ⚠️ **IMPORTANT** : Remplacer les valeurs de production actuellement dans `.env.local`

### 3. Créer `.env.preview` (PREPROD)
- [ ] Créer `.env.preview` avec la configuration PREPROD

### 4. Récupérer les Service Accounts
Pour chaque projet (DEV et PREPROD) :
- [ ] Aller dans Firebase Console > Project Settings > Service accounts
- [ ] Générer une nouvelle clé privée (JSON)
- [ ] Noter `project_id`, `client_email`, `private_key`
- [ ] Ajouter dans `.env.local` (dev) et `.env.preview` (preprod)

### 5. Configurer Vercel
- [ ] Variables Preview (PREPROD) : Configurer dans Vercel Dashboard
- [ ] Variables Production (PROD) : Vérifier/Configurer dans Vercel Dashboard

### 6. Tester en local
- [ ] Tester avec le projet DEV (`.env.local`)
- [ ] Vérifier que l'application fonctionne
- [ ] Vérifier que les collections utilisent le préfixe `-dev`

---

## 🔒 Sécurité

**⚠️ IMPORTANT** :
- ❌ Ne jamais commiter `.env.local`, `.env.preview`
- ✅ S'assurer que ces fichiers sont dans `.gitignore`
- ✅ Ne pas partager les clés privées (Service Account)
- ✅ Utiliser des variables d'environnement sécurisées dans Vercel

---

## 📚 Références

- `documentation/FIREBASE_MIGRATION_URGENTE.md` : Guide de migration complet
- `documentation/FIREBASE_SETUP_CHECKLIST.md` : Checklist de setup
- `documentation/FIREBASE_MULTI_ENVIRONNEMENT.md` : Guide multi-environnement
- `WORKFLOW.md` : Section INIT-2 et INIT-3
